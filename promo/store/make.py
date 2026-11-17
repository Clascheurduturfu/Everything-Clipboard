"""Build the store / website stills as HTML pages and render them with headless Chrome.

python make.py [name ...]   (no names = all)
Pages are written to pages/, PNGs to out/<group>/.
"""
import os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

BAR = ('<div class="bar"><img src="../assets/logo.png" alt="">ClipSync Preferences'
       '<div class="ctl"><span>&#x2014;</span><span>&#x25A2;</span><span>&#x2715;</span></div></div>')
LOCK = ('<svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.4" stroke-linecap="round" '
        'stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/></svg>')


def win(tab, left, top, width):
    return (f'<div class="win" style="left:{left}px;top:{top}px;width:{width}px">{BAR}'
            f'<img class="cap" src="../assets/shots/windows-{tab}.png" alt=""></div>')


def phone(frame, left, top, sw, masked=False):
    """Android frame around a 720-wide capture (status bar cropped); draws a clean 9:41 bar and
    covers the 'Last received from <device>' label with a neutral device name."""
    s = sw / 720
    sbar = (f'<div style="height:{60 * s}px;background:#0f1725;color:#f1f5f9;font:600 {28 * s}px Geist;'
            f'padding:{16 * s}px 0 0 {46 * s}px;position:relative">9:41'
            + "".join(f'<i style="position:absolute;top:{24 * s}px;left:{x * s}px;width:{w * s}px;height:{16 * s}px;'
                      f'border-radius:{3 * s}px;background:#f1f5f9"></i>' for x, w in ((560, 26), (596, 26), (632, 44)))
            + '</div>')
    mask = (f'<div style="position:absolute;left:{70 * s}px;top:{(60 + 776) * s}px;width:{400 * s}px;height:{42 * s}px;'
            f'background:#172033;color:#b7c0d3;font:400 {25 * s}px Roboto,sans-serif;line-height:{42 * s}px;'
            f'padding-left:{5 * s}px">Last received from Windows PC:</div>') if masked else ""
    return (f'<div class="phone" style="left:{left}px;top:{top}px;padding:{max(10, 14 * sw / 400)}px">'
            f'<div class="screen" style="width:{sw}px;border-radius:{52 * sw / 400}px">{sbar}'
            f'<img src="../assets/shots/{frame}.png" alt="">{mask}</div></div>')


def appwin(kind, left, top, width, height, font=28, k=1):
    """Notepad or Photos window drawn in HTML."""
    title = "wifi.txt — Notepad" if kind == "text" else "sunset.png — Photos"
    if kind == "text":
        inner = (f'<div style="height:38px;background:#272727;color:#cfcfcf;font-size:16px;padding:9px 0 0 20px;word-spacing:16px">File Edit View</div>'
                 f'<div style="padding:22px 0 0 26px;font:{font}px \'Geist Mono\',monospace;white-space:nowrap">'
                 f'<span style="background:#0067c0;color:#f8fafc;padding:2px 4px;border-radius:3px">Wi-Fi: blue-otter-2026</span>'
                 f'<div style="margin-top:16px;font-size:{font * 0.73}px;color:#8a90a0">guest: same password</div></div>')
    else:
        inner = (f'<div style="padding:14px"><img src="../assets/sunset.png" alt="" style="display:block;width:100%;'
                 f'border-radius:4px;box-shadow:0 0 0 4px #3b82f6"></div>')
    return (f'<div class="win" style="left:{left}px;top:{top}px;width:{width}px;height:{height}px;background:#1f1f1f;transform:scale({k});transform-origin:0 0">'
            f'<div class="bar" style="background:#2b2b2b">{title}<div class="ctl"><span>&#x2014;</span><span>&#x25A2;</span>'
            f'<span>&#x2715;</span></div></div>{inner}</div>')


def pill(left, top, text="End-to-end encrypted", size=26):
    return f'<div class="pill" style="left:{left}px;top:{top}px;font-size:{size}px">{LOCK}{text}</div>'


def page(w, h, body):
    return (f'<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="../base.css">'
            f'<style>html,body{{width:{w}px;height:{h}px}}</style></head><body><div class="bg"></div>{body}</body></html>')


def brand(left, top):
    return f'<div class="brand" style="left:{left}px;top:{top}px"><img src="../assets/logo.png" alt="">Everything Clipboard</div>'


