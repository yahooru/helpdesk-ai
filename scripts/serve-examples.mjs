// Serves examples/ on a different origin (default http://localhost:3199) to test the widget
// cross-origin. Query params ?origin=<help desk origin>&workspace=<slug> rewrite the one-line
// snippet in external-site.html so the same file works against local dev and production.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "examples");
const port = Number(process.env.EXAMPLES_PORT ?? 3199);

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${port}`);
  const file = url.pathname === "/" ? "external-site.html" : url.pathname.slice(1);
  if (!/^[a-z0-9._-]+\.html$/i.test(file)) {
    res.writeHead(404).end("Not found");
    return;
  }
  try {
    let html = await readFile(path.join(root, file), "utf8");
    const origin = url.searchParams.get("origin");
    const workspace = url.searchParams.get("workspace");
    if (origin && /^https?:\/\/[^"'<>\s]+$/.test(origin)) html = html.replaceAll("http://localhost:3101", origin.replace(/\/$/, ""));
    if (workspace && /^[a-z0-9-]{3,40}$/.test(workspace)) html = html.replaceAll("your-workspace-slug", workspace);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(html);
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(port, () => console.log(`examples on http://localhost:${port}`));
