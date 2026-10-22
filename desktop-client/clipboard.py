"""Cross-platform clipboard access for ClipSync.

Design notes
------------
Windows uses the Win32 API in-process (never spawn powershell.exe: during a
session shutdown newly spawned processes fail with 0xc0000142 and Windows
shows a blocking modal error dialog for each one, which prevents shutdown).

macOS prefers NSPasteboard through PyObjC, which the tray dependency already
pulls in.  That buys three things over shelling out to pbpaste/pbcopy twice a
second:

* correct UTF-8 (``pbpaste`` decodes using the locale encoding, and under
  launchd ``LANG`` is often unset, so accented text raised UnicodeDecodeError
  and silently came back as an empty string),
* ``changeCount()``, a cheap integer that lets the poller skip work entirely
  when nothing was copied,
* the pasteboard *type list*, so we can tell a Finder file copy apart from a
  plain text copy.

``pbpaste``/``pbcopy`` remain as a fallback when PyObjC is unavailable.
"""

import io
import platform
import subprocess
import time

_SYSTEM = platform.system()
_IS_WINDOWS = _SYSTEM == "Windows"
_IS_MACOS = _SYSTEM == "Darwin"

# --------------------------------------------------------------------------
# Windows - in-process Win32
# --------------------------------------------------------------------------

if _IS_WINDOWS:
    import ctypes
    from ctypes import wintypes

    _user32 = ctypes.windll.user32
    _kernel32 = ctypes.windll.kernel32

    _CF_BITMAP = 2
    _CF_DIB = 8
    _CF_UNICODETEXT = 13
    _CF_HDROP = 15
    _CF_DIBV5 = 17
    _GHND = 0x0042

    _user32.OpenClipboard.argtypes = [wintypes.HWND]
    _user32.OpenClipboard.restype = wintypes.BOOL
    _user32.CloseClipboard.argtypes = []
    _user32.CloseClipboard.restype = wintypes.BOOL
    _user32.EmptyClipboard.argtypes = []
    _user32.EmptyClipboard.restype = wintypes.BOOL
    _user32.GetClipboardData.argtypes = [wintypes.UINT]
    _user32.GetClipboardData.restype = wintypes.HANDLE
    _user32.SetClipboardData.argtypes = [wintypes.UINT, wintypes.HANDLE]
    _user32.SetClipboardData.restype = wintypes.HANDLE
    _user32.IsClipboardFormatAvailable.argtypes = [wintypes.UINT]
    _user32.IsClipboardFormatAvailable.restype = wintypes.BOOL
    _user32.GetClipboardSequenceNumber.argtypes = []
    _user32.GetClipboardSequenceNumber.restype = wintypes.DWORD
    _kernel32.GlobalAlloc.argtypes = [wintypes.UINT, ctypes.c_size_t]
    _kernel32.GlobalAlloc.restype = wintypes.HGLOBAL
    _kernel32.GlobalLock.argtypes = [wintypes.HGLOBAL]
    _kernel32.GlobalLock.restype = wintypes.LPVOID
    _kernel32.GlobalUnlock.argtypes = [wintypes.HGLOBAL]
    _kernel32.GlobalUnlock.restype = wintypes.BOOL
    _kernel32.GlobalFree.argtypes = [wintypes.HGLOBAL]
    _kernel32.GlobalFree.restype = wintypes.HGLOBAL
    _user32.RegisterClipboardFormatW.argtypes = [wintypes.LPCWSTR]
    _user32.RegisterClipboardFormatW.restype = wintypes.UINT

    # Browsers, Office and the Snipping Tool publish this alongside CF_DIB; it
    # keeps transparency and is what we prefer to read and write.
    _CF_PNG = _user32.RegisterClipboardFormatW("PNG")


def _get_clipboard_windows() -> str:
    for _ in range(5):
        if _user32.OpenClipboard(None):
            break
        time.sleep(0.01)
    else:
        return ""
    try:
        handle = _user32.GetClipboardData(_CF_UNICODETEXT)
        if not handle:
            return ""
        ptr = _kernel32.GlobalLock(handle)
        if not ptr:
            return ""
        try:
            return ctypes.c_wchar_p(ptr).value or ""
        finally:
            _kernel32.GlobalUnlock(handle)
    finally:
        _user32.CloseClipboard()


