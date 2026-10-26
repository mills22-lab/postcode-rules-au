#!/usr/bin/env node
/**
 * Copies shared/au-rules.js into every extension src/ directory and app/lib/.
 * Run: node scripts/sync-shared.js
 */
import { copyFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(root, "shared/au-rules.js");

const destinations = [
  "extensions/postcode-validation/src/au-rules.js",
  "extensions/postcode-delivery/src/au-rules.js",
  "app/lib/au-rules.js",
];

for (const rel of destinations) {
  const dest = resolve(root, rel);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  console.log(`✓ ${rel}`);
}

console.log("Sync complete.");
