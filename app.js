/* 宿舍小帳本 Dorm Ledger — 室友共用物品記帳 PWA */
"use strict";

/* ---------- Storage ---------- */
const STORE_KEY = "dormLedger.v1";

const PALETTE = [
  ["#F3F8CF", "#B8C43A"], // lime
  ["#FDEBF3", "#E27DA9"], // pink
  ["#E6F4FC", "#63A9CF"], // blue
  ["#F1ECFB", "#9C82D4"], // lavender
  ["#FFF1DE", "#DFA25C"], // peach
  ["#E8F6EA", "#6AAE72"], // mint
];

const ITEM_EMOJIS = ["🥚","🧻","🧴","🧼","🧃","🥛","🍜","☕","🍞","🧀","🍚","🧂","🫧","🧊","🍌","🍫","🧺","💊","🔋","🗑️"];
const MEMBER_EMOJIS = ["🐣","🐰","🐱","🐻","🦊","🐸","🐼","🦄","🐯","🐨","🐷","🦉"];

/* outline icons（與 tab bar 同一套 stroke 風格） */
const ICONS = {
  box: `<svg class="icon-line" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/></svg>`,
  trash: `<svg class="icon-line" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v5.5M14 11v5.5"/></svg>`,
};

let db = load();
let tab = "home";

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* corrupted -> start fresh */ }
  return { members: [], items: [], logs: [], settlements: [] };
}

function save() { localStorage.setItem(STORE_KEY, JSON.stringify(db)); }

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

/* ---------- Helpers ---------- */
const $ = (sel, el = document) => el.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt$ = (n) => "$" + Math.round(n).toLocaleString("en-US");

function member(id) {
  return db.members.find((m) => m.id === id) || { id, name: "前室友", emoji: "👻", color: ["#EFEEE8", "#92929B"] };
}

function itemUsed(itemId) {
  return db.logs.filter((l) => l.itemId === itemId).reduce((s, l) => s + l.count, 0);
}

function unsettledLogs() { return db.logs.filter((l) => !l.settledId); }

/** 每筆未結紀錄：使用者欠買家 count*price（自用不算錢）→ 合併成淨額轉帳（最少轉帳數） */
function computeTransfers(logs) {
  const net = {}; // memberId -> net balance (+應收 / -應付)
  let total = 0;
  for (const l of logs) {
    if (l.memberId === l.buyerId) continue;
    const amt = l.count * l.price;
    net[l.memberId] = (net[l.memberId] || 0) - amt;
    net[l.buyerId] = (net[l.buyerId] || 0) + amt;
    total += amt;
  }
  const debtors = [], creditors = [];
  for (const [id, v] of Object.entries(net)) {
    const r = Math.round(v);
    if (r < 0) debtors.push({ id, amt: -r });
    else if (r > 0) creditors.push({ id, amt: r });
  }
  debtors.sort((a, b) => b.amt - a.amt);
  creditors.sort((a, b) => b.amt - a.amt);
  const transfers = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    if (pay > 0) transfers.push({ from: debtors[i].id, to: creditors[j].id, amount: pay });
    debtors[i].amt -= pay;
    creditors[j].amt -= pay;
    if (debtors[i].amt === 0) i++;
    if (creditors[j].amt === 0) j++;
  }
  return { transfers, total: Math.round(total), net };
}

/* ---------- Render ---------- */
const view = $("#view");

function render() {
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === tab));
  $("#fab").style.display = tab === "home" || tab === "logs" ? "grid" : "none";

  const { total } = computeTransfers(unsettledLogs());
  const badge = $("#headerBadge");
  badge.hidden = total <= 0;
  badge.textContent = `未結 ${fmt$(total)}`;
  $("#subGreeting").textContent = subGreeting(total);

  if (tab === "home") renderHome();
  else if (tab === "logs") renderLogs();
  else if (tab === "settle") renderSettle();
  else renderMembers();
}

function subGreeting(total) {
  if (db.members.length === 0) return "先把室友加進來吧 👇";
  if (total === 0) return "帳目乾乾淨淨，感情好好 💚";
  if (total < 100) return "小錢小錢，月底一起算 ✨";
  return "累積中…月底一次結清 💸";
}

