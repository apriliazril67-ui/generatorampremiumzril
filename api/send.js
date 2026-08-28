const UPSTREAM = "https://alight-motion-premium.site.je/index.php?action=send_eceran";

function headers(res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("X-Content-Type-Options", "nosniff");
}

module.exports = async function handler(req, res) {
  headers(res);

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({success:false, message:"Method not allowed"});
  }

  const body = typeof req.body === "string"
    ? (() => { try { return JSON.parse(req.body); } catch { return null; } })()
    : (req.body || {});

  const email = String(body?.email || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({success:false, message:"Email tidak valid."});
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(UPSTREAM, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-Requested-With": "XMLHttpRequest"
      },
      body: JSON.stringify({email}),
      signal: controller.signal,
      redirect: "follow"
    });

    const text = await response.text();
    let upstream = {};
    try { upstream = JSON.parse(text); } catch {
      return res.status(502).json({success:false, message:"Response upstream bukan JSON yang valid."});
    }

    const success = upstream.success === true || upstream.ok === true;
    return res.status(response.ok ? 200 : 502).json({
      success,
      message: upstream.message || (success ? "Request berhasil." : "Request gagal."),
      data: success ? (upstream.data || {}) : undefined
    });
  } catch (error) {
    console.error("[send]", error.name, error.message);
    return res.status(502).json({
      success:false,
      message:error.name === "AbortError" ? "Upstream timeout." : "Tidak dapat menghubungi upstream."
    });
  } finally {
    clearTimeout(timeout);
  }
};
