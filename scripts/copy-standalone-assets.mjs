// output: "standalone" ne copie pas public/ ni .next/static (prévu pour un CDN) —
// on le fait nous-mêmes après chaque build, requis pour servir l'app depuis
// .next/standalone/server.js (déploiement cPanel/Passenger).
import { cp, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const targets = [
  ["public", ".next/standalone/public"],
  [".next/static", ".next/standalone/.next/static"],
];

for (const [src, dest] of targets) {
  if (!existsSync(src)) continue;
  await cp(src, dest, { recursive: true });
  console.log(`copied ${src} -> ${dest}`);
}

// Passenger (cPanel) restarts the app when tmp/restart.txt's mtime changes.
// Deployment has no SSH access to `touch` it remotely, so we ship a freshly
// timestamped one with every build — uploading it (even with identical
// content) updates its mtime and triggers the restart.
await mkdir(".next/standalone/tmp", { recursive: true });
await writeFile(".next/standalone/tmp/restart.txt", new Date().toISOString());
console.log("wrote .next/standalone/tmp/restart.txt");
