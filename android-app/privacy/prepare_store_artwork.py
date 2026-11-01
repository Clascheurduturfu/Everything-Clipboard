"""Render-ready SVG/HTML store artwork using the app's authored vector logo.

Browser screenshots turn these code-native assets into the required PNG sizes.
"""
from pathlib import Path
import html
import sys
import xml.etree.ElementTree as ET

repo = Path(__file__).resolve().parents[2]
output = Path(sys.argv[1]).resolve()
output.mkdir(parents=True, exist_ok=True)
namespace = '{http://schemas.android.com/apk/res/android}'
vector = ET.parse(repo / 'android-app/app/src/main/res/drawable/ic_launcher_foreground.xml').getroot()
paths = ''.join(f'<path fill="{html.escape(path.attrib[namespace + "fillColor"])}" '
                f'd="{html.escape(path.attrib[namespace + "pathData"])}"/>' for path in vector)
logo = f'<rect width="108" height="108" fill="#00C2A8"/>{paths}'
icon = f'<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 108 108">{logo}</svg>'
feature = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
<rect width="1024" height="500" fill="#0D1828"/>
<rect x="0" y="0" width="14" height="500" fill="#00C2A8"/>
<circle cx="994" cy="-20" r="245" fill="#122B40"/>
<circle cx="1020" cy="-30" r="180" fill="#16384A"/>
<g transform="translate(72 100) scale(2.65)">{logo}</g>
<g font-family="Arial,sans-serif" fill="#F7FBFF">
<text x="408" y="175" font-size="76" font-weight="700">ClipSync</text>
<text x="410" y="245" font-size="34">Your clipboard.</text>
<text x="410" y="292" font-size="34">Across your devices.</text>
<text x="410" y="354" font-size="17" letter-spacing="1.6" fill="#6EE2CE">TEXT · IMAGES · ENCRYPTED SYNC</text>
<text x="410" y="402" font-size="21" fill="#A7BED7">Android · Windows · macOS</text>
</g></svg>'''
for name, svg in [('icon', icon), ('feature', feature)]:
    page = '<!doctype html><html><head><meta charset="utf-8"><title>ClipSync ' + name + \
        '</title><style>html,body{margin:0;padding:0;overflow:hidden}svg{display:block}</style></head><body>' + svg + '</body></html>'
    (output / f'{name}.html').write_text(page, encoding='utf-8')

# Optional real test-recording frames, retained with the external delivery bundle.
# Preserve the complete app image; only add surrounding captions/background.
frames = [
    ('01-sync', 'Your clipboard, connected.', 'Send text between your personal devices.', 'connected.png'),
    ('02-consent', 'You choose when to sync.', 'Clear disclosure before clipboard access.', 'consent.png'),
    ('03-background', 'Keep receiving, visibly.', 'A foreground notification while sync runs.', 'notification.png'),
    ('04-privacy', 'Privacy controls in the app.', 'Read offline, stop sync and erase local settings.', 'privacy60.png'),
]
for name, title, subtitle, source in frames:
    if not (output / source).exists():
        continue
    page = f'''<!doctype html><html><head><meta charset="utf-8"><title>ClipSync {name}</title>
<style>html,body{{margin:0;width:1080px;height:1920px;overflow:hidden;background:#0d1828;color:#f7fbff;font-family:Arial,sans-serif}}
header{{height:250px;box-sizing:border-box;padding:58px 65px 25px}}h1{{font-size:43px;margin:0 0 20px}}
p{{font-size:25px;color:#a7bed7;margin:0}}img{{display:block;height:1600px;width:auto;margin:0 auto;border:2px solid #214252;border-radius:28px}}
footer{{text-align:center;font-size:23px;color:#6ee2ce;margin-top:22px}}</style></head><body>
<header><h1>{html.escape(title)}</h1><p>{html.escape(subtitle)}</p></header>
<img src="{source}" alt="Actual ClipSync Android screenshot"><footer>ClipSync · Android</footer></body></html>'''
    (output / f'{name}.html').write_text(page, encoding='utf-8')
