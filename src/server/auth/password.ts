import "server-only";
import argon2 from "argon2";

const HASH_OPTS: argon2.Options = {
  type: argon2.argon2id,
  timeCost: 3,
  memoryCost: 64 * 1024, // 64 MB
  parallelism: 4,
};

export async function hashPassword(plaintext: string): Promise<string> {
  if (!plaintext || plaintext.length < 8) {
    throw new Error("password must be at least 8 characters");
  }
  return argon2.hash(plaintext, HASH_OPTS);
}

export async function verifyPassword(hash: string, plaintext: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plaintext);
  } catch {
    return false;
  }
}
