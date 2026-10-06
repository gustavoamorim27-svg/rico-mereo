// Motor MEREO — mesmas regras do Rico Pipeline (core.mjs → monthData), agora por membro do time.
// Pesos, curvas e referências idênticos: Captação 40% · Cesta 20% · Crossell 10% · Índice comercial 10% · NPS 20%.
const MereoCore = (() => {
  const COMPONENTS = [
    { id: 'cap', name: 'Captação', short: 'Capt.', weight: .4, curve: [20, 60, 100, 140, 180], unit: 'R$' },
    { id: 'cesta', name: 'Cesta investimento', short: 'Cesta', weight: .2, curve: [60, 80, 100, 120, 140], unit: 'R$' },
    { id: 'cross', name: 'Crossell', short: 'Cross', weight: .1, curve: [60, 80, 100, 120, 140], unit: 'pts' },
    { id: 'ic', name: 'Índice comercial', short: 'IC', weight: .1, curve: [80, 90, 100, 110, 120], unit: '%' },
    { id: 'nps', name: 'NPS', short: 'NPS', weight: .2, curve: [60, 80, 100, 120, 140], unit: '' }
  ];
  // Metas padrão do pipeline: captação R$ 800 mil/mês, cesta R$ 2,2 mi, crossell 25 pts, IC 83%, NPS 41,3.
  const DEFAULT_GOALS = { cap: 800000, cesta: 2200000, cross: 25, ic: 83, nps: 41.3 };
  // Card de metas 2S2026 (Assessor · Exclusive Advisory DF II): NPS com meta mensal crescente e
  // crossell de 25 pts com mínimo de 10 pts em seguros (cartão sem mínimo).
  const NPS_META = { '2026-07': 35, '2026-08': 37.5, '2026-09': 40, '2026-10': 42.5, '2026-11': 45, '2026-12': 47.5 };
  const CROSS_MIN_SEG = 10;
  // sem o mínimo de seguros, os demais produtos contam no máximo (meta − mínimo) pontos
  function crossPoints(e, goal) {
    const seg = num(e.seg) / 1000, outros = num(e.cards) + num(e.con) / 10000;
    return seg >= CROSS_MIN_SEG ? seg + outros : seg + Math.min(outros, Math.max(0, (goal ?? DEFAULT_GOALS.cross) - CROSS_MIN_SEG));
  }
  const FLOW = ['cap', 'cesta', 'cross'];
  const INPUTS = ['cap', 'prev', 'stvm', 'aloc', 'cards', 'seg', 'con', 'ic', 'nps'];

  const num = v => (v == null || v === '' || !isFinite(+v)) ? 0 : +v;
  const pct = (v, m) => m > 0 ? v / m * 100 : 0;
  // Curva de 5 pontos: até curve[0] = 1; a partir de curve[4] = 5; linear entre os pontos. 100% da meta = 3.
  function score(p, curve) {
    if (p <= curve[0]) return 1;
    if (p >= curve[4]) return 5;
    for (let i = 0; i < 4; i++) if (p <= curve[i + 1]) return i + 1 + (p - curve[i]) / (curve[i + 1] - curve[i]);
    return 1;
  }
  const hasData = e => !!e && !e.cleared && INPUTS.some(k => e[k] != null && e[k] !== '');

  // Valores MEREO de um lançamento mensal.
  // Previdência/STVM dentro da captação pesam 1,25× (igual ao pipeline). A cesta soma alocação + previdência ponderada.
  // Crossell: cartão = 1 ponto, consórcio = 1 ponto a cada R$ 10 mil, seguro = 1 ponto a cada R$ 1 mil.
  function values(e, crossGoal) {
    e = e || {};
    const cap = num(e.cap), boosted = Math.min(num(e.prev) + num(e.stvm), cap);
    const prevW = Math.min(num(e.prev), cap) * 1.25;
    return {
      cap: cap + boosted * .25,
      cesta: num(e.aloc) + prevW,
      cross: crossPoints(e, crossGoal),
      ic: e.ic == null || e.ic === '' ? null : +e.ic,
      nps: e.nps == null || e.nps === '' ? null : +e.nps
    };
  }

  function build(vals, goals) {
    const components = COMPONENTS.map(c => {
      const assumed = vals[c.id] == null;
      const value = assumed ? goals[c.id] : vals[c.id];
      const p = pct(value, goals[c.id]);
      return { ...c, value, goal: goals[c.id], pct: p, score: score(p, c.curve), assumed };
    });
    return { components, score: components.reduce((s, c) => s + c.score * c.weight, 0) };
  }

  const monthKey = (id, month) => `${id}|${month}`;
  function goalsFor(member, month) {
    const base = { ...DEFAULT_GOALS, ...(member?.goals || {}) };
    const o = member?.monthGoals?.[month] || {};
    for (const k of FLOW) if (o[k] != null && o[k] !== '') base[k] = +o[k];
    if (o.nps != null && o.nps !== '') base.nps = +o.nps;
    else if (NPS_META[month] != null) base.nps = NPS_META[month];
    return base;
  }
  function monthResult(state, member, month) {
    const entry = state.entries?.[monthKey(member.id, month)];
    const filled = hasData(entry);
    const goals = goalsFor(member, month);
    const r = build(values(filled ? entry : {}, goals.cross), goals);
    return { ...r, month, goals, entry: filled ? entry : null, filled, status: filled ? (entry.status || 'est') : 'none' };
  }

  // Semestre: meses 1–6 (1º sem.) ou 7–12 (2º sem.).
  function semesterOf(month) { const y = +month.slice(0, 4), m = +month.slice(5, 7); return { year: y, half: m <= 6 ? 1 : 2 }; }
  function semesterMonths(sem) { const s = sem.half === 1 ? 1 : 7; return Array.from({ length: 6 }, (_, i) => `${sem.year}-${String(s + i).padStart(2, '0')}`); }
  function shiftSemester(sem, d) { let i = sem.year * 2 + sem.half - 1 + d; return { year: Math.floor(i / 2), half: i % 2 + 1 }; }

  // Visão semestral. Fluxos (captação, cesta, crossell) somam no semestre contra a soma das metas mensais;
  // IC e NPS usam a média dos meses lançados (sem lançamento = referência da meta, como no pipeline).
  // mode 'proj': meses sem lançamento recebem a média dos meses lançados (projeção de fechamento).
  // mode 'ytd' : compara só os meses lançados com as metas desses mesmos meses (ritmo até agora).
  function semesterResult(state, member, sem, mode = 'proj') {
    const months = semesterMonths(sem).map(m => monthResult(state, member, m));
    const filled = months.filter(m => m.filled);
    const vals = months.map(m => m.filled ? values(m.entry, m.goals.cross) : null);
    const filledVals = vals.filter(Boolean);
    const avg = k => filledVals.length ? filledVals.reduce((s, v) => s + v[k], 0) / filledVals.length : 0;
    const totals = {}, goals = {};
    for (const k of FLOW) {
      totals[k] = 0; goals[k] = 0;
      months.forEach((m, i) => {
        if (mode === 'ytd' && !m.filled) return;
        totals[k] += vals[i] ? vals[i][k] : (mode === 'proj' ? avg(k) : 0);
        goals[k] += m.goals[k];
      });
    }
    for (const k of ['ic', 'nps']) {
      const list = filledVals.map(v => v[k]).filter(v => v != null);
      totals[k] = list.length ? list.reduce((a, b) => a + b, 0) / list.length : null;
      goals[k] = months.reduce((s, m) => s + m.goals[k], 0) / months.length;
    }
    const r = build(totals, goals);
    return { ...r, months, totals, goals, filledCount: filled.length, realCount: filled.filter(m => m.status === 'real').length, mode, sem };
  }

  // Estado e mesclagem (cada registro com updatedAt; exclusão é marcação, para sincronizar entre aparelhos).
  function emptyState() { return { version: 1, members: {}, entries: {}, settings: { team: 'Meu time', leader: '', updatedAt: 0 } }; }
  function mergeMaps(a = {}, b = {}) {
    const out = { ...a };
    for (const [k, v] of Object.entries(b)) if (!out[k] || (v?.updatedAt || 0) > (out[k]?.updatedAt || 0)) out[k] = v;
    return out;
  }
  function merge(a, b) {
    a = a || emptyState(); b = b || emptyState();
    return {
      version: 1,
      members: mergeMaps(a.members, b.members),
      entries: mergeMaps(a.entries, b.entries),
      settings: (b.settings?.updatedAt || 0) > (a.settings?.updatedAt || 0) ? b.settings : a.settings
    };
  }
  function validate(s) {
    if (!s || typeof s !== 'object' || typeof s.members !== 'object' || typeof s.entries !== 'object') throw Error('Arquivo não reconhecido como base MEREO.');
    return { ...emptyState(), ...s, settings: { ...emptyState().settings, ...(s.settings || {}) } };
  }
  const activeMembers = s => Object.values(s.members || {}).filter(m => !m.removedAt).sort((a, b) => (a.order ?? a.createdAt ?? 0) - (b.order ?? b.createdAt ?? 0) || String(a.name).localeCompare(b.name, 'pt-BR'));

  // Resumo do time (média simples das notas, somatório de captação).
  function teamSummary(state, list) {
    if (!list.length) return { avg: 0, above: 0, cap: 0, capGoal: 0, filled: 0, real: 0 };
    return {
      avg: list.reduce((s, r) => s + r.score, 0) / list.length,
      above: list.filter(r => r.score >= 3).length,
      cap: list.reduce((s, r) => s + r.components[0].value, 0),
      capGoal: list.reduce((s, r) => s + r.components[0].goal, 0),
      filled: list.filter(r => r.filled ?? r.filledCount > 0).length,
      real: list.filter(r => r.status === 'real').length
    };
  }

  const shortMoney = n => { n = +n || 0; const a = Math.abs(n); return a >= 1e6 ? 'R$ ' + (n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: a >= 1e7 ? 1 : 2 }) + ' mi' : a >= 1000 ? 'R$ ' + (n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }); };
  const fmtScore = s => s.toFixed(2).replace('.', ',');
  const fmtNum = (n, d = 1) => (+n || 0).toLocaleString('pt-BR', { maximumFractionDigits: d });

  return { COMPONENTS, DEFAULT_GOALS, NPS_META, CROSS_MIN_SEG, FLOW, INPUTS, score, values, build, monthKey, goalsFor, monthResult, semesterOf, semesterMonths, shiftSemester, semesterResult, emptyState, merge, validate, activeMembers, teamSummary, hasData, shortMoney, fmtScore, fmtNum };
})();
if (typeof module !== 'undefined') module.exports = MereoCore;
