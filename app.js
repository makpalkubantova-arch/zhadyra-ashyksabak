// ===== сақтау =====
const store = {
  get(k, d) { try { const v = localStorage.getItem("zh_" + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("zh_" + k, JSON.stringify(v)); } catch (e) {} }
};
const G = id => GROUPS.find(g => g.id === id);
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function defaultStudents() {
  const list = []; let n = 1;
  GROUPS.forEach(g => { for (let i = 0; i < g.count; i++) list.push({ name: n++ + "-оқушы", g: g.id, st: 0, bk: 0, ws: 0 }); });
  return list;
}
let S = store.get("students", null) || defaultStudents();
const saveS = () => store.set("students", S);
const total = s => (s.st || 0) + (s.bk || 0) + (s.ws || 0);

let state = store.get("state", { intro: [], board: {}, fb: [[0, 0, 0], [0, 0, 0]], video: "" });
const saveState = () => store.set("state", state);

// ===== таймер =====
let timerInt = null;
function timerHTML(sec) {
  return `<div class="timer" id="timer" data-sec="${sec}"><span class="t">${fmt(sec)}</span>
  <button onclick="tStart()">▶</button><button onclick="tPause()">⏸</button><button onclick="tReset()">↺</button></div>`;
}
function fmt(s) { return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); }
let tLeft = 0;
function tInit() { clearInterval(timerInt); timerInt = null; const el = $("#timer"); if (el) tLeft = +el.dataset.sec; }
function tStart() {
  if (timerInt) return;
  timerInt = setInterval(() => {
    tLeft = Math.max(0, tLeft - 1);
    const el = $("#timer"); if (!el) { clearInterval(timerInt); timerInt = null; return; }
    el.querySelector(".t").textContent = fmt(tLeft);
    if (tLeft === 0) { clearInterval(timerInt); timerInt = null; el.classList.add("end"); beep(); if (window.onTimerEnd) window.onTimerEnd(); }
  }, 1000);
}
function tPause() { clearInterval(timerInt); timerInt = null; }
function tReset() { tPause(); const el = $("#timer"); tLeft = +el.dataset.sec; el.classList.remove("end"); el.querySelector(".t").textContent = fmt(tLeft); }
function beep() { try { const c = new (window.AudioContext || window.webkitAudioContext)(); const o = c.createOscillator(); o.frequency.value = 880; o.connect(c.destination); o.start(); setTimeout(() => { o.stop(); c.close(); }, 700); } catch (e) {} }

// ===== 1 балл беру (кім жауап берді?) =====
function award(cb) {
  const cols = GROUPS.map(g => `<div class="col"><h4 style="color:${g.color}">${g.name}</h4>` +
    S.map((s, i) => s.g === g.id ? `<button class="${s.st ? "has" : ""}" onclick="giveSt(${i})"><span class="dot" style="background:${g.color}"></span>${esc(s.name)}${s.st ? " ✓" : ""}</button>` : "").join("") + `</div>`).join("");
  openModal(`<h2>Кім жауап берді? (+1 балл)</h2><p class="sub">Сұр түстегілер баллын алып қойған.</p><div class="who">${cols}</div>
  <div class="row" style="margin-top:14px"><button class="btn ghost" onclick="closeModal()">Жабу</button></div>`);
  window._awardCb = cb;
}
function giveSt(i) { S[i].st = 1; saveS(); closeModal(); if (window._awardCb) window._awardCb(i); }
function openModal(html) { $("#modalBox").innerHTML = html; $("#modal").classList.remove("hidden"); }
function closeModal() { $("#modal").classList.add("hidden"); }
$("#modal").addEventListener("click", e => { if (e.target.id === "modal") closeModal(); });

