import { serve } from "bun";

// Simple static file server
serve({
  port: 4173, // Keep same port as before for convenience
  async fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname;
    
    // Default to index.html
    if (path === "/" || path === "/minecraft.html") {
      path = "/index.html";
    }

    // Serve from dist
    const file = Bun.file(`./dist${path}`);
    
    if (await file.exists()) {
      return new Response(file);
    }
    
    return new Response("Not Found", { status: 404 });
  },
});

console.log("🚀 Server running at http://localhost:4173");
