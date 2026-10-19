const { Readable } = require("node:stream");

const ALLOWED_ACTIONS = new Set([
  "get_live_categories",
  "get_live_streams",
  "get_vod_categories",
  "get_vod_streams",
  "get_series_categories",
  "get_series",
  "get_series_info",
]);
const ALLOWED_KINDS = new Set(["live", "movie", "series"]);
const ALLOWED_EXTENSIONS = new Set(["ts", "m3u8", "mp4", "mkv", "avi", "mov", "mpg", "mpeg"]);

function getBase() {
  const value = String(process.env.XTREAM_BASE_URL || "").trim().replace(/\/+$/, "");
  if (!value) throw new Error("AGYASHtv provider configuration is missing.");
  const base = new URL(value);
  if (!["http:", "https:"].includes(base.protocol)) throw new Error("Provider URL must use HTTP or HTTPS.");
  return base;
}

function encode(value) {
  return encodeURIComponent(String(value || ""));
}

function makePlayerApiUrl(base, username, password, action, params = {}) {
  const url = new URL("/player_api.php", base);
  url.searchParams.set("username", String(username));
  url.searchParams.set("password", String(password));
  if (action) url.searchParams.set("action", action);
  if (action === "get_series_info" && params.series_id != null) {
    url.searchParams.set("series_id", String(params.series_id));
  }
  return url;
}

function streamProxyUrl(username, password, target) {
  const proxy = new URL("/api/xtream", "https://proxy.invalid");
  proxy.searchParams.set("mode", "remote");
  proxy.searchParams.set("username", username);
  proxy.searchParams.set("password", password);
  proxy.searchParams.set("url", target);
  return proxy.pathname + proxy.search;
}

async function pipeUpstream(req, res, upstream, contentType) {
  res.statusCode = upstream.status;
  res.setHeader("Content-Type", contentType || upstream.headers.get("content-type") || "application/octet-stream");
  res.setHeader("Cache-Control", "no-store");
  for (const header of ["content-length", "content-range", "accept-ranges"]) {
    const value = upstream.headers.get(header);
    if (value) res.setHeader(header, value);
  }
  if (!upstream.body) return res.end();
  Readable.fromWeb(upstream.body).pipe(res);
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const base = getBase();

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
      const username = String(body.username || "").trim();
      const password = String(body.password || "");
      const action = body.action ? String(body.action) : "";
      const params = body.params || {};
      if (!username || !password) return res.status(400).json({ error: "Enter your username and password." });
      if (action && !ALLOWED_ACTIONS.has(action)) return res.status(400).json({ error: "Unsupported provider action." });
      if (action === "get_series_info" && !/^\d+$/.test(String(params.series_id || ""))) {
        return res.status(400).json({ error: "Invalid series ID." });
      }
      const url = makePlayerApiUrl(base, username, password, action, params);
      const upstream = await fetch(url, { headers: { Accept: "application/json" } });
      if (!upstream.ok) return res.status(502).json({ error: "The IPTV provider could not complete the request." });
      const data = await upstream.json();
      return res.status(200).json(data);
    }

    if (req.method !== "GET") {
      res.setHeader("Allow", "GET, POST");
      return res.status(405).json({ error: "Method not allowed." });
    }

    const q = req.query || {};
    const mode = String(q.mode || "");
    const username = String(q.username || "");
    const password = String(q.password || "");
    if (!username || !password) return res.status(400).json({ error: "Missing playback credentials." });

    let target;
    if (mode === "stream") {
      const kind = String(q.kind || "");
      const id = String(q.id || "");
      const ext = String(q.ext || "mp4").toLowerCase();
      if (!ALLOWED_KINDS.has(kind) || !/^\d+$/.test(id) || !ALLOWED_EXTENSIONS.has(ext)) {
        return res.status(400).json({ error: "Invalid stream request." });
      }
      const pathKind = kind === "movie" ? "movie" : kind === "series" ? "series" : "live";
      target = new URL(`/${pathKind}/${encode(username)}/${encode(password)}/${encode(id)}.${ext}`, base);
    } else if (mode === "remote") {
      target = new URL(String(q.url || ""));
      if (target.hostname !== base.hostname || !["http:", "https:"].includes(target.protocol)) {
        return res.status(403).json({ error: "Blocked stream target." });
      }
    } else {
      return res.status(400).json({ error: "Invalid stream mode." });
    }

    const headers = { Accept: "*/*" };
    if (req.headers.range) headers.Range = req.headers.range;
    const upstream = await fetch(target, { headers, redirect: "follow" });
    const type = upstream.headers.get("content-type") || "";
    const pathname = target.pathname.toLowerCase();

    if (upstream.ok && (pathname.endsWith(".m3u8") || type.includes("mpegurl") || type.includes("vnd.apple"))) {
      let playlist = await upstream.text();
      const rewrite = (line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
          return line.replace(/URI="([^"]+)"/g, (_all, uri) => {
            const absolute = new URL(uri, target).href;
            return `URI="${streamProxyUrl(username, password, absolute)}"`;
          });
        }
        const absolute = new URL(trimmed, target).href;
        return streamProxyUrl(username, password, absolute);
      };
      playlist = playlist.split(/\r?\n/).map(rewrite).join("\n");
      res.statusCode = upstream.status;
      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      res.setHeader("Cache-Control", "no-store");
      return res.end(playlist);
    }

    return await pipeUpstream(req, res, upstream);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected provider error.";
    return res.status(500).json({ error: message === "AGYASHtv provider configuration is missing." ? message : "Unable to contact your IPTV provider. Check its configuration and try again." });
  }
};