// ===== кезеңдер =====
const STAGES = [
  { t: "Басы", min: "0,5 мин", r: rTitle, m: "Ұйымдастыру" },
  { t: "Дәйексөз", min: "4,5 мин", r: rIntro, m: "Әдіс: «Дәйексөз — менің тобым»" },
  { t: "Бейне", min: "5 мин", r: rVideo, m: "Әдіс: «Көрдім — Білдім — Сұраймын»" },
  { t: "Тақта + спикер", min: "8 мин", r: rBoard, m: "Әдіс: «Кезекпен тақтаға» + «Спикерлер алаңы»" },
  { t: "Спикерлер", min: "7 мин", r: rSpeakers, m: "Әдіс: «Спикерлер алаңы» (оқушы оқушыға түсіндіреді)" },
  { t: "Оқулық", min: "5 мин", r: rBook, m: "Әдіс: «Детектив» (оқулықтан іздеу)" },
  { t: "Жұмыс парағы", min: "7 мин", r: rWorksheet, m: "Әдіс: «Таймермен жеке жұмыс» (саралап оқыту, 5 нұсқа)" },
  { t: "Тексеру", min: "5 мин", r: rCheck, m: "Әдіс: «Үш сүзгі» — өзін-өзі, өзара, мұғалім" },
  { t: "Рейтинг", min: "1 мин", r: rRating, m: "Әдіс: «Көшбасшылар тұғыры»" },
  { t: "Кері байланыс", min: "2 мин", r: rFeedback, m: "Әдіс: «Тамшының жолы» (Өзен · Көл · Батпақ)" }
];
let cur = store.get("stage", 0);
function go(i) {
  cur = Math.max(0, Math.min(STAGES.length - 1, i)); store.set("stage", cur);
  window.onTimerEnd = null;
  $("#stage").innerHTML = STAGES[cur].r();
  tInit();
  $("#nav").innerHTML = STAGES.map((s, k) => `<button class="${k === cur ? "on" : k < cur ? "done" : ""}" onclick="go(${k})">${k + 1}. ${s.t}</button>`).join("");
  $("#prog").style.width = ((cur + 1) / STAGES.length * 100) + "%";
  $("#stageInfo").textContent = `${cur + 1} / ${STAGES.length} · ${STAGES[cur].t}`;
  $("#topic").innerHTML = `<b>Тақырып:</b> ${LESSON.topic}`;
  window.scrollTo(0, 0);
  if (STAGES[cur].after) STAGES[cur].after();
}
$("#prev").onclick = () => go(cur - 1);
$("#next").onclick = () => go(cur + 1);
document.addEventListener("keydown", e => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
  if (e.key === "ArrowRight" || e.key === "PageDown") go(cur + 1);
  if (e.key === "ArrowLeft" || e.key === "PageUp") go(cur - 1);
  if (e.key === "Escape") closeModal();
});
const head = (title, sub) => `<div class="shead"><div class="method">${STAGES[cur].m || ""}</div><h2>${title}</h2><div class="sub">${sub || ""}</div></div>`;

// 1. Басы
function rTitle() {
  return `<div class="title-page">
    <div class="meta">${LESSON.school}<br>Мұғалім: ${LESSON.teacher}</div>
    <div class="hello">👋</div>
    <h1>Сәлеметсіздер ме, балалар!</h1>
    <div class="groups-strip">${GROUPS.map(g => `<span class="gchip" style="background:${g.color}">${g.icon} ${g.name}</span>`).join("")}</div>
  </div>`;
}

