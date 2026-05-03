// Helper: prints an argon2id hash for the password you provide.
// Run with: pnpm exec tsx scripts/hash-password.ts <password>
// Or interactively: pnpm exec tsx scripts/hash-password.ts (then type password)

import argon2 from "argon2";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

async function main() {
  let password = process.argv[2];

  if (!password) {
    const rl = readline.createInterface({ input, output });
    password = await rl.question("Password: ");
    rl.close();
  }

  if (!password || password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const hash = await argon2.hash(password, {
    type: argon2.argon2id,
    timeCost: 3,
    memoryCost: 64 * 1024,
    parallelism: 4,
  });

  console.log("\nAdd this to your .env file (single quotes preserve $ characters):\n");
  console.log(`SIMPLE_PASSWORD_HASH='${hash}'`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
