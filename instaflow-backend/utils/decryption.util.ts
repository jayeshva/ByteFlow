import crypto from "crypto";


export const decryptToken = (account: any) => {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    account.tokenKeyBlob,
    account.tokenNonce
  );

  decipher.setAuthTag(account.tokenAuthTag);

  let decrypted = decipher.update(account.tokenCiphertext, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};