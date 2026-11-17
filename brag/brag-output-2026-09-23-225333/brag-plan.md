# Brag Plan: Everything Clipboard

## What is this app?
Everything Clipboard (ClipSync) copies text on one device and makes it instantly pasteable on all your others — Android, iOS, iPadOS, Windows, macOS — through an AES-256-GCM encrypted relay that is architecturally incapable of reading the content.

## The angle
Zero-knowledge as a flex. The relay server is a "dumb relay" (their README's words) that only ever sees encrypted gibberish — so the ad is told as a dry security statement from the developers' side: "We can't read your clipboard. We checked." Then the payoff flips to the user's side: the real macOS tray menu showing `Last: "Hello from android !" from Android Phone`. The joke is that nothing is a joke — the most boring-sounding claim (the server sees nothing) is the whole product, and it costs $3. Once.

## Hook (first 2-3 seconds)
Dark screen, mono type: "We can't read your clipboard." — hold — "We checked." Two dry lines, no motion ornament, deadpan confidence. It earns the next 16 seconds by being an impossible thing for a clipboard-sync company to say.

## Key moments (the middle)
- The relay server log panel: room hash + real-shaped encrypted payload JSON lines arriving one by one, captioned "Encrypted on your device. Gibberish everywhere else."
- The real macOS tray menu dropping: `Status: Connected` / `Last: "Hello from android !" from Android Phone` / `Host Mode: OFF` — the Last row highlights as the text resolves, caption "Your devices see everything."
- The price reveal: "$3." then "Once. No subscriptions."

## Outro / punchline
"$3." — huge, held. "Once." beneath it. Then the logo, "Everything Clipboard", platform row "Android · iOS · iPadOS · Windows · macOS", and "everything-clipboard.online". No exclamation marks anywhere. The restraint IS the punchline.

## User flow worth showing
- Beat 1 (Key action): The payload view — clipboard text encrypted client-side into base64 gibberish before it ever leaves the device (AES-256-GCM), relayed untouched.
- Beat 2 (Result, desktop): macOS menu bar → ClipSync tray menu drops: `Status: Connected`, then `Last: "Hello from android !" from Android Phone` resolves/highlights.
- Beat 3 (Result implied): the same text now sitting in the clipboard of every device — one tap from paste.

## Tone
- Preset: `deadpan`
- Creative direction: "A zero-knowledge security ad where the server proudly knows nothing, and the $3 price is delivered like a classified fact."
- Interpretation: Calm pacing, long holds, one idea per scene, minimal motion, no camera flourishes. Typography is the personality: mono uppercase micro-labels, huge light-weight display lines. Humor lands through silence and hold time, never through motion.

## Format: landscape — 1920x1080
## Duration: 21.0 seconds (scene 4 gets +1.0s over the 20.0 draft so the final lockup holds ~2.4s; still in the 18–22s sweet spot)

## Visual identity (from the project)
- Background: `#020617` (slate-950, the site's dark mode base) with very subtle blue/sky ambient glow blobs (site uses `bg-blue-900/40`, `bg-sky-900/30` blurred circles)
- Text: `#f1f5f9` (slate-100), secondary `#94a3b8` (slate-400)
- Accent: gradient `#2563eb → #7c3aed` (blue-600 → violet-600); dark-mode variant `#60a5fa → #c084fc`
- Status green: `#10b981` (emerald-500 — used for Connected/encryption badges on the site)
- Display font: Geist Sans (light weight, tight tracking for big lines; the site hero is `font-light tracking-[-0.04em]`)
- Body/mono font: Geist Mono (the site's badge style: uppercase, tracking-widest, small)
- Card style: frosted glass — `rgba(255,255,255,0.05)` fill, `1px solid rgba(255,255,255,0.1)` border, `border-radius: 1.25–2rem`, soft `0 20px 40px -10px rgba(0,0,0,0.5)` shadow
- Strongest visual element: the macOS frosted tray dropdown from `MacOs app.png` (translucent vibrancy panel, thin dividers) and the site's glass cards

## Share copy (draft)
We built a clipboard-sync server that can't read your clipboard. It only ever sees AES-256-GCM gibberish. Your devices see everything. $3. Once. https://everything-clipboard.online

## Audio direction
- Role: low, restrained music bed with sparse, dry, motion-matched accents — deadpan posture
- Music: `happy-beats-business-moves-vol-12-by-ende-dot-app.mp3` (109.96 BPM, 117.4s — the audio guide's deadpan pick, "steady and clean"). Very low volume posture (0.14), slow fade-in over the first ~1.5s, gentle fade-out under the final logo hold.
- Music treatment: Bed carries continuity only. No swells during text; the mix must feel like a quiet room, not an ad.
- Music cue guidance: Preset read (vol-12). Beat grid step ≈ 0.55s. Strong cues in window: 8.74, 9.29, 10.93, 13.11, 17.47, 18.56, 19.66. Mapping: scene 2 log panel entry ≈ 4.39 (beat); scene 3 tray drop ≈ 9.29 (strong cue lock); Last-row highlight ≈ 12.55 (beat); "$3." impact ≈ 15.84 (beat); identity block ≈ 18.56 (strong cue lock). Restraint note: align only these majors; do NOT snap sequential log lines to every beat — deadpan holds beat sync at arm's length.
- Audio-reactive treatment: none. Deadpan means no visual breathing/pulsing to the music.
- SFX posture: sparse — at most 5 accents total: one soft key tick per typed line in scene 1, one low muted "thud" as the tray menu drops, one dry "ding" (low-passed, small) as the Last row highlights green, one soft felt impact on "$3.", nothing on the logo. All dry, no reverb tails, no whooshes.
- Audio-coupled moments: typed lines in scene 1 (type-on with subtle key ticks); log lines arriving one by one (tiny terminal tick each, quieter than scene 1); tray menu drop; green highlight ding; "$3." impact.
- Restraint rule: No risers, no whooshes, no swoosh transitions, no bass drops. If any cue would feel "excited", cut it. Music never ducks or swells for text.

## Storyboard

### Scene 1 — "The claim" — 4.0s
Near-black slate background (#020617) with the faintest blue aura glow top-left. Two lines of large light-weight Geist Sans, centered left-ish, type on:
"We can't read your clipboard." (types on 0.2–1.3s, settles by 1.6s — aligns near the 1.60s strong cue — holds to 2.8s)
then beneath, slightly smaller: "We checked." (appears 2.8s, holds to 4.0s)
Micro-label top-left in Geist Mono uppercase tracking-widest, slate-400: "EVERYTHING CLIPBOARD — SECURITY STATEMENT". No logo yet, no color pop yet. Pure type.
Sequential/interaction: yes — two lines type on one after the other (simulated typing).
Audio intent: quiet, assured; the room-tone feel of a confession.
Audio-coupled idea: type-on with subtle key ticks (2 lines).
Music: low bed fade-in, nothing else.
Transition mood: clean hard cut → Scene 2

### Scene 2 — "The gibberish" — 5.2s (4.0–9.2s)
A frosted-glass terminal panel (site's glass-card style, rounded-2rem) titled in mono uppercase: "RELAY SERVER — LIVE". Three log lines arrive one by one (slow, deadpan cadence, ~0.9s apart, NOT beat-snapped):
`> room  9f2c…a41b`
`> payload {"device_name": "cU9xdE…mQ==", "content": "xJ3fP2vQ…"}`
`> forwarded ✓`
Content is synthetic plausible base64 (fictional stand-ins — no real data). Lines are Geist Mono, slate-300, with the payload in slate-500 so it reads as texture, not text. Beneath the panel, one caption line (Geist Sans, slate-400, appears ~7.6s, holds): "Encrypted on your device. Gibberish everywhere else."
Optional micro-detail: a tiny emerald `AES-256-GCM` pill in the panel corner.
Sequential/interaction: yes — 3 log lines print one by one, each with a tiny terminal tick.
Audio intent: matter-of-fact, mechanical; the server is boring and proud.
Audio-coupled idea: terminal tick per line (quiet); no typing sounds here — printer-like cadence.
Music: bed only; panel entry may align near ~4.23–4.75 beats.
Transition mood: soft crossfade → Scene 3

### Scene 3 — "The payoff — the real tray menu" — 6.4s (9.2–15.6s)
A minimal macOS menu bar strip at top (dark, blurred) with a tiny clipboard icon. The actual ClipSync tray menu drops below it — recreate the real `MacOs app.png` menu faithfully:
`ClipSync v1.0.2` (dim, header)
`Status: Connected`
`Last: "Hello from android !" from Android Phone`
`Preferences…`
`Host Mode: OFF`
`Disconnect`  /  `Quit`
thin dividers, frosted dark vibrancy panel, small type. The menu drops in one piece at ~9.3s (one motion, then still). At ~12.55s the `Last:` row highlights — emerald dot + subtle green wash — as `"Hello from android !"` resolves to full readability. Caption bottom-left, appears ~13.6s, holds: "Your devices see everything."
This is the show-the-thing centerpiece: real strings, real hierarchy, real product.
Sequential/interaction: yes — menu drop (one piece), then a single-row highlight interaction.
Audio intent: the reveal of the whole premise — dry, satisfying, quiet.
Audio-coupled idea: muted thud on drop (≈9.29s strong cue), one low dry ding on the green highlight (≈12.55s beat).
Music: bed only.
Transition mood: soft crossfade → Scene 4

### Scene 4 — "The punchline" — 5.4s (15.6–21.0s)
Same background. Center: "$3" in enormous light Geist Sans (fast-in at ~15.84s, then dead still — fast-in plus long hold). At ~17.47s, beneath it: "Once. No subscriptions." small, slate-400. At ~18.56s the product identity fades in below, centered: the two-clipboard sync logo (recreate simply: two rounded clipboard boards, blue→cyan and green gradients, white bidirectional arrows), wordmark "Everything Clipboard", platform row "Android · iOS · iPadOS · Windows · macOS" (mono uppercase, slate-500), and "everything-clipboard.online" (slate-400). Identity block holds ~2.4s. Music fades 18.8–20.9s, ending on near-silence.
Sequential/interaction: yes — three arrivals in sequence ($3 → Once → identity block), each a fast-in + hold.
Audio intent: the price stated like a fact; end on calm.
Audio-coupled idea: soft felt impact on "$3" (≈15.84s beat), nothing else.
Music: bed fade-out under final hold.

**Music mood for this video:** deadpan — very low-volume restrained electronic bed, majors aligned at ~10.93s (tray drop) and ~18.56s (identity block); smaller accents near beats ~4.39s, ~12.55s, ~16.38s.
**Audio summary:** A quiet confident bed runs under the whole piece while ~5 dry, low-passed accents (key ticks, terminal ticks, thud, ding, felt impact) mark each product moment — no swells, no whooshes, silence does the comedy.

**Final timing (as composed, beat-mapped to the vol-12 cue preset):**
- Scene 1 — 0.00–4.00 — line 1 types 0.32–1.54, line 2 at 2.60
- Scene 2 — 4.00–10.50 — panel in at 4.39 (beat), log lines 5.0 / 5.75 / 6.5 / 7.25, caption 7.75 (~2.0s hold)
- Scene 3 — 10.50–15.85 — tray drop at 10.93 (strong-cue lock #1), Last-row highlight at 12.55 (beat), caption 13.6
- Scene 4 — 15.85–21.00 — "$3" at 16.38 (beat), "Once." at 17.47 (strong-cue lock #2), identity at 18.56 (strong-cue lock #3), music fades 18.8–20.9
- Scene windows sum to 21.0s; reading floors verified per line. The log JSON is printed on two lines (payload + content continuation), so all four log arrivals stay short and wrap-free.