def ms_split(title, sub, visual, size=104, width=820):
    """1920x1080 desktop slide: copy on the left, product on the right."""
    lines = title.count("<br>") + 1
    return page(1920, 1080, brand(140, 110) + '<div class="glow" style="left:980px;top:60px;width:960px;height:960px"></div>'
                + f'<h1 style="left:140px;top:350px;width:{width}px;font-size:{size}px">{title}</h1>'
                + f'<div class="sub" style="left:144px;top:{350 + size * 1.02 * lines + 42:.0f}px;width:{min(width, 760)}px;font-size:36px">{sub}</div>'
                + visual)


def ios(frame, left, top, sw, ipad=False):
    """Apple device frame around a full simulator screenshot (status bar included)."""
    r, pad = (28 * sw / 400, 12 * sw / 400) if ipad else (58 * sw / 400, 13 * sw / 400)
    return (f'<div class="phone" style="left:{left}px;top:{top}px;padding:{pad}px;border-radius:{r + pad}px">'
            f'<div class="screen" style="width:{sw}px;border-radius:{r}px"><img src="../assets/shots/{frame}.png" alt=""></div></div>')


def macwin(left, top, width):
    return (f'<img src="../assets/shots/mac-prefs.png" alt="" style="position:absolute;left:{left}px;top:{top}px;width:{width}px;'
            f'border-radius:{width * 0.022}px;box-shadow:0 50px 100px rgba(0,0,0,0.6),0 0 0 1px rgba(148,163,184,0.3)">')


def scaled(inner, left, top, k):
    return f'<div style="position:absolute;left:{left}px;top:{top}px;transform:scale({k});transform-origin:0 0">{inner}</div>'


def label(text, left, top, width, size=24):
    return (f'<div style="position:absolute;left:{left}px;top:{top}px;width:{width}px;text-align:center;color:#94a3b8;'
            f'font-size:{size}px;font-weight:500">{text}</div>')


def play(title, sub, visual):
    """1080x1920 phone screenshot (rendered at 540x960 css, 2x)."""
    return page(540, 960, '<div class="glow" style="left:-120px;top:300px;width:780px;height:780px"></div>'
                + f'<h1 style="left:40px;top:70px;width:470px;font-size:50px">{title}</h1>'
                + f'<div class="sub" style="left:42px;top:196px;width:460px;font-size:21px">{sub}</div>'
                + visual)


CIPHER = ('<div style="position:absolute;left:40px;top:370px;width:460px">'
          + "".join(f'<div style="margin-bottom:22px"><div style="color:#94a3b8;font-size:19px;margin-bottom:10px">{h}</div>'
                    f'<div style="font:{s}px \'Geist Mono\',monospace;color:{c};background:rgba(15,23,42,0.85);border-radius:14px;'
                    f'padding:18px 20px;box-shadow:0 0 0 1.5px {b}">{t}</div></div>'
                    for h, t, c, b, s in (
                        ("Copied on your PC", "Wi-Fi: blue-otter-2026", "#f8fafc", "rgba(148,163,184,0.35)", 23),
                        ("What the relay sees", "q7Z+e1Kx9/aR0mT4wB=c2L…", "#c084fc", "rgba(192,132,252,0.6)", 23),
                        ("Pasted on your phone", "Wi-Fi: blue-otter-2026", "#f8fafc", "rgba(148,163,184,0.35)", 23)))
          + '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:34px">'
          + "".join(f'<span style="padding:10px 16px;border-radius:999px;background:rgba(59,130,246,0.14);color:#bfdbfe;font-size:18px;'
                    f'box-shadow:0 0 0 1px rgba(96,165,250,0.4)">{t}</span>' for t in ("AES-256-GCM", "Key you choose", "Self-host or use ours"))
          + '</div></div>')

