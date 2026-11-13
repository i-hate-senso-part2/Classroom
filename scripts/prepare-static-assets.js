import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { scramjetPath } from "@mercuryworkshop/scramjet/path";

const outputPath = fileURLToPath(
	new URL("../public/scramjet/", import.meta.url)
);
const runtimeFiles = ["scramjet.js", "scramjet.wasm"];

rmSync(outputPath, { recursive: true, force: true });
mkdirSync(outputPath, { recursive: true });

for (const filename of runtimeFiles) {
	copyFileSync(join(scramjetPath, filename), join(outputPath, filename));
}
