# 宿舍小帳本 Dorm Ledger 🥚

室友共用物品記帳 PWA——誰買的、誰用的，點一下就記好，月底一鍵結清，不用一直轉帳。

## 怎麼用

1. **加室友**：每人取名字＋選一隻代表動物。
2. **新增物品**：例如「蛋，1 顆 $15，買了 10 顆，小美買的」。有常用品一鍵套用。
3. **用了就點 +1**：點物品卡片 → 點是誰用的，自動記「他欠買的人 $15」。用自己買的東西不算錢。剩餘量會顯示在卡片上，用完可「補貨」。
4. **月底結算**：「結算」頁自動互相抵銷，算出最少轉帳方案（例如：小美 → 球球 $45）。大家轉完帳按「一鍵結清」，整期歸檔進歷史紀錄。

## 技術

- 純 HTML / CSS / JavaScript，零依賴、免打包。
- 資料存在瀏覽器 `localStorage`（一台裝置當公帳本，例如貼在冰箱旁的平板或誰的手機）。
- PWA：可「加入主畫面」變成 App，離線也能用（service worker 為 network-first，斷線退回快取）。

## 在本機跑

```sh
python3 -m http.server 8341
# 打開 http://localhost:8341
```

手機安裝：部署到任何 HTTPS 靜態空間（GitHub Pages、Netlify、Cloudflare Pages…），用手機瀏覽器開啟 → 分享 → 加入主畫面。

## 檔案結構

- `index.html` / `style.css` / `app.js` — 全部的 UI 與邏輯
- `manifest.webmanifest` + `icons/` — PWA 安裝資訊與圖示
- `sw.js` — 離線快取（改版時記得把 `CACHE` 版本號 +1）
