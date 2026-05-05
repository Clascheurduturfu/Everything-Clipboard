import base64
import os
import json
import hashlib
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

STATIC_SALT = b"clipsync_static_salt_for_key_derivation"


def derive_key(secret: str) -> bytes:
    """Derive a 32-byte AES key from the user's secret string using PBKDF2."""
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=STATIC_SALT,
        iterations=200_000,
    )
    return kdf.derive(secret.encode("utf-8"))


def get_room_id(secret: str) -> str:
    """Hash the secret to create a room ID. Server never sees the actual secret."""
    return hashlib.sha256(secret.encode("utf-8")).hexdigest()


def encrypt_payload(device_name: str, content: str, key: bytes) -> str:
    """Encrypt a JSON payload containing device_name and content using AES-256-GCM."""
    aesgcm = AESGCM(key)
    iv = os.urandom(12)

    payload_dict = {"device_name": device_name, "content": content}
    plaintext = json.dumps(payload_dict, ensure_ascii=False)

    ciphertext = aesgcm.encrypt(iv, plaintext.encode("utf-8"), None)
    return base64.b64encode(iv + ciphertext).decode("utf-8")


def decrypt_payload(payload_b64: str, key: bytes) -> dict:
    """Decrypt a base64 AES-256-GCM payload back to a dict with device_name and content."""
    payload = base64.b64decode(payload_b64)
    iv = payload[:12]
    ciphertext = payload[12:]

    aesgcm = AESGCM(key)
    plaintext = aesgcm.decrypt(iv, ciphertext, None).decode("utf-8")
    return json.loads(plaintext)
