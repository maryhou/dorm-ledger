# HANDOFF — 宿舍小帳本 Dorm Ledger

> 給下一個 session / 接手者的交接文件。最後更新：2026-07-10（v1.3）。

## 專案是什麼

室友共用物品記帳 PWA：新增物品（名稱／單價／買了幾個／誰買的）→ 誰用了就點 +1 記到他頭上 → 結算頁自動互相抵銷、給出最少轉帳方案 → 月底「一鍵結清」整期歸檔。目的是不用每筆小錢都轉帳，月結一次搞定。

UI 走粉彩、大圓角、高趣味風格（動物頭像室友、emoji 物品、俏皮文案），全繁體中文。

## 目前狀態：v1.3 已上線 ✅（補貨邏輯強化＋使用面板打磨）

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

### 2026-07-09 第二輪打磨（v1.2）：手繪素材 ＋ 陽光橘配色（都是使用者逐項點名要的）

素材（放在 `public/Assets/`，使用者自備手繪 jpg，取代原本的 emoji）：

1. 物品空狀態 🏠 → `Home_empty.jpg`（160px 區塊圖，`.empty-gif`）
2. 紀錄空狀態 🧾 → `Record_empty.jpg`（同上）
3. 「先看示範資料」按鈕 👀 → `Eye.jpg`（行內小圖，`.inline-img`）
4. 結算「目前沒有人欠誰錢」🎉 → `Smile.jpg`（行內小圖）
5. 物品面板售罄狀態 🕳️ → `Happy.jpg`（160px 區塊圖，`app.js` item sheet）
6. 移除 hero-card 右下的 💸（`.hero-card::after` 整條刪掉）、副標「累積中…月底一次結清」尾端 💸 也拿掉

（五處手繪圖都已引用並 commit：`Home_empty`／`Record_empty`／`Eye`／`Smile`／`Happy`）

配色（一路試色定案，全站改成陽光橘系；改的是 design token，牽一髮動全身）：

7. **主漸層 `--grad`**：舊霧面萊姆→粉 改成 `linear-gradient(100deg, #F9D42E 0%, #FFB13D 52%, #FF8A3D 100%)`（陽光橘；曾試過洋紅 #FF00B7 太重、粉 #FF6FC5，最後定陽光橘）
8. **動作 accent `--lime`/`--lime-soft`**：萊姆綠 → `#FF8A3D` / 淡橘 `#FFE9CF`（影響 `＋` 加購鈕、tab active 高亮、input focus、chip/emoji 選取）
9. hero-card 用**專屬** 45° 漸層（`linear-gradient(45deg, #F9D42E … #FF8A3D)`，左下更黃）；文字曾試過 `#ff5700` 橘字，最後改回深色 ink（比較清楚）
10. `.btn-grad`／`.fab`／`.item-plus` 文字都 `#fff` 白字；FAB 從深色改主漸層、尺寸 58→50px
11. 白字在漸層黃端對比：靠「把 `--grad` 左端黃色調深成 #F9D42E」解決；曾加 text-shadow 但使用者覺得不夠乾淨已拿掉

### 2026-07-10 這輪（v1.3）：補貨邏輯＋使用面板（都是使用者逐項點名要的）

1. 空狀態手繪圖 `.empty-gif` 160→200px（style.css＋app.js 三處 width/height 屬性同步）
2. 使用面板文案改白話：「先按 ＋− 調好用了幾個，再點頭像記到他帳上 👇」（強調先調數量再點頭像的順序）
3. 「退回」鈕從頭像卡右上角（像刪除徽章會誤會）移到卡片底部，變成「− 退回」文字小藥丸（`.pick-minus` 拿掉絕對定位改流式）
4. **補貨鎖定**：還有剩貨時只能同買家、同單價補（其他室友 chip 和單價框 disabled）——因為帳跟著 item 目前的 price/buyerId 快照記，中途換人改價會把舊庫存算到新人/新價頭上。`restock()` 寫入端也有防呆，DOM 被改也寫不進去
5. **「重新開一批」checkbox**（補上去按鈕上方）：勾了→`it.resetAt = Date.now()`、`stock = n`，所有數量統計（`itemUsed`、使用面板的「用了 N 個」）只算 resetAt 之後的 log；**帳款 log 原封不動**，舊未結帳照常進結算。勾選會即時解鎖換人/改價（舊庫存作廢後就安全了），取消勾選鎖回。文案走白話：「重新開一批：剩下的 N 個不要了，數量從 0 重新數（誰欠誰錢不受影響）」
6. 使用面板頭像探出卡片頂（`margin-top:-40px`，58px 探出 30px）；`.pick-grid` 上方 margin 38px、行距 42px 預留探頭空間

### 設計慣例（使用者的明確偏好，之後改 UI 請遵守）

