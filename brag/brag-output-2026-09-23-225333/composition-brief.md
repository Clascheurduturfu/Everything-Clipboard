# Hyperframes Composition Brief: Everything Clipboard

## Objective
Create a short launch-style brag video for Everything Clipboard (ClipSync) — told as a deadpan zero-knowledge security statement.

## Output
- Composition directory: `brag-output-2026-09-23-225333/composition/`
- Rendered video: `brag-output-2026-09-23-225333/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 20.0 seconds

## Source Material
- Project root: `C:\Users\jouan\Documents\GitHub\ClipSync`
- Primary files read: `website/src/app/page.tsx`, `website/src/app/globals.css`, `website/src/app/layout.tsx`, `README.md`, `desktop-client/app.py`, product screenshots in `product image/` (described below; do not screenshot them — recreate the UI in HTML)
- Product name: Everything Clipboard (app/desktop tray name: ClipSync)
- Tagline / strongest claim: "One Clipboard. All Your Devices." / "The relay server only sees encrypted gibberish."
- Key UI or visual moment to recreate: the macOS tray dropdown from `product image/MacOs app.png` — a frosted dark vibrancy menu panel with thin dividers, exact strings below.
- Copy that must appear verbatim:
  - "We can't read your clipboard."
  - "We checked."
  - "Encrypted on your device. Gibberish everywhere else."
  - `Status: Connected`
  - `Last: "Hello from android !" from Android Phone`
  - `Host Mode: OFF`
  - "$3"
  - "Once. No subscriptions."
  - "Your devices see everything."
  - "Everything Clipboard"
  - "Android · iOS · iPadOS · Windows · macOS"
  - "everything-clipboard.online"

## Creative Direction
- Tone preset: `deadpan`
- Creative direction: "A zero-knowledge security ad where the server proudly knows nothing, and the $3 price is delivered like a classified fact."
- Interpretation: Calm pacing, long holds, one idea per scene, minimal motion. Typography is the personality: mono uppercase micro-labels (Geist Mono, tracking-widest) and huge light-weight display lines (Geist Sans, font-weight 300, tight tracking). Entrances are fast-in then dead-still holds. No camera flourishes, no bouncy easings, no confetti. Humor lands through silence and hold time.
- Angle: Zero-knowledge as a flex. The relay server is a "dumb relay" that only ever sees encrypted gibberish — the ad opens from the developers' side ("We can't read your clipboard. We checked."), shows the server's meaningless log, then flips to the user's side where the real macOS tray menu resolves `"Hello from android !"`. The price ($3, once) is stated like a fact, with zero exclamation marks.
- Hook: Dark screen, two typed lines: "We can't read your clipboard." — hold — "We checked."
- Outro / punchline: "$3" huge and still; "Once. No subscriptions." beneath; logo, wordmark, platform row, domain. Music fades.
- Avoid:
  - Generic SaaS language ("streamline your workflow" etc.)
  - Abstract filler visuals, particles, waveforms
  - Unrelated visual redesign — use the project's slate/glass identity
  - Any motion that reads as "excited": no bounces, no swells, no strobing

## Visual Identity
- Background: `#020617` (slate-950) with very subtle blurred ambient glow blobs (`rgba` blue `#1e3a8a`-ish at low opacity, top-left and bottom-right, large blur) — echo of the site's aura blobs. Keep them dim; deadpan means near-dark.
- Text: `#f1f5f9` (slate-100) primary, `#94a3b8` (slate-400) secondary, `#64748b` (slate-500) tertiary
- Accent: gradient `#2563eb → #7c3aed` (use sparingly — maybe not at all except logo board gradients); status green `#10b981` (emerald-500) for the Connected dot / highlight wash
- Display font: Geist Sans, weight 300, `letter-spacing: -0.02em to -0.04em` (fallback: Inter/system sans if Geist unavailable — Hyperframes' call)
- Body/mono font: Geist Mono (fallback: any clean mono), used uppercase `letter-spacing: 0.2em+` for micro-labels
- Visual references from the project:
  - Glass cards: `rgba(255,255,255,0.05)` fill, `1px solid rgba(255,255,255,0.1)` border, radius 1.25–2rem, shadow `0 20px 40px -10px rgba(0,0,0,0.5)`
  - macOS tray menu: frosted dark panel (`rgba(30,35,45,0.85)` + `backdrop-blur`), ~13px system-like text, thin `rgba(255,255,255,0.08)` dividers, small clipboard glyph in the menu bar
  - Logo: two overlapping rounded clipboard boards — left gradient blue→cyan (`#2563eb → #22d3ee`), right gradient green (`#16a34a → #4ade80`), bold white bidirectional sync arrows crossing the center. Recreate in SVG, simple and crisp.

## Storyboard
Use the storyboard in `brag-output-2026-09-23-225333/brag-plan.md` as the creative contract. Full scene detail, timing, SFX intent, and audio-coupled moments live there.

Scene summary:
1. "The claim" — 4.0s — two typed lines: "We can't read your clipboard." then "We checked."; mono micro-label top-left "EVERYTHING CLIPBOARD — SECURITY STATEMENT"
2. "The gibberish" — 5.2s — frosted terminal panel "RELAY SERVER — LIVE", 3 log lines print one by one (room hash, encrypted payload JSON with synthetic base64, `forwarded ✓`), caption "Encrypted on your device. Gibberish everywhere else."; small emerald `AES-256-GCM` pill
3. "The payoff — the real tray menu" — 6.4s — macOS menu bar + ClipSync tray menu drops (verbatim: `ClipSync v1.0.2`, `Status: Connected`, `Last: "Hello from android !" from Android Phone`, `Preferences…`, `Host Mode: OFF`, `Disconnect`, `Quit`); at ~12.55s the Last row highlights with an emerald dot/wash; caption "Your devices see everything."
4. "The punchline" — 4.4s — "$3" enormous fast-in then dead still; "Once. No subscriptions." beneath; then logo + "Everything Clipboard" + platform row + "everything-clipboard.online"; music fades out

## Audio
- Audio role: sparse professional accents over a very low, restrained music bed — deadpan posture
- Audio arc: quiet bed fades in over ~1.5s and carries the whole piece at an almost-room-tone level; ~5 dry low-key accents mark product moments (key ticks, terminal ticks, tray thud, highlight ding, $3 felt impact); bed fades under the final identity block; ends calm
- Music: `happy-beats-business-moves-vol-12-by-ende-dot-app.mp3` (copied to `composition/assets/music/`)
- Music treatment: `data-volume` ≈ 0.14 (deadpan range 0.12–0.18, never above 0.5); fade-in 0–1.5s; fade-out ~18.6–20.0s. No ducking, no swells.
- Music cue guidance: bundled preset `C:\Users\jouan\.agents\skills\brag\assets\music\cues\happy-beats-business-moves-vol-12-by-ende-dot-app.music-cues.json` — copy it to `composition/assets/music/cues/`. Tempo 109.96 BPM, beat step ≈ 0.55s. Strong cues in window: 8.74, 9.29, 10.93, 13.11, 17.47, 18.56, 19.66. Suggested locks: tray menu drop ≈ 9.29 (strong-cue lock #1), identity block ≈ 18.56 (strong-cue lock #2). Smaller entrances near beats: log panel ≈ 4.39, Last-row highlight ≈ 12.55, "$3" ≈ 15.84, "Once." ≈ 18.02. Optional only — ignore any cue that hurts readability/pacing. Do NOT snap the 3 log lines to consecutive beats (deadpan cadence ~0.9s apart; reading floor wins).
- Audio-reactive treatment: none — deadpan stillness. Do not add RMS-driven motion. If a tiny ambient glow breathing is trivial to add, it must be nearly imperceptible; otherwise skip.
- Audio-coupled moments:
  - Scene 1 typed lines — per-character typing with soft randomized `keyboard/keypress-*.wav` ticks (quiet, ~0.35 vol), thinned if it clutters
  - Scene 2 log lines — tiny terminal tick per line arrival (e.g. `interface/click_003`-like or `ui/click` at low volume, quieter than scene 1 ticks)
  - Scene 3 tray menu drop ≈ 9.29s — one muted low thud (`impact/impactSoft_medium_000` at modest volume)
  - Scene 3 Last-row highlight ≈ 12.55s — one dry low ding (`impact/impactMetal_light_002/003` or `interface/bong_001` very quiet)
  - Scene 4 "$3" ≈ 15.84s — soft felt impact (`impact/impactSoft_heavy` at low volume); nothing on the logo
- SFX selection guidance: match the visible action; all dry, no reverb, no risers/whooshes; deadpan = very sparse (tone table says 1–2 dry cues minimum, ~5 small ones max here)
- SFX analysis guidance: `C:\Users\jouan\.agents\skills\brag\assets\sfx\sfx-analysis.md` — prefer low/medium high-frequency-risk files; these cues are small and repeated, so keep HF risk low
- Exact SFX choice: Hyperframes decides filenames, timestamps, density, and volume based on the implemented animation (within the volume policy above).
- Audio files: music copied to `composition/assets/music/`; SFX files Hyperframes selects must be copied into `composition/assets/sfx/**` (relative paths only in HTML)

## Hyperframes Instructions
Load the composition-building Hyperframes domain skills — `hyperframes-core` (composition contract + `data-*` timing), `hyperframes-animation` (motion), `hyperframes-creative` (design spec, beats, audio-reactive), `hyperframes-keyframes` (seek-safe keyframes), and `hyperframes-cli` (lint/check/render). /brag is its own workflow: do not enter the `hyperframes` entry-point intent interview and do not route into its generic promo / launch-video workflow. Prefer native Hyperframes conventions over anything in `/brag`.

Requirements:
- Show at least one real UI, copy, or visual element from the source project — the macOS tray menu recreation with verbatim strings is the centerpiece (scene 3).
- Keep all text readable in the final render; every line holds past its reading floor (short label ≥0.8s settled; sentence ≈0.3s/word).
- Keep the video within 15-25 seconds (target exactly 20.0s).
- Include the planned music/SFX layer as specified above.
- Treat `/brag` audio notes as guidance, not a fixed cue sheet. Choose SFX after the visual animation exists.
- Treat music cue metadata as optional timing hints. Use 1-3 strong cue locks max; ignore cues that hurt readability, scene pacing, or the product story.
- Use SFX to support motion and interaction; restraint is the aesthetic — when in doubt, cut the cue.
- Honor the fade-in/fade-out music treatment.
- Audio-reactive treatment is intentionally `none` (deadpan); do not add waveform/equalizer/pulse visuals.
- Use local assets for audio and any required runtime/media dependencies.
- Run `hyperframes check` before render — it is brag's single gate. Render to `brag-output-2026-09-23-225333/brag.mp4` (1920x1080, 20.0s).
- No real user data, tokens, hostnames, or personal data on screen — the base64 payload strings are synthetic fictional stand-ins; URLs limited to the public marketing domain `everything-clipboard.online`.
