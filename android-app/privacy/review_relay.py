"""Isolated loopback relay + paired desktop for PrivacyFlowInstrumentation.

Only synthetic review text is used. Never configure real devices with this fixture secret.
"""
import asyncio
import base64
import hashlib
import json
import os

import websockets
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

SECRET = b'play-review-only-20261029'
ROOM = hashlib.sha256(SECRET).hexdigest()
KEY = hashlib.pbkdf2_hmac('sha256', SECRET, b'clipsync_static_salt_for_key_derivation', 200000, 32)
clients = set()


async def relay(socket):
    if socket.path != '/ws/' + ROOM:
        await socket.close()
        return
    clients.add(socket)
    try:
        async for text in socket:
            for peer in tuple(clients - {socket}):
                await peer.send(text)
    finally:
        clients.discard(socket)


def encrypt(text):
    iv = os.urandom(12)
    data = json.dumps({'v': 2, 'device_name': 'Review desktop', 'content': text}).encode()
    return base64.b64encode(iv + AESGCM(KEY).encrypt(iv, data, None)).decode()


async def desktop():
    async with websockets.connect('ws://127.0.0.1:8769/ws/' + ROOM) as socket:
        replied = False
        async for message in socket:
            raw = base64.b64decode(message)
            payload = json.loads(AESGCM(KEY).decrypt(raw[:12], raw[12:], None))
            if payload.get('device_name') == 'Review Android' and not replied:
                replied = True
                print('PASS: paired desktop decrypted synthetic Android transfer', flush=True)
                await socket.send(encrypt('Desktop to Android review'))
                await asyncio.sleep(8)
                await socket.send(encrypt('Background receipt review'))
                print('PASS: paired desktop sent foreground/background replies', flush=True)


async def main():
    async with websockets.serve(relay, '127.0.0.1', 8769):
        print('Review relay ready on 127.0.0.1:8769; emulator uses 10.0.2.2', flush=True)
        await desktop()


if __name__ == '__main__':
    asyncio.run(main())