// 2. «Дәйексөз — менің тобым»
const SLOT_ORDER = ["ozen", "kol", "muzdyk", "batpak", "zherasty"];
function rIntro() {
  const opened = state.intro;
  const cards = QUOTES.map((d, i) => { const g = G(d.g); const o = opened.includes(i);
    return `<div class="drop q ${o ? "open" : ""}" onclick="openIntro(${i})"><div class="in">
      <div class="f qf"><div class="num">${i + 1}</div><div class="qt">«${d.q}»</div><div class="au">— ${d.a}</div></div>
      <div class="b" style="background:linear-gradient(160deg,${g.color},${g.color}dd)"><div style="font-size:30px">${g.icon}</div><div class="nm" style="margin-top:2px">${g.name}</div><div class="tx">${d.why}</div></div></div></div>`; }).join("");
  const has = id => opened.some(i => QUOTES[i].g === id);
  const slot = id => `<span class="slot ${has(id) ? "fill" : ""}" data-g="${id}">${GOAL_KEYS[id]}</span>`;
  const all = SLOT_ORDER.every(has);
  return head("«Дәйексөз — менің тобым»", "Дәйексөзді орныңнан дауыстап оқы → «Менің тобым — ..., себебі ...» де → карточканы аш.") +
    `<div class="grid5 qgrid">${cards}</div>
    <div class="goalbox">Мен бүгін құрлық суларының ${slot("ozen")}, ${slot("kol")} ${slot("muzdyk")} және олардың ${slot("batpak")} ${slot("zherasty")}.</div>
    <div class="row" style="margin-top:14px"><button class="btn" id="btnGoals" onclick="showGoals()" ${all ? "" : "disabled style='opacity:.4'"}>Тақырып пен мақсатты ашу</button>
    <button class="btn ghost" onclick="state.intro=[];state.goalsShown=false;saveState();go(cur)">Қайта бастау</button></div>
    <div id="goals" class="reveal ${state.goalsShown ? "" : "hidden"}"><b>Тақырып:</b> ${LESSON.topic}<br>
      <b>1-мақсат:</b> ${LESSON.goals[0]}.<br><b>2-мақсат:</b> ${LESSON.goals[1]}.<br>
      <b>Бағалау:</b> ${CRITERIA.map(c => `${c.name} — ${c.max} б.`).join(" · ")} · <b>Барлығы — 10 балл</b></div>`;
}
function openIntro(i) {
  if (state.intro.includes(i)) return;
  state.intro.push(i); saveState();
  document.querySelectorAll(".drop")[i].classList.add("open");
  const sl = document.querySelector(`.slot[data-g="${QUOTES[i].g}"]`); if (sl) sl.classList.add("fill");
  const b = document.querySelector("#btnGoals");
  if (SLOT_ORDER.every(id => state.intro.some(k => QUOTES[k].g === id)) && b) { b.disabled = false; b.style.opacity = 1; }
}
function showGoals() { state.goalsShown = true; saveState(); $("#goals").classList.remove("hidden"); confetti(); }

// 3. Бейне
function ytEmbed(u) {
  const m = u.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : u;
}
function rVideo() {
  const v = state.video || "kurlyk_sulary.mp4";
  const player = v ? (/\.(mp4|webm)$/i.test(v) ? `<video src="${esc(v)}" controls></video>` : `<iframe src="${esc(ytEmbed(v))}" allowfullscreen></iframe>`)
    : `<div>Видео сілтемесін төменге қойыңыз</div>`;
  return head("Бейнежазба және түсіндіру", "Видеоны көреміз → әр топ: «Не көрдім? Не білемін? Не сұраймын?» → мұғалімнің сұрақтары.") +
    `<div class="grid3" style="grid-template-columns:3fr 2fr">
      <div><div class="video">${player}</div>
        <div class="row" style="margin-top:10px"><input id="vurl" placeholder="Басқа видео қойғыңыз келсе — YouTube сілтемесі" value="${esc(state.video)}" style="flex:1;padding:10px;border-radius:10px;border:1px solid var(--line);font-size:15px">
        <button class="btn ghost" onclick="state.video=$('#vurl').value.trim();saveState();go(cur)">Қою</button></div></div>
      <div class="card"><h3 style="margin-top:0">Мұғалімнің сұрақтары</h3>
        ${VIDEO_Q.map((q, i) => `<div class="qa"><b>${i + 1}.</b> ${q.q}
          <div class="row" style="margin-top:6px"><button class="btn ghost" style="padding:5px 10px;font-size:14px" onclick="this.parentNode.nextElementSibling.classList.toggle('hidden')">Жауабы</button>
          <button class="btn ok" style="padding:5px 10px;font-size:14px" onclick="award()">+1 балл</button></div>
          <div class="a hidden">${q.a}</div></div>`).join("")}
      </div></div>`;
}