function avatarHTML(m, size = "") {
  return `<span class="avatar ${size}" style="background:${m.color[0]}">${esc(m.emoji)}</span>`;
}

/* ----- Home: items ----- */
function renderHome() {
  if (db.members.length === 0) {
    view.innerHTML = `
      <div class="card empty">
        <span class="big">🏠</span>
        <h3>歡迎搬進來！</h3>
        <p>先加入室友，再開始記東西。<br>誰買的、誰用的，通通記得清清楚楚。</p>
        <button class="btn btn-grad" onclick="sheetAddMember()">加入第一位室友</button>
        <div style="height:10px"></div>
        <button class="btn btn-ghost" onclick="loadDemo()">先看示範資料 👀</button>
      </div>`;
    return;
  }
  if (db.items.length === 0) {
    view.innerHTML = `
      <div class="card empty">
        <span class="big">🧺</span>
        <h3>還沒有共用物品</h3>
        <p>買了一盒蛋？一串衛生紙？<br>按下方 ＋ 記上去，誰用誰付錢。</p>
        <button class="btn btn-grad" onclick="sheetAddItem()">新增第一個物品</button>
      </div>`;
    return;
  }

  const cards = db.items.map((it) => {
    const used = itemUsed(it.id);
    const left = Math.max(0, it.stock - used);
    const pct = it.stock > 0 ? (left / it.stock) * 100 : 0;
    const buyer = member(it.buyerId);
    const color = PALETTE[hashColor(it.id)];
    const out = left === 0;
    return `
      <button class="item-card ${out ? "is-empty" : ""}" onclick="sheetUseItem('${it.id}')">
        <span class="item-emoji" style="background:${color[0]}">${esc(it.emoji)}</span>
        <span class="item-plus">＋</span>
        ${out ? '<span class="badge-out">用完啦</span>' : ""}
        <span class="item-name">${esc(it.name)}</span>
        <span class="item-meta">1 個 <b>${fmt$(it.price)}</b> · 剩 <b>${left}</b>/${it.stock}</span>
        <span class="item-stock"><i style="width:${pct}%"></i></span>
        <span class="item-buyer">${avatarHTML(buyer, "sm")} ${esc(buyer.name)} 買的</span>
      </button>`;
  }).join("");

  view.innerHTML = `
    <div class="section-title">共用物品 <small>點一下 = 用掉一個</small></div>
    <div class="item-grid">${cards}</div>`;
}

function hashColor(id) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 997;
  return h % PALETTE.length;
}

/* ----- Logs ----- */
function renderLogs() {
  const logs = [...db.logs].sort((a, b) => b.ts - a.ts);
  if (logs.length === 0) {
    view.innerHTML = `
      <div class="card empty">
        <span class="big">🧾</span>
        <h3>還沒有使用紀錄</h3>
        <p>回到「物品」頁，用了什麼點一下 +1，<br>這裡就會幫大家記著。</p>
      </div>`;
    return;
  }

  let html = "";
  let curDay = "";
  for (const l of logs) {
    const day = dayLabel(l.ts);
    if (day !== curDay) {
      curDay = day;
      html += `<div class="log-day">${day}</div>`;
    }
    const m = member(l.memberId);
    const b = member(l.buyerId);
    const item = db.items.find((i) => i.id === l.itemId);
    const self = l.memberId === l.buyerId;
    const amt = l.count * l.price;
    html += `
      <div class="log-row ${l.settledId ? "settled" : ""}">
        ${avatarHTML(m)}
        <div class="log-text">
          <b>${esc(m.name)}</b> 用了 ${esc(item ? item.emoji + " " + item.name : "（已刪除）")} ×${l.count}
          <small>${self ? "自己買的，不用付 😎" : `要給 ${esc(b.name)}`}${l.settledId ? " · ✓ 已結清" : ""}</small>
        </div>
        <span class="log-amt ${self ? "zero" : ""}">${self ? "—" : fmt$(amt)}</span>
        ${l.settledId ? "" : `<button class="log-del" onclick="delLog('${l.id}')">✕</button>`}
      </div>`;
  }
  view.innerHTML = html;
}

function dayLabel(ts) {
  const d = new Date(ts);
  const today = new Date();
  const yst = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const same = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const wd = "日一二三四五六"[d.getDay()];
  const base = `${d.getMonth() + 1}月${d.getDate()}日 週${wd}`;
  if (same(d, today)) return "今天 · " + base;
  if (same(d, yst)) return "昨天 · " + base;
  return base;
}

