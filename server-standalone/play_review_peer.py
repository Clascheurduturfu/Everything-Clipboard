"""Synthetic, isolated peer for Google Play reviewers. Never uses a personal room.

The private JSON config supplies relay_url and a dedicated review-only secret.
Only synthetic acknowledgements are sent. Received content is not logged or saved.
"""
import asyncio
import base64
import hashlib
import json
import os
import sys
import time
import uuid
from pathlib import Path

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from websockets.asyncio.client import connect


async def run(config):
    secret = config['secret'].encode()
    key = hashlib.pbkdf2_hmac('sha256', secret, b'clipsync_static_salt_for_key_derivation', 200000, 32)
    room = hashlib.sha256(secret).hexdigest()
    url = config['relay_url'].rstrip('/') + '/ws/' + room

    def encrypted(text):
        payload = json.dumps({'v': 2, 'id': uuid.uuid4().hex,
                              'device_name': 'ClipSync review peer', 'content': text}).encode()
        iv = os.urandom(12)
        return base64.b64encode(iv + AESGCM(key).encrypt(iv, payload, None)).decode()

    while True:
        try:
            async with connect(url, max_size=1024 * 1024, ping_interval=20) as socket:
                print('Review peer connected; payload logging disabled', flush=True)
                chunks = {}

                async def samples():
                    while True:
                        await socket.send(encrypted('ClipSync review: encrypted receiving is working. Use synthetic text only.'))
                        await asyncio.sleep(15)

                async def receive():
                    async for frame in socket:
                        if not isinstance(frame, str):
                            continue
                        if frame.startswith('cs_chunk:v1:'):
                            try:
                                _, _, message_id, index, count, fragment = frame.split(':', 5)
                                index, count = int(index), int(count)
                                if not 1 <= count <= 64 or not 0 <= index < count:
                                    continue
                                now = time.monotonic()
                                chunks_copy = list(chunks.items())
                                for identifier, state in chunks_copy:
                                    if now - state['created'] > 90:
                                        chunks.pop(identifier, None)
                                if message_id not in chunks:
                                    if len(chunks) >= 2:
                                        continue
                                    chunks[message_id] = {'created': now, 'parts': {}, 'count': count}
                                state = chunks[message_id]
                                if state['count'] != count:
                                    continue
                                state['parts'][index] = fragment
                                if len(state['parts']) != count:
                                    continue
                                frame = ''.join(state['parts'][i] for i in range(count))
                                chunks.pop(message_id, None)
                            except (ValueError, KeyError):
                                continue
                        try:
                            raw = base64.b64decode(frame, validate=True)
                            decoded = json.loads(AESGCM(key).decrypt(raw[:12], raw[12:], None))
                            if decoded.get('device_name') == 'ClipSync review peer':
                                continue
                            kind = 'image' if decoded.get('type') == 'image' else 'text'
                            await socket.send(encrypted(f'ClipSync review: encrypted {kind} transfer received.'))
                            del decoded, raw
                        except Exception:
                            # No packet content, room ID, URL or exception text in logs.
                            continue

                tasks = [asyncio.create_task(samples()), asyncio.create_task(receive())]
                try:
                    await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
                finally:
                    for task in tasks:
                        task.cancel()
                    await asyncio.gather(*tasks, return_exceptions=True)
        except Exception:
            print('Review peer disconnected; reconnecting without payload logs', flush=True)
        await asyncio.sleep(10)


if __name__ == '__main__':
    asyncio.run(run(json.loads(Path(sys.argv[1]).read_text())))
