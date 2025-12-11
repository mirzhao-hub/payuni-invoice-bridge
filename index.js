// index.js
// -- PayUNi Notify 接收 + 解析 --
// 之後要開發票（綠界）可以在 handlePayuniNotify 裡面接上去。

const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const querystring = require("querystring");
require("dotenv").config();

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// ======== 1. 環境變數 ==========
const {
  PAYUNI_MER_ID,
  PAYUNI_HASH_KEY,
  PAYUNI_HASH_IV,
  INVOICE_FALLBACK_LOVECODE
} = process.env;

if (!PAYUNI_MER_ID || !PAYUNI_HASH_KEY || !PAYUNI_HASH_IV) {
  console.warn("⚠️ 警告：PAYUNi 串接資訊尚未設定完整，請確認 .env。");
}

// ======== 2. PayUNi AES-GCM / SHA256 工具 ==========
function getKeyBuffer() {
  // HASH_KEY 應該是 32 字元，對應 AES-256 key
  return Buffer.from(PAYUNI_HASH_KEY, "utf8");
}

function getIvBuffer() {
  // HASH_IV 應該是 16 字元，對應 GCM IV 長度
  return Buffer.from(PAYUNI_HASH_IV, "utf8");
}

/**
 * AES-GCM 解密（照 PayUNi 官方範例邏輯）
 * @param {string} encryptStr - PayUNi 傳來的 EncryptInfo（hex string）
 * @returns {string} - 解密後的字串（querystring 格式）
 */
function payuniDecrypt(encryptStr) {
  const key = getKeyBuffer();
  const iv = getIvBuffer();

  const raw = Buffer.from(encryptStr, "hex").toString(); // "cipherBase64:::tagBase64"
  const [cipherBase64, tagBase64] = raw.split(":::");
  const cipherText = Buffer.from(cipherBase64, "base64");
  const authTag = Buffer.from(tagBase64, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(cipherText, undefined, "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * PayUNi SHA256 驗證
 * hash = SHA256( key + EncryptInfo + iv )
 */
function payuniSha256(encryptInfo) {
  const hash = crypto
    .createHash("sha256")
    .update(`${PAYUNI_HASH_KEY}${encryptInfo}${PAYUNI_HASH_IV}`)
    .digest("hex")
    .toUpperCase();
  return hash;
}

/**
 * 驗證並解析 PayUNi Notify
 * @param {object} body - req.body
 * @returns {object} - 解析後的物件（由 querystring 轉成 object）
 */
function verifyAndParsePayuni(body) {
  const { MerID, EncryptInfo, HashInfo } = body;

  if (!MerID || !EncryptInfo || !HashInfo) {
    throw new Error("缺少必要欄位 MerID / EncryptInfo / HashInfo");
  }

  if (MerID !== PAYUNI_MER_ID) {
    throw new Error(`MerID 不符，收到 ${MerID}，預期 ${PAYUNI_MER_ID}`);
  }

  const localHash = payuniSha256(EncryptInfo);
  if (localHash !== HashInfo) {
    throw new Error("Hash 驗證失敗（HashInfo 不一致）");
  }

  const plaintext = payuniDecrypt(EncryptInfo);
  const data = querystring.parse(plaintext); // e.g. "Status=SUCCESS&MerTradeNo=xxx&TradeAmt=30"

  return data;
}

// ======== 3. 之後會接發票用的處理邏輯（現在先只 log） ==========
async function handlePayuniNotify(parsed) {
  // parsed 是 PayUNi 解密後的內容，如：
  // {
  //   Status: 'SUCCESS',
  //   Message: '',
  //   MerID: 'HIBE018886',
  //   MerTradeNo: '2025121001...',
  //   TradeAmt: '30',
  //   InvoiceNotifyType: 'C0401',
  //   ...
  // }

  console.log("✅ PayUNi Notify 內容：", parsed);

  // 只處理成功的狀態
  if (parsed.Status !== "SUCCESS") {
    console.log("ℹ️ 非 SUCCESS 狀態，略過開立發票。Status =", parsed.Status);
    return;
  }

  // 這裡可以依你的需求做對應，例如：
  const merTradeNo = parsed.MerTradeNo; // 商店訂單編號
  const amount = parsed.TradeAmt;
  const buyerEmail = parsed.UsrMail || ""; // 不一定有
  const carrierType = parsed.CarrierType || ""; // 不一定有
  const carrierInfo = parsed.CarrierInfo || "";

  // 決定要怎麼處理發票載具 / 捐贈
  let invoiceMode = "";
  let invoiceNote = "";

  if (carrierType) {
    invoiceMode = `載具 (${carrierType})`;
  } else if (buyerEmail) {
    invoiceMode = "電子發票寄送 Email";
  } else {
    invoiceMode = "捐贈發票";
    invoiceNote = `無載具無 Email，使用愛心碼 ${INVOICE_FALLBACK_LOVECODE}`;
  }

  console.log("🧾 準備開立發票：", {
    orderNo: merTradeNo,
    amount,
    buyerEmail,
    carrierType,
    carrierInfo,
    invoiceMode,
    invoiceNote
  });

  // ⬇️ 這裡之後可以接綠界發票 API
  // await issueEcpayInvoice({ ... });

  // 目前先只 log，不真的打綠界，避免你還沒設定就報錯
}

// ======== 4. HTTP 路由 ==========

// 健康檢查（方便雲端用）
app.get("/", (req, res) => {
  res.send("OK - PayUNi invoice bridge is running.");
});

// PayUNi 背景通知（真正會用的入口）
app.post("/payuni/notify", async (req, res) => {
  console.log("📩 收到 PayUNi Notify POST，原始 body：", req.body);

  try {
    const parsed = verifyAndParsePayuni(req.body);
    await handlePayuniNotify(parsed);

    // 按 PayUNi 文件，成功請回應字串 SUCCESS（或至少 HTTP 200）
    res.send("SUCCESS");
  } catch (err) {
    console.error("❌ PayUNi Notify 處理失敗：", err.message);
    // 為避免重複補送太多次，一樣回 200，但內容標記 error 方便之後查 log
    res.send("ERROR");
  }
});

// （選擇性）如果你之後要用 Return URL，可以加：
app.get("/payuni/return", (req, res) => {
  console.log("↩️ 收到 PayUNi Return GET，query：", req.query);
  res.send("支付完成，謝謝贊助！（來自 Return URL）");
});

// ======== 5. 啟動 server ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 PayUNi invoice bridge server 已啟動，port=${PORT}`);
});