/* ----- Settle ----- */
function renderSettle() {
  const logs = unsettledLogs();
  const { transfers, total, net } = computeTransfers(logs);

  const transferHTML = transfers.length
    ? transfers.map((t) => {
        const f = member(t.from), to = member(t.to);
        return `
          <div class="transfer-row">
            ${avatarHTML(f)} ${esc(f.name)}
            <span class="transfer-arrow">➜</span>
            ${avatarHTML(to)} ${esc(to.name)}
            <span class="transfer-amt">${fmt$(t.amount)}</span>
          </div>`;
      }).join("")
    : `<div class="card" style="text-align:center;color:var(--muted);font-size:14px">目前沒有人欠誰錢 🎉</div>`;

  const balanceHTML = db.members.map((m) => {
    const v = Math.round(net[m.id] || 0);
    const cls = v > 0 ? "plus" : v < 0 ? "minus" : "even";
    const txt = v > 0 ? `可收 ${fmt$(v)}` : v < 0 ? `要付 ${fmt$(-v)}` : "剛剛好";
    return `<div class="balance-row">${avatarHTML(m)} ${esc(m.name)} <span class="amt ${cls}">${txt}</span></div>`;
  }).join("");

  const historyHTML = [...db.settlements].sort((a, b) => b.ts - a.ts).map((s) => `
    <div class="history-card">
      <div class="history-head"><span>${esc(s.label)}</span><span>${fmt$(s.total)}</span></div>
      <div class="history-body">${
        s.transfers.length
          ? s.transfers.map((t) => `${esc(member(t.from).name)} ➜ ${esc(member(t.to).name)} ${fmt$(t.amount)}`).join("　·　")
          : "無需轉帳"
      }　·　共 ${s.logCount} 筆</div>
    </div>`).join("");

  view.innerHTML = `
    <div class="hero-card">
      <div class="hero-label">本期未結總額</div>
      <div class="hero-amt">${fmt$(total)}</div>
      <div class="hero-sub">共 ${logs.length} 筆紀錄 · 建議 ${transfers.length} 筆轉帳搞定</div>
    </div>

    <div class="section-title">這樣轉最省事 <small>已互相抵銷</small></div>
    ${transferHTML}

    ${db.members.length ? `<div class="section-title">各自盈虧</div><div class="card">${balanceHTML}</div>` : ""}

    <div style="height:18px"></div>
    <button class="btn btn-dark" ${logs.length === 0 ? "disabled" : ""} onclick="sheetConfirmSettle()">💰 一鍵結清這一期</button>

    ${historyHTML ? `<div class="section-title">歷史結算</div>${historyHTML}` : ""}`;
}

/* ----- Members ----- */
function renderMembers() {
  const { net } = computeTransfers(unsettledLogs());
  const rows = db.members.map((m) => {
    const v = Math.round(net[m.id] || 0);
    const stat = v > 0 ? `可收 ${fmt$(v)}` : v < 0 ? `要付 ${fmt$(-v)}` : "帳目乾淨";
    const bought = db.items.filter((i) => i.buyerId === m.id).length;
    return `
      <div class="member-row">
        ${avatarHTML(m, "lg")}
        <div style="flex:1">
          <div class="member-name">${esc(m.name)}</div>
          <div class="member-stat">買過 ${bought} 樣 · ${stat}</div>
        </div>
        <button class="log-del" onclick="delMember('${m.id}')">✕</button>
      </div>`;
  }).join("");

  view.innerHTML = `
    <div class="section-title">室友們 <small>共 ${db.members.length} 人</small></div>
    ${rows || ""}
    <div style="height:8px"></div>
    <button class="btn btn-grad" onclick="sheetAddMember()">＋ 加入室友</button>
    <div style="height:10px"></div>
    <button class="btn btn-ghost" onclick="resetAll()">清空全部資料</button>`;
}

/* ---------- Sheets ---------- */
const sheetRoot = $("#sheetRoot");

function openSheet(html) {
  sheetRoot.innerHTML = `
    <div class="sheet-backdrop" onclick="closeSheet()"></div>
    <div class="sheet"><div class="sheet-handle"></div>${html}</div>`;
}
function closeSheet() { sheetRoot.innerHTML = ""; }

