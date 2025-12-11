=// index.js - 超精簡 PayUNi Debug 版本
// 先確認 Notify 有沒有打進來，再來談解密＆開發票

const express = require("express");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

// 解析 JSON / x-www-form-urlencoded body
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// ---- 讀取環境變數（順便兼容你之前設定過的名稱） ----
const PAYUNI_MER_ID =
  process.env.PAYUNI_MER_ID || process.env.PAYUNI_MERCHANT_ID;
const PAYUNI_HASH_KEY = process.env.PAYUNI_HASH_KEY;
const PAYUNI_HASH_IV = process.env.PAYUNI_HASH_IV;
const INVOICE_FALLBACK_LOVECODE =
  process.env.INVOICE_FALLBACK_LOVECODE ||
  process.env.DONATION_FALLBACK_CODE;

// 啟動時先印一下目前的設定狀態
if (!PAYUNI_MER_ID || !PAYUNI_HASH_KEY || !PAYUNI_HASH_IV) {
  console.warn(
    "⚠️ 警告：PAYUNi 串接資訊尚未設定完整，請確認 Render 的 Environment Variables。"
  );
} else {
  console.log("✅ PAYUNi 環境變數載入成功：", {
    PAYUNI_MER_ID,
    HASH_KEY_LENGTH: PAYUNI_HASH_KEY.length,
    HASH_IV_LENGTH: PAYUNI_HASH_IV.length,
    INVOICE_FALLBACK_LOVECODE,
  });
}

// ---- 全域 log：看任何 request 有沒有進來 ----
app.use((req, res, next) => {
  console.log(
    `➡️ ${new Date().toISOString()} ${req.method} ${req.url}`
  );
  next();
});

// ---- Health check ----
app.get("/", (req, res) => {
  res.send("OK - PayUNi invoice bridge is running.");
});

// ---- PayUNi Notify Debug 版 ----
// 先不要做加解密，純粹確認「有沒有打進來」。
app.all("/payuni/notify", async (req, res) => {
  console.log("📩 收到 /payuni/notify 請求：", {
    method: req.method,
    query: req.query,
    body: req.body,
  });

  // 正式 Notify 會是 POST，我們先把 GET 當成「測試用 ping」
  if (req.method !== "POST") {
    return res.send("OK (non-POST)");
  }

  try {
    // 之後這裡再接「驗證簽章＋開綠界發票」
    console.log("✅ 收到 POST Notify（這裡還沒做解密，只先記錄）");
    res.send("SUCCESS");
  } catch (err) {
    console.error("❌ PayUNi Notify 處理失敗：", err);
    res.send("ERROR");
  }
});

// ---- 啟動 server ----
app.listen(PORT, () => {
  console.log(`🚀 PayUNi invoice bridge server 已啟動，port=${PORT}`);
});

module.exports = app;
