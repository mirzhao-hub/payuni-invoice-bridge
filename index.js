// ------------------------------
// 基本設定
// ------------------------------
import express from 'express';
import bodyParser from 'body-parser';

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// ------------------------------
// Server 啟動紀錄
// ------------------------------
app.get('/', (req, res) => {
  res.send("OK - PayUNi invoice bridge is running.");
});

// ------------------------------
// PayUNi Notify Debug
// ------------------------------
app.all('/payuni/notify', async (req, res) => {
  console.log('📩 收到 PayUNi Notify 請求:', {
    method: req.method,
    query: req.query,
    body: req.body,
    headers: req.headers,
  });

  // 不做解密，單純確認有打進來
  res.send('OK');
});

// ------------------------------
// O’Pay / 歐付寶 Notify Debug（背景通知 & 回傳）
// ------------------------------
app.all('/opay/notify', async (req, res) => {
  console.log('📩 收到 OPay Notify（all）:', {
    method: req.method,
    query: req.query,
    body: req.body,
    headers: req.headers,
  });

  // O’Pay 規定：背景通知成功後必須回純字串 "1|OK"
  res.send('1|OK');
});

// ------------------------------
// 專門給背景通知（通常是 POST）
// ------------------------------
app.post('/opay/notify', async (req, res) => {
  console.log('📩 收到 OPay POST Notify:', {
    method: req.method,
    query: req.query,
    body: req.body,
    headers: req.headers,
  });

  res.send('1|OK');
});

// ------------------------------
// Render / Local 啟動 Port
// ------------------------------
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log("🚀 PayUNi invoice bridge server 已啟動，port=" + port);
});