/* ----- Add member ----- */
function sheetAddMember() {
  const emojis = MEMBER_EMOJIS.map((e, i) =>
    `<button class="emoji-opt ${i === 0 ? "sel" : ""}" data-emoji="${e}" onclick="pickEmoji(this)">${e}</button>`).join("");
  openSheet(`
    <h2>加入室友 🎉</h2>
    <p class="sheet-sub">取個好認的名字，選一隻代表動物</p>
    <div class="field"><label>名字</label><input id="fMemberName" class="input" placeholder="例如：小美" maxlength="10"></div>
    <div class="field"><label>頭像</label><div class="emoji-row" id="fMemberEmoji">${emojis}</div></div>
    <button class="btn btn-grad" onclick="addMember()">加入</button>`);
  setTimeout(() => $("#fMemberName").focus(), 150);
}

function pickEmoji(btn) {
  btn.parentElement.querySelectorAll(".emoji-opt").forEach((b) => b.classList.remove("sel"));
  btn.classList.add("sel");
}

function addMember() {
  const name = $("#fMemberName").value.trim();
  if (!name) { toast("名字不能空白喔 ✍️"); return; }
  const emoji = $("#fMemberEmoji .sel")?.dataset.emoji || "🐣";
  db.members.push({ id: uid(), name, emoji, color: PALETTE[db.members.length % PALETTE.length] });
  save(); closeSheet(); render();
  toast(`${emoji} ${name} 搬進來了！`);
}

function delMember(id) {
  const m = member(id);
  const involved = unsettledLogs().some((l) => l.memberId === id || l.buyerId === id)
    || db.items.some((i) => i.buyerId === id && itemUsed(i.id) < i.stock);
  if (involved) { toast(`${m.name} 還有未結的帳，先結清再說 💰`); return; }
  if (!confirm(`確定讓 ${m.name} 搬走嗎？`)) return;
  db.members = db.members.filter((x) => x.id !== id);
  save(); render();
  toast(`${m.emoji} ${m.name} 搬走了，一路順風`);
}

/* ----- Add item ----- */
const PRESETS = [
  { name: "蛋", emoji: "🥚", price: 15 },
  { name: "衛生紙", emoji: "🧻", price: 20 },
  { name: "洗衣精", emoji: "🫧", price: 10 },
  { name: "泡麵", emoji: "🍜", price: 45 },
  { name: "鮮奶", emoji: "🥛", price: 30 },
  { name: "咖啡", emoji: "☕", price: 25 },
];

function sheetAddItem() {
  if (db.members.length === 0) { sheetAddMember(); return; }
  const emojis = ITEM_EMOJIS.map((e, i) =>
    `<button class="emoji-opt ${i === 0 ? "sel" : ""}" data-emoji="${e}" onclick="pickEmoji(this)">${e}</button>`).join("");
  const presets = PRESETS.map((p) =>
    `<button class="preset" onclick="applyPreset('${p.emoji}','${p.name}',${p.price})">${p.emoji} ${p.name}</button>`).join("");
  const buyers = db.members.map((m, i) =>
    `<button class="chip ${i === 0 ? "sel" : ""}" data-id="${m.id}" onclick="pickChip(this)">${avatarHTML(m, "sm")} ${esc(m.name)}</button>`).join("");
  openSheet(`
    <h2>新增共用物品 🛒</h2>
    <p class="sheet-sub">快速套用，或自己填</p>
    <div class="preset-row">${presets}</div>
    <div class="field"><label>圖示</label><div class="emoji-row" id="fItemEmoji">${emojis}</div></div>
    <div class="field"><label>名稱</label><input id="fItemName" class="input" placeholder="例如：蛋" maxlength="12"></div>
    <div class="field-row">
      <div class="field"><label>1 個多少錢</label><input id="fItemPrice" class="input" type="number" inputmode="decimal" placeholder="15"></div>
      <div class="field"><label>買了幾個</label><input id="fItemStock" class="input" type="number" inputmode="numeric" placeholder="10"></div>
    </div>
    <div class="field"><label>誰買的（用的人付錢給他）</label><div class="chip-row" id="fItemBuyer">${buyers}</div></div>
    <button class="btn btn-grad" onclick="addItem()">記上去 ✏️</button>`);
}

