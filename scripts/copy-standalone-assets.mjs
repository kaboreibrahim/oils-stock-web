// output: "standalone" ne copie pas public/ ni .next/static (prévu pour un CDN) —
// on le fait nous-mêmes après chaque build, requis pour servir l'app depuis
// .next/standalone/server.js (déploiement cPanel/Passenger).
import { cp } from "node:fs/promises";
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