// 4. Тақтадағы 15 сұрақ (спикерлер дайындалып жатқанда)
function rBoard() {
  const b = state.board;
  return head("Тақтадағы 15 сұрақ", "5 спикер дайындық парағымен дайындалады. Қалғандары тақтаға кезекпен шығады: 1 сұрақ — 1 оқушы — 1 балл.") +
    `<div class="row" style="margin-bottom:14px">${timerHTML(480)}</div>
    <div class="tiles">${BOARD_Q.map((q, i) => `<button class="tile ${b[i] === true ? "ok" : b[i] === false ? "no" : ""}" onclick="openQ(${i})">${i + 1}</button>`).join("")}</div>`;
}
function openQ(i) {
  const q = BOARD_Q[i];
  openModal(`<div class="sub">${i + 1}-сұрақ · оқулық ${q.p}-бет</div><div class="qbig">${q.q}</div>
    <div class="opts">${q.o.map((o, k) => `<button class="opt" onclick="answerQ(${i},${k},this)">${String.fromCharCode(65 + k)}) ${o}</button>`).join("")}</div>
    <div class="row" id="qafter" style="margin-top:16px"></div>`);
}
function answerQ(i, k, el) {
  const q = BOARD_Q[i]; const ok = k === q.a;
  document.querySelectorAll(".opt").forEach((b, n) => { b.disabled = true; if (n === q.a) b.classList.add("ok"); });
  if (!ok) el.classList.add("no");
  state.board[i] = ok; saveState();
  if (ok) confetti();
  $("#qafter").innerHTML = (ok ? `<b style="color:var(--ok);font-size:22px">Дұрыс! 🎉</b><button class="btn ok" onclick="award(()=>go(cur))">+1 балл беру</button>`
    : `<b style="color:var(--bad);font-size:22px">Қате. Дұрыс жауабы — жасыл.</b>`) + `<button class="btn ghost" onclick="closeModal();go(cur)">Жабу</button>`;
}

// 5. Спикерлер
let spkTab = 0;
function rSpeakers() {
  const g = GROUPS[spkTab]; const sp = SPEAKERS[g.id];
  return head("Спикерлер сыныпқа түсіндіреді", "Спикер өз суын жоспар бойынша түсіндіреді. Сынып тыңдап, 1 сұрақ қояды.") +
    `<div class="tabs">${GROUPS.map((x, k) => `<button class="${k === spkTab ? "on" : ""}" style="background:${x.color};color:#fff" onclick="spkTab=${k};go(cur)">${x.icon} ${x.name}</button>`).join("")}</div>
    <div class="spk" style="background:${g.light};border:2px solid ${g.color}">
      <h2 style="color:${g.color}">${g.icon} ${g.name}</h2>
      <ol>${sp.plan.map(p => `<li><b>${p[0]}</b></li>`).join("")}</ol>
      <div class="sub">Оқулық: ${sp.pages}-беттер</div>
      <button class="btn ok" onclick="award()">Спикерге +1 балл</button>
    </div>`;
}

// 6. Оқулықпен жұмыс
function rBook() {
  return head(BOOK_TASK.title, "Жауапты оқулықтан «детективтей» іздеп, дәптерге жазамыз. " + BOOK_TASK.descr) +
    `<div class="row" style="margin-bottom:14px">${timerHTML(300)}<button class="btn ok" onclick="document.querySelectorAll('.ans').forEach(e=>e.classList.toggle('hidden'))">Дескрипторды ашу</button></div>
    <div class="card" style="font-size:20px;margin-bottom:14px">${BOOK_TASK.text}</div>
    <table><tr><th style="width:24%">Су түрі</th><th>Шаруашылықта пайдаланылуы</th><th style="width:10%">Балл</th></tr>
    ${BOOK_TASK.rows.map(r => `<tr><td><b>${r[0]}</b></td><td><span class="ans hidden">${r[1]}</span></td><td>1</td></tr>`).join("")}
    <tr><td colspan="2" style="text-align:right"><b>Барлығы</b></td><td><b>4</b></td></tr></table>`;
}

// 7. Жұмыс парақтары
function rWorksheet() {
  window.onTimerEnd = () => { $("#wsEnd").classList.remove("hidden"); };
  return head("Жұмыс парақтары", "Әр оқушыда әртүрлі нұсқа. 5 тапсырма — 5 балл. Уақыт біткенде қалам қойылады.") +
    `<div style="text-align:center;margin:30px 0">${timerHTML(420).replace('class="timer"', 'class="timer" style="transform:scale(1.8);transform-origin:center"')}</div>
    <div class="grid5">${WORKSHEETS.map(w => `<div class="card" style="text-align:center"><div style="font-size:40px">📄</div><b>${w.n}-нұсқа</b><div class="sub" style="margin:4px 0 0">5 тапсырма</div></div>`).join("")}</div>
    <div id="wsEnd" class="reveal hidden" style="text-align:center;font-size:26px">⏰ Уақыт бітті! Қаламдарды қойыңдар → <b>Тексеру</b></div>`;
}

