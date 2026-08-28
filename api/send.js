const UPSTREAM = "https://alight-motion-premium.site.je/index.php?action=send_eceran";
const TIMEOUT_MS = 15000;

function setHeaders(res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("X-Content-Type-Options", "nosniff");
}

function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return null; }
  }
  return null;
}

async function fetchUpstream(payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(UPSTREAM, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json, text/plain;q=0.9, */*;q=0.8",
        "User-Agent": "AM-Premium-Generator/1.0",
        "X-Requested-With": "XMLHttpRequest"
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      redirect: "follow"
    });

    const text = await response.text();
    const contentType = response.headers.get("content-type") || "";

    let data = null;
    if (contentType.includes("application/json")) {
      try { data = JSON.parse(text); } catch {}
    } else {
      try { data = JSON.parse(text); } catch {}
    }

    return { response, text, data, contentType };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async function handler(req, res) {
  setHeaders(res);

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ success:false, message:"Method not allowed" });
  }

  const body = parseBody(req);
  const email = String(body?.email || "").trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success:false, message:"Email tidak valid." });
  }

  try {
    const result = await fetchUpstream({ email });

    if (result.data && typeof result.data === "object") {
      const success =
        result.data.success === true ||
        result.data.ok === true ||
        String(result.data.status || "").toLowerCase() === "success";

      return res.status(result.response.ok ? 200 : 502).json({
        success,
        message: result.data.message || result.data.error ||
          (success ? "Request berhasil." : "Request ditolak oleh upstream."),
        data: success ? (result.data.data || {}) : undefined
      });
    }

    // The upstream returned HTML/text rather than the expected JSON API response.
    console.error("[send] upstream non-JSON", {
      status: result.response.status,
      contentType: result.contentType,
      preview: result.text.slice(0, 180)
    });

    const status = result.response.status === 403 ? 502 : 502;
    const message = result.response.status === 403
      ? "Upstream menolak request (403) atau meminta verifikasi browser. Endpoint API perlu akses resmi dari penyedia."
      : "Upstream tidak mengembalikan JSON API yang valid.";

    return res.status(status).json({ success:false, message });
  } catch (error) {
    console.error("[send]", error.name, error.message);
    return res.status(502).json({
      success:false,
      message:error.name === "AbortError"
        ? "Upstream timeout."
        : "Tidak dapat menghubungi upstream."
    });
  }
};
