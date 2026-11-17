# Everything Clipboard launch video

Created with the brag workflow and HyperFrames 0.8.142. Final preview was approved for rendering in chat on 2026-10-08.

## Deliverables
- `brag.mp4`: 20 seconds, 1920 x 1080, 30 fps, H.264 + AAC, 3,271,592 bytes. Includes music and sparse SFX, without narration.
- `brag.jpg`: settled copy/paste scene at 6.6 seconds, also baked into video frame 0.
- `share-copy.txt`: ready-to-use launch caption.
- `render-sheet.jpg`: four representative frames decoded from the MP4.
- `composition/`: editable project, local runtime, fonts, assets, and validation evidence.

The animation demonstrates fictional clipboard content alongside the actual Android settings and Windows tray screenshots. It is a staged product demonstration, not footage of a live synchronization test.

## Validation
HyperFrames check passed: zero runtime, layout, motion, or contrast errors. All 70 contrast checks passed. Six advisory lint warnings concern monolithic scene structure and repeated logo assets; they do not indicate visible defects. Motion assertions sampled the timeline at 300 points.

Final export contains exactly 600 video frames and 20.000000 seconds of video/audio. Full FFmpeg decode completed without errors. Poster replacement retained duration, frame count, frame rate, dimensions, and the original encoded audio stream hash. Extracted frame zero matches the selected poster (39.10 dB PSNR after H.264 encoding). Settled frames were inspected after export. The Studio preview server and render workers were closed after completion.

## Edit or render again
Run from `composition/`:

```powershell
npm run check
npx --yes hyperframes@0.8.142 preview --background --port 3129
```

Studio URL: `http://localhost:3129/#project/composition`. After approving the final preview:

```powershell
npm run render -- --quality delivery --fps 30 --output ../brag.mp4
npx --yes hyperframes@0.8.142 preview --stop
```

A fresh render does not include the frame-zero poster replacement. The poster can be re-extracted at 6.6 seconds and applied using the brag skill's delivery instructions.

## Assets
- Product logo and native app screenshots: existing ClipSync repository assets.
- Geist and Geist Mono: existing Next.js local WOFF2 assets.
- Music: bundled brag track, "Happy Beats / Business Moves vol. 11" by ende.app.
- SFX: Kenney CC0 interface click and soft impact from the brag bundle.
- Motion: adapted installed `line-by-line-slide` and `browser-device-stage` registry primitives.

The app's source code was not modified and no commit was created. Previous brag output directories were preserved.
