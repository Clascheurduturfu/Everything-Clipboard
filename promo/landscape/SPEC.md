# SPEC — Everything Clipboard promo, 40 s landscape

GOAL:    the viewer thinks "I copy on my PC and it's just on my phone, encrypted, for $3 once" and visits everything-clipboard.com.
OUTPUT:  HyperFrames 1920 x 1080, 30 fps (siblings: vertical 1080 x 1920 40 s, landscape 20 s cut).
TIME:    40 s x 30 = 1200 frames. Music 120 BPM = 15 frames/beat, bar = 2 s. Music enters at 4.5 s
         (data-media-start 0.015 so beats land on 4.5 + 0.5k).
LOOK:    worlds — old way: #e8ecf2 ground, ink #0f172a; product: brand night #020617 with one
         off-centre radial of #0b1a3a (the site's own hero), ink #f1f5f9, secondary #94a3b8;
         privacy: teal flood #052e2b, ink #ecfeff, accent #5eead4.
         Accent = the site's text-gradient #60a5fa → #c084fc, on ONE word/line per scene.
         Display: Geist 600, 104-128 px, tracking -0.04em, max 2 lines. Body: Geist 400 34-40 px.
         Mono: Geist Mono 36-44 px for clip contents (the Wi-Fi line, ciphertext).
         Medium: real product UI — phone footage recorded over adb 2026-11-16 (S26 Ultra, ClipSync
         2.0-rc.6) and the repo's real Mac/Windows/iOS/iPad screenshots. Phone bezel #0b0d12, 16 px,
         radius 58 px. Shadow 0 40px 80px rgba(0,0,0,.45).
OBJECTS: compose window (To/Subject/body/attachment/Send), Notepad window, Photos window, keycaps
         (Ctrl, C) drawn as real keys with a 6 px bottom lip, phone with real footage, relay wire.
MOTION:  enter expo.out 0.5-0.7 s; camera power2.inOut 0.5 s; exit power3.in 0.3 s; springs
         back.out(1.3) on device landings only. Words stagger 0.07 s. Fast moves carry 8-16 px blur.
SHOTS:   0.0-4.5   inbox: email to self, Send, progress stalls at 34%, "Skip the inbox", zoom through
                   the Wi-Fi line (object becomes world).
         4.5-6.5   copy-text: Notepad, selection sweep, Ctrl+C (keys), music drops, line flies right.
         6.5-10.0  paste-text: real phone, text lands at 7.2 s, punch-in 1.75x on the card.
         10.0-15.0 photo: PC Photos window + phone side by side, Ctrl+C, photo flies into the phone,
                   real thumbnail lands at 12.0 s, punch-in.
         15.0-23.0 devices: Android centre, macOS / Windows / iPhone / iPad land on beats, then each
                   real "last received" line gets outlined — proof every device got a clip.
         23.0-31.0 private: teal flood, the Wi-Fi line scrambles to ciphertext across the relay and
                   decrypts at the phone; "Run it on [your Wi-Fi / your server / our relay]".
         31.0-40.0 end: "$3. Once." then the mark drops in, wordmark wipes, URL button, hold ≥ 2.5 s.
BANNED:  dark void with small floating UI; glow/orbs/particles; glass cards; three cards in a row;
         everything fading+sliding up; titles drifting after landing; corner labels/HUD; logo docked
         in a corner; any invented ClipSync UI (only real footage/screenshots claim to be the product);
         claimed latency numbers.
QA:      t=0 (thumbnail reads), 3.0, 5.2, 7.6, 12.4, 18.5, 21, 26, 29.5, 33, 38.5.
