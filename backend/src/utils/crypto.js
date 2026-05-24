import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;   // 96-bit IV recommended for GCM
const TAG_LENGTH = 16;  // 128-bit auth tag

const getKey = () => {
  const raw = process.env.ENCRYPTION_KEY || '';
  if (!raw) {
    console.warn('[Crypto] ENCRYPTION_KEY not set — messages will NOT be encrypted');
    return null;
  }
  // Accept a 64-char hex string (32 bytes) or any string we hash to 32 bytes
  const buf = Buffer.from(raw, 'hex');
  if (buf.length === 32) return buf;
  // Fallback: use first 32 bytes of UTF-8 (padded/sliced)
  return Buffer.from(raw.padEnd(32, '0').slice(0, 32), 'utf8');
};

/**
 * Encrypts a plaintext string.
 * Returns a single base64 string: iv:tag:ciphertext (all base64 parts joined by ':')
 * Returns original text unchanged if ENCRYPTION_KEY is not set.
 */
export const encrypt = (plaintext) => {
  if (!plaintext) return plaintext;
  const key = getKey();
  if (!key) return plaintext;

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `enc:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
};

/**
 * Decrypts a string produced by encrypt().
 * Returns the original plaintext.
 * If the value doesn't start with 'enc:' (old plain-text messages), returns it as-is.
 */
export const decrypt = (value) => {
  if (!value || !value.startsWith('enc:')) return value;
  const key = getKey();
  if (!key) return value;

  try {
    const parts = value.split(':');
    if (parts.length !== 4) return value;

    const iv = Buffer.from(parts[1], 'base64');
    const tag = Buffer.from(parts[2], 'base64');
    const ciphertext = Buffer.from(parts[3], 'base64');

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(ciphertext) + decipher.final('utf8');
  } catch (err) {
    console.error('[Crypto] Decrypt failed:', err.message);
    return '[Encrypted message]';
  }
};
