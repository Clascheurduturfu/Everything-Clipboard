# Store and website visuals (2026-11-16)

All product UI is real: ClipSync 2.0-rc.6 captured on Windows (Preferences at 2x/2.4x), macOS (your screenshots,
cropped to the window/menu), Android (S26 Ultra over adb), iPhone 18 Pro Max and iPad Air 13" (iOS Simulator, fresh
devices not signed in to any Apple Account). Received clips were sent from a staging script as device "Windows PC",
so no personal device names appear. Status bars on Android are a clean 9:41 bar drawn over the cropped capture.

Regenerate: `python make.py [name ...]` (headless Chrome, 2x). Pages land in `pages/`, PNGs in `out/`.

## Google Play (`out/play/`)
| File | Use |
|---|---|
| `feature-graphic-1024x500.png` | Feature graphic (required, 1024x500, no alpha) |
| `play-1-text.png` … `play-6-devices.png` | Phone screenshots, 1080x1920, in this order |
| Promo video | Upload `../out/everything-clipboard-20s-16x9.mp4` (or 40s) to YouTube, paste the URL |

Order: 1 Copy on your PC / Paste on your phone, 2 Photos too, 3 Your key, 4 Encrypted before it leaves,
5 Your relay or ours, 6 All your devices. No prices in the images (Play discourages them).

## Microsoft Store (`out/msstore/`)
| File | Use |
|---|---|
| `ms-1-text.png` … `ms-6-general.png` | Desktop screenshots, 3840x2160 PNG, in this order |
| `trailer-40s-1920x1080.mp4` | Trailer (MP4, 1920x1080) |
| `trailer-thumbnail-1920x1080.png` | Trailer thumbnail |

## Website
- Hero: `website/public/hero/hero-loop.{webm,mp4}` + poster (source project: `promo/hero/`).
- "Native Apps" gallery: `website/public/apps/*.webp`. Full-size sources: `promo/website-shots/`.
- `product image/` and the legacy `website/public/* app.png` files now hold the new screenshots
  (`MacOs app.png` is still the Stripe checkout product image).

## Before submitting
- The apps call themselves "ClipSync"; the listings say "Everything Clipboard". Pick one name for the store builds.
- The Microsoft Store build should probably hide "Check for updates" and the preview channel toggle
  (`ms-6-general.png` shows them), since the Store handles updates.
