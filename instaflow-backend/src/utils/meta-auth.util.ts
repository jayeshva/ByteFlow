import crypto from 'crypto';
import { config } from '../config';

/**
 * Validates and parses a "signed_request" from Meta (Facebook/Instagram).
 * Meta sends this in deauthorization and data deletion callbacks.
 * 
 * Logic:
 * 1. Split by dot '.' into [signature, payload]
 * 2. URL-safe base64 decode both.
 * 3. Verify signature using HMAC-SHA256 with CLIENT_SECRET.
 * 
 * @param signedRequest The raw signed_request string from Meta
 * @returns The decoded payload object if valid, otherwise null
 */
export function parseSignedRequest(signedRequest: string): any {
    if (!signedRequest || !config.CLIENT_SECRET) {
        return null;
    }

    try {
        const parts = signedRequest.split('.');
        if (parts.length !== 2) return null;

        const [encodedSig, encodedPayload] = parts;

        // Decode signature
        const sig = Buffer.from(encodedSig.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

        // Decode payload
        const payloadStr = Buffer.from(encodedPayload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
        const data = JSON.parse(payloadStr);

        if (data.algorithm !== 'HMAC-SHA256') {
            console.error('Unknown algorithm. Expected HMAC-SHA256');
            return null;
        }

        // Verify HMAC
        const expectedSig = crypto
            .createHmac('sha256', config.CLIENT_SECRET)
            .update(encodedPayload)
            .digest();

        if (!crypto.timingSafeEqual(sig, expectedSig)) {
            console.error('Invalid signature on signed_request');
            return null;
        }

        return data;
    } catch (err) {
        console.error('Error parsing signed_request:', err);
        return null;
    }
}
