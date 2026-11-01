"""Generate the public page and offline Android policy from one reviewed source."""
import html
import json
from pathlib import Path

base = Path(__file__).resolve().parent
repo = base.parents[1]
policy = json.loads((base / 'policy.json').read_text(encoding='utf-8'))
text = '\n\n'.join([policy['title'], f"Updated {policy['date']} | Policy {policy['version']}"] +
                     [f'{title}\n{body}' for title, body in policy['sections']])
raw = repo / 'android-app/app/src/main/res/raw'
raw.mkdir(parents=True, exist_ok=True)
(raw / 'privacy_policy.txt').write_text(text + '\n', encoding='utf-8')
sections = '\n'.join(f'<section><h2>{html.escape(title)}</h2><p>{html.escape(body)}</p></section>'
                     for title, body in policy['sections'])
page = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="Privacy policy for ClipSync Android clipboard synchronization.">
<title>{policy['title']}</title><link rel="stylesheet" href="/clipsync-privacy.css"></head>
<body><main><nav><a href="/privacy.html">Website privacy</a><a href="/">Everything home</a></nav>
<p class="eyebrow">CLIPSYNC · ANDROID</p><h1>{policy['title']}</h1>
<p class="updated">Updated {policy['date']} · Policy {policy['version']}</p>
{sections}
<section><h2>Provider privacy information</h2><p><a href="https://www.oracle.com/legal/privacy/">Oracle privacy</a> · <a href="https://www.cloudflare.com/privacypolicy/">Cloudflare privacy</a></p></section>
<footer><a href="mailto:support@everything-clipboard.online">support@everything-clipboard.online</a><p>ClipSync · Android package com.clipsync</p></footer>
</main></body></html>'''
(repo / 'website/public/clipsync-privacy.html').write_text(page + '\n', encoding='utf-8')
