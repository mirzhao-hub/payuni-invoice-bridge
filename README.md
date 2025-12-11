# PayUNi Invoice Bridge

這個專案的用途：接收 PayUNi 的 Notify，解密交易內容，之後再接綠界開立發票。

目前版本只會：
- 驗證 PayUNi Hash
- AES-GCM 解密 EncryptInfo
- 在 console.log 印出解析後的內容
- 根據是否有載具 / email 判斷是否要捐贈（邏輯先寫好）

## 使用方式（本機測試）

1. 安裝套件

```bash
npm install
```

2. 建立 `.env` 檔案（可以複製 `.env.example` 一份改名）

至少要填這幾個：

```env
PAYUNI_MER_ID=HIBE018886
PAYUNI_HASH_KEY=你的PayUNi HashKey
PAYUNI_HASH_IV=你的PayUNi HashIV
INVOICE_FALLBACK_LOVECODE=919
```

3. 啟動 server

```bash
npm start
```

Server 會跑在 `http://localhost:3000`。

## 放到雲端

把這個專案推到 GitHub，然後可以用 Render / Railway / Vercel 建立一個 Node Web Service：

- Build command: `npm install`
- Start command: `npm start`

雲端會給你一個網址，例如：

```
https://payuni-invoice-bridge.onrender.com
```

接著在 PayUNi 後台設定 Notify URL：

```
https://payuni-invoice-bridge.onrender.com/payuni/notify
```

（Return URL 可選：`/payuni/return`）

之後只要 PayUNi 有打 Notify，就會出現在你的雲端 log 裡。
