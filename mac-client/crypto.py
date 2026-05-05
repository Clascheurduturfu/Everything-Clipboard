import base64
import os
import json
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

STATIC_SALT = b"clipsync_static_salt_for_key_derivation"

def derive_key(secret: str) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=STATIC_SALT,
        iterations=200_000,
    )
    return kdf.derive(secret.encode('utf-8'))

def encrypt_payload(device_name: str, content: str, key: bytes) -> str:
    aesgcm = AESGCM(key)
    iv = os.urandom(12)
    
    # Pack device name and clipboard content into JSON
    payload_dict = {"device_name": device_name, "content": content}
    plaintext = json.dumps(payload_dict)
    
    ciphertext = aesgcm.encrypt(iv, plaintext.encode('utf-8'), None)
    payload = iv + ciphertext
    return base64.b64encode(payload).decode('utf-8')

def decrypt_payload(payload_b64: str, key: bytes) -> dict:
    payload = base64.b64decode(payload_b64)
    iv = payload[:12]
    ciphertext = payload[12:]
    
    aesgcm = AESGCM(key)
    plaintext = aesgcm.decrypt(iv, ciphertext, None).decode('utf-8')
    return json.loads(plaintext)