function applyPreset(emoji, name, price) {
  $("#fItemName").value = name;
  $("#fItemPrice").value = price;
  const opt = $(`#fItemEmoji .emoji-opt[data-emoji="${emoji}"]`);
  if (opt) pickEmoji(opt);
}

function pickChip(btn) {
  btn.parentElement.querySelectorAll(".chip").forEach((b) => b.classList.remove("sel"));
  btn.classList.add("sel");
}

function addItem() {
  const name = $("#fItemName").value.trim();
  const price = parseFloat($("#fItemPrice").value);
  const stock = parseInt($("#fItemStock").value, 10);
  const buyerId = $("#fItemBuyer .sel")?.dataset.id;
  if (!name) { toast("要填名稱喔 ✍️"); return; }
  if (!(price > 0)) { toast("單價要大於 0 💰"); return; }
  if (!(stock > 0)) { toast("數量要至少 1 個 🔢"); return; }
  const emoji = $("#fItemEmoji .sel")?.dataset.emoji || "🧺";
  db.items.push({ id: uid(), name, emoji, price, stock, buyerId, createdAt: Date.now() });
  save(); closeSheet(); tab = "home"; render();
  toast(`${emoji} ${name} ×${stock} 上架！`);
}

/* ----- Use item (+1) ----- */
let useCount = 1;

function sheetUseItem(itemId) {
  const it = db.items.find((i) => i.id === itemId);
  if (!it) return;
  const left = Math.max(0, it.stock - itemUsed(it.id));
  useCount = 1;

  const members = db.members.map((m) => {
    const usedByM = db.logs
      .filter((l) => l.itemId === it.id && l.memberId === m.id)
      .reduce((s, l) => s + l.count, 0);
    const undoable = db.logs.some((l) => l.itemId === it.id && l.memberId === m.id && !l.settledId);
    return `
    <div class="pick-member" onclick="useItem('${it.id}','${m.id}')" style="border:2px solid ${m.color[0]}">
      ${avatarHTML(m, "lg")} ${esc(m.name)}
      <span class="pick-count">${usedByM > 0 ? `用了 ${usedByM} 個` : "還沒用過"}</span>
      ${undoable ? `<button class="pick-minus" onclick="undoUse(event,'${it.id}','${m.id}')" aria-label="退回一個">−</button>` : ""}
    </div>`;
  }).join("");

  openSheet(`
    <h2>${esc(it.emoji)} ${esc(it.name)}</h2>
    <p class="sheet-sub">1 個 ${fmt$(it.price)} · 還剩 ${left} 個 · ${esc(member(it.buyerId).name)} 買的</p>
    ${left > 0 ? `
      <div class="stepper">
        <button onclick="stepUse(-1)">−</button>
        <span class="count" id="useCount">1</span>
        <button onclick="stepUse(1)">＋</button>
      </div>
      <p class="sheet-sub" style="text-align:center;margin-top:-8px">誰用的？點頭像直接記帳 👇</p>
      <div class="pick-grid">${members}</div>`
      : `<div class="empty" style="padding:18px"><span class="big">🕳️</span><p>用完啦！要再買記得補貨</p></div>`}
    <div class="sheet-links">
      <button onclick="sheetRestock('${it.id}')">${ICONS.box} 補貨</button>
      <button class="danger" onclick="delItem('${it.id}')">${ICONS.trash} 刪除物品</button>
    </div>`);
}

function stepUse(d) {
  useCount = Math.max(1, Math.min(99, useCount + d));
  $("#useCount").textContent = useCount;
}

function useItem(itemId, memberId) {
  const it = db.items.find((i) => i.id === itemId);
  if (!it) return;
  const left = it.stock - itemUsed(it.id);
  const count = Math.min(useCount, left);
  if (count <= 0) { toast("已經用完了 🕳️"); return; }
  db.logs.push({ id: uid(), itemId, memberId, count, price: it.price, buyerId: it.buyerId, ts: Date.now(), settledId: null });
  save(); closeSheet(); render();
  const m = member(memberId);
  const self = memberId === it.buyerId;
  toast(self
    ? `${m.emoji} ${m.name} 用了自己的 ${it.name} ×${count} 😎`
    : `${m.emoji} ${m.name} 用了 ${it.name} ×${count}，記 ${fmt$(count * it.price)} ✏️`);
}

