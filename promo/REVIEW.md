# Everything Clipboard promo — delivery note (2026-11-16)

## Deliverables (`promo/out/`)
| File | Format | Length |
|---|---|---|
| `everything-clipboard-40s-16x9.mp4` | 1920x1080, 30 fps | 40 s |
| `everything-clipboard-40s-9x16.mp4` | 1080x1920, 30 fps | 40 s |
| `everything-clipboard-20s-16x9.mp4` | 1920x1080, 30 fps | 20 s |
| `everything-clipboard-20s-9x16.mp4` | 1080x1920, 30 fps | 20 s |

Projects: `landscape/`, `vertical/`, `landscape20/`, `vertical20/` (HyperFrames, editable). Plan: `landscape/SPEC.md`,
storylines: `landscape/STORYLINES.md`.

## Creative calls
- Storyline A "Skip the inbox" (life before → after, one object across devices). B (one continuous take following a
  photo) and C (kinetic type cut on the beat) are written up, not built.
- Real footage: S26 Ultra screen recorded over adb on 2026-11-16 while this PC set the clipboard (text, then an image).
  Text and photo arrival frames are the real app receiving them; the flying text/photo is a graphic that lands on the
  real frame. Status bar cropped (personal notification icons); the device-name label "PC-BARNAB" is masked as
  "Windows PC" in-composition (`.mask` in the paste/photo scenes — delete it to show the raw label).
- Other platforms use the repo's real screenshots (`product image/`); `Android app.png` was skipped (pre-redesign UI).
- The sunset picture is an illustration rendered for the shoot (no stock/personal photos).
- Claims on screen all come from the site/README: 16 MB images, AES-256-GCM with your own key, local / self-hosted /
  hosted relay, $3 one-time with future updates, Windows/macOS/Android/iOS. No latency number is claimed.
- Music: bundled ende.app "Happy Beats / Business Moves vol. 1" (120 BPM), entering on Ctrl+C; Kenney CC0 SFX.
  Licence of the ende.app track should be confirmed before paid ads.

## Measured vs looked at
- `hyperframes check`: ok on all projects (warnings kept: product-UI chrome text under 28 px, the disabled grey Send
  button's contrast, overlapping price/Once hits — all intentional).
- Snapshots reviewed for every scene and every seam; vertical moved inside TikTok/Reels/Shorts title safe zones
  (the "iPhone" label still touches the TikTok right rail).
- Audio was measured, not heard. Loudness normalized to about -14 LUFS / -1.5 dBTP after render.

## Weakest shot / next
- Devices scene: five real UIs is dense; Windows tray and iPad screenshots are low-res. A fresh 2x capture of the
  Windows tray and macOS menu would sharpen it.
- With HeyGen sign-in, swap the bundled bed for a catalog track.
