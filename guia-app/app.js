(() => {
  "use strict";
  const SUPABASE_URL = "https://wkkzcjnxyylrqoolmmhi.supabase.co";
  const SUPABASE_KEY = "sb_publishable_t1g3kHG-weQdyGcG9jJHYg_l1hkYcYn";
  const DEMO = new URLSearchParams(location.search).has("demo");
  const VALID = 70; // % para o dia contar na sequência

  const $ = id => document.getElementById(id);
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = String(x); return e; };
  const DOW = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  const DOW1 = ["D", "S", "T", "Q", "Q", "S", "S"];
  const iso = d => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10); };
  const today = () => iso(new Date());
  const addDays = (s, n) => { const [y, m, d] = s.split("-").map(Number); return iso(new Date(y, m - 1, d + n)); };
  const dowOf = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d).getDay(); };
  const short = s => s.slice(8) + "/" + s.slice(5, 7);
  const safeUrl = u => (typeof u === "string" && u.startsWith("https://")) ? u : null;
  const CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

  const LEVELS = ["Iniciante", "Aprendiz", "Executor", "Constante", "Focado", "Disciplinado", "Imparável", "Referência", "Mestre", "Lenda"];
  const xpForLevel = L => 100 * L * (L - 1) / 2; // L1=0, L2=100, L3=300, L4=600…

  const S = { sb: null, agenda: null, corpo: null, semana: null, registro: {}, estudo: {}, tarefas: [], view: "hoje", lastLevel: null, lastPct: null };

  // ---------------- dados ----------------
  function demoData() {
    const t = today();
    const util = [
      { h: "05:30", id: "acordar", titulo: "Acordar + 1 copo de água" }, { h: "06:00", id: "academia", titulo: "Academia" },
      { h: "07:00", id: "cafe", titulo: "Café com proteína" }, { h: "07:30", id: "leitura", titulo: "Leitura · 20 min" },
      { h: "08:00", id: "trabalho", titulo: "Trabalho", tipo: "trabalho" }, { h: "12:00", id: "almoco", titulo: "Almoço + água" },
      { h: "12:40", id: "duolingo", titulo: "Duolingo · 10 min" }, { h: "16:00", id: "lanche", titulo: "Lanche + água" },
      { h: "19:00", id: "estudo", titulo: "Estudo · 1 hora", tipo: "estudo" }, { h: "21:30", id: "amanha", titulo: "Olhar o amanhã" },
      { h: "22:30", id: "dormir", titulo: "Celular longe da cama" }];
    S.agenda = { util, fds: util };
    S.corpo = { proximo: "Costas + bíceps" };
    S.semana = { titulo: "Oratória para vender · semana 1" };
    const reg = {}; for (let i = 1; i < 6; i++) { const d = addDays(t, -i); const f = {}; util.forEach((s, k) => { if ((k + i) % 4) f[s.id] = true; }); reg[d] = f; }
    reg[t] = { acordar: true, academia: true, cafe: true };
    S.registro = reg;
    S.estudo = { [t]: { dia: t, titulo: "Perguntar vende mais que falar", foco: "Método SPIN", feitos: [0], blocos: [
      { min: 15, titulo: "Leia: as 4 perguntas do SPIN", links: [{ rotulo: "RD Station", url: "https://www.rdstation.com/blog/vendas/spin-selling/" }] },
      { min: 20, titulo: "Escreva 8 perguntas para uma dona de clínica" },
      { min: 20, titulo: "Simulação por voz no app do Claude" },
      { min: 5, titulo: "Inglês", falar: ["Tell me how you get new clients today."] }] } };
    S.tarefas = [
      { id: "1", titulo: "Perguntar ao contador sobre a nota fiscal", dia: t, feita: false, origem: "app" },
      { id: "2", titulo: "Decidir kits da Black Friday", dia: addDays(t, 1), feita: false, origem: "whatsapp" },
      { id: "3", titulo: "Enviar proposta da clínica", dia: addDays(t, -1), feita: false, origem: "app" }];
  }

  async function load() {
    if (DEMO) { render(); return; }
    const t = today();
    const [docs, reg, est, tar] = await Promise.all([
      S.sb.from("guia_doc").select("key,data"),
      S.sb.from("guia_registro").select("dia,feitos").gte("dia", addDays(t, -180)),
      S.sb.from("guia_estudo").select("*").gte("dia", addDays(t, -30)).lte("dia", addDays(t, 14)),
      S.sb.from("guia_tarefas").select("*").order("criada_em", { ascending: true }).limit(500)]);
    const err = docs.error || reg.error || est.error || tar.error;
    if (err) { toast("Não consegui carregar seus dados. Puxe para atualizar."); console.error(err); return; }
    (docs.data || []).forEach(d => { if (d.key === "agenda") S.agenda = d.data; if (d.key === "corpo") S.corpo = d.data; if (d.key === "semana") S.semana = d.data; });
    S.registro = {}; (reg.data || []).forEach(r => S.registro[r.dia] = r.feitos || {});
    S.estudo = {}; (est.data || []).forEach(r => S.estudo[r.dia] = r);
    S.tarefas = tar.data || [];
    render();
  }

  // ---------------- regras ----------------
  function slotsFor(d) {
    const a = S.agenda; if (!a) return [];
    const w = dowOf(d);
    const list = a["d" + w] || ((w === 0 || w === 6) ? a.fds : a.util) || [];
    return list.slice().sort((x, y) => x.h.localeCompare(y.h));
  }
  const doneMap = d => S.registro[d] || {};
  function dayPct(d) { const sl = slotsFor(d); if (!sl.length) return 0; const dm = doneMap(d); return Math.round(100 * sl.filter(s => dm[s.id]).length / sl.length); }
  function streakAt(d) { let n = 0, x = d; if (dayPct(x) < VALID) x = addDays(x, -1); for (let i = 0; i < 400; i++) { if (dayPct(x) >= VALID) { n++; x = addDays(x, -1); } else break; } return n; }
  function bestStreak() { const days = Object.keys(S.registro).sort(); let best = 0, cur = 0, prev = null;
    days.forEach(d => { if (dayPct(d) >= VALID) { cur = (prev && addDays(prev, 1) === d) ? cur + 1 : 1; prev = d; best = Math.max(best, cur); } else { cur = 0; prev = null; } }); return best; }
  function totalXP() {
    let xp = 0;
    Object.keys(S.registro).forEach(d => { const dm = S.registro[d]; const sl = slotsFor(d); const n = sl.filter(s => dm[s.id]).length; xp += n * 10;
      const p = sl.length ? 100 * n / sl.length : 0; if (p >= VALID) xp += 20; if (p >= 100) xp += 30; });
    S.tarefas.forEach(t => { if (t.feita) xp += 5; });
    Object.values(S.estudo).forEach(e => { xp += (e.feitos || []).length * 5; });
    return xp;
  }
  function levelOf(xp) { let L = 1; while (xpForLevel(L + 1) <= xp && L < 99) L++; return L; }
  function studyMinutes() { let m = 0; Object.values(S.estudo).forEach(e => { const f = new Set(e.feitos || []); (e.blocos || []).forEach((b, i) => { if (f.has(i)) m += Number(b.min) || 0; }); }); return m; }
  function countDone(id) { return Object.values(S.registro).filter(dm => dm[id]).length; }
  function openTasks(d) { return S.tarefas.filter(t => !t.feita && (t.dia === d || !t.dia || t.dia < d)); }

  // ---------------- telas ----------------
  function render() {
    const t = today();
    const [, m, dd] = t.split("-").map(Number);
    $("dateTxt").textContent = DOW[dowOf(t)] + ", " + dd + "/" + String(m).padStart(2, "0");
    const pct = dayPct(t), xp = totalXP(), L = levelOf(xp);
    $("ring").style.setProperty("--p", pct); $("ringTxt").textContent = pct + "%";
    $("lvlName").textContent = "Nível " + L + " · " + (LEVELS[Math.min(L - 1, LEVELS.length - 1)]);
    const a = xpForLevel(L), b = xpForLevel(L + 1);
    $("xpBar").style.width = Math.round(100 * (xp - a) / (b - a)) + "%";
    $("xpTxt").textContent = xp + " XP · faltam " + (b - xp) + " para o nível " + (L + 1);
    $("streakN").textContent = streakAt(t);
    if (S.lastLevel != null && L > S.lastLevel) toast("Subiu para o nível " + L + ": " + LEVELS[Math.min(L - 1, LEVELS.length - 1)]);
    if (S.lastPct != null && S.lastPct < VALID && pct >= VALID) toast("O dia contou. Sequência: " + streakAt(t) + (streakAt(t) === 1 ? " dia" : " dias"));
    if (S.lastPct != null && S.lastPct < 100 && pct === 100) toast("Dia perfeito. +30 XP");
    S.lastLevel = L; S.lastPct = pct;

    const wk = $("week"); wk.replaceChildren();
    for (let i = 6; i >= 0; i--) { const d = addDays(t, -i); const c = el("div", "wd" + (dayPct(d) >= VALID ? " ok" : "") + (d === t ? " today" : ""));
      c.append(el("span", null, DOW1[dowOf(d)]), el("i")); c.title = short(d) + " · " + dayPct(d) + "%"; wk.append(c); }

    renderMissions(t); renderTasks(t); renderStudy(t); renderYou(t);
  }

  function nowId(sl) { const n = new Date(); const hm = String(n.getHours()).padStart(2, "0") + ":" + String(n.getMinutes()).padStart(2, "0"); let cur = null; sl.forEach(s => { if (s.h <= hm) cur = s; }); return cur && cur.id; }

  function renderMissions(t) {
    const ul = $("missions"); ul.replaceChildren();
    const sl = slotsFor(t), dm = doneMap(t), nid = nowId(sl);
    const hm = new Date().toTimeString().slice(0, 5);
    $("missCount").textContent = sl.filter(s => dm[s.id]).length + " de " + sl.length;
    if (!sl.length) { ul.append(el("li", "muted small", "Sua agenda aparece aqui quando o professor publicar.")); return; }
    sl.forEach(s => {
      const done = !!dm[s.id];
      const li = el("li", "m" + (done ? " done" : "") + (s.id === nid && !done ? " now" : "") + (s.h < hm && s.id !== nid ? " past" : ""));
      li.append(el("span", "t", s.h));
      const body = el("div", "body");
      if (s.id === nid && !done) body.append(el("span", "tag-now", "agora"));
      let title = s.titulo;
      if (s.id === "academia" && S.corpo && S.corpo.proximo) title += " · " + S.corpo.proximo;
      body.append(el("span", "ttl", title));
      if (s.tipo === "trabalho") { const n = openTasks(t).length; body.append(el("span", "sub", n ? n + (n === 1 ? " tarefa aberta" : " tarefas abertas") + " · tocar para ver" : "Sem tarefas abertas")); body.style.cursor = "pointer"; body.addEventListener("click", () => go("tarefas")); }
      else if (s.tipo === "estudo") { const e = S.estudo[t]; body.append(el("span", "sub", e ? e.titulo + " · tocar para abrir" : "Plano de estudo sai na segunda")); body.style.cursor = "pointer"; body.addEventListener("click", () => go("estudo")); }
      else if (s.detalhe) body.append(el("span", "sub", s.detalhe));
      li.append(body);
      const b = el("button", "chk"); b.type = "button"; b.innerHTML = CHECK_SVG; b.setAttribute("aria-pressed", done ? "true" : "false");
      b.setAttribute("aria-label", (done ? "Desmarcar: " : "Concluir: ") + title);
      b.addEventListener("click", ev => toggleSlot(t, s.id, !done, ev));
      li.append(b); ul.append(li);
    });
  }

  function taskRow(task, t) {
    const late = !task.feita && task.dia && task.dia < t;
    const li = el("li", "li" + (task.feita ? " done" : "") + (late ? " late" : ""));
    const b = el("button", "chk"); b.type = "button"; b.innerHTML = CHECK_SVG; b.setAttribute("aria-pressed", task.feita ? "true" : "false");
    b.setAttribute("aria-label", (task.feita ? "Reabrir: " : "Concluir: ") + task.titulo);
    b.addEventListener("click", ev => toggleTask(task, !task.feita, ev));
    const meta = late ? "desde " + short(task.dia) : task.dia && task.dia !== t ? short(task.dia) : (task.origem === "whatsapp" ? "WhatsApp" : "");
    const right = el("div", "row"); right.style.flexWrap = "nowrap"; right.append(el("span", "meta", meta));
    const del = el("button", "del", "✕"); del.type = "button"; del.setAttribute("aria-label", "Apagar tarefa: " + task.titulo); del.addEventListener("click", () => deleteTask(task)); right.append(del);
    li.append(b, el("span", "ttl", task.titulo), right);
    return li;
  }
  function renderTasks(t) {
    const card = $("taskCard"); card.replaceChildren();
    const open = S.tarefas.filter(x => !x.feita);
    const groups = [["Atrasadas", open.filter(x => x.dia && x.dia < t)], ["Hoje", open.filter(x => x.dia === t || !x.dia)],
      ["Próximos dias", open.filter(x => x.dia && x.dia > t).sort((a, b) => a.dia.localeCompare(b.dia))],
      ["Feitas hoje", S.tarefas.filter(x => x.feita && (x.feita_em || "").slice(0, 10) === t)]];
    let any = false;
    groups.forEach(([name, list]) => { if (!list.length) return; any = true; card.append(el("span", "group-h", name + " · " + list.length));
      const ul = el("ul", "list"); list.forEach(x => ul.append(taskRow(x, t))); card.append(ul); });
    if (!any) card.append(el("p", "muted small", "Nenhuma tarefa aberta. Adicione acima ou mande no WhatsApp."));
  }

  function renderStudy(t) {
    const e = S.estudo[t];
    $("progName").textContent = (S.semana && S.semana.titulo) || "";
    $("studyTitle").textContent = e ? e.titulo : "Estudo de hoje";
    $("studyFoco").textContent = e ? (e.foco || "") : "O professor publica o plano da semana toda segunda.";
    const ul = $("studyList"); ul.replaceChildren();
    if (!e) { ul.hidden = true; return; } ul.hidden = false;
    const f = new Set(e.feitos || []);
    (e.blocos || []).forEach((bk, i) => {
      const li = el("li", "li" + (f.has(i) ? " done" : "")); li.style.alignItems = "start";
      const b = el("button", "chk"); b.type = "button"; b.innerHTML = CHECK_SVG; b.setAttribute("aria-pressed", f.has(i) ? "true" : "false");
      b.setAttribute("aria-label", "Concluir: " + bk.titulo); b.addEventListener("click", ev => toggleStudy(e, i, !f.has(i), ev));
      const body = el("div"); body.style.display = "flex"; body.style.flexDirection = "column"; body.style.gap = "6px"; body.style.minWidth = "0";
      body.append(el("span", "ttl", bk.titulo));
      if (bk.detalhe) body.append(el("span", "muted small", bk.detalhe));
      (bk.falar || []).forEach(p => { const r = el("span", "phrase"); r.append(el("span", null, p));
        if ("speechSynthesis" in window) { const s = el("button", "say", "Ouvir"); s.type = "button"; s.addEventListener("click", () => speak(p)); r.append(s); } body.append(r); });
      (bk.links || []).forEach(l => { const u = safeUrl(l.url); if (!u) return; const a = el("a", "lnk", l.rotulo || "Abrir"); a.href = u; a.target = "_blank"; a.rel = "noopener"; body.append(a); });
      li.append(b, body, el("span", "meta", (bk.min || 0) + " min")); ul.append(li);
    });
  }
  function speak(text) { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(String(text)); u.lang = "en-US"; u.rate = 0.9; speechSynthesis.speak(u); } catch (e) {} }

  function renderYou(t) {
    const xp = totalXP(), L = levelOf(xp);
    const st = $("stats"); st.replaceChildren();
    [[String(streakAt(t)), "dias seguidos"], [String(bestStreak()), "melhor sequência"], [String(L), "nível"],
     [String(countDone("academia")), "treinos"], [String(Math.round(studyMinutes() / 6) / 10) + " h", "de estudo"], [String(S.tarefas.filter(x => x.feita).length), "tarefas feitas"]]
      .forEach(([v, k]) => { const c = el("div", "stat"); c.append(el("b", null, v), el("span", null, k)); st.append(c); });
    const bars = $("bars"); bars.replaceChildren();
    for (let i = 13; i >= 0; i--) { const d = addDays(t, -i), p = dayPct(d); const c = el("div"); const bar = el("i");
      bar.style.height = Math.max(3, p) + "%"; if (p >= VALID) bar.style.background = "var(--flame)"; c.append(bar, el("span", null, DOW1[dowOf(d)])); c.title = short(d) + " · " + p + "%"; bars.append(c); }
    const best = bestStreak(), anyPerfect = Object.keys(S.registro).some(d => dayPct(d) >= 100), anyCheck = Object.values(S.registro).some(dm => Object.values(dm).some(Boolean));
    const list = [["1", "Primeiro check", anyCheck], ["3", "3 dias seguidos", best >= 3], ["7", "7 dias seguidos", best >= 7], ["21", "21 dias: hábito", best >= 21],
      ["100", "Dia perfeito", anyPerfect], ["5h", "Madrugador: 5 dias", countDone("acordar") >= 5], ["12", "Atleta: 12 treinos", countDone("academia") >= 12],
      ["7", "Leitor: 7 leituras", countDone("leitura") >= 7], ["300", "5 horas de estudo", studyMinutes() >= 300]];
    const bg = $("badges"); bg.replaceChildren();
    list.forEach(([ic, name, got]) => { const c = el("div", "badge" + (got ? " got" : "")); c.append(el("span", "ic", ic), el("span", null, name)); bg.append(c); });
  }

  // ---------------- ações ----------------
  function pop(ev, txt) { if (!ev) return; const r = ev.currentTarget.getBoundingClientRect(); const p = el("div", "pop", txt);
    p.style.left = (r.left + r.width / 2 - 18) + "px"; p.style.top = (r.top - 8) + "px"; document.body.append(p); setTimeout(() => p.remove(), 950);
    try { navigator.vibrate && navigator.vibrate(12); } catch (e) {} }
  function toast(msg) { const t = el("div", "toast", msg); document.body.append(t); setTimeout(() => t.remove(), 2700); }

  async function toggleSlot(d, id, on, ev) {
    const f = { ...doneMap(d), [id]: on }; if (!on) delete f[id]; S.registro[d] = f; if (on) pop(ev, "+10 XP"); render();
    if (DEMO) return;
    const { error } = await S.sb.from("guia_registro").upsert({ dia: d, feitos: f, updated_at: new Date().toISOString() });
    if (error) toast("Não salvou. Confira a internet.");
  }
  async function toggleTask(task, on, ev) {
    task.feita = on; task.feita_em = on ? new Date().toISOString() : null; if (on) pop(ev, "+5 XP"); render();
    if (DEMO) return;
    const { error } = await S.sb.from("guia_tarefas").update({ feita: on, feita_em: task.feita_em }).eq("id", task.id);
    if (error) toast("Não salvou a tarefa.");
  }
  async function deleteTask(task) {
    S.tarefas = S.tarefas.filter(x => x !== task); render();
    if (DEMO) return;
    const { error } = await S.sb.from("guia_tarefas").delete().eq("id", task.id); if (error) toast("Não apagou a tarefa.");
  }
  async function toggleStudy(e, i, on, ev) {
    const f = new Set(e.feitos || []); on ? f.add(i) : f.delete(i); e.feitos = [...f].sort((a, b) => a - b); if (on) pop(ev, "+5 XP");
    const all = (e.blocos || []).length && e.feitos.length === e.blocos.length;
    if (all && !doneMap(e.dia).estudo) { S.registro[e.dia] = { ...doneMap(e.dia), estudo: true }; if (!DEMO) S.sb.from("guia_registro").upsert({ dia: e.dia, feitos: S.registro[e.dia], updated_at: new Date().toISOString() }); toast("Estudo do dia concluído"); }
    render();
    if (DEMO) return;
    const { error } = await S.sb.from("guia_estudo").update({ feitos: e.feitos, updated_at: new Date().toISOString() }).eq("dia", e.dia);
    if (error) toast("Não salvou o estudo.");
  }
  $("taskForm").addEventListener("submit", async ev => {
    ev.preventDefault(); const v = $("taskInput").value.trim().slice(0, 300); if (!v) return; $("taskInput").value = "";
    const row = { titulo: v, dia: today(), area: "Trabalho", origem: "app" };
    if (DEMO) { S.tarefas.push({ ...row, id: String(Date.now()), feita: false }); render(); return; }
    const { data, error } = await S.sb.from("guia_tarefas").insert(row).select().single();
    if (error) { toast("Não adicionou. Tente de novo."); $("taskInput").value = v; return; }
    S.tarefas.push(data); render();
  });
  $("sendRecado").addEventListener("click", async () => {
    const v = $("recado").value.trim().slice(0, 4000); if (!v) { $("recadoMsg").textContent = "Escreva ou fale o recado primeiro."; return; }
    if (DEMO) { $("recado").value = ""; $("recadoMsg").textContent = "Recado salvo (modo demonstração)."; return; }
    const { error } = await S.sb.from("guia_recados").insert({ texto: v, dia: today(), origem: "app" });
    if (error) { $("recadoMsg").textContent = "Não enviou. Tente de novo."; return; }
    $("recado").value = ""; $("recadoMsg").textContent = "Recado salvo. O professor lê na próxima revisão.";
  });

  // ---------------- navegação ----------------
  function go(v) {
    S.view = v;
    document.querySelectorAll("[data-view]").forEach(s => s.hidden = s.dataset.view !== v);
    document.querySelectorAll("[data-tab]").forEach(b => { if (b.dataset.tab === v) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
    window.scrollTo(0, 0);
  }
  document.querySelectorAll("[data-tab]").forEach(b => b.addEventListener("click", () => go(b.dataset.tab)));

  function showApp() { $("login").hidden = true; $("main").hidden = false; $("tabs").hidden = false; }
  function showLogin() { $("login").hidden = false; $("main").hidden = true; $("tabs").hidden = true; }

  // ---------------- início ----------------
  async function start() {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (DEMO) { demoData(); showApp(); render(); return; }
    if (!window.supabase) { showLogin(); $("loginMsg").textContent = "Sem conexão. Abra de novo com internet."; return; }
    S.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
    const { data } = await S.sb.auth.getSession();
    if (data.session) { showApp(); load(); } else showLogin();
    $("loginForm").addEventListener("submit", async ev => {
      ev.preventDefault(); $("loginMsg").textContent = "Entrando…";
      const { error } = await S.sb.auth.signInWithPassword({ email: $("email").value.trim(), password: $("pass").value });
      if (error) { $("loginMsg").textContent = "E-mail ou senha não conferem."; return; }
      $("loginMsg").textContent = ""; showApp(); load();
    });
    $("logout").addEventListener("click", async () => { await S.sb.auth.signOut(); showLogin(); });
    document.addEventListener("visibilitychange", () => { if (!document.hidden) load(); });
    setInterval(() => { if (!document.hidden) render(); }, 60000);
  }
  start();
})();
