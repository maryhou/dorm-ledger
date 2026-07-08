# HANDOFF — 宿舍小帳本 Dorm Ledger

> 給下一個 session / 接手者的交接文件。最後更新：2026-07-08。

## 專案是什麼

室友共用物品記帳 PWA：新增物品（名稱／單價／買了幾個／誰買的）→ 誰用了就點 +1 記到他頭上 → 結算頁自動互相抵銷、給出最少轉帳方案 → 月底「一鍵結清」整期歸檔。目的是不用每筆小錢都轉帳，月結一次搞定。

UI 走粉彩、大圓角、高趣味風格（動物頭像室友、emoji 物品、俏皮文案），全繁體中文。

## 目前狀態：v1 已完成並上線 ✅

- **線上網址**：https://maryhou.github.io/dorm-ledger/（GitHub Pages，legacy build，main branch 根目錄）
- **Repo**：https://github.com/maryhou/dorm-ledger（公開，帳號 maryhou，`gh` CLI 已登入可直接操作）
- 已完整手動驗證：+1 記帳、剩餘量進度條、補貨、刪紀錄、結算數學（與手算相符）、一鍵結清歸檔、歷史結算、示範資料、service worker 註冊與快取
- push 到 main 即自動重新部署（約 1 分鐘生效）

## 技術架構（零依賴，免打包）

| 檔案 | 內容 |
|---|---|
| `index.html` | App shell：header、四個分頁 tab bar、FAB、sheet/toast 容器 |
| `style.css` | 全部樣式，design tokens 在 `:root`（粉彩色盤、漸層、圓角） |
| `app.js` | 全部邏輯：資料模型、四頁 render、bottom sheets、結算演算法 |
| `sw.js` | Service worker，**network-first**、離線退回快取。**改版時把 `CACHE` 常數版本號 +1** |
| `manifest.webmanifest` + `icons/` | PWA 安裝資訊；icon-192/512.png 由 icon.svg 用 qlmanage+sips 轉出 |
| `.claude/launch.json` | 本機預覽：`python3 -m http.server 8341` |

### 資料模型（localStorage key `dormLedger.v1`）

```
members:     [{id, name, emoji, color: [bg, fg]}]
items:       [{id, name, emoji, price, stock, buyerId, createdAt}]   // stock=總購入量
logs:        [{id, itemId, memberId, count, price, buyerId, ts, settledId}]
             // price/buyerId 是使用當下的快照，補貨改價不影響舊帳
settlements: [{id, ts, label, transfers:[{from,to,amount}], total, logCount}]
```

- 剩餘量 = `stock - Σ logs.count`（沒有獨立欄位，動態計算）
- 自用（memberId === buyerId）記錄消耗但金額為 0
- 結算：`computeTransfers()` 算每人淨額 → 貪婪配對最大債務人/債權人 → 最少轉帳
- 結清 = 所有未結 logs 標上 settledId、存入 settlements；**不可逆**
- 刪室友/物品有防呆：有未結帳款時擋下

## 未完成事項（優先順序）

1. **（等使用者）手機實測安裝**：使用者要在宿舍公用裝置瀏覽器開網址→加入主畫面，實際用一兩週。這是目前的 blocking 步驟，程式端沒事可做。
2. **多人同步（候選，尚未決定做不做）**：目前資料存單一裝置 localStorage。若實測後室友想各自在手機上記，需加後端（討論過 Supabase）+ 帳本共享機制。**等使用者實測後回饋再動工，不要先做。**
3. 小改進候選（未承諾）：結清前匯出/備份 JSON、編輯物品名稱與 emoji、log 長按修改數量、結算歷史點開看明細。

## 注意事項（坑）

- ⚠️ `/Users/maryhou`（家目錄）本身是一個意外建立的 git repo。本專案已在內層另建獨立 repo，正常運作，但在專案外跑 git 指令時小心別碰到外層那個。
- SW 是 network-first，開發時不太會吃到舊快取；但改了 `ASSETS` 清單或想強制失效舊快取時，記得 bump `sw.js` 的 `CACHE` 版本字串。
- 金額以四捨五入到整數元顯示與結算（`fmt$` / `computeTransfers`）。
- inline onclick handlers 依賴 `app.js` 底部的 `Object.assign(window, {...})` 匯出，新增函式記得補。
