// Builds the Worker with OpenNext, then works around a gap in the adapter:
// Next 16.4 loads .next/server/preview-props.json at startup, which the adapter's
// manifest inliner does not know yet. We inline the real build-generated file.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

console.log("cf-build: building Worker with OpenNext");
execSync("npx opennextjs-cloudflare build", { stdio: "inherit" });

const handler = ".open-next/server-functions/default/handler.mjs";
const props = JSON.stringify(JSON.parse(readFileSync(".next/server/preview-props.json", "utf8")));
const marker = "throw new Error(`Unexpected loadManifest(${path2}) call!`)";
let src = readFileSync(handler, "utf8");
if (!src.includes(marker)) throw new Error("cf-build: loadManifest marker not found; adapter changed, review the workaround");
src = src.replace(marker, `if(path2.endsWith("/server/preview-props.json"))return ${props};` + marker);
writeFileSync(handler, src);
console.log("cf-build: inlined preview-props.json");
