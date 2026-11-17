# Brag Plan: Everything Clipboard

## Planning rubric
1. App: Everything Clipboard (ClipSync in the native clients) synchronizes encrypted text clipboards across devices.
2. Strongest claim: "One Clipboard. All Your Devices."
3. Visual hook: the same clipboard note travels from a phone to a Windows desktop, against the site's dark slate and blue/violet identity.
4. Actual UI: the Android settings screen and Windows tray menu from `product image/`; both contain fictional example values and no personal data.
5. Shortest satisfying film: 20 seconds, with a complete copy-to-paste demonstration.
6. Tone: default, clean and playful; a small everyday action gets a confident product-film treatment.
7. Audio: steady warm electronic music, sparse low-risk clicks and soft impacts; no narration.
8. Share caption: I made Everything Clipboard. Copy on your phone, paste on your PC. Encrypted text sync, local or hosted, for $3 once.
9. Flow: connect native clients with matching settings, copy text on Android, receive on Windows, paste into a document. The copy/paste interaction is a staged demonstration using fictional text, not a recording of a live connection.

## Angle and hook
Your clipboard has places to be. A familiar text snippet leaves one device and lands on another. Show the outcome first, then the privacy and ownership options behind it.

## Format and identity
- Landscape, 1920 x 1080, 30 fps, 20 seconds.
- Background #020617, foreground #f1f5f9, secondary #94a3b8.
- Accents #60a5fa and #c084fc from the website's dark theme.
- Geist Sans and Geist Mono, shipped as local WOFF2 files from the existing Next.js dependency.
- Native logo and real product screenshots retained without visual recoloring.

## Storyboard
### 1. Places to be — 0.00–3.70 (3.70s)
Oversized headline "Your clipboard has places to be." A phone-shaped notes surface shows "Hello from Android!" A Copy button presses at 1.60s, followed by a Copied confirmation. Hold the completed headline for more than 2s.
Sequential/interaction: simulated Copy action; the note is fictional.
Audio: quiet click at Copy; warm music begins gently.
Transition: clean cut to the two-device demonstration.

### 2. Copy → paste — 3.70–10.00 (6.30s)
"Copy on Android. Paste on Windows." The fictional source note and a Windows destination sit across the frame. A single clipboard token travels between them; a Paste action lands at 5.80s and the identical text appears in the destination. The real Windows tray screenshot shows Connected and Last received text underneath. Hold the completed result through 9.6s.
Sequential/interaction: phone, destination, travelling token, paste confirmation.
Audio: soft reveal at 3.70; click and success accent at 5.80.
Transition: quick fade of inner content, followed by a clean privacy scene.

### 3. Private by design — 10.00–15.81 (5.81s)
"Your text. Your business." "End-to-End Encrypted" and "AES-256-GCM" are large readable supporting claims. The actual Android settings screenshot is shown at right. Local, Self-hosted, Hosted appear on every other music beat and then hold together.
Sequential/interaction: three hosting choices reveal at 11.06, 12.12, 13.18s; no invented app buttons.
Audio: one soft accent; music-supported product glow, no heavy pulse.
Transition: purposeful cut to the price and wordmark.

### 4. Once — 15.81–20.00 (4.19s)
Native logo with "Everything Clipboard". Giant "$3. Once." and "One Clipboard. All Your Devices." Public product URL: everything-clipboard.online. Final composition remains visible through the last frame.
Sequential/interaction: logo, price, tagline; full lockup settles before 17.3s.
Audio: restrained final soft impact, fade music down over the final 1.3s.

Total: 3.70 + 6.30 + 5.81 + 4.19 = 20.00s.

## Audio guidance
- Music: happy-beats-business-moves-vol-11-by-ende-dot-app.mp3, 114.84 BPM, first 20s.
- Music bed: volume 0.30, brief entrance fade and final fade.
- Bundled cue preset: `C:/Users/jouan/.agents/skills/brag/assets/music/cues/happy-beats-business-moves-vol-11-by-ende-dot-app.music-cues.json`.
- Strong cue locks: Copy at 1.60, flow reveal at 3.70, Paste at 5.80.
- Sequential text: every other beat at 11.06, 12.12, 13.18; final item holds over 2s.
- Subtle audio-reactive blue light behind the product; no waveform or equalizer.
- SFX: low-risk interface clicks and soft reveal accents, selected after motion exists.

## Review and delivery
Run the current HyperFrames check, inspect settled snapshots, and open the finished Studio timeline for review. The HyperFrames CLI skill requires explicit final preview approval before MP4 rendering. After approval: render delivery quality, choose a settled poster, bake it into frame 0, verify 20s / 1080p / 30fps / audio, and deliver the MP4, poster, and caption.
