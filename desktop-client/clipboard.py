import platform
import subprocess


def get_clipboard() -> str:
    """Get current clipboard text. Works on macOS and Windows."""
    system = platform.system()
    try:
        if system == "Darwin":  # macOS
            result = subprocess.run(["pbpaste"], capture_output=True, text=True, timeout=2)
            return result.stdout
        elif system == "Windows":
            # PowerShell is the most reliable way on Windows
            result = subprocess.run(
                ["powershell", "-command", "Get-Clipboard"],
                capture_output=True, text=True, timeout=2
            )
            return result.stdout.rstrip("\r\n")
        else:
            # Linux fallback (xclip)
            result = subprocess.run(
                ["xclip", "-selection", "clipboard", "-o"],
                capture_output=True, text=True, timeout=2
            )
            return result.stdout
    except Exception:
        return ""


def set_clipboard(text: str):
    """Set clipboard text. Works on macOS and Windows."""
    system = platform.system()
    try:
        if system == "Darwin":  # macOS
            process = subprocess.Popen(["pbcopy"], stdin=subprocess.PIPE)
            process.communicate(text.encode("utf-8"))
        elif system == "Windows":
            # Use clip.exe — it reads from stdin
            process = subprocess.Popen(["clip"], stdin=subprocess.PIPE)
            process.communicate(text.encode("utf-16le"))
        else:
            # Linux fallback
            process = subprocess.Popen(
                ["xclip", "-selection", "clipboard"],
                stdin=subprocess.PIPE
            )
            process.communicate(text.encode("utf-8"))
    except Exception:
        pass
