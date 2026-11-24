(() => {
  "use strict";
  const SUPABASE_URL = "https://wkkzcjnxyylrqoolmmhi.supabase.co";
  const SUPABASE_KEY = "sb_publishable_t1g3kHG-weQdyGcG9jJHYg_l1hkYcYn";
  const DEMO = new URLSearchParams(location.search).has("demo");
  const CHAT_URL = "https://claude.ai/code/session_01EkF52SZYYcRPcMb856WiJX";
  const VALID = 70;                       // % para o dia contar na sequência
  const STEPS = [1, 3, 7, 21, 60];        // intervalos da revisão espaçada (dias)

  const $ = id => document.getElementById(id);
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = String(x); return e; };
  const DOW = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  const DOW1 = ["D", "S", "T", "Q", "Q", "S", "S"];
  const DOW3 = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  const iso = d => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10); };
  const today = () => iso(new Date());
  const addDays = (s, n) => { const [y, m, d] = s.split("-").map(Number); return iso(new Date(y, m - 1, d + n)); };
  const dowOf = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d).getDay(); };
  const short = s => s.slice(8) + "/" + s.slice(5, 7);
  const safeUrl = u => (typeof u === "string" && u.startsWith("https://")) ? u : null;
  const CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
  const MIC_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';

  const LEVELS = ["Iniciante", "Aprendiz", "Executor", "Constante", "Focado", "Disciplinado", "Imparável", "Referência", "Mestre", "Lenda"];
  const xpForLevel = L => 100 * L * (L - 1) / 2;

  const S = { sb: null, agenda: null, corpo: null, semana: null, trilhas: [], crono: null, aulas: {}, registro: {}, estudo: {}, tarefas: [], cartoes: {},
    resultados: [], treino: null, nutri: null, openMiss: new Set(), open: new Set(), reveal: new Set(), lastLevel: null, lastPct: null, cronoAll: false };

  // ---------------- dados ----------------
  async function fetchJSON(path) { try { const r = await fetch(path, { cache: "no-cache" }); return r.ok ? await r.json() : null; } catch (e) { return null; } }
  async function loadPlano() {
    const [tr, cr, tw, nu] = await Promise.all([fetchJSON("/plano/trilhas.json"), fetchJSON("/plano/cronograma.json"), fetchJSON("/plano/treino.json"), fetchJSON("/plano/nutricao.json")]);
    if (tr) S.trilhas = tr; if (cr) S.crono = cr; if (tw) S.treino = tw; if (nu) S.nutri = nu;
    const t = today();
    const dias = new Set((S.crono ? S.crono.dias : []).map(d => d.dia).filter(d => d <= addDays(t, 1)));
    Object.keys(S.estudo).forEach(d => dias.add(d));
    await Promise.all([...dias].map(async d => { if (!S.aulas[d]) { const a = await fetchJSON("/plano/" + d + ".json"); if (a) S.aulas[d] = a; } }));
  }
  function demoData() {
    const t = today();
    const util = [
      { h: "05:30", id: "acordar", titulo: "Acordar + 1 copo de água" }, { h: "06:00", id: "academia", titulo: "Academia" },
      { h: "07:00", id: "cafe", titulo: "Café com proteína" }, { h: "07:30", id: "leitura", titulo: "Leitura · 20 min" },
      { h: "08:00", id: "trabalho", titulo: "Trabalho", tipo: "trabalho" }, { h: "12:00", id: "almoco", titulo: "Almoço + água" },
      { h: "12:40", id: "duolingo", titulo: "Duolingo · 10 min" }, { h: "16:00", id: "lanche", titulo: "Lanche + água" },
      { h: "19:00", id: "estudo", titulo: "Estudo · 1 hora", tipo: "estudo" }, { h: "21:30", id: "amanha", titulo: "Olhar o amanhã" },
      { h: "22:30", id: "dormir", titulo: "Celular longe da cama" }];
    S.agenda = { util, fds: util }; S.corpo = { proximo: "Costas + bíceps" };
    const reg = {}; for (let i = 1; i < 6; i++) { const d = addDays(t, -i); const f = {}; util.forEach((s, k) => { if ((k + i) % 4) f[s.id] = true; }); reg[d] = f; }
    reg[t] = { acordar: true, academia: true, cafe: true }; S.registro = reg;
    S.tarefas = [{ id: "1", titulo: "Integrar a NFS-e no sistema da Peformake", dia: t, feita: false, origem: "app" },
      { id: "2", titulo: "Decidir kits da Black Friday", dia: addDays(t, 1), feita: false, origem: "whatsapp" }];
    S.cartoes = { "demo-1": { trilha: "oratoria", p: "Qual a faixa de ritmo boa para vender?", r: "Perto de 130 a 160 palavras por minuto.", due: t, int: 1 } };
  }
  async function load() {
    if (DEMO) { await loadPlano(); if (!S.aulas[today()] && S.crono) { const first = S.crono.dias[0].dia; S.aulas[today()] = { ...(S.aulas[first] || {}), dia: today() }; } render(); return; }
    const t = today();
    const [docs, reg, est, tar] = await Promise.all([
      S.sb.from("guia_doc").select("key,data"),
      S.sb.from("guia_registro").select("dia,feitos").gte("dia", addDays(t, -180)),
      S.sb.from("guia_estudo").select("dia,titulo,foco,blocos,feitos"),
      S.sb.from("guia_tarefas").select("*").order("criada_em", { ascending: true }).limit(500)]);
    const res = await S.sb.from("guia_resultados").select("dia,licao,trilha,tipo,nota,acertos,total,dados,texto,criado_em").order("criado_em", { ascending: true }).limit(2000);
    S.resultados = res.data || [];
    const err = docs.error || reg.error || est.error || tar.error;
    if (err) { toast("Não consegui carregar seus dados. Tente de novo."); console.error(err); return; }
    (docs.data || []).forEach(d => { if (d.key === "agenda") S.agenda = d.data; if (d.key === "corpo") S.corpo = d.data; if (d.key === "semana") S.semana = d.data; if (d.key === "cartoes") S.cartoes = (d.data && d.data.cards) || {}; });
    S.registro = {}; (reg.data || []).forEach(r => S.registro[r.dia] = r.feitos || {});
    S.estudo = {}; (est.data || []).forEach(r => S.estudo[r.dia] = r);
    S.tarefas = tar.data || [];
    await loadPlano();
    render();
  }

  // ---------------- regras ----------------
  function slotsFor(d) { const a = S.agenda; if (!a) return []; const w = dowOf(d); const list = a["d" + w] || ((w === 0 || w === 6) ? a.fds : a.util) || []; return list.slice().sort((x, y) => x.h.localeCompare(y.h)); }
  const doneMap = d => S.registro[d] || {};
  function dayPct(d) { const sl = slotsFor(d); if (!sl.length) return 0; const dm = doneMap(d); return Math.round(100 * sl.filter(s => dm[s.id]).length / sl.length); }
  function streakAt(d) { let n = 0, x = d; if (dayPct(x) < VALID) x = addDays(x, -1); for (let i = 0; i < 400; i++) { if (dayPct(x) >= VALID) { n++; x = addDays(x, -1); } else break; } return n; }
  function bestStreak() { const days = Object.keys(S.registro).sort(); let best = 0, cur = 0, prev = null;
    days.forEach(d => { if (dayPct(d) >= VALID) { cur = (prev && addDays(prev, 1) === d) ? cur + 1 : 1; prev = d; best = Math.max(best, cur); } else { cur = 0; prev = null; } }); return best; }
  const feitosOf = d => new Set(((S.estudo[d] && S.estudo[d].feitos) || []).map(String));
  const lessonsOf = d => (S.aulas[d] && S.aulas[d].assuntos) || [];
  function minutesBy(trilha) { let m = 0; Object.keys(S.aulas).forEach(d => { const f = feitosOf(d); lessonsOf(d).forEach((a, gi) => { if (trilha && a.trilha !== trilha) return; (a.pratica || []).forEach((p, pi) => { if (f.has(gi + "." + pi)) m += Number(p.min) || 0; }); if (f.has(gi + ".aula")) m += 5; }); }); return m; }
  function totalXP() {
    let xp = 0;
    Object.keys(S.registro).forEach(d => { const dm = S.registro[d]; const sl = slotsFor(d); const n = sl.filter(s => dm[s.id]).length; xp += n * 10; const p = sl.length ? 100 * n / sl.length : 0; if (p >= VALID) xp += 20; if (p >= 100) xp += 30; });
    S.tarefas.forEach(t => { if (t.feita) xp += 5; });
    Object.values(S.estudo).forEach(e => { xp += (e.feitos || []).length * 5; });
    Object.values(S.cartoes).forEach(c => { xp += (c.acertos || 0) * 3; });
    S.resultados.forEach(r => { if (r.tipo === "prova") xp += (r.acertos || 0) * 5; if (r.tipo === "gravacao") xp += 10; });
    return xp;
  }
  function levelOf(xp) { let L = 1; while (xpForLevel(L + 1) <= xp && L < 99) L++; return L; }
  const countDone = id => Object.values(S.registro).filter(dm => dm[id]).length;
  const openTasks = d => S.tarefas.filter(t => !t.feita && (t.dia === d || !t.dia || t.dia < d));
  const trilhaInfo = id => S.trilhas.find(x => x.id === id) || { id, nome: id || "Estudo", cor: "#3B5BFF" };
  const dueCards = () => Object.entries(S.cartoes).filter(([, c]) => c.due <= today()).slice(0, 6);

  // ---------------- topo e missões ----------------
  function render() {
    const t = today(); const [, m, dd] = t.split("-").map(Number);
    $("dateTxt").textContent = DOW[dowOf(t)] + ", " + dd + "/" + String(m).padStart(2, "0");
    const pct = dayPct(t), xp = totalXP(), L = levelOf(xp);
    $("ring").style.setProperty("--p", pct); $("ringTxt").textContent = pct + "%";
    $("lvlName").textContent = "Nível " + L + " · " + LEVELS[Math.min(L - 1, LEVELS.length - 1)];
    const a = xpForLevel(L), b = xpForLevel(L + 1);
    $("xpBar").style.width = Math.round(100 * (xp - a) / (b - a)) + "%";
    $("xpTxt").textContent = xp + " XP · faltam " + (b - xp) + " para o nível " + (L + 1);
    $("streakN").textContent = streakAt(t);
    if (S.lastLevel != null && L > S.lastLevel) toast("Subiu para o nível " + L + ": " + LEVELS[Math.min(L - 1, LEVELS.length - 1)]);
    if (S.lastPct != null && S.lastPct < VALID && pct >= VALID) toast("O dia contou. Sequência: " + streakAt(t));
    if (S.lastPct != null && S.lastPct < 100 && pct === 100) toast("Dia perfeito. +30 XP");
    S.lastLevel = L; S.lastPct = pct;
    const wk = $("week"); wk.replaceChildren();
    for (let i = 6; i >= 0; i--) { const d = addDays(t, -i); const c = el("div", "wd" + (dayPct(d) >= VALID ? " ok" : "") + (d === t ? " today" : "")); c.append(el("span", null, DOW1[dowOf(d)]), el("i")); wk.append(c); }
    renderMissions(t); renderTasks(t); renderStudy(t); renderYou(t);
  }
  function nowId(sl) { const n = new Date(); const hm = String(n.getHours()).padStart(2, "0") + ":" + String(n.getMinutes()).padStart(2, "0"); let cur = null; sl.forEach(s => { if (s.h <= hm) cur = s; }); return cur && cur.id; }
  function renderMissions(t) {
    const ul = $("missions"); ul.replaceChildren();
    const sl = slotsFor(t), dm = doneMap(t), nid = nowId(sl), hm = new Date().toTimeString().slice(0, 5);
    $("missCount").textContent = sl.filter(s => dm[s.id]).length + " de " + sl.length;
    if (!sl.length) { ul.append(el("li", "muted small", "Sua agenda aparece aqui quando o professor publicar.")); return; }
    sl.forEach(s => {
      const done = !!dm[s.id], open = S.openMiss.has(s.id);
      const li = el("li", "mwrap");
      const row = el("div", "m" + (done ? " done" : "") + (s.id === nid && !done ? " now" : "") + (s.h < hm && s.id !== nid ? " past" : ""));
      row.append(el("span", "t", s.h));
      const body = el("button", "body mbtn"); body.type = "button";
      if (s.id === nid && !done) body.append(el("span", "tag-now", "agora"));
      let title = s.titulo; const wd = workoutFor(t);
      if (s.id === "academia" && wd) title = "Academia · " + wd.nome.replace(/^[A-D] · /, "");
      body.append(el("span", "ttl", title));
      const hasDetail = missionDetail(s, t, true);
      if (s.tipo === "trabalho") { const n = openTasks(t).length; body.append(el("span", "sub", n ? n + (n === 1 ? " tarefa aberta" : " tarefas abertas") : "Sem tarefas abertas")); body.addEventListener("click", () => go("tarefas")); }
      else if (s.tipo === "estudo") { const ls = lessonsOf(t); body.append(el("span", "sub", ls.length ? ls.map(x => trilhaInfo(x.trilha).nome).join(" + ") : "Plano de estudo sai na segunda")); body.addEventListener("click", () => go("estudo")); }
      else if (hasDetail) { body.append(el("span", "sub", open ? "fechar" : "ver detalhes")); body.setAttribute("aria-expanded", open ? "true" : "false"); body.addEventListener("click", () => { open ? S.openMiss.delete(s.id) : S.openMiss.add(s.id); renderMissions(t); }); }
      row.append(body);
      const btn = el("button", "chk"); btn.type = "button"; btn.innerHTML = CHECK_SVG; btn.setAttribute("aria-pressed", done ? "true" : "false");
      btn.setAttribute("aria-label", (done ? "Desmarcar: " : "Concluir: ") + title); btn.addEventListener("click", ev => toggleSlot(t, s.id, !done, ev));
      row.append(btn); li.append(row);
      if (open && hasDetail) li.append(missionDetail(s, t, false));
      ul.append(li);
    });
  }
  function workoutFor(d) { const w = S.treino; return w && w.dias ? w.dias[String(dowOf(d))] || null : null; }
  const MEAL = { cafe: "cafe", almoco: "almoco", lanche: "lanche", jantar: "jantar" };
  function missionDetail(s, t, onlyCheck) {
    if (s.id === "academia" && workoutFor(t)) return onlyCheck ? true : workoutView(t);
    if (MEAL[s.id] && S.nutri) return onlyCheck ? true : mealView(s.id);
    if (s.detalhe) return onlyCheck ? true : el("div", "mdetail", s.detalhe);
    return onlyCheck ? false : null;
  }
  function lastLoad(exId) { const r = S.resultados.filter(x => x.tipo === "treino" && x.dados && x.dados.exercicio === exId && x.dia < today()).sort((a, b) => b.dia.localeCompare(a.dia))[0]; return r ? r.dados.carga : null; }
  function todayLoad(exId, t) { const r = S.resultados.filter(x => x.tipo === "treino" && x.dados && x.dados.exercicio === exId && x.dia === t).pop(); return r ? r.dados : null; }
  function workoutView(t) {
    const w = workoutFor(t), box = el("div", "mdetail");
    box.append(el("b", "wk-title", w.nome));
    const strat = el("details", "mini-fold"); strat.append(el("summary", null, "Como fazer: " + S.treino.estrategia.titulo));
    const ol = el("ol", "strat"); S.treino.estrategia.passos.forEach(p => ol.append(el("li", null, p))); strat.append(ol, el("p", "muted small", S.treino.estrategia.drop));
    box.append(strat);
    w.exercicios.forEach(x => {
      const done = todayLoad(x.id, t); const card = el("div", "ex" + (done ? " done" : ""));
      const img = el("img"); img.src = x.imgs[0]; img.alt = x.nome + " (" + x.maquina + ")"; img.loading = "lazy"; img.width = 92; img.height = 92;
      let f = 0; img.addEventListener("click", () => { f = 1 - f; img.src = x.imgs[f]; });
      const info = el("div", "ex-info");
      info.append(el("span", "ttl", x.nome), el("span", "muted small", x.maquina),
        el("span", "ex-sets", x.series + " séries · " + x.reps + (x.piramide ? " (pirâmide)" : "") + " · descanso " + x.descanso), el("span", "muted small", x.dica));
      const prev = lastLoad(x.id);
      const form = el("div", "ex-log"); const inp = el("input", "input ex-kg"); inp.type = "number"; inp.inputMode = "decimal"; inp.placeholder = prev ? "última: " + prev + " kg" : "kg da última série"; inp.setAttribute("aria-label", "Carga da última série em kg: " + x.nome);
      if (done) inp.value = done.carga || "";
      const ok = el("button", "btn small-btn" + (done ? " ok-btn" : ""), done ? "Feito" : "Feito?"); ok.type = "button";
      ok.addEventListener("click", ev => logExercise(t, x, inp.value, ev));
      form.append(inp, ok); info.append(form);
      card.append(img, info); box.append(card);
    });
    box.append(el("p", "muted small", "Toque na foto para ver o movimento. " + S.treino.cardio));
    return box;
  }
  async function logExercise(t, x, kg, ev) {
    const carga = kg === "" ? null : Number(String(kg).replace(",", "."));
    const row = { dia: t, licao: t + ":treino", trilha: "treino", tipo: "treino", dados: { exercicio: x.id, nome: x.nome, carga } };
    S.resultados.push({ ...row, criado_em: new Date().toISOString() }); pop(ev, "+5 XP");
    const w = workoutFor(t); const all = w.exercicios.every(e => todayLoad(e.id, t));
    if (all && !doneMap(t).academia) toggleSlot(t, "academia", true); else renderMissions(t);
    if (!DEMO) { const r = await S.sb.from("guia_resultados").insert(row); if (r.error) toast("Não salvou o exercício."); }
  }
  function mealView(id) {
    const n = S.nutri, box = el("div", "mdetail");
    const real = n.refeicoes && n.refeicoes[id];
    if (real) { const ul = el("ul", "plain"); real.forEach(i => ul.append(el("li", null, i))); box.append(ul); return box; }
    box.append(el("p", "small", n.mensagem));
    const prov = n.provisorio; if (prov && prov.refeicoes[id]) { box.append(el("span", "lsec-h", "Por enquanto")); const ul = el("ul", "plain"); prov.refeicoes[id].forEach(i => ul.append(el("li", null, i))); box.append(ul); }
    if (prov) prov.cuidados.forEach(c => box.append(el("p", "muted small", c)));
    box.append(fileButton("Enviar o plano da nutricionista (foto ou PDF)", { tipo: "plano_nutricionista" }, "nutricao"));
    return box;
  }

  // ---------------- tarefas ----------------
  function taskRow(task, t) {
    const late = !task.feita && task.dia && task.dia < t;
    const li = el("li", "li" + (task.feita ? " done" : "") + (late ? " late" : ""));
    const b = el("button", "chk"); b.type = "button"; b.innerHTML = CHECK_SVG; b.setAttribute("aria-pressed", task.feita ? "true" : "false");
    b.setAttribute("aria-label", (task.feita ? "Reabrir: " : "Concluir: ") + task.titulo); b.addEventListener("click", ev => toggleTask(task, !task.feita, ev));
    const meta = late ? "desde " + short(task.dia) : task.dia && task.dia !== t ? short(task.dia) : (task.origem === "whatsapp" ? "WhatsApp" : "");
    const right = el("div", "row"); right.style.flexWrap = "nowrap"; right.append(el("span", "meta", meta));
    const del = el("button", "del", "✕"); del.type = "button"; del.setAttribute("aria-label", "Apagar tarefa: " + task.titulo); del.addEventListener("click", () => deleteTask(task)); right.append(del);
    li.append(b, el("span", "ttl", task.titulo), right); return li;
  }
  function renderTasks(t) {
    const card = $("taskCard"); card.replaceChildren();
    const open = S.tarefas.filter(x => !x.feita);
    const groups = [["Atrasadas", open.filter(x => x.dia && x.dia < t)], ["Hoje", open.filter(x => x.dia === t || !x.dia)],
      ["Próximos dias", open.filter(x => x.dia && x.dia > t).sort((a, b) => a.dia.localeCompare(b.dia))], ["Feitas hoje", S.tarefas.filter(x => x.feita && (x.feita_em || "").slice(0, 10) === t)]];
    let any = false;
    groups.forEach(([name, list]) => { if (!list.length) return; any = true; card.append(el("span", "group-h", name + " · " + list.length)); const ul = el("ul", "list"); list.forEach(x => ul.append(taskRow(x, t))); card.append(ul); });
    if (!any) card.append(el("p", "muted small", "Nenhuma tarefa aberta. Adicione acima, fale no microfone ou mande no WhatsApp."));
  }

  // ---------------- estudo: o professor ----------------
  const lessonId = (dia, gi) => dia + ":" + gi;
  const provaOf = (dia, gi) => S.resultados.filter(r => r.tipo === "prova" && r.licao === lessonId(dia, gi)).sort((a, b) => (b.criado_em || "").localeCompare(a.criado_em || ""))[0];
  const gravOf = (dia, gi) => S.resultados.filter(r => r.tipo === "gravacao" && r.licao === lessonId(dia, gi)).sort((a, b) => (b.criado_em || "").localeCompare(a.criado_em || ""))[0];
  const fmtNota = n => (Math.round(Number(n) * 10) / 10).toString().replace(".", ",");

  function renderStudy(t) {
    const ls = lessonsOf(t);
    const prog = S.crono && S.crono.semanas ? S.crono.semanas.find(w => t >= w.de && t <= w.ate) : null;
    $("progName").textContent = prog ? "Semana " + prog.n + " de " + S.crono.semanas.length + " · " + prog.tema : "";
    $("todayN").textContent = ls.length ? ls.filter((a, gi) => provaOf(t, gi)).length + " de " + ls.length + " feitas" : "sem aula hoje";
    renderReview();
    const box = $("todayCards"); box.replaceChildren();
    if (!ls.length) box.append(el("p", "muted small", "O professor publica as aulas toda segunda."));
    ls.forEach((a, gi) => box.append(lessonCard(t, a, gi)));
    renderNotas(); renderCrono(t);
  }
  function renderReview() {
    const box = $("review"); box.replaceChildren(); const due = dueCards();
    $("foldReview").hidden = !due.length; if (!due.length) return;
    $("reviewN").textContent = due.length + (due.length === 1 ? " pergunta" : " perguntas");
    due.forEach(([id, c]) => box.append(qaItem(id, c.p, c.r, trilhaInfo(c.trilha))));
  }
  function qaItem(id, p, r, tr) {
    const it = el("div", "qa"); it.style.setProperty("--c", tr.cor);
    it.append(el("span", "subj-tag", tr.nome), el("p", "qa-q", p));
    if (!S.reveal.has(id)) { const b = el("button", "btn ghost small-btn", "Mostrar resposta"); b.type = "button"; b.addEventListener("click", () => { S.reveal.add(id); render(); }); it.append(b); return it; }
    it.append(el("p", "qa-a", r));
    const row = el("div", "row"); const ok = el("button", "btn small-btn ok-btn", "Acertei"); ok.type = "button"; const bad = el("button", "btn ghost small-btn", "Errei"); bad.type = "button";
    ok.addEventListener("click", ev => gradeCard(id, true, ev, tr.id, p, r)); bad.addEventListener("click", ev => gradeCard(id, false, ev, tr.id, p, r));
    row.append(ok, bad); it.append(row); return it;
  }
  function lessonCard(dia, a, gi) {
    const tr = trilhaInfo(a.trilha), pv = provaOf(dia, gi);
    const card = el("button", "lcard"); card.type = "button"; card.style.setProperty("--c", tr.cor);
    const left = el("div", "lcard-l"); left.append(el("span", "subj-tag", tr.nome), el("span", "lcard-t", a.tema));
    const right = el("div", "lcard-r");
    if (pv) { right.append(el("b", "nota" + (pv.nota >= 7 ? " boa" : ""), fmtNota(pv.nota)), el("span", "meta", "nota")); }
    else right.append(el("span", "lcard-go", "Começar"));
    card.append(left, right);
    card.addEventListener("click", () => openPlayer(dia, gi));
    return card;
  }
  function renderNotas() {
    const box = $("notas"); box.replaceChildren();
    const provas = S.resultados.filter(r => r.tipo === "prova");
    $("notasN").textContent = provas.length ? "média " + fmtNota(provas.reduce((s, r) => s + Number(r.nota), 0) / provas.length) : "ainda sem provas";
    if (!provas.length) { box.append(el("p", "muted small", "Cada aula termina com uma prova. As notas aparecem aqui, por matéria.")); return; }
    const by = {}; provas.forEach(r => { (by[r.trilha] = by[r.trilha] || []).push(Number(r.nota)); });
    Object.entries(by).sort((x, y) => avg(x[1]) - avg(y[1])).forEach(([id, ns]) => {
      const tr = trilhaInfo(id); const row = el("div", "nrow"); row.style.setProperty("--c", tr.cor);
      const bar = el("span", "tr-bar"); const i = el("i"); i.style.width = (avg(ns) * 10) + "%"; bar.append(i);
      const nm = el("div"); nm.style.cssText = "display:flex;flex-direction:column;gap:4px;min-width:0"; nm.append(el("span", "ttl", tr.nome), bar);
      row.append(nm, el("b", "nota" + (avg(ns) >= 7 ? " boa" : ""), fmtNota(avg(ns)))); box.append(row);
    });
    box.append(el("p", "muted small", "A matéria com a menor nota fica em cima: é ela que volta primeiro."));
  }
  const avg = ns => ns.reduce((s, n) => s + n, 0) / ns.length;

  // ---------- a aula, um passo por vez ----------
  const P = { dia: null, gi: 0, step: 0, answers: {}, graded: null };
  const STEP_NAMES = ["Aula", "Exemplo", "Tarefa", "Prova"];
  function openPlayer(dia, gi) { Object.assign(P, { dia, gi, step: 0, answers: {}, graded: null }); $("player").hidden = false; document.body.style.overflow = "hidden"; drawPlayer(); }
  function closePlayer() { $("player").hidden = true; document.body.style.overflow = ""; stopRecIfAny(); render(); }
  function drawPlayer() {
    const a = lessonsOf(P.dia)[P.gi]; if (!a) return closePlayer();
    const tr = trilhaInfo(a.trilha); const pl = $("player"); pl.style.setProperty("--c", tr.cor);
    $("plTag").textContent = tr.nome;
    const dots = $("plDots"); dots.replaceChildren();
    STEP_NAMES.forEach((n, i) => { const d = el("span", "pdot" + (i < P.step ? " done" : "") + (i === P.step ? " on" : "")); d.title = n; dots.append(d); });
    const body = $("plBody"); body.replaceChildren(); body.scrollTop = 0;
    const btn = $("plNext"); btn.disabled = false;
    if (P.step === 0) {
      body.append(el("span", "lsec-h", "Aula"), el("h2", "pl-title", a.tema));
      if (a.objetivo) body.append(el("p", "muted small", "Objetivo: " + a.objetivo));
      (a.aula || []).forEach(p => body.append(el("p", "lesson-p", p)));
      btn.textContent = "Entendi, continuar";
    } else if (P.step === 1) {
      body.append(el("span", "lsec-h", "Exemplo"), el("p", "lesson-ex", a.exemplo || ""));
      btn.textContent = "Continuar";
    } else if (P.step === 2) {
      body.append(el("span", "lsec-h", "Tarefa"));
      const f = feitosOf(P.dia); const ul = el("ul", "list");
      (a.pratica || []).forEach((p, pi) => {
        const li = checkLine(P.dia, P.gi + "." + pi, p.titulo, f.has(P.gi + "." + pi), (p.min || 0) + " min", true);
        const b = li.querySelector(".lbody");
        if (p.detalhe) b.append(el("span", "muted small", p.detalhe));
        (p.falar || []).forEach(x => { const r = el("span", "phrase"); r.append(el("span", null, x)); if ("speechSynthesis" in window) { const sb = el("button", "say", "Ouvir"); sb.type = "button"; sb.addEventListener("click", () => speak(x)); r.append(sb); } b.append(r); });
        (p.links || []).forEach(l => { const u = safeUrl(l.url); if (!u) return; const an = el("a", "lnk", l.rotulo || "Abrir"); an.href = u; an.target = "_blank"; an.rel = "noopener"; b.append(an); });
        ul.append(li);
      });
      body.append(ul);
      if (a.gravar) body.append(recorderBox(a, tr));
      if (a.foto) { const fb = el("div", "recbox"); fb.append(el("span", "lsec-h", "Envie aqui"), el("p", "lesson-p", a.foto.prompt), fileButton("Tirar foto ou escolher arquivo", { tipo: "tarefa", licao: lessonId(P.dia, P.gi) }, a.trilha)); body.append(fb); }
      btn.textContent = "Ir para a prova";
    } else if (P.step === 3) {
      body.append(el("span", "lsec-h", "Prova · sem consultar"));
      (a.prova || []).forEach((q, qi) => body.append(questionBox(q, qi)));
      if (!P.graded) { btn.textContent = "Corrigir"; btn.disabled = Object.keys(P.answers).length < (a.prova || []).length; }
      else btn.textContent = "Ver minha nota";
    } else {
      const g = P.graded; body.append(el("span", "lsec-h", "Resultado"));
      const big = el("div", "result"); big.append(el("b", "nota-big" + (g.nota >= 7 ? " boa" : ""), fmtNota(g.nota)), el("span", "muted", g.acertos + " de " + g.total + " certas"));
      body.append(big);
      body.append(el("p", "lesson-p", g.nota >= 9 ? "Excelente. Esse assunto volta só em revisão." : g.nota >= 7 ? "Bom. As que você errou voltam na revisão amanhã." : "Ainda não fixou. As erradas voltam amanhã e o professor retoma este assunto na semana."));
      if (a.feynman) { body.append(el("span", "lsec-h", "Para fixar (opcional)"), el("p", "lesson-p", a.feynman), voiceBox("[" + tr.nome + " · " + a.tema + " · " + P.dia + "] ", "Explique com suas palavras…")); }
      btn.textContent = "Fechar aula";
    }
  }
  function questionBox(q, qi) {
    const box = el("div", "qbox"); box.append(el("p", "qa-q", (qi + 1) + ". " + q.p));
    q.opcoes.forEach((op, oi) => {
      const b = el("button", "opt"); b.type = "button"; b.textContent = op;
      const chosen = P.answers[qi] === oi;
      if (P.graded) { b.disabled = true; if (oi === q.certa) b.classList.add("right"); else if (chosen) b.classList.add("wrong"); }
      else if (chosen) b.classList.add("chosen");
      b.addEventListener("click", () => { if (P.graded) return; P.answers[qi] = oi; drawPlayer(); });
      box.append(b);
    });
    if (P.graded && q.explica) box.append(el("p", "muted small", q.explica));
    return box;
  }
  async function gradeProva() {
    const a = lessonsOf(P.dia)[P.gi]; const qs = a.prova || [];
    const acertos = qs.filter((q, qi) => P.answers[qi] === q.certa).length;
    const nota = Math.round(100 * acertos / qs.length) / 10;
    P.graded = { nota, acertos, total: qs.length };
    // erradas viram cartões de revisão para amanhã
    qs.forEach((q, qi) => { if (P.answers[qi] !== q.certa) { const id = P.dia + "-" + P.gi + "-" + qi; S.cartoes[id] = { trilha: a.trilha, p: q.p, r: q.opcoes[q.certa] + (q.explica ? ". " + q.explica : ""), int: 1, due: addDays(today(), 1), erros: 1, acertos: 0, respondida: true }; } });
    const row = { dia: P.dia, licao: lessonId(P.dia, P.gi), trilha: a.trilha, tipo: "prova", nota, acertos, total: qs.length, dados: { respostas: P.answers } };
    S.resultados.push({ ...row, criado_em: new Date().toISOString() });
    if (!DEMO) {
      const r1 = await S.sb.from("guia_resultados").insert(row); if (r1.error) toast("Não salvou a nota. Confira a internet.");
      await S.sb.from("guia_doc").upsert({ key: "cartoes", data: { cards: S.cartoes }, updated_at: new Date().toISOString() });
    }
    if (acertos) toast("+" + acertos * 5 + " XP");
    drawPlayer();
  }
  $("plNext").addEventListener("click", async () => {
    if (P.step === 0) { if (!feitosOf(P.dia).has(P.gi + ".aula")) toggleStudy(P.dia, P.gi + ".aula", true); P.step = 1; }
    else if (P.step === 1) P.step = 2;
    else if (P.step === 2) { stopRecIfAny(); P.step = 3; }
    else if (P.step === 3) { if (!P.graded) { await gradeProva(); return; } P.step = 4; }
    else return closePlayer();
    drawPlayer();
  });
  $("plClose").addEventListener("click", closePlayer);

  // ---------- gravação da tarefa: o professor mede ----------
  let REC = null;
  function stopRecIfAny() { if (REC && REC.state !== "inactive") REC.stop(); }
  const VICIOS = ["né", "tipo", "assim", "então", "aí", "entendeu"];
  function metrics(text, secs) {
    const words = (text.toLowerCase().match(/[\p{L}\p{N}']+/gu) || []);
    const v = {}; VICIOS.forEach(w => { const n = words.filter(x => x === w).length; if (n) v[w] = n; });
    return { palavras: words.length, segundos: Math.round(secs), ppm: secs ? Math.round(words.length * 60 / secs) : 0, vicios: v };
  }
  function recorderBox(a, tr) {
    const box = el("div", "recbox"); const last = gravOf(P.dia, P.gi);
    box.append(el("span", "lsec-h", "Grave aqui"), el("p", "lesson-p", a.gravar.prompt));
    const time = el("span", "rec-time", "0:00"); const btn = el("button", "btn full rec-btn", "Gravar"); btn.type = "button";
    const out = el("div", "rec-out"); if (last) out.append(metricView(last.dados || {}, last.texto, true));
    btn.addEventListener("click", async () => {
      if (REC && REC.state === "recording") { REC.stop(); return; }
      if (!navigator.mediaDevices || !window.MediaRecorder) { out.replaceChildren(el("p", "muted small", "Este aparelho não grava aqui. Grave no celular e mande pelo WhatsApp para você mesmo começando com 'recado'.")); return; }
      let stream; try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { out.replaceChildren(el("p", "muted small", "Libere o microfone para o app nas configurações do celular.")); return; }
      const chunks = []; REC = new MediaRecorder(stream); const t0 = Date.now();
      const tick = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); time.textContent = Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }, 250);
      REC.ondataavailable = e => e.data.size && chunks.push(e.data);
      REC.onstop = async () => {
        clearInterval(tick); stream.getTracks().forEach(x => x.stop()); btn.textContent = "Gravar de novo"; btn.classList.remove("on");
        const secs = (Date.now() - t0) / 1000; const blob = new Blob(chunks, { type: REC.mimeType || "audio/webm" });
        out.replaceChildren(el("p", "muted small", "Salvando e analisando…"));
        const path = await uploadAudio(blob); const text = await transcribe(blob);
        const m = text ? metrics(text, secs) : { segundos: Math.round(secs) };
        const row = { dia: P.dia, licao: lessonId(P.dia, P.gi), trilha: a.trilha, tipo: "gravacao", dados: m, texto: text || null, audio_path: path };
        S.resultados.push({ ...row, criado_em: new Date().toISOString() });
        if (!DEMO) { const r = await S.sb.from("guia_resultados").insert(row); if (r.error) toast("Não salvou a gravação."); }
        out.replaceChildren(metricView(m, text, false));
      };
      REC.start(); btn.textContent = "Parar"; btn.classList.add("on");
    });
    box.append(time, btn, out); return box;
  }
  function metricView(m, text, old) {
    const w = el("div", "metrics");
    if (!text) { w.append(el("p", "muted small", (old ? "Última gravação salva. " : "Gravação salva (" + (m.segundos || 0) + " s). ") + "A análise automática liga quando a transcrição estiver ativa; o professor ouve na revisão.")); return w; }
    const g = el("div", "mgrid");
    const ppmOk = m.ppm >= 120 && m.ppm <= 165;
    [[m.ppm + "", "palavras/min", ppmOk], [String(Object.values(m.vicios || {}).reduce((s, n) => s + n, 0)), "vícios", !Object.keys(m.vicios || {}).length], [m.segundos + " s", "duração", true]]
      .forEach(([v, k, ok]) => { const c = el("div", "mcell" + (ok ? " ok" : " warn")); c.append(el("b", null, v), el("span", null, k)); g.append(c); });
    w.append(g);
    const vs = Object.entries(m.vicios || {}); if (vs.length) w.append(el("p", "small", "Vícios: " + vs.map(([k, n]) => "“" + k + "” " + n + "x").join(", ")));
    w.append(el("p", "muted small", ppmOk ? "Ritmo bom para vender." : m.ppm > 165 ? "Rápido demais: use pausas." : "Devagar: ganhe energia."));
    return w;
  }
  async function uploadAudio(blob) {
    if (DEMO || !S.sb) return null;
    const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
    const path = P.dia + "/" + P.gi + "-" + Date.now() + "." + ext;
    const { error } = await S.sb.storage.from("guia-audios").upload(path, blob, { contentType: blob.type || "audio/webm" });
    return error ? null : path;
  }

  function fileButton(label, meta, trilha) {
    const wrap = el("div", "comment"); const inp = el("input"); inp.type = "file"; inp.accept = "image/*,application/pdf"; inp.hidden = true;
    const btn = el("button", "btn ghost small-btn", label); btn.type = "button"; const st = el("span", "muted small");
    btn.addEventListener("click", () => inp.click());
    inp.addEventListener("change", async () => {
      const f = inp.files && inp.files[0]; if (!f) return; if (f.size > 15000000) { st.textContent = "Arquivo grande demais (até 15 MB)."; return; }
      st.textContent = "Enviando…";
      if (DEMO) { st.textContent = "Enviado (modo demonstração)."; return; }
      const ext = (f.name.split(".").pop() || "jpg").toLowerCase().slice(0, 5);
      const path = today() + "/" + (meta.tipo || "foto") + "-" + Date.now() + "." + ext;
      const up = await S.sb.storage.from("guia-fotos").upload(path, f, { contentType: f.type || "image/jpeg" });
      if (up.error) { st.textContent = "Não enviou. Tente de novo."; return; }
      const row = { dia: today(), licao: meta.licao || (today() + ":" + (meta.tipo || "foto")), trilha: trilha || "geral", tipo: "foto", dados: meta, audio_path: path };
      const r = await S.sb.from("guia_resultados").insert(row);
      S.resultados.push({ ...row, criado_em: new Date().toISOString() });
      st.textContent = r.error ? "Arquivo salvo, mas não registrou. Avise o professor." : "Enviado. O professor vai analisar.";
    });
    wrap.append(btn, inp, st); return wrap;
  }

  function checkLine(dia, key, label, on, meta, inPlayer) {
    const li = el("li", "li" + (on ? " done" : "")); li.style.alignItems = "start";
    const b = el("button", "chk"); b.type = "button"; b.innerHTML = CHECK_SVG; b.setAttribute("aria-pressed", on ? "true" : "false");
    b.setAttribute("aria-label", (on ? "Desmarcar: " : "Concluir: ") + label);
    b.addEventListener("click", async ev => { await toggleStudy(dia, key, !on, ev); if (inPlayer) drawPlayer(); });
    const body = el("div", "lbody"); body.append(el("span", "ttl", label));
    li.append(b, body, el("span", "meta", meta || "")); return li;
  }
  function renderCrono(t) {
    const box = $("crono"); box.replaceChildren(); if (!S.crono) return;
    if (S.crono.concurso) { const c = el("p", "muted small"); c.textContent = "Concurso: " + S.crono.concurso.alvo + ". " + S.crono.concurso.situacao; box.append(c); }
    const days = S.crono.dias.filter(d => S.cronoAll || (d.dia >= addDays(t, -1) && d.dia <= addDays(t, 6)));
    days.forEach(d => {
      const row = el("div", "crow" + (d.dia === t ? " today" : "") + (d.dia < t ? " past" : ""));
      const dt = el("div", "cdate"); dt.append(el("b", null, d.dia.slice(8)), el("span", null, DOW3[dowOf(d.dia)])); row.append(dt);
      const items = el("div", "citems");
      d.assuntos.forEach((a, gi) => { const tr = trilhaInfo(a.trilha); const c = el("span", "citem"); c.style.setProperty("--c", tr.cor); c.append(el("b", null, tr.nome), document.createTextNode(" · " + a.tema)); items.append(c); });
      row.append(items);
      const notas = d.assuntos.map((a, gi) => provaOf(d.dia, gi)).filter(Boolean);
      row.append(el("span", "cstat", notas.length ? fmtNota(avg(notas.map(n => Number(n.nota)))) : d.dia === t ? "hoje" : ""));
      box.append(row);
    });
    const more = el("button", "btn ghost small-btn", S.cronoAll ? "Só esta semana" : "Ver tudo"); more.type = "button";
    more.addEventListener("click", () => { S.cronoAll = !S.cronoAll; renderCrono(t); }); box.append(more);
  }
  function speak(text) { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(String(text)); u.lang = "en-US"; u.rate = 0.9; speechSynthesis.speak(u); } catch (e) {} }

  // ---------------- voz ----------------
  // Usa o reconhecimento de fala do aparelho quando existe; senão grava e manda para a transcrição do sistema.
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  function startVoice(target, btn, status) {
    if (btn.dataset.on === "1") { btn._stop && btn._stop(); return; }
    const setOn = on => { btn.dataset.on = on ? "1" : ""; btn.classList.toggle("rec", on); btn.lastChild.textContent = on ? " Parar" : " Falar"; };
    if (SR) {
      const r = new SR(); r.lang = "pt-BR"; r.continuous = true; r.interimResults = true; const base = target.value ? target.value.trim() + " " : "";
      r.onresult = e => { let txt = ""; for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript; target.value = base + txt; };
      r.onerror = e => { status.textContent = e.error === "not-allowed" ? "Libere o microfone para este app." : "O microfone parou. Tente de novo."; };
      r.onend = () => setOn(false);
      btn._stop = () => r.stop(); setOn(true); status.textContent = "Ouvindo… toque em Parar quando terminar."; try { r.start(); } catch (e) { setOn(false); }
      return;
    }
    if (!navigator.mediaDevices || !window.MediaRecorder) { status.textContent = "Este aparelho não grava aqui. Use o microfone do teclado."; return; }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      const chunks = []; const rec = new MediaRecorder(stream);
      rec.ondataavailable = e => e.data.size && chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach(x => x.stop()); setOn(false); status.textContent = "Transcrevendo…";
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        const text = await transcribe(blob);
        if (text) { target.value = (target.value ? target.value.trim() + " " : "") + text; status.textContent = "Pronto. Confira e salve."; }
        else status.textContent = "Não consegui transcrever agora. Use o microfone do teclado.";
      };
      btn._stop = () => rec.state !== "inactive" && rec.stop(); rec.start(); setOn(true); status.textContent = "Gravando… toque em Parar quando terminar.";
    }).catch(() => { status.textContent = "Libere o microfone para este app."; });
  }
  async function transcribe(blob) {
    if (DEMO || !S.sb) return "";
    try {
      const { data } = await S.sb.auth.getSession(); const fd = new FormData(); fd.append("audio", blob, "audio." + (blob.type.includes("mp4") ? "m4a" : "webm"));
      const r = await fetch(SUPABASE_URL + "/functions/v1/voice-transcribe", { method: "POST", headers: { Authorization: "Bearer " + data.session.access_token, apikey: SUPABASE_KEY }, body: fd });
      const j = await r.json().catch(() => ({})); return r.ok ? String(j.text || "") : "";
    } catch (e) { return ""; }
  }
  function micButton(target, status) { const b = el("button", "btn ghost small-btn mic"); b.type = "button"; b.innerHTML = MIC_SVG; b.append(document.createTextNode(" Falar")); b.addEventListener("click", () => startVoice(target, b, status)); return b; }
  function voiceBox(prefix, placeholder) {
    const wrap = el("div", "comment"); const ta = el("textarea", "input"); ta.placeholder = placeholder; ta.setAttribute("aria-label", placeholder);
    const status = el("span", "small muted"); const row = el("div", "row"); const send = el("button", "btn small-btn", "Enviar ao professor"); send.type = "button";
    send.addEventListener("click", async () => { const v = ta.value.trim().slice(0, 3800); if (!v) { status.textContent = "Fale ou escreva primeiro."; return; }
      const ok = await saveRecado(prefix + v); status.textContent = ok ? "Enviado. O professor vai ler." : "Não enviou. Tente de novo."; if (ok) ta.value = ""; });
    row.append(micButton(ta, status), send); wrap.append(ta, row, status); return wrap;
  }

  // ---------------- você ----------------
  function renderYou(t) {
    const xp = totalXP(), L = levelOf(xp); const st = $("stats"); st.replaceChildren();
    const acertos = Object.values(S.cartoes).reduce((s, c) => s + (c.acertos || 0), 0);
    [[String(streakAt(t)), "dias seguidos"], [String(bestStreak()), "melhor sequência"], [String(L), "nível"],
     [String(countDone("academia")), "treinos"], [String(Math.round(minutesBy(null) / 6) / 10) + " h", "de estudo"], [S.resultados.some(r => r.tipo === "prova") ? fmtNota(avg(S.resultados.filter(r => r.tipo === "prova").map(r => Number(r.nota)))) : "–", "média nas provas"]]
      .forEach(([v, k]) => { const c = el("div", "stat"); c.append(el("b", null, v), el("span", null, k)); st.append(c); });
    const bars = $("bars"); bars.replaceChildren();
    for (let i = 13; i >= 0; i--) { const d = addDays(t, -i), p = dayPct(d); const c = el("div"); const bar = el("i"); bar.style.height = Math.max(3, p) + "%"; if (p >= VALID) bar.style.background = "var(--flame)"; c.append(bar, el("span", null, DOW1[dowOf(d)])); bars.append(c); }
    const best = bestStreak(), anyPerfect = Object.keys(S.registro).some(d => dayPct(d) >= 100), anyCheck = Object.values(S.registro).some(dm => Object.values(dm).some(Boolean));
    const list = [["1", "Primeiro check", anyCheck], ["3", "3 dias seguidos", best >= 3], ["7", "7 dias seguidos", best >= 7], ["21", "21 dias: hábito", best >= 21],
      ["100", "Dia perfeito", anyPerfect], ["5h", "Madrugador: 5 dias", countDone("acordar") >= 5], ["12", "Atleta: 12 treinos", countDone("academia") >= 12],
      ["25", "25 acertos", acertos >= 25], ["300", "5 horas de estudo", minutesBy(null) >= 300]];
    const bg = $("badges"); bg.replaceChildren();
    list.forEach(([ic, name, got]) => { const c = el("div", "badge" + (got ? " got" : "")); c.append(el("span", "ic", ic), el("span", null, name)); bg.append(c); });
  }

  // ---------------- ações ----------------
  function pop(ev, txt) { if (!ev) return; const r = ev.currentTarget.getBoundingClientRect(); const p = el("div", "pop", txt); p.style.left = (r.left + r.width / 2 - 18) + "px"; p.style.top = (r.top - 8) + "px"; document.body.append(p); setTimeout(() => p.remove(), 950); try { navigator.vibrate && navigator.vibrate(12); } catch (e) {} }
  function toast(msg) { const t = el("div", "toast", msg); document.body.append(t); setTimeout(() => t.remove(), 2700); }
  async function toggleSlot(d, id, on, ev) {
    const f = { ...doneMap(d), [id]: on }; if (!on) delete f[id]; S.registro[d] = f; if (on) pop(ev, "+10 XP"); render();
    if (DEMO) return; const { error } = await S.sb.from("guia_registro").upsert({ dia: d, feitos: f, updated_at: new Date().toISOString() }); if (error) toast("Não salvou. Confira a internet.");
  }
  async function toggleTask(task, on, ev) {
    task.feita = on; task.feita_em = on ? new Date().toISOString() : null; if (on) pop(ev, "+5 XP"); render();
    if (DEMO) return; const { error } = await S.sb.from("guia_tarefas").update({ feita: on, feita_em: task.feita_em }).eq("id", task.id); if (error) toast("Não salvou a tarefa.");
  }
  async function deleteTask(task) { S.tarefas = S.tarefas.filter(x => x !== task); render(); if (DEMO) return; const { error } = await S.sb.from("guia_tarefas").delete().eq("id", task.id); if (error) toast("Não apagou a tarefa."); }
  async function addTask(v) {
    v = String(v || "").trim().slice(0, 300); if (!v) return false; const row = { titulo: v, dia: today(), area: "Trabalho", origem: "app" };
    if (DEMO) { S.tarefas.push({ ...row, id: String(Date.now()), feita: false }); render(); return true; }
    const { data, error } = await S.sb.from("guia_tarefas").insert(row).select().single(); if (error) { toast("Não adicionou. Tente de novo."); return false; }
    S.tarefas.push(data); render(); return true;
  }
  async function toggleStudy(dia, key, on, ev) {
    const e = S.estudo[dia] || (S.estudo[dia] = { dia, titulo: lessonsOf(dia).map(a => trilhaInfo(a.trilha).nome).join(" + "), feitos: [] });
    const f = new Set((e.feitos || []).map(String)); on ? f.add(key) : f.delete(key); e.feitos = [...f].sort(); if (on) pop(ev, "+5 XP");
    const total = lessonsOf(dia).reduce((s, a) => s + (a.pratica || []).length + 1, 0);
    if (total && e.feitos.length >= total && !doneMap(dia).estudo) { S.registro[dia] = { ...doneMap(dia), estudo: true }; if (!DEMO) S.sb.from("guia_registro").upsert({ dia, feitos: S.registro[dia], updated_at: new Date().toISOString() }); toast("Aula do dia concluída"); }
    render();
    if (DEMO) return;
    const { error } = await S.sb.from("guia_estudo").upsert({ dia, titulo: e.titulo || "", feitos: e.feitos, updated_at: new Date().toISOString() }, { onConflict: "dia" });
    if (error) toast("Não salvou o estudo.");
  }
  async function gradeCard(id, ok, ev, trilha, p, r) {
    const c = S.cartoes[id] || { trilha, p, r, int: 0, acertos: 0, erros: 0 };
    const idx = STEPS.indexOf(c.int);
    c.int = ok ? (c.int ? STEPS[Math.min(idx + 1, STEPS.length - 1)] : STEPS[1]) : STEPS[0];
    c.due = addDays(today(), c.int); c.ultimo = ok; c.respondida = true;
    if (ok) { c.acertos = (c.acertos || 0) + 1; pop(ev, "+3 XP"); } else c.erros = (c.erros || 0) + 1;
    S.cartoes[id] = c; S.reveal.delete(id); render();
    if (DEMO) return;
    const { error } = await S.sb.from("guia_doc").upsert({ key: "cartoes", data: { cards: S.cartoes }, updated_at: new Date().toISOString() });
    if (error) toast("Não salvou a revisão.");
  }
  async function saveRecado(texto) { if (DEMO) return true; const { error } = await S.sb.from("guia_recados").insert({ texto, dia: today(), origem: "app" }); return !error; }

  // formulários fixos
  $("taskForm").addEventListener("submit", async ev => { ev.preventDefault(); const v = $("taskInput").value; $("taskInput").value = ""; if (!(await addTask(v))) $("taskInput").value = v; });
  $("taskMic").replaceWith(micButton($("taskInput"), $("taskMsg")));
  $("chatBtn").href = CHAT_URL;
  $("generalVoice").append(voiceBox("[recado geral] ", "Fale ou escreva para o professor…"));
  $("generalVoice").append(fileButton("Enviar foto ou PDF ao professor", { tipo: "geral" }, "geral"));
  // gravação rápida no Hoje: vira tarefa ou recado
  $("quickMic").addEventListener("click", () => { $("quickSheet").hidden = false; $("quickText").value = ""; $("quickMsg").textContent = ""; startVoice($("quickText"), $("quickRec"), $("quickMsg")); });
  $("quickRec").addEventListener("click", () => startVoice($("quickText"), $("quickRec"), $("quickMsg")));
  $("quickClose").addEventListener("click", () => { $("quickRec")._stop && $("quickRec")._stop(); $("quickSheet").hidden = true; });
  $("quickTask").addEventListener("click", async () => { const v = $("quickText").value.trim(); if (!v) return; if (await addTask(v)) { $("quickSheet").hidden = true; toast("Tarefa adicionada"); } });
  $("quickNote").addEventListener("click", async () => { const v = $("quickText").value.trim(); if (!v) return; if (await saveRecado("[recado falado] " + v)) { $("quickSheet").hidden = true; toast("Recado enviado ao professor"); } });

  // tema: automático, claro ou escuro (guardado só neste aparelho)
  function applyTheme(v) {
    if (v === "light" || v === "dark") document.documentElement.setAttribute("data-theme", v); else document.documentElement.removeAttribute("data-theme");
    try { localStorage.setItem("tema", v); } catch (e) {}
    document.querySelectorAll("[data-tema]").forEach(b => b.setAttribute("aria-checked", b.dataset.tema === v ? "true" : "false"));
    const dark = v === "dark" || (v !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.querySelector('meta[name="theme-color"]').setAttribute("content", dark ? "#0B1120" : "#F5F7FB");
  }
  let tema = "auto"; try { tema = localStorage.getItem("tema") || "auto"; } catch (e) {}
  applyTheme(tema);
  document.querySelectorAll("[data-tema]").forEach(b => b.addEventListener("click", () => applyTheme(b.dataset.tema)));

  // ---------------- navegação e início ----------------
  function go(v) { document.querySelectorAll("[data-view]").forEach(s => s.hidden = s.dataset.view !== v); document.querySelectorAll("[data-tab]").forEach(b => { if (b.dataset.tab === v) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); }); window.scrollTo(0, 0); }
  document.querySelectorAll("[data-tab]").forEach(b => b.addEventListener("click", () => go(b.dataset.tab)));
  function showApp() { $("login").hidden = true; $("main").hidden = false; $("tabs").hidden = false; }
  function showLogin() { $("login").hidden = false; $("main").hidden = true; $("tabs").hidden = true; }

  async function start() {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (DEMO) { demoData(); showApp(); await load(); return; }
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
