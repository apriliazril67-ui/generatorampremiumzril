const UPSTREAM = "https://alight-motion-premium.site.je/index.php?action=verify_eceran";

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
  const link = String(body?.link || "").trim();

  if (!link || !/^https?:\/\//i.test(link)) {
    return res.status(400).json({success:false, message:"Link verifikasi tidak valid."});
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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
      body: JSON.stringify({email, link}),
      signal: controller.signal,
      redirect: "follow"
    });

    const text = await response.text();
    let upstream = {};
    try { upstream = JSON.parse(text); } catch {
      return res.status(502).json({success:false, message:"Response upstream bukan JSON yang valid."});
    }

    const message = String(upstream.message || "");
    const success =
      upstream.success === true ||
      upstream.ok === true ||
      upstream.status === "success" ||
      upstream.status === "active";

    return res.status(response.ok ? 200 : 502).json({
      success,
      message: message || (success ? "Verifikasi berhasil." : "Verifikasi gagal."),
      data: success ? {
        ...(upstream.data || {}),
        status: "active"
      } : undefined
    });
  } catch (error) {
    console.error("[verify]", error.name, error.message);
    return res.status(502).json({
      success:false,
      message:error.name === "AbortError" ? "Upstream timeout." : "Tidak dapat menghubungi upstream."
    });
  } finally {
    clearTimeout(timeout);
  }
};
