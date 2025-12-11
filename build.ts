import { serve } from "bun";
import { rmSync } from "node:fs";

// Clean dist
try {
  rmSync("./dist", { recursive: true });
} catch (e) {}

// Build Workers
const workerEntrypoints = [
  "./src/modules/world/workers/ChunkWorker.ts",
  "./src/modules/environment/workers/LightingWorker.ts",
  "./src/modules/rendering/workers/MeshingWorker.ts",
  "./src/modules/physics/workers/PhysicsWorker.ts",
];

const workerBuild = await Bun.build({
  entrypoints: workerEntrypoints,
  outdir: "./dist/assets",
  target: "browser",
  minify: true,
  kind: "worker", // Explicitly tell Bun this is a worker
  naming: "[name].[ext]", // Flatten output structure
});

if (!workerBuild.success) {
  console.error("❌ Worker Build Failed:");
  console.error(workerBuild.logs);
  process.exit(1);
}

// Build Main App
const build = await Bun.build({
  entrypoints: ["./src/main.ts"],
  outdir: "./dist",
  target: "browser",
  minify: true,
  splitting: false, // Disable code splitting
  naming: "index.js", // Match HTML reference
});

if (!build.success) {
  console.error("❌ Main Build Failed:");
  console.error(build.logs);
  process.exit(1);
}

// Copy index.html and inject script AND css
let html = await Bun.file("./index.html").text();
// Replace vite script with bun output
html = html.replace(
  /<script type="module" src="\.?\/src\/main\.ts"><\/script>/,
  '<script type="module" src="./index.js"></script>'
);
// Inject CSS link manually since we removed import
html = html.replace(
  /<\/head>/,
  '<link rel="stylesheet" href="./style.css"></head>'
);
await Bun.write("./dist/index.html", html);

// Copy style.css manually
const css = await Bun.file("./src/style.css").text();
await Bun.write("./dist/style.css", css);

// Copy public folder to dist
await Bun.$`cp -r public/* dist/ 2>/dev/null || true`;

console.log("✅ Build Complete!");
