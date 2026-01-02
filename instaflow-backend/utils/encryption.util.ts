import crypto from "crypto";

export const encryptToken = (token: string) => {
  const key = crypto.randomBytes(32); // Replace with KMS plaintext key
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, nonce);

  let encrypted = cipher.update(token, "utf8", "base64");
  encrypted += cipher.final("base64");

  const tag = cipher.getAuthTag().toString("base64");

  return {
    encryptedToken: encrypted,
    keyBlob: key,  // Replace with KMS CiphertextBlob
    nonce,
    tag
  };
};
