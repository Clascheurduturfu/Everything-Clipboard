# Hyperframes Composition Brief: Everything Clipboard

## Objective
Create a short launch-style brag video for Everything Clipboard.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1280x720
- Duration: 18 seconds

## Source Material
- Project root: `C:\Users\jouan\Documents\GitHub\ClipSync`
- Primary files read: `website/src/app/page.tsx`, `website/src/app/globals.css`, `README.md`
- Product name: Everything Clipboard
- Tagline / strongest claim: Sync at the speed of thought.
- Key UI or visual moment to recreate: The glass-card styling and orbiting device icons. The core cross-platform copy/paste flow.
- Copy that must appear verbatim:
  - "One Clipboard. All Your Devices."
  - "Sync at the speed of thought."
  - "End-to-End Encrypted."
  - "Zero-Knowledge"

## Creative Direction
- Tone preset: app-store
- Creative direction: smooth, sleek, privacy-focused utility ad
- Interpretation: Clean sliding reveals, polished UI glass-card drops, confident and snappy pacing.
- Angle: Syncing at the speed of thought. A secure, self-hosted clipboard that bridges Mac, Windows, and Android instantly without giving up your data to the cloud.
- Hook: "One Clipboard. All Your Devices." (first 4s)
- Outro / punchline: "Everything Clipboard" framed by the 4 OS icons (last 4s)
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals (use the blob/aura aesthetic from globals.css instead)
  - Unrelated visual redesign

## Visual Identity
- Background: `#020617` (slate-950) with blue/purple aura blobs (`#2563eb`/`#7c3aed`)
- Text: `#f1f5f9` (slate-100)
- Accent: Linear gradient `#2563eb` to `#7c3aed` (blue-600 to purple-600)
- Display font: Geist Sans
- Body font: Geist Mono
- Visual references from the project: 
  - `glass-card` CSS class (translucent white/slate-900 with blur)
  - Floating aura bubbles (background blur blobs)
  - The OrbitImages concept for OS support.

## Storyboard
Use the storyboard in `brag-output/brag-plan.md` as the creative contract.

Scene summary:
1. Hook — 4s — "One Clipboard. All Your Devices."
2. The Transfer Flow — 6s — Simulating Mac → Windows encrypted text transfer
3. Privacy — 4s — Shield icon and "Zero-Knowledge"
4. Outro — 4s — App Title + orbiting OS icons.

## Audio
- Audio role: sparse professional accents
- Audio arc: Confident synth start -> fast tech sounds in the middle -> resolving securely -> fade out.
- Music: polished corporate electronic bed (use a suitable default track or `ambient.mp3` if available).
- Music treatment: fade-in fast, maintain energy, clean resolve/fade at the end.
- Music cue guidance: detect at composition via `hyperframes beats`. Align major scene transitions (Scenes 2, 3, 4) to strong beats.
- Audio-reactive treatment: subtle; use music RMS to gently pulse the background aura blobs.
- Audio-coupled moments:
  - Scene 2 — simulated transfer (copy, whoosh, paste)
  - Scene 3 — lock/secure click on "Zero-Knowledge" reveal
- SFX selection guidance: clean UI pops, swooshes, clicks.
- SFX analysis guidance: use lower high-frequency-risk sounds for repeated or polished moments.
- Exact SFX choice: Hyperframes should choose filenames, timestamps, density, and volume based on the implemented animation.

## Hyperframes Instructions
Load the composition-building Hyperframes domain skills — `hyperframes-core`, `hyperframes-animation`, `hyperframes-creative`, `hyperframes-keyframes`, and `hyperframes-cli`. /brag is its own workflow: do not enter the `hyperframes` entry-point intent interview and do not route into its generic promo / launch-video workflow. Prefer native Hyperframes conventions over anything in `/brag`.

Requirements:
- Show at least one real UI, copy, or visual element from the source project (glass cards and OS icons).
- Keep all text readable in the final render.
- Keep the video within 15-25 seconds (target 18s).
- Include the planned music/SFX layer.
- Treat `/brag` audio notes as guidance. Choose SFX after the visual animation exists.
- Treat music cue metadata as optional timing hints. 
- Use SFX to support motion and interaction.
- Extract audio data and use RMS/frequency bands for subtle background aura blob pulse.
- Run `hyperframes check` before render.
