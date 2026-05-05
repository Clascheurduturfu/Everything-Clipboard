import platform
import subprocess


def _windows_subprocess_kwargs() -> dict:
    """Keep helper clipboard commands from flashing terminal windows."""
    if platform.system() != "Windows":
        return {}

    startupinfo = subprocess.STARTUPINFO()
    startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
    return {
        "creationflags": subprocess.CREATE_NO_WINDOW,
        "startupinfo": startupinfo,
    }


def get_clipboard() -> str:
    """Get current clipboard text. Works on macOS and Windows."""
    system = platform.system()
    try:
        if system == "Darwin":
            result = subprocess.run(["pbpaste"], capture_output=True, text=True, timeout=2)
            return result.stdout
        if system == "Windows":
            result = subprocess.run(
                [
                    "powershell",
                    "-NoProfile",
                    "-NonInteractive",
                    "-WindowStyle",
                    "Hidden",
                    "-Command",
                    "Get-Clipboard",
                ],
                capture_output=True,
                text=True,
                timeout=2,
                **_windows_subprocess_kwargs(),
            )
            return result.stdout.rstrip("\r\n")

        result = subprocess.run(
            ["xclip", "-selection", "clipboard", "-o"],
            capture_output=True,
            text=True,
            timeout=2,
        )
        return result.stdout
    except Exception:
        return ""


def set_clipboard(text: str):
    """Set clipboard text. Works on macOS and Windows."""
    system = platform.system()
    try:
        if system == "Darwin":
            process = subprocess.Popen(["pbcopy"], stdin=subprocess.PIPE)
            process.communicate(text.encode("utf-8"))
        elif system == "Windows":
            process = subprocess.Popen(
                ["clip"],
                stdin=subprocess.PIPE,
                **_windows_subprocess_kwargs(),
            )
            process.communicate(text.encode("utf-16le"))
        else:
            process = subprocess.Popen(
                ["xclip", "-selection", "clipboard"],
                stdin=subprocess.PIPE,
            )
            process.communicate(text.encode("utf-8"))
    except Exception:
        pass