def _set_clipboard_windows(text: str):
    for _ in range(5):
        if _user32.OpenClipboard(None):
            break
        time.sleep(0.01)
    else:
        return
    try:
        _user32.EmptyClipboard()
        data = text.encode("utf-16le") + b"\x00\x00"
        h_mem = _kernel32.GlobalAlloc(_GHND, len(data))
        if not h_mem:
            return
        ptr = _kernel32.GlobalLock(h_mem)
        if not ptr:
            _kernel32.GlobalFree(h_mem)
            return
        try:
            ctypes.memmove(ptr, data, len(data))
        finally:
            _kernel32.GlobalUnlock(h_mem)
        if not _user32.SetClipboardData(_CF_UNICODETEXT, h_mem):
            _kernel32.GlobalFree(h_mem)
    finally:
        _user32.CloseClipboard()


def _put_windows_data(fmt: int, data: bytes) -> bool:
    """SetClipboardData for raw bytes. The clipboard must already be open."""
    h_mem = _kernel32.GlobalAlloc(_GHND, len(data))
    if not h_mem:
        return False
    ptr = _kernel32.GlobalLock(h_mem)
    if not ptr:
        _kernel32.GlobalFree(h_mem)
        return False
    try:
        ctypes.memmove(ptr, data, len(data))
    finally:
        _kernel32.GlobalUnlock(h_mem)
    if not _user32.SetClipboardData(fmt, h_mem):
        _kernel32.GlobalFree(h_mem)
        return False
    return True


def _set_clipboard_image_windows(png: bytes, image):
    bmp = io.BytesIO()
    image.convert("RGB").save(bmp, "BMP")
    dib = bmp.getvalue()[14:]  # CF_DIB is a BMP without its file header
    for _ in range(5):
        if _user32.OpenClipboard(None):
            break
        time.sleep(0.01)
    else:
        return
    try:
        _user32.EmptyClipboard()
        _put_windows_data(_CF_PNG, png)
        _put_windows_data(_CF_DIB, dib)
    finally:
        _user32.CloseClipboard()


def _windows_has_image() -> bool:
    return any(
        _user32.IsClipboardFormatAvailable(fmt) for fmt in (_CF_PNG, _CF_DIB, _CF_DIBV5, _CF_BITMAP)
    )


def _windows_has_files() -> bool:
    try:
        return bool(_user32.IsClipboardFormatAvailable(_CF_HDROP))
    except Exception:
        return False


# --------------------------------------------------------------------------
# macOS - NSPasteboard with pbpaste/pbcopy fallback
# --------------------------------------------------------------------------

_NS_PASTEBOARD = None
_NS_STRING_TYPE = None
_MAC_IMAGE_TYPES: tuple[str, ...] = ("public.png", "public.tiff")
_MAC_FILE_TYPES: tuple[str, ...] = (
    "public.file-url",
    "NSFilenamesPboardType",
    "public.url",
)

if _IS_MACOS:
    try:  # pragma: no cover - platform specific
        from AppKit import NSPasteboard, NSPasteboardTypeString

        _NS_PASTEBOARD = NSPasteboard.generalPasteboard()
        _NS_STRING_TYPE = NSPasteboardTypeString
    except Exception:
        _NS_PASTEBOARD = None
        _NS_STRING_TYPE = None


def _get_clipboard_macos() -> str:
    if _NS_PASTEBOARD is not None:
        value = _NS_PASTEBOARD.stringForType_(_NS_STRING_TYPE)
        return str(value) if value else ""

    # Fallback: decode explicitly as UTF-8 rather than trusting the locale.
    result = subprocess.run(
        ["pbpaste", "-Prefer", "txt"],
        capture_output=True,
        timeout=2,
    )
    return result.stdout.decode("utf-8", errors="replace")


def _set_clipboard_macos(text: str):
    if _NS_PASTEBOARD is not None:
        _NS_PASTEBOARD.clearContents()
        _NS_PASTEBOARD.setString_forType_(text, _NS_STRING_TYPE)
        return

    process = subprocess.Popen(["pbcopy"], stdin=subprocess.PIPE)
    process.communicate(text.encode("utf-8"))


def _macos_types() -> set[str]:
    if _NS_PASTEBOARD is None:
        return set()
    try:
        return {str(t) for t in (_NS_PASTEBOARD.types() or [])}
    except Exception:
        return set()


