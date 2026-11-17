# HyperFrames Composition Brief: Everything Clipboard

## Objective
Create a polished 20-second launch video for Everything Clipboard (ClipSync), showing a real clipboard update arrive on a phone and appear in the Mac tray menu.

## Output
- Composition directory: brag-output-2026-09-23-225619/composition/
- Rendered video: brag-output-2026-09-23-225619/brag.mp4
- Format: landscape — 1920x1080
- Duration: 20 seconds

## Source Material
- Project root: current ClipSync workspace.
- Primary files read: website/src/app/page.tsx, website/src/app/features/page.tsx, website/src/app/globals.css, website/src/app/layout.tsx, and README.md.
- Product name: Everything Clipboard (ClipSync).
- Tagline / strongest claim: “One Clipboard. All Your Devices.”
- Key UI moment: the iOS Connected/Clipboard Sync screen and the macOS tray menu's Last row, both showing the same sample update.
- Copy that must appear verbatim:
  - “One Clipboard.”
  - “All Your Devices.”
  - “Buy for $3” (adapt to concise end-card “$3 once”; the site explicitly says one-time payment.)
  - “Copy here. Paste anywhere.” (short adaptation of the landing page's cross-device copy/paste message)

## Creative Direction
- Tone preset: polished
- Creative direction: a quiet, confident product film about a small everyday shortcut.
- Interpretation: smooth, measured reveals and clean cuts; let the genuine UI carry the proof, with no narration or exaggerated claims.
- Angle: one clipboard item travels from the real iOS screen to the real macOS menu. End on the current product name, platforms, and $3 one-time price.
- Hook: “One Clipboard. All Your Devices.” over an immediate paired phone-and-desktop UI reveal.
- Outro / punchline: “Everything Clipboard — Copy here. Paste anywhere. $3 once.”
- Avoid:
  - Generic SaaS language.
  - Abstract filler visuals or invented product claims.
  - Unrelated visual redesign.
  - Any real secrets, credentials, customer data, or non-public endpoints in the UI.

## Visual Identity
- Background: #020617 (site dark mode)
- Text: #f1f5f9; supporting text #94a3b8
- Accent: site gradient #2563eb to #7c3aed, with teal drawn from the app's copy action.
- Display font: Geist Sans if locally available; otherwise use a neutral installed sans-serif.
- Body font: Geist Mono if locally available; otherwise use a neutral monospace.
- Visual references: the site’s dark glass card, the supplied iOS and macOS app screenshots, and the blue/teal action buttons.

## Storyboard
Use the storyboard in brag-output-2026-09-23-225619/brag-plan.md as the creative contract.

Scene summary:
1. One clipboard — 3.2s — hook and paired authentic iOS/macOS surfaces.
2. On the phone — 5.0s — connected iOS screen; sample clipboard item receives focus.
3. Ready on the Mac — 6.0s — authentic menu highlights the matching sample item.
4. Everywhere — 5.8s — actual Android, iOS, Windows, macOS UI surfaces; name, short tagline, and $3 one-time price.

## Audio
- Audio role: warm, restrained music bed with sparse UI accents.
- Audio arc: ease in, support the phone-to-desktop handoff, fade beneath the closing identity.
- Music: happy-beats-business-moves-vol-11-by-ende-dot-app.mp3
- Music treatment: low volume; ease in over 0.8s; fade out under the last identity hold.
- Music cue guidance: bundled preset happy-beats-business-moves-vol-11-by-ende-dot-app.music-cues.json. Suggested cue locks: 3.70s phone UI, 8.96s desktop proof, 17.91s brand close. Beat grid is about 0.52s. Cue times are hints; readability takes priority.
- Audio-reactive treatment: subtle response in the existing background warmth using pre-extracted audio data; no waveform/visualizer.
- Audio-coupled moments:
  - Phone action and connected-state highlight — one quiet tap.
  - Mac Last row — one soft, low-risk arrival accent.
  - Wordmark landing — light finishing accent.
- SFX selection guidance: follow the brag skill's sfx-analysis.md; prefer low-risk UI and impact sounds.
- Exact SFX choice: choose filenames, timestamps, and levels to match the implemented motion.
- Audio files: copy planned music and selected SFX into composition/assets/.

## HyperFrames Instructions
Use the loaded HyperFrames skills and current CLI. Keep a single standalone composition, real UI assets, readable typography, seek-safe animation, and a gently moving brand background. Use the discovered registry device-splay component where appropriate; tune it to the actual device images. Run npx hyperframes check before preview. Do not render until the user approves the final preview.
