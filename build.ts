import { rmSync } from "node:fs";

// Parse command line flags
const isDev = process.argv.includes('--dev');

// Clean dist
try {
  rmSync("./dist", { recursive: true });
} catch (e) {}

// Build Workers
const workerEntrypoints = [
  "./src/modules/world/workers/ChunkWorker.ts",
  "./src/modules/environment/workers/LightingWorker.ts",
  "./src/modules/meshing/workers/MeshingWorker.ts",
  "./src/modules/physics/workers/PhysicsWorker.ts",
];

const workerBuild = await Bun.build({
  entrypoints: workerEntrypoints,
  outdir: "./dist/assets",
  target: "browser",
  minify: !isDev,
  sourcemap: isDev ? "external" : "none",
  kind: "worker",
  naming: "[name].[ext]",
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
  minify: !isDev,
  sourcemap: isDev ? "external" : "none",
  splitting: false,
  naming: "index.js",
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

// Copy and concatenate CSS files
const mainCss = await Bun.file("./src/style.css").text();
const designTokensCss = await Bun.file("./src/modules/ui/styles/design-tokens.css").text();
const componentsCss = await Bun.file("./src/modules/ui/styles/components.css").text();

// Concatenate all CSS (design tokens first, then main, then components)
const fullCss = `/* Design Tokens */\n${designTokensCss}\n\n/* Main Styles */\n${mainCss}\n\n/* Component Styles */\n${componentsCss}`;
await Bun.write("./dist/style.css", fullCss);

// Copy public folder to dist
await Bun.$`cp -r public/* dist/ 2>/dev/null || true`;

console.log(`✅ Build Complete! (${isDev ? 'development' : 'production'})`);
