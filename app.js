const HISTORY_KEY = "amPremiumGeneratorHistory";
const $ = (s) => document.querySelector(s);

const sendForm = $("#sendForm");
const verifyForm = $("#verifyForm");
const sendBtn = $("#sendBtn");
const verifyBtn = $("#verifyBtn");
const toast = $("#toast");
let toastTimer;

function showToast(message, type = "success") {
  $("#toastText").textContent = message;
  $(".toast-dot").style.background = type === "error" ? "var(--danger)" : "var(--success)";
  $(".toast-dot").style.boxShadow = type === "error"
    ? "0 0 10px var(--danger)" : "0 0 10px var(--success)";
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}

function setLoading(button, state) {
  button.classList.toggle("loading", state);
  button.disabled = state;
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

async function postJSON(url, payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {"Content-Type": "application/json", "Accept": "application/json"},
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    let data = {};
    try { data = await response.json(); } catch {}
    if (!response.ok) throw new Error(data.message || "Server mengembalikan error.");
    return data;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("Request timeout. Coba lagi.");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function saveHistory(type, target, status) {
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  history.unshift({type, target, status, time: new Date().toLocaleString("id-ID")});
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 10)));
  renderHistory();
}

function renderHistory() {
  const list = $("#historyList");
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  if (!history.length) {
    list.innerHTML = '<div class="empty">Belum ada aktivitas.</div>';
    return;
  }
  list.innerHTML = history.map(item => `
    <div class="history-item">
      <div>
        <strong>${escapeHTML(item.target)}</strong>
        <small>${escapeHTML(item.type)} • ${escapeHTML(item.time)}</small>
      </div>
      <span class="badge">${escapeHTML(item.status)}</span>
    </div>
  `).join("");
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

function showResult(id, title, meta, ok = true) {
  const box = $(id);
  box.classList.remove("hidden");
  box.style.borderColor = ok ? "rgba(67,209,158,.2)" : "rgba(255,109,131,.2)";
  box.querySelector(".result-icon").textContent = ok ? "✓" : "!";
  box.querySelector(".result-icon").style.color = ok ? "var(--success)" : "var(--danger)";
  box.querySelector("strong").textContent = title;
  box.querySelector("span").textContent = meta;
}

sendForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = $("#sendEmail").value.trim();
  if (!validEmail(email)) {
    showToast("Masukkan email yang valid.", "error");
    $("#sendEmail").focus();
    return;
  }

  setLoading(sendBtn, true);
  try {
    const data = await postJSON("/api/send", {email});
    const ok = data.success === true || data.ok === true;
    if (!ok) throw new Error(data.message || data.error || "Generate gagal.");
    showResult("#sendResult", "Request berhasil", data.message || "Permintaan berhasil dikirim.");
    saveHistory("Generate", email, "Berhasil");
    showToast("Request berhasil dikirim.");
  } catch (error) {
    showResult("#sendResult", "Generate gagal", error.message, false);
    saveHistory("Generate", email, "Gagal");
    showToast(error.message, "error");
  } finally {
    setLoading(sendBtn, false);
  }
});

verifyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = $("#verifyEmail").value.trim();
  const link = $("#verifyLink").value.trim();

  if (!link || !/^https?:\/\//i.test(link)) {
    showToast("Masukkan link verifikasi yang valid.", "error");
    $("#verifyLink").focus();
    return;
  }
  if (email && !validEmail(email)) {
    showToast("Email tidak valid.", "error");
    $("#verifyEmail").focus();
    return;
  }

  setLoading(verifyBtn, true);
  try {
    const data = await postJSON("/api/verify", {email, link});
    const ok = data.success === true || data.ok === true;
    if (!ok) throw new Error(data.message || data.error || "Verifikasi gagal.");
    const duration = data.data?.duration ? ` • ${data.data.duration}` : "";
    showResult("#verifyResult", "Premium terverifikasi", (data.message || "Verifikasi berhasil.") + duration);
    saveHistory("Verify", email || link, "Berhasil");
    showToast("Verifikasi berhasil.");
  } catch (error) {
    showResult("#verifyResult", "Verifikasi gagal", error.message, false);
    saveHistory("Verify", email || link, "Gagal");
    showToast(error.message, "error");
  } finally {
    setLoading(verifyBtn, false);
  }
});

$("#clearHistory").addEventListener("click", () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
  showToast("Riwayat dihapus.");
});

renderHistory();