// 8. Тексеру + бағалау
let chkStep = 0, chkVar = 0;
function rCheck() {
  const steps = ["1. Өзін-өзі тексеру", "2. Көршісімен алмасып тексеру", "3. Мұғалім баллды қояды"];
  const w = WORKSHEETS[chkVar];
  const answers = `<div class="tabs">${WORKSHEETS.map((x, k) => `<button class="${k === chkVar ? "on" : ""}" style="background:var(--blue)" onclick="chkVar=${k};go(cur)">${x.n}-нұсқа</button>`).join("")}</div>
    <table><tr><th style="width:5%">№</th><th style="width:42%">Тапсырма</th><th>Дұрыс жауап (дескриптор)</th><th style="width:7%">Балл</th></tr>
    ${w.tasks.map((t, i) => `<tr><td>${i + 1}</td><td>${t[0]}</td><td class="ans">${t[1]}</td><td>1</td></tr>`).join("")}</table>`;
  const table = `<table class="score"><tr><th>№</th><th>Оқушы</th>${CRITERIA.map(c => `<th>${c.name}<br><small style="font-weight:400;color:var(--muted)">${c.d} · 0–${c.max}</small></th>`).join("")}<th>Барлығы</th></tr>
    ${S.map((s, i) => `<tr><td>${i + 1}</td><td><span class="dot" style="background:${G(s.g).color}"></span>${esc(s.name)}</td>
      ${CRITERIA.map(c => `<td><div class="pick">${Array.from({ length: c.max + 1 }, (_, v) => `<button class="${(s[c.id] || 0) === v ? "on" : ""}" onclick="setScore(${i},'${c.id}',${v})">${v}</button>`).join("")}</div></td>`).join("")}
      <td class="total" id="tot${i}">${total(s)}</td></tr>`).join("")}</table>`;
  return head("Тексеру және бағалау", "Тақтада жауаптар ашылады → өзін-өзі тексереді → көршісімен алмасады → мұғалім критерий бойынша балл қояды.") +
    `<div class="steps">${steps.map((s, k) => `<div class="${k === chkStep ? "on" : ""}" onclick="chkStep=${k};go(cur)" style="cursor:pointer">${s}</div>`).join("")}</div>
    ${chkStep < 2 ? answers : table}`;
}
function setScore(i, c, v) {
  S[i][c] = v; saveS();
  const btns = event.target.parentNode.querySelectorAll("button");
  btns.forEach((b, k) => b.classList.toggle("on", k === v));
  $("#tot" + i).textContent = total(S[i]);
}

// 9. Рейтинг
function rRating() {
  const sorted = S.map(s => ({ ...s, t: total(s) })).sort((a, b) => b.t - a.t);
  let place = 0, prev = null;
  const rows = sorted.map((s, k) => { if (s.t !== prev) { place = k + 1; prev = s.t; }
    const medal = place === 1 ? "🥇" : place === 2 ? "🥈" : place === 3 ? "🥉" : place;
    return `<div class="rank r${place <= 3 ? place : ""}"><span class="n">${medal}</span><span><span class="dot" style="background:${G(s.g).color}"></span>${esc(s.name)}</span><span class="s">${s.t} / 10</span></div>`; }).join("");
  const top = sorted.slice(0, 3);
  const pod = [1, 0, 2].map(k => top[k] ? `<div class="pod p${k + 1}"><div style="font-size:40px">${["🥇","🥈","🥉"][k]}</div><div class="nm"><span class="dot" style="background:${G(top[k].g).color}"></span>${esc(top[k].name)}</div><div class="bar">${top[k].t}<small>балл</small></div></div>` : "").join("");
  setTimeout(confetti, 600);
  return head("Оқушылар рейтингі 🏆", "Бағалау критерийлері бойынша — жоғарыдан төменге") + `<div class="podium">${pod}</div><div class="rankcols">${rows}</div>`;
}