def _get_clipboard_image_macos() -> bytes | None:
    types = _macos_types()
    for image_type in _MAC_IMAGE_TYPES:
        if image_type in types:
            data = _NS_PASTEBOARD.dataForType_(image_type)
            if data:
                return bytes(data)
    return None


def _set_clipboard_image_macos(png: bytes):
    from AppKit import NSImage, NSPasteboardItem
    from Foundation import NSData

    data = NSData.dataWithBytes_length_(png, len(png))
    item = NSPasteboardItem.alloc().init()
    item.setData_forType_(data, "public.png")
    tiff = NSImage.alloc().initWithData_(data)
    if tiff is not None and tiff.TIFFRepresentation() is not None:
        # Older apps only read TIFF from the pasteboard.
        item.setData_forType_(tiff.TIFFRepresentation(), "public.tiff")
    _NS_PASTEBOARD.clearContents()
    _NS_PASTEBOARD.writeObjects_([item])


def _macos_has_files() -> bool:
    if _NS_PASTEBOARD is None:
        return False
    try:
        types = {str(t) for t in (_NS_PASTEBOARD.types() or [])}
    except Exception:
        return False
    return any(file_type in types for file_type in _MAC_FILE_TYPES)


# --------------------------------------------------------------------------
# Public API
# --------------------------------------------------------------------------


def get_clipboard() -> str:
    """Return the clipboard's plain-text flavour, or "" if unavailable."""
    try:
        if _IS_WINDOWS:
            return _get_clipboard_windows()
        if _IS_MACOS:
            return _get_clipboard_macos()

        result = subprocess.run(
            ["xclip", "-selection", "clipboard", "-o"],
            capture_output=True,
            timeout=2,
        )
        return result.stdout.decode("utf-8", errors="replace")
    except Exception:
        return ""


def set_clipboard(text: str):
    """Replace the clipboard with *text*."""
    try:
        if _IS_WINDOWS:
            _set_clipboard_windows(text)
        elif _IS_MACOS:
            _set_clipboard_macos(text)
        else:
            process = subprocess.Popen(
                ["xclip", "-selection", "clipboard"],
                stdin=subprocess.PIPE,
            )
            process.communicate(text.encode("utf-8"))
    except Exception:
        pass


def clipboard_has_files() -> bool:
    """True when the clipboard currently holds file references.

    A Finder (or Explorer) file copy also publishes a text flavour holding the
    file names, which is what we sync.  Knowing the real payload is a file lets
    the caller avoid destroying those references by writing plain text back
    over them.
    """
    try:
        if _IS_MACOS:
            return _macos_has_files()
        if _IS_WINDOWS:
            return _windows_has_files()
    except Exception:
        pass
    return False


def clipboard_has_image() -> bool:
    """Cheap format check; does not read or decode the image."""
    try:
        if _IS_WINDOWS:
            return _windows_has_image()
        if _IS_MACOS:
            return any(t in _macos_types() for t in _MAC_IMAGE_TYPES)
    except Exception:
        pass
    return False


def get_clipboard_image():
    """Return the clipboard image as a PIL Image, or None."""
    try:
        from PIL import Image, ImageGrab

        if _IS_WINDOWS:
            grabbed = ImageGrab.grabclipboard()
            return grabbed if isinstance(grabbed, Image.Image) else None
        if _IS_MACOS:
            raw = _get_clipboard_image_macos()
            if raw:
                image = Image.open(io.BytesIO(raw))
                image.load()
                return image
    except Exception:
        pass
    return None


def set_clipboard_image(png: bytes, image):
    """Replace the clipboard with an image (*png* bytes and the decoded *image*)."""
    try:
        if _IS_WINDOWS:
            _set_clipboard_image_windows(png, image)
        elif _IS_MACOS and _NS_PASTEBOARD is not None:
            _set_clipboard_image_macos(png)
    except Exception:
        pass


def clipboard_change_token() -> int | None:
    """A counter that changes whenever the clipboard is written.

    Lets the poller skip reading the clipboard when nothing happened.
    Returns None on platforms where no such counter is available.
    """
    try:
        if _IS_MACOS and _NS_PASTEBOARD is not None:
            return int(_NS_PASTEBOARD.changeCount())
        if _IS_WINDOWS:
            return int(_user32.GetClipboardSequenceNumber())
    except Exception:
        return None
    return None