- **UI 控制元件（按鈕、tab、連結）用 outline 線條 icon**，不用 emoji；新 icon 加進 `ICONS` 常數，風格：stroke 1.8、round cap/join、currentColor
- **趣味核心可用 emoji 或使用者的手繪 jpg**：室友動物頭像、標題🥚、toast、剩三句副標(👇/💚/✨)仍是 emoji；空狀態/示範/結算卡已換手繪圖。素材放 `public/Assets/`，區塊圖套 `.empty-gif`（200px）、行內小圖套 `.inline-img`（1.3em）
- **全站主色是陽光橘**（`--grad` / `--lime`）；漸層按鈕一律白字、hero 卡文字用深色 ink（清楚）
- ⚠️ 慣例更新：**FAB 已從深色改成主漸層**（v1.1 時是深色）。目前深色點綴只剩右上「未結 $XXX」徽章
- 次要按鈕（btn-ghost）：透明底＋淡灰框；placeholder 一律淡於正文
- 改配色優先動 `:root` 的 token（`--grad`/`--lime`/`--lime-soft`），會全站一致；只想改單一元件（如 hero-card 的 45° 漸層）才寫死在該規則上

## 技術架構（零依賴，免打包）

| 檔案 | 內容 |
|---|---|
| `index.html` | App shell：header、四個分頁 tab bar（含 outline SVG）、FAB、sheet/toast 容器 |
| `style.css` | 全部樣式，design tokens 在 `:root`；⚠️ html/body 是 `min-height` 不是 `height`（見上面第 6 點的坑） |
| `app.js` | 全部邏輯：資料模型、四頁 render、bottom sheets、結算演算法、`ICONS` outline icon 庫 |
| `sw.js` | Service worker，**network-first**、離線退回快取。改 `ASSETS` 清單時把 `CACHE` 版本號 +1 |
| `manifest.webmanifest` + `icons/` | PWA 安裝資訊；icon-192/512.png 由 icon.svg 用 qlmanage+sips 轉出 |
| `public/Assets/*.jpg` | 使用者自備手繪裝飾圖；被引用的有 `Home_empty`／`Record_empty`／`Eye`／`Smile`。從根目錄提供，路徑 `public/Assets/xxx.jpg` |
| `.claude/launch.json` | 本機預覽：`autoPort:true`＋`sh -c 'python3 -m http.server ${PORT:-8342}'`（改成 autoPort 是因為 8341 常被別的 session 佔住） |

### 資料模型（localStorage key `dormLedger.v1`）

```
members:     [{id, name, emoji, color: [bg, fg]}]
items:       [{id, name, emoji, price, stock, buyerId, createdAt, resetAt?}]
             // stock=總購入量；resetAt=補貨勾「重新開一批」的時間戳（可能不存在，預設 0）
logs:        [{id, itemId, memberId, count, price, buyerId, ts, settledId}]
             // price/buyerId 是使用當下的快照，補貨改價不影響舊帳
settlements: [{id, ts, label, transfers:[{from,to,amount}], total, logCount}]
```

- 剩餘量 = `stock - Σ logs.count`（動態計算，**只算 `ts >= resetAt` 的 log**，見 `itemUsed()`）；自用（memberId===buyerId）記消耗但金額 0
- 補貨規則：還有剩貨→鎖同買家同單價；勾「重新開一批」→ resetAt 歸零重算、可換人改價，帳款 log 不動
- 結算：`computeTransfers()` 每人淨額 → 貪婪配對 → 最少轉帳；結清不可逆（logs 標 settledId）
- 兩種「減」：使用面板中央步進器只是設定「這次記幾個」；真正退帳是頭像卡底部「− 退回」小藥丸（`undoUse`）
- 刪室友/物品有防呆：有未結帳款時擋下

## 未完成事項（優先順序）

1. **（等使用者）手機實測**：使用者要在宿舍公用裝置瀏覽器開網址→加入主畫面，實際用一兩週。目前的 blocking 步驟，程式端沒事可做。
2. **多人同步（候選，尚未決定）**：目前單機 localStorage。若實測後想各自手機記帳，加 Supabase＋帳本共享。**等使用者回饋再動工。** 屆時注意：anon key 可進公開 repo（靠 RLS 保護），其他金鑰不行。
3. 小改進候選（未承諾）：bottom sheet 也做毛玻璃、結清前匯出/備份 JSON、編輯物品名稱與 emoji、結算歷史點開看明細、步進器是否簡化（使用者曾問兩個 − 的差異，可考慮藏掉步進器預設記 1）。
4. 素材相關收尾：五張手繪圖都已引用並 commit。`public/Assets/` 內有 `Happy_001.jpg` 未使用、未追蹤（使用者放的，用途未定，先不 commit）。`.DS_Store` 已被 `.gitignore` 擋。手繪圖是 jpg 未壓縮，若之後變多可考慮壓一版。

## 注意事項（坑）

- ⚠️ `/Users/maryhou`（家目錄）本身是一個意外的 git repo。本專案已有獨立 repo；在專案外跑 git 指令小心別碰到外層。
- ⚠️ 本機預覽驗證 CSS/JS 改動時，python http.server 沒有 cache 標頭，瀏覽器會吃舊檔——用 `fetch(f, {cache:'reload'})` 逐檔刷新再 `location.reload()`（本 session 反覆用這招）。線上版不受影響。
- 使用者常一邊看預覽一邊自己點——程式化驗證時 DOM 狀態可能被她改掉，查詢前先確認當前分頁。
- inline onclick 依賴 `app.js` 底部 `Object.assign(window, {...})` 匯出，新增函式記得補。
- 金額四捨五入到整數元（`fmt$` / `computeTransfers`）。