SLIDES = {
    # name: (group, width, height, html)
    "play-1-text": ("play", 540, 960, play('Copy on your PC.<br><span class="grad">Paste on your phone.</span>',
        'No more emailing yourself. Text you copy is ready on your phone.', phone("android-text", 70, 300, 400))),
    "play-2-photo": ("play", 540, 960, play('<span class="grad">Photos</span> too.',
        'Copy an image on one device, paste it on another. Up to 16 MB.', phone("android-photo", 70, 300, 400))),
    "play-3-key": ("play", 540, 960, play('Your key.<br><span class="grad">Your data.</span>',
        'Generate a key, share it to your devices, and you are connected.', phone("android-top", 70, 300, 400))),
    "play-4-private": ("play", 540, 960, play('Encrypted<br><span class="grad">before it leaves.</span>',
        'The relay only ever sees ciphertext.', CIPHER)),
    "play-5-settings": ("play", 540, 960, play('Your relay,<br><span class="grad">or ours.</span>',
        'Point it at your own server, keep images to Wi-Fi, or just use the default.', phone("android-settings", 70, 300, 400))),
    "play-6-devices": ("play", 540, 960, play('One clipboard.<br><span class="grad">All your devices.</span>',
        'Windows, macOS, Android, iPhone and iPad.',
        scaled(win("Connection", 0, 0, 420), 30, 290, 0.58) + macwin(290, 290, 222)
        + label("Windows", 30, 580, 244, 17) + label("macOS", 290, 580, 222, 17)
        + ios("iPhone-photo", 34, 620, 128) + phone("android-photo", 188, 618, 128) + ios("iPad-photo", 344, 640, 172, ipad=True)
        + label("iPhone", 34, 920, 146, 17) + label("Android", 188, 920, 150, 17) + label("iPad", 344, 920, 186, 17))),
    "ms-5-devices": ("msstore", 1920, 1080, ms_split(
        'One clipboard.<br><span class="grad">All your devices.</span>',
        'Windows, macOS, Android, iPhone and iPad. Copy on one, paste on any of them.',
        win("Connection", 880, 100, 420) + macwin(1350, 100, 440)
        + phone("android-photo", 960, 520, 210) + ios("iPhone-photo", 1225, 535, 205) + ios("iPad-photo", 1480, 600, 300, ipad=True),
        size=80, width=720)),
    "ms-1-text": ("msstore", 1920, 1080, ms_split(
        'Copy here.<br><span class="grad">Paste there.</span>',
        'Whatever you copy is ready on your other devices, end-to-end encrypted. No email to yourself, no cables.',
        appwin("text", 930, 330, 500, 300) + pill(1000, 220) + phone("android-text", 1352, 96, 400))),
    "ms-2-photo": ("msstore", 1920, 1080, ms_split(
        '<span class="grad">Photos</span> too.',
        'Copy an image on your PC and it lands on your phone, at full resolution up to 16 MB.',
        appwin("photo", 900, 320, 520, 400) + phone("android-photo", 1352, 96, 400))),
    "feature-graphic": ("play", 1024, 500, page(1024, 500,
        brand(60, 56) + '<div class="glow" style="left:470px;top:-160px;width:760px;height:760px"></div>'
        + '<h1 style="left:58px;top:150px;width:520px;font-size:56px">One clipboard.<br><span class="grad">All your devices.</span></h1>'
        + '<div class="sub" style="left:62px;top:306px;width:480px;font-size:22px">Text and photos, end-to-end encrypted.<br>Windows · macOS · Android · iOS</div>'
        + appwin("text", 560, 160, 460, 280, font=26, k=0.62) + phone("android-text", 800, 34, 190))),
    "ms-3-key": ("msstore", 1920, 1080, ms_split(
        'Your key.<br><span class="grad">Your data.</span>',
        'Clips are encrypted with AES-256-GCM before they leave your PC, using a key only your devices know. Generate one in a click.',
        win("Connection", 1156, 185, 624))),
    "ms-4-hosting": ("msstore", 1920, 1080, ms_split(
        'Run it<br><span class="grad">anywhere.</span>',
        'Use our relay, point ClipSync at your own server, or host the relay on this PC for your home Wi-Fi.',
        win("Hosting", 1156, 185, 624))),
    "ms-6-general": ("msstore", 1920, 1080, ms_split(
        'Set it.<br><span class="grad">Forget it.</span>',
        'Starts with Windows, sits in the tray, and keeps text and images up to 16 MB in sync across your devices.',
        win("General", 1156, 185, 624))),
}


def render(name):
    group, w, h, html = SLIDES[name]
    os.makedirs(os.path.join(HERE, "pages"), exist_ok=True)
    os.makedirs(os.path.join(HERE, "out", group), exist_ok=True)
    src = os.path.join(HERE, "pages", name + ".html")
    with open(src, "w", encoding="utf-8") as f:
        f.write(html)
    out = os.path.join(HERE, "out", group, name + ".png")
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=2",
                    f"--window-size={w},{h}", "--virtual-time-budget=3000", f"--screenshot={out}",
                    "file:///" + src.replace("\\", "/")], check=True, capture_output=True)
    print(out)


if __name__ == "__main__":
    for n in (sys.argv[1:] or list(SLIDES)):
        render(n)
