import base64
import os
import json
import hashlib
import uuid
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


# Payload v2 keeps text messages readable by v1 clients ({"device_name",
# "content"} plus fields they ignore). Image messages carry no "content", so
# v1 clients skip them instead of pasting garbage.
PAYLOAD_VERSION = 2


def _encrypt_dict(payload_dict: dict, key: bytes) -> str:
    aesgcm = AESGCM(key)
    iv = os.urandom(12)
    plaintext = json.dumps(payload_dict, ensure_ascii=False)

    ciphertext = aesgcm.encrypt(iv, plaintext.encode("utf-8"), None)
    return base64.b64encode(iv + ciphertext).decode("utf-8")


def encrypt_payload(device_name: str, content: str, key: bytes) -> str:
    """Encrypt a text clip using AES-256-GCM."""
    return _encrypt_dict(
        {"v": PAYLOAD_VERSION, "id": uuid.uuid4().hex, "device_name": device_name, "content": content},
        key,
    )


def encrypt_image_payload(device_name: str, data: bytes, mime: str, width: int, height: int, key: bytes) -> str:
    """Encrypt an image clip. *data* is the encoded image (PNG/JPEG/...)."""
    return _encrypt_dict(
        {
            "v": PAYLOAD_VERSION,
            "id": uuid.uuid4().hex,
            "device_name": device_name,
            "type": "image",
            "mime": mime,
            "data": base64.b64encode(data).decode("ascii"),
            "sha256": hashlib.sha256(data).hexdigest(),
            "w": width,
            "h": height,
        },
        key,
    )


def decode_image(payload: dict) -> bytes | None:
    """Image bytes from a decrypted image payload, or None if damaged."""
    try:
        data = base64.b64decode(payload["data"])
    except Exception:
        return None
    expected = payload.get("sha256")
    if expected and hashlib.sha256(data).hexdigest() != expected:
        return None
    return data


def decrypt_payload(payload_b64: str, key: bytes) -> dict:
    """Decrypt a base64 AES-256-GCM payload back to a dict with device_name and content."""
    payload = base64.b64decode(payload_b64)
    iv = payload[:12]
    ciphertext = payload[12:]

    aesgcm = AESGCM(key)
    plaintext = aesgcm.decrypt(iv, ciphertext, None).decode("utf-8")
    return json.loads(plaintext)
