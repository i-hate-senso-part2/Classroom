import {
	copyFileSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { scramjetPath } from "@mercuryworkshop/scramjet/path";

const outputPath = fileURLToPath(
	new URL("../public/scramjet/", import.meta.url)
);
const legacyOutputPath = fileURLToPath(
	new URL("../public/scram-v1/", import.meta.url)
);
const runtimeFiles = ["scramjet.js", "scramjet.wasm"];
const legacyDatabaseOpen = '"$scramjet",1';
const legacyDatabaseReplacement = '"$classroom-scramjet-v1",2';

rmSync(outputPath, { recursive: true, force: true });
mkdirSync(outputPath, { recursive: true });

for (const filename of runtimeFiles) {
	copyFileSync(join(scramjetPath, filename), join(outputPath, filename));
}

const legacyRuntimePath = fileURLToPath(
	new URL("../public/scram/scramjet.all.js", import.meta.url)
);
const legacyRuntime = readFileSync(legacyRuntimePath, "utf8");
const legacyDatabaseOpenCount =
	legacyRuntime.split(legacyDatabaseOpen).length - 1;
if (legacyDatabaseOpenCount !== 6) {
	throw new Error("Could not isolate the Scramjet V1 IndexedDB database.");
}

rmSync(legacyOutputPath, { recursive: true, force: true });
mkdirSync(legacyOutputPath, { recursive: true });
writeFileSync(
	join(legacyOutputPath, "scramjet.all.js"),
	legacyRuntime.replaceAll(legacyDatabaseOpen, legacyDatabaseReplacement)
);
