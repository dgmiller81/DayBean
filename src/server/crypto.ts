import "server-only";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;
const HKDF_INFO = Buffer.from("llm-cred");

function masterKey(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw) throw new Error("APP_ENCRYPTION_KEY missing");
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_LEN) {
    throw new Error("APP_ENCRYPTION_KEY must decode to 32 bytes");
  }
  return key;
}

function subkey(userId: string): Buffer {
  const out = hkdfSync("sha256", masterKey(), Buffer.from(userId, "utf8"), HKDF_INFO, KEY_LEN);
  return Buffer.from(out);
}

export function encrypt(plaintext: string, userId: string): string {
  const iv = randomBytes(IV_LEN);
  const key = subkey(userId);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ct, tag]).toString("base64");
}

export function decrypt(encoded: string, userId: string): string {
  const buf = Buffer.from(encoded, "base64");
  if (buf.length < IV_LEN + TAG_LEN + 1) throw new Error("ciphertext too short");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(buf.length - TAG_LEN);
  const ct = buf.subarray(IV_LEN, buf.length - TAG_LEN);
  const key = subkey(userId);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}

export function last4Of(plaintext: string): string {
  return plaintext.slice(-4);
}
