# HANDOFF — 宿舍小帳本 Dorm Ledger

> 給下一個 session / 接手者的交接文件。最後更新：2026-07-09。

## 專案是什麼

室友共用物品記帳 PWA：新增物品（名稱／單價／買了幾個／誰買的）→ 誰用了就點 +1 記到他頭上 → 結算頁自動互相抵銷、給出最少轉帳方案 → 月底「一鍵結清」整期歸檔。目的是不用每筆小錢都轉帳，月結一次搞定。

UI 走粉彩、大圓角、高趣味風格（動物頭像室友、emoji 物品、俏皮文案），全繁體中文。

## 目前狀態：v1.1 已上線 ✅（功能完成＋一輪 UI 打磨）

- **線上網址**：https://maryhou.github.io/dorm-ledger/（GitHub Pages，legacy build，main branch 根目錄；push 即自動部署，約 1 分鐘＋最多 10 分鐘 CDN 快取）
- **Repo**：https://github.com/maryhou/dorm-ledger（公開——使用者已確認公開沒關係；`gh` CLI 已登入帳號 maryhou）
- 工作目錄乾淨、main 與 origin 同步，所有變更都已部署並逐一在預覽中驗證過

### 2026-07-09 這輪 UI 打磨（都是使用者逐項點名要的）

1. Tab 列 emoji → outline 線條 SVG icon（菜籃/收據/錢幣/房子）
2. 補貨📦、刪除🗑️、記上去✏️、補上去📦、一鍵結清💰 → 同套 outline icon（存在 `app.js` 的 `ICONS` 常數）
3. 使用面板：每個室友頭像下顯示「用了 N 個」；右上角「−」鈕退回最近一筆未結紀錄（多顆扣一顆、單顆刪整筆、已結清擋下）
4. input placeholder 調淡（#C9C9CF），避免看起來像已填值
5. btn-ghost 加淡灰邊框（#DBDBE0）
6. 修正列表底部被 tab 列遮住：根因是 `html,body{height:100%}` 鎖死 body 高度使 padding-bottom 失效，改 `min-height` ＋ 預留空間加到 64px
7. Tab 列 iOS 毛玻璃（`backdrop-filter: blur(22px) saturate(1.7)` ＋半透明白＋白色細框，含 `-webkit-` 前綴）
8. 結清兩顆按鈕黑底 → 品牌漸層（btn-grad）

### 設計慣例（使用者的明確偏好，之後改 UI 請遵守）

- **UI 控制元件（按鈕、tab、連結）用 outline 線條 icon**，不用 emoji；新 icon 加進 `ICONS` 常數，風格：stroke 1.8、round cap/join、currentColor
- **emoji 保留在趣味核心**：物品圖示、室友動物頭像、標題🥚、toast 文案——這些是 App 個性，別動
- 深色只當小面積點綴（FAB、頂部徽章、toast）；大按鈕用漸層或淡色
- 次要按鈕（btn-ghost）：透明底＋淡灰框；placeholder 一律淡於正文

## 技術架構（零依賴，免打包）

| 檔案 | 內容 |
|---|---|
| `index.html` | App shell：header、四個分頁 tab bar（含 outline SVG）、FAB、sheet/toast 容器 |
| `style.css` | 全部樣式，design tokens 在 `:root`；⚠️ html/body 是 `min-height` 不是 `height`（見上面第 6 點的坑） |
| `app.js` | 全部邏輯：資料模型、四頁 render、bottom sheets、結算演算法、`ICONS` outline icon 庫 |
| `sw.js` | Service worker，**network-first**、離線退回快取。改 `ASSETS` 清單時把 `CACHE` 版本號 +1 |
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

- 剩餘量 = `stock - Σ logs.count`（動態計算）；自用（memberId===buyerId）記消耗但金額 0
- 結算：`computeTransfers()` 每人淨額 → 貪婪配對 → 最少轉帳；結清不可逆（logs 標 settledId）
- 兩種「減」：使用面板中央步進器只是設定「這次記幾個」；真正退帳是頭像卡右上角 −（`undoUse`）
- 刪室友/物品有防呆：有未結帳款時擋下

## 未完成事項（優先順序）

1. **（等使用者）手機實測**：使用者要在宿舍公用裝置瀏覽器開網址→加入主畫面，實際用一兩週。目前的 blocking 步驟，程式端沒事可做。
2. **多人同步（候選，尚未決定）**：目前單機 localStorage。若實測後想各自手機記帳，加 Supabase＋帳本共享。**等使用者回饋再動工。** 屆時注意：anon key 可進公開 repo（靠 RLS 保護），其他金鑰不行。
3. 小改進候選（未承諾）：bottom sheet 也做毛玻璃、結清前匯出/備份 JSON、編輯物品名稱與 emoji、結算歷史點開看明細、步進器是否簡化（使用者曾問兩個 − 的差異，可考慮藏掉步進器預設記 1）。

## 注意事項（坑）

- ⚠️ `/Users/maryhou`（家目錄）本身是一個意外的 git repo。本專案已有獨立 repo；在專案外跑 git 指令小心別碰到外層。
- ⚠️ 本機預覽驗證 CSS/JS 改動時，python http.server 沒有 cache 標頭，瀏覽器會吃舊檔——用 `fetch(f, {cache:'reload'})` 逐檔刷新再 `location.reload()`（本 session 反覆用這招）。線上版不受影響。
- 使用者常一邊看預覽一邊自己點——程式化驗證時 DOM 狀態可能被她改掉，查詢前先確認當前分頁。
- inline onclick 依賴 `app.js` 底部 `Object.assign(window, {...})` 匯出，新增函式記得補。
- 金額四捨五入到整數元（`fmt$` / `computeTransfers`）。
