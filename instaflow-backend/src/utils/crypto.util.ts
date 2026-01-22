import crypto from 'crypto';
import { config } from '../config';

const MASTER_KEY = Buffer.from(config.MASTER_ENCRYPTION_KEY, 'utf8').slice(0, 32);

/**
 * Wraps (encrypts) a data key using the Master Key.
 * Uses AES-256-GCM for envelope encryption.
 */
const wrapKey = (dataKey: Buffer) => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', MASTER_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(dataKey), cipher.final()]);
    const tag = cipher.getAuthTag();
    // Return combined [iv, tag, encrypted] for storage in tokenKeyBlob
    return Buffer.concat([iv, tag, encrypted]);
};

/**
 * Unwraps (decrypts) a data key using the Master Key.
 */
const unwrapKey = (wrappedKey: Buffer) => {
    const iv = wrappedKey.slice(0, 12);
    const tag = wrappedKey.slice(12, 28);
    const encrypted = wrappedKey.slice(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', MASTER_KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
};

export const encryptToken = (token: string) => {
    const dataKey = crypto.randomBytes(32);
    const nonce = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', dataKey, nonce);

    let encrypted = cipher.update(token, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const tag = cipher.getAuthTag().toString('base64');

    return {
        encryptedToken: encrypted,
        keyBlob: wrapKey(dataKey), // Wrap the data key
        nonce,
        tag,
    };
};

export const decryptToken = (account: any) => {
    const dataKey = unwrapKey(account.tokenKeyBlob); // Unwrap the data key first
    const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        dataKey,
        account.tokenNonce
    );

    decipher.setAuthTag(account.tokenAuthTag);

    let decrypted = decipher.update(account.tokenCiphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
};
