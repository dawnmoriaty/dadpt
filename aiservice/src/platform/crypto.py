"""API Key encryption/decryption using Fernet symmetric encryption.

Uses ENCRYPTION_KEY from settings. All API keys stored in DB are encrypted.
"""

from __future__ import annotations

from cryptography.fernet import Fernet, InvalidToken

from src.config import get_settings


class ApiKeyCrypto:
    """Encrypt/decrypt API keys using Fernet (AES-128-CBC)."""

    def __init__(self, key: str) -> None:
        if not key:
            raise ValueError("ENCRYPTION_KEY is required for API key encryption")
        self._fernet = Fernet(key.encode() if isinstance(key, str) else key)

    def encrypt(self, plaintext: str) -> str:
        """Encrypt a plaintext API key → base64 ciphertext string."""
        return self._fernet.encrypt(plaintext.encode()).decode()

    def decrypt(self, ciphertext: str) -> str:
        """Decrypt a ciphertext string → plaintext API key.

        Raises:
            InvalidToken: if the ciphertext is invalid or the key is wrong.
        """
        try:
            return self._fernet.decrypt(ciphertext.encode()).decode()
        except InvalidToken:
            raise ValueError("Failed to decrypt API key — check ENCRYPTION_KEY")


# ── Singleton ───────────────────────────────────────────────────────────────
_crypto: ApiKeyCrypto | None = None


def get_crypto() -> ApiKeyCrypto:
    global _crypto
    if _crypto is None:
        settings = get_settings()
        _crypto = ApiKeyCrypto(settings.encryption_key)
    return _crypto
