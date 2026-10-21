module.exports = function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const value = String(process.env.XTREAM_BASE_URL || "").trim();
  if (!value) {
    return res.status(503).json({
      error: "AGYASHtv provider is not configured yet. Please contact the app provider.",
    });
  }

  try {
    const base = new URL(value);
    if (!["https:", "http:"].includes(base.protocol) || base.username || base.password) {
      return res.status(500).json({ error: "AGYASHtv provider configuration is invalid." });
    }
    const providerBase = base.toString().replace(/\/+$/, "");
    return res.status(200).json({ providerBase });
  } catch {
    return res.status(500).json({ error: "AGYASHtv provider configuration is invalid." });
  }
};