function undoUse(ev, itemId, memberId) {
  ev.stopPropagation();
  const candidates = db.logs.filter((l) => l.itemId === itemId && l.memberId === memberId && !l.settledId);
  if (candidates.length === 0) { toast("已結清的紀錄不能退回 🔒"); return; }
  const last = candidates.reduce((a, b) => (b.ts > a.ts ? b : a));
  if (last.count > 1) last.count -= 1;
  else db.logs = db.logs.filter((l) => l.id !== last.id);
  save();
  const m = member(memberId);
  const it = db.items.find((i) => i.id === itemId);
  toast(`↩️ 退回 ${m.name} 的 1 個${it ? " " + it.name : ""}`);
  sheetUseItem(itemId); // 重建面板，更新「用了幾個」與剩餘量
  render();
}

function delLog(id) {
  const l = db.logs.find((x) => x.id === id);
  if (!l || l.settledId) return;
  db.logs = db.logs.filter((x) => x.id !== id);
  save(); render();
  toast("已刪除這筆紀錄 🧽");
}

/* ----- Restock ----- */
function sheetRestock(itemId) {
  const it = db.items.find((i) => i.id === itemId);
  if (!it) return;
  const buyers = db.members.map((m) =>
    `<button class="chip ${m.id === it.buyerId ? "sel" : ""}" data-id="${m.id}" onclick="pickChip(this)">${avatarHTML(m, "sm")} ${esc(m.name)}</button>`).join("");
  openSheet(`
    <h2>補貨 ${esc(it.emoji)} ${esc(it.name)}</h2>
    <p class="sheet-sub">之前的使用紀錄照舊，新的價錢從現在開始算</p>
    <div class="field-row">
      <div class="field"><label>這次買幾個</label><input id="fRestockN" class="input" type="number" inputmode="numeric" placeholder="10"></div>
      <div class="field"><label>1 個多少錢</label><input id="fRestockP" class="input" type="number" inputmode="decimal" value="${it.price}"></div>
    </div>
    <div class="field"><label>這次誰買的</label><div class="chip-row" id="fRestockBuyer">${buyers}</div></div>
    <button class="btn btn-grad" onclick="restock('${it.id}')">補上去 📦</button>`);
}

function restock(itemId) {
  const it = db.items.find((i) => i.id === itemId);
  const n = parseInt($("#fRestockN").value, 10);
  const p = parseFloat($("#fRestockP").value);
  const buyerId = $("#fRestockBuyer .sel")?.dataset.id;
  if (!it) return;
  if (!(n > 0)) { toast("數量要至少 1 個 🔢"); return; }
  if (!(p > 0)) { toast("單價要大於 0 💰"); return; }
  it.stock += n;
  it.price = p;
  it.buyerId = buyerId || it.buyerId;
  save(); closeSheet(); render();
  toast(`${it.emoji} ${it.name} 補了 ${n} 個！`);
}

function delItem(itemId) {
  const it = db.items.find((i) => i.id === itemId);
  if (!it) return;
  const hasUnsettled = unsettledLogs().some((l) => l.itemId === itemId && l.memberId !== l.buyerId);
  if (hasUnsettled) { toast("這個物品還有未結的帳，先結清再刪 💰"); return; }
  if (!confirm(`確定刪除「${it.name}」嗎？相關紀錄會一起消失。`)) return;
  db.items = db.items.filter((i) => i.id !== itemId);
  db.logs = db.logs.filter((l) => l.itemId !== itemId || l.settledId);
  save(); closeSheet(); render();
  toast(`${it.emoji} ${it.name} 已下架`);
}