// 10. Кері байланыс
function rFeedback() {
  const opts = [["🌊", "Жеттім", "#1e6fd9", "Өзендей ары қарай ағамын"], ["🏞", "Жартылай жеттім", "#17a673", "Көлдей тоқтап, ойланамын"], ["🟫", "Жетпедім", "#8a6a3b", "Батпақтай тұрып қалдым, көмек керек"]];
  return head("Кері байланыс: мақсатқа жеттім бе?", "Әр оқушы дәйексөз карточкасын сәйкес бағанға жапсырып, бір сөйлеммен себебін айтады. Мұғалім санын белгілейді.") +
    LESSON.goals.map((gl, gi) => `<div class="card" style="margin-bottom:14px"><div style="font-size:20px"><b>${gi + 1}-мақсат:</b> ${gl}</div>
      <div class="fb">${opts.map((o, k) => `<div class="fbc" style="background:${o[2]}"><div class="ic">${o[0]}</div><div class="lb">${o[1]}</div><div style="opacity:.9">${o[3]}</div>
        <div class="cnt">${state.fb[gi][k]}</div><button onclick="fb(${gi},${k},-1)">−</button><button onclick="fb(${gi},${k},1)">+</button></div>`).join("")}</div></div>`).join("") +
    `<div class="reveal"><b>Үй тапсырмасы:</b> ${HOMEWORK}</div>`;
}
function fb(g, k, d) { state.fb[g][k] = Math.max(0, state.fb[g][k] + d); saveState(); go(cur); }

// ===== оқушылар тізімі =====
$("#btnSetup").onclick = () => {
  const txt = GROUPS.map(g => g.name + ":\n" + S.filter(s => s.g === g.id).map(s => s.name).join("\n")).join("\n\n");
  openModal(`<h2>Оқушылар тізімі</h2><p class="sub">Әр топтың атынан кейін оқушылардың аты-жөнін жаңа жолдан жазыңыз (топ атауы өзгермесін).</p>
    <textarea id="roster" rows="22">${esc(txt)}</textarea>
    <div class="row" style="margin-top:12px"><button class="btn" onclick="saveRoster()">Сақтау</button>
    <button class="btn ghost" onclick="if(confirm('Барлық балл мен белгілер өшеді. Жалғастырасыз ба?')){resetAll()}">Баллдарды тазалау</button>
    <button class="btn ghost" onclick="closeModal()">Жабу</button></div>`);
};
function saveRoster() {
  const lines = $("#roster").value.split("\n").map(l => l.trim()).filter(Boolean);
  const old = {}; S.forEach(s => old[s.name] = s);
  const out = []; let g = null;
  lines.forEach(l => { const gg = GROUPS.find(x => x.name + ":" === l || x.name === l.replace(/:$/, "")); if (gg) { g = gg.id; return; }
    if (g) { const o = old[l]; out.push({ name: l, g, st: o ? o.st : 0, bk: o ? o.bk : 0, ws: o ? o.ws : 0 }); } });
  if (out.length) { S = out; saveS(); }
  closeModal(); go(cur);
}
function resetAll() { S.forEach(s => { s.st = 0; s.bk = 0; s.ws = 0; }); saveS(); state = { intro: [], board: {}, fb: [[0, 0, 0], [0, 0, 0]], video: state.video }; saveState(); closeModal(); go(cur); }

go(cur);

// ===== конфетти мен көпіршіктер =====
function confetti() {
  const cols = ["#1e6fd9", "#21a0e8", "#14a46c", "#ffd23f", "#7b4fc9", "#ff7a59"];
  for (let i = 0; i < 70; i++) {
    const c = document.createElement("div"); c.className = "conf";
    c.style.left = Math.random() * 100 + "vw"; c.style.background = cols[i % cols.length];
    c.style.animationDelay = Math.random() * 0.5 + "s"; c.style.borderRadius = Math.random() > .5 ? "50%" : "2px";
    document.body.appendChild(c); setTimeout(() => c.remove(), 2600);
  }
}
(function () {
  const b = document.getElementById("bubbles");
  for (let i = 0; i < 14; i++) {
    const s = document.createElement("span"); const d = 8 + Math.random() * 26;
    s.style.cssText = `left:${Math.random() * 100}vw;width:${d}px;height:${d}px;animation-duration:${12 + Math.random() * 18}s;animation-delay:${-Math.random() * 30}s`;
    b.appendChild(s);
  }
})();