/* ----- Settle ----- */
function sheetConfirmSettle() {
  const logs = unsettledLogs();
  const { transfers, total } = computeTransfers(logs);
  const lines = transfers.length
    ? transfers.map((t) => `
        <div class="transfer-row">
          ${avatarHTML(member(t.from))} ${esc(member(t.from).name)}
          <span class="transfer-arrow">➜</span>
          ${avatarHTML(member(t.to))} ${esc(member(t.to).name)}
          <span class="transfer-amt">${fmt$(t.amount)}</span>
        </div>`).join("")
    : `<p class="sheet-sub">沒有人欠錢，直接把 ${logs.length} 筆紀錄歸檔。</p>`;
  openSheet(`
    <h2>確認結清 💰</h2>
    <p class="sheet-sub">照下面轉完帳，按確認就整期歸檔（不能反悔喔）</p>
    ${lines}
    <div style="height:10px"></div>
    <button class="btn btn-dark" onclick="doSettle()">✓ 大家都轉好了，結清！</button>
    <div style="height:8px"></div>
    <button class="btn btn-ghost" onclick="closeSheet()">再等等</button>`);
}

function doSettle() {
  const logs = unsettledLogs();
  if (logs.length === 0) { closeSheet(); return; }
  const { transfers, total } = computeTransfers(logs);
  const sid = uid();
  const d = new Date();
  db.settlements.push({
    id: sid, ts: Date.now(),
    label: `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 結算`,
    transfers, total, logCount: logs.length,
  });
  for (const l of logs) l.settledId = sid;
  save(); closeSheet(); render();
  toast(`🎉 結清 ${fmt$(total)}，下一期重新開始！`);
}

/* ----- Misc ----- */
function resetAll() {
  if (!confirm("確定清空所有資料嗎？室友、物品、紀錄都會消失，無法復原。")) return;
  db = { members: [], items: [], logs: [], settlements: [] };
  save(); tab = "home"; render();
  toast("已清空，重新開始 🌱");
}

function loadDemo() {
  const [m1, m2, m3] = [uid(), uid(), uid()];
  const [i1, i2, i3] = [uid(), uid(), uid()];
  const day = 86400000;
  const now = Date.now();
  db = {
    members: [
      { id: m1, name: "小美", emoji: "🐰", color: PALETTE[0] },
      { id: m2, name: "阿哲", emoji: "🐻", color: PALETTE[1] },
      { id: m3, name: "球球", emoji: "🐱", color: PALETTE[2] },
    ],
    items: [
      { id: i1, name: "蛋", emoji: "🥚", price: 15, stock: 10, buyerId: m1, createdAt: now - 6 * day },
      { id: i2, name: "衛生紙", emoji: "🧻", price: 20, stock: 12, buyerId: m2, createdAt: now - 5 * day },
      { id: i3, name: "泡麵", emoji: "🍜", price: 45, stock: 6, buyerId: m3, createdAt: now - 3 * day },
    ],
    logs: [
      { id: uid(), itemId: i1, memberId: m2, count: 2, price: 15, buyerId: m1, ts: now - 4 * day, settledId: null },
      { id: uid(), itemId: i1, memberId: m3, count: 1, price: 15, buyerId: m1, ts: now - 3 * day, settledId: null },
      { id: uid(), itemId: i2, memberId: m1, count: 3, price: 20, buyerId: m2, ts: now - 2 * day, settledId: null },
      { id: uid(), itemId: i3, memberId: m1, count: 1, price: 45, buyerId: m3, ts: now - day, settledId: null },
      { id: uid(), itemId: i1, memberId: m1, count: 1, price: 15, buyerId: m1, ts: now - day, settledId: null },
      { id: uid(), itemId: i3, memberId: m2, count: 1, price: 45, buyerId: m3, ts: now, settledId: null },
    ],
    settlements: [],
  };
  save(); render();
  toast("示範資料好了，隨便玩 🎈");
}

/* ---------- Toast ---------- */
function toast(msg) {
  const root = $("#toastRoot");
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => {
    el.classList.add("out");
    setTimeout(() => el.remove(), 350);
  }, 2200);
}

/* ---------- Wire up ---------- */
$("#tabbar").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  tab = btn.dataset.tab;
  render();
});

$("#fab").addEventListener("click", () => sheetAddItem());

document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });

/* expose for inline handlers */
Object.assign(window, {
  sheetAddMember, addMember, delMember, pickEmoji, pickChip,
  sheetAddItem, applyPreset, addItem,
  sheetUseItem, stepUse, useItem, undoUse, delLog,
  sheetRestock, restock, delItem,
  sheetConfirmSettle, doSettle, resetAll, loadDemo, closeSheet,
});

render();

/* ---------- PWA ---------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
