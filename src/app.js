// Rico · MEREO do time — painel do líder: membros, metas e estimativas mensais/semestrais.
(() => {
const C = MereoCore;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const app = $('#app'), dialog = $('#dialog');
const LS = { state: 'ricoMereo.state', key: 'ricoMereo.cloudKey', theme: 'ricoMereo.theme', sidebar: 'ricoMereo.sidebar', stamp: 'ricoMereo.cloudStamp' };
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch {} }
};
const pad = n => String(n).padStart(2, '0');
const todayMonth = (() => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; })();
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const now = () => Date.now();

let state = C.emptyState(), demo = false, demoBackup = null;
let screen = 'team', memberId = null, view = 'month', month = todayMonth, sem = C.semesterOf(todayMonth), semMode = 'proj';
let sidebarCollapsed = store.get(LS.sidebar) === 'collapsed', syncStatus = 'local', toastTimer, syncTimer, cloud = null, syncing = false, dirty = false;

try { const raw = store.get(LS.state); if (raw) state = C.validate(JSON.parse(raw)); } catch { state = C.emptyState(); }

// ---------- Ícones e marca ----------
const icons = {
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M15 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/>',
  settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="currentColor"/><circle cx="15" cy="17" r="3" fill="currentColor"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', close: '<path d="m6 6 12 12M6 18 18 6"/>',
  arrow: '<path d="M4 17 10 11l4 4 6-10m-6 0h6v6"/>', shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/>',
  cloud: '<path d="M7 18a5 5 0 1 1 0-10 6 6 0 0 1 11-1 5.5 5.5 0 0 1 0 11M12 11v10m-3-3 3 3 3-3"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>', check: '<path d="m4 12 5 5L20 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>', back: '<path d="m14 5-7 7 7 7"/>', edit: '<path d="m14 5 5 5M4 20l5-1L21 7l-5-5L4 14z"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>', upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  palette: '<path d="M12 3a9 9 0 0 0 0 18c1.5 0 2-1 1.5-2s0-2 1.5-2h1.5a4.5 4.5 0 0 0 4.5-4.5C21 7 17 3 12 3z"/><circle cx="7.5" cy="11.5" r="1.2"/><circle cx="10.5" cy="7.5" r="1.2"/><circle cx="15" cy="7.5" r="1.2"/>',
  key: '<circle cx="8" cy="9" r="5"/><path d="m12 13 8 8m-3-3 3-3m-6 0 3-3"/>', copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 11h18"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>', undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  wallet: '<path d="M20 7H5a2 2 0 0 1 0-4h12v4M3 5v14a2 2 0 0 0 2 2h15V7m0 5h-6v5h6"/>', exit: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>'
};
const icon = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[n] || icons.target}</svg>`;
const logo = () => `<span class="brand-logo"><svg viewBox="${RICO_LOGO_VIEWBOX}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Rico"><path d="${RICO_LOGO_PATH}"/></svg></span>`;
const brand = () => `<div class="brand">${logo()}<span class="brand-divider"></span><span class="brand-label">MEREO<br>do time</span></div>`;
const button = (text, action, ico = '', cls = '', extra = '') => `<button type="button" class="btn ${cls}" data-action="${action}" ${extra}>${ico ? icon(ico) : ''}${text}</button>`;
const initials = n => esc(String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase());
const MEMBER_COLORS = ['#ff621d', '#7199ff', '#48d6a0', '#ffd075', '#ff2d78', '#b29aff', '#19c3d6', '#ff9e57', '#c8e04a', '#ff6f91'];
const colorOf = m => m.color || MEMBER_COLORS[Math.abs([...String(m.id)].reduce((a, c) => a * 31 + c.charCodeAt(0) | 0, 7)) % MEMBER_COLORS.length];
const avatar = (m, cls = '') => `<span class="avatar ${cls}" style="--mc:${colorOf(m)}">${initials(m.name)}</span>`;

// ---------- Formatação ----------
const cap1 = s => s.charAt(0).toUpperCase() + s.slice(1);
const monthName = (m, opt = { month: 'long', year: 'numeric' }) => new Date(m + '-15T12:00:00').toLocaleDateString('pt-BR', opt);
const monthShort = m => monthName(m, { month: 'short' }).replace('.', '');
const semLabel = s => `${s.half}º semestre ${s.year}`;
const scoreClass = s => s >= 4 ? 's-top' : s >= 3 ? 's-ok' : s >= 2 ? 's-mid' : 's-low';
const scoreText = s => s >= 4 ? 'Excelente' : s >= 3 ? 'Na meta' : s >= 2 ? 'Atenção' : 'Abaixo';
const fmtVal = (c, v) => c.unit === 'R$' ? C.shortMoney(v) : c.unit === 'pts' ? C.fmtNum(v) + ' pts' : c.unit === '%' ? C.fmtNum(v) + '%' : C.fmtNum(v);
const pctTxt = p => Math.round(p) + '%';

// ---------- Tema ----------
const THEMES = [['rico', 'Rico', 'Azul-marinho com laranja, coral e âmbar', ['#0b1020', '#ff6a00', '#2b4bff', '#ff2e4d']], ['lava', 'Lava', 'Violeta com laranja, rosa e azul — o visual do Hub', ['#2a1470', '#ff3d00', '#4533ff', '#ff2d78']], ['xp', 'XP', 'Grafite com dourado e âmbar', ['#0b0b0e', '#f5c400', '#ff8c00', '#ffd54a']]];
let theme = store.get(LS.theme) || 'rico';
function applyTheme(t) {
  theme = THEMES.some(x => x[0] === t) ? t : 'rico';
  if (theme === 'lava') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = theme;
  store.set(LS.theme, theme);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', { rico: '#0b1020', lava: '#241263', xp: '#0b0b0e' }[theme]);
}
applyTheme(theme);

// ---------- Persistência ----------
function persist() {
  if (demo) return;
  store.set(LS.state, JSON.stringify(state));
  if (cloud) { dirty = true; setStatus('pending'); clearTimeout(syncTimer); syncTimer = setTimeout(sync, 1200); }
}
function commit(fn, { rerender = true } = {}) { fn(state); persist(); if (rerender) render(); }
function notify(msg, undo) {
  const el = $('#toast'); el.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button type="button" id="undo">Desfazer</button>' : ''}`;
  el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), undo ? 9000 : 4500);
  if (undo) $('#undo').onclick = () => { undo(); el.classList.remove('show'); };
}
const statusLabel = () => demo ? 'Demonstração · nada é salvo' : ({ local: 'Salvo neste aparelho', synced: 'Sincronizado', pending: 'Salvando…', offline: 'Offline · salvo no aparelho', error: 'Nuvem indisponível · salvo no aparelho' }[syncStatus]);
function setStatus(s) { syncStatus = s; $$('[data-sync]').forEach(e => { e.className = 'sync ' + (demo ? 'pending' : s); e.innerHTML = `<i class="dot"></i>${statusLabel()}`; }); }

// ---------- Nuvem (opcional): mesmo projeto Firestore do Pipeline, base criptografada por chave pessoal ----------
const ROOT = 'https://firestore.googleapis.com/v1/projects/rico-hub/databases/(default)/documents/ricoPipeline/';
const b64 = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const from64 = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const genKey = () => 'MEREO-' + b64(crypto.getRandomValues(new Uint8Array(32)));
async function credentials(access) {
  const text = String(access).trim(); if (!/^MEREO-[A-Za-z0-9_-]{43}$/.test(text)) throw Error('Cole a chave completa, começando por MEREO-.');
  const material = await crypto.subtle.importKey('raw', from64(text.slice(6)), 'HKDF', false, ['deriveKey', 'deriveBits']);
  const params = { name: 'HKDF', hash: 'SHA-256', salt: new TextEncoder().encode('rico-mereo-v1') };
  const key = await crypto.subtle.deriveKey({ ...params, info: new TextEncoder().encode('encryption') }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const path = await crypto.subtle.deriveBits({ ...params, info: new TextEncoder().encode('document') }, material, 256);
  return { access: text, key, id: 'mereo-v1-' + b64(new Uint8Array(path)) };
}
const bigB64 = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
async function seal(value, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(value))));
  return { v: 1, iv: bigB64(iv), data: bigB64(data) };
}
async function unseal(env, key) {
  const dec = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: dec(env.iv) }, key, dec(env.data));
  return C.validate(JSON.parse(new TextDecoder().decode(plain)));
}
async function request(url, options = {}) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 15000);
  try {
    const r = await fetch(url, { ...options, signal: ctl.signal, headers: { 'Content-Type': 'application/json' } });
    const body = await r.json().catch(() => ({}));
    if (r.status === 404 && !options.method) return null;
    if (!r.ok) { const e = Error(body.error?.message || 'Falha na nuvem.'); e.status = r.status; throw e; }
    return body;
  } finally { clearTimeout(t); }
}
async function remoteRead(c) { const d = await request(ROOT + encodeURIComponent(c.id)); return d ? { envelope: JSON.parse(d.fields.envelope.stringValue), stamp: d.updateTime } : null; }
async function remoteWrite(c, value, stamp) {
  const cond = stamp ? 'currentDocument.updateTime=' + encodeURIComponent(stamp) : 'currentDocument.exists=false';
  const d = await request(ROOT + encodeURIComponent(c.id) + '?' + cond, { method: 'PATCH', body: JSON.stringify({ fields: { envelope: { stringValue: JSON.stringify(await seal(value, c.key)) }, format: { stringValue: 'mereo-1' } } }) });
  return d.updateTime;
}
async function sync({ quiet = true } = {}) {
  if (!cloud || demo || syncing) return;
  syncing = true; setStatus('pending');
  try {
    for (let attempt = 0; attempt < 4; attempt++) {
      const remote = await remoteRead(cloud);
      const remoteState = remote ? await unseal(remote.envelope, cloud.key) : null;
      const before = JSON.stringify(state);
      const merged = C.merge(state, remoteState);
      const needsWrite = !remoteState || JSON.stringify(C.merge(remoteState, merged)) !== JSON.stringify(remoteState) || dirty;
      try {
        if (needsWrite && JSON.stringify(merged) !== JSON.stringify(remoteState)) await remoteWrite(cloud, merged, remote?.stamp);
        dirty = false;
        if (JSON.stringify(merged) !== before) { state = merged; store.set(LS.state, JSON.stringify(state)); if (!dialog.open && !isSliding) render(); }
        setStatus('synced'); break;
      } catch (e) { if ([400, 409, 412].includes(e.status) && attempt < 3) continue; throw e; }
    }
  } catch (e) {
    setStatus(/fetch|network|abort|Failed|Load/i.test(e.message) ? 'offline' : 'error');
    if (!quiet) notify('Não foi possível falar com a nuvem agora. Tudo continua salvo neste aparelho.');
  } finally { syncing = false; }
}
async function connectCloud(access, create) {
  const c = await credentials(access);
  const remote = await remoteRead(c);
  if (!remote && !create) throw Error('Nenhuma base encontrada com essa chave.');
  if (remote) state = C.merge(state, await unseal(remote.envelope, c.key));
  cloud = c; store.set(LS.key, c.access); store.set(LS.state, JSON.stringify(state)); dirty = true;
  await sync({ quiet: false });
}
(async () => { const k = store.get(LS.key); if (k) { try { cloud = await credentials(k); sync(); } catch { cloud = null; } } })();
setInterval(() => { if (cloud && !document.hidden) sync(); }, 20000);
document.addEventListener('visibilitychange', () => { if (!document.hidden && cloud) sync(); });

// ---------- Dados ----------
const members = () => C.activeMembers(state);
const member = id => state.members[id];
const entryKey = (id, m) => C.monthKey(id, m);
const teamDefaults = () => ({ ...C.DEFAULT_GOALS, ...(state.settings.defaultGoals || {}) });
function periodResults() {
  return members().map(m => ({ m, r: view === 'month' ? C.monthResult(state, m, month) : C.semesterResult(state, m, sem, semMode) }));
}

// ---------- Estrutura ----------
let isSliding = false;
function render() {
  if (!members().length && screen === 'member') screen = 'team';
  const scrollTop = $('.content')?.scrollTop || 0;
  const navs = [['team', 'Painel', 'target'], ['manage', 'Equipe', 'users'], ['settings', 'Minha base', 'settings']];
  const crumb = { team: 'Painel', member: 'Membro', manage: 'Equipe', settings: 'Minha base' }[screen];
  const leader = state.settings.leader || 'Liderança';
  app.innerHTML = `<div class="shell ${sidebarCollapsed ? 'collapsed' : ''}"><aside class="sidebar">${brand()}<button class="sidebar-toggle" data-action="toggle-sidebar" aria-label="${sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}">${icon('chevron')}</button><div class="eyebrow">${esc(state.settings.team || 'Meu time')}</div><nav class="nav-items" aria-label="Navegação principal">${navs.map(([k, n, i]) => `<button class="nav-item ${screen === k || (k === 'team' && screen === 'member') ? 'active' : ''}" data-nav="${k}" aria-label="${n}">${icon(i)}<span>${n}</span>${k === 'manage' ? `<span class="nav-count">${members().length}</span>` : ''}</button>`).join('')}</nav><div class="sidebar-footer"><div class="private-note">${icon('trophy')}<span>100% da meta = nota 3.<br>Nota máxima: 5,00.</span></div><div class="account">${avatar({ id: 'leader', name: leader, color: 'var(--orange)' })}<div>${esc(leader)}<small>${demo ? 'Time de exemplo' : 'Líder do time'}</small></div></div></div></aside><main class="main"><header class="topbar"><div class="breadcrumb">MEREO do time ${icon('chevron')} <b>${crumb}</b></div><div class="topbar-actions"><span class="sync ${demo ? 'pending' : syncStatus}" data-sync><i class="dot"></i>${statusLabel()}</span><button class="icon-btn" title="Trocar tema" aria-label="Trocar tema" data-action="cycle-theme">${icon('palette')}</button></div></header><div class="content" data-screen="${screen}">${demo ? `<div class="notice demo">${icon('shield')}<span><strong>Time de exemplo.</strong> Explore à vontade — nada disso é salvo.</span>${button('Sair do exemplo', 'exit-demo', 'exit')}</div>` : ''}${screen === 'team' ? renderTeam() : screen === 'member' ? renderMember() : screen === 'manage' ? renderManage() : renderSettings()}</div></main></div>`;
  const content = $('.content'); if (content) content.scrollTop = scrollTop;
}
const pageTitle = (title, actions = '') => `<div class="page-title"><h1>${title}</h1><div class="title-actions">${actions}</div></div>`;
function periodBar(extra = '') {
  const label = view === 'month' ? cap1(monthName(month)) : semLabel(sem);
  return `<div class="period">${extra}<div class="segment" role="tablist"><button class="${view === 'month' ? 'on' : ''}" data-view="month">Mês</button><button class="${view === 'semester' ? 'on' : ''}" data-view="semester">Semestre</button></div><div class="stepper"><button class="icon-btn" data-action="period-prev" aria-label="Período anterior">${icon('back')}</button><b>${label}</b><button class="icon-btn" data-action="period-next" aria-label="Próximo período">${icon('chevron')}</button></div>${view === 'semester' ? `<div class="segment" title="Como tratar os meses sem lançamento"><button class="${semMode === 'proj' ? 'on' : ''}" data-semmode="proj">Projeção</button><button class="${semMode === 'ytd' ? 'on' : ''}" data-semmode="ytd">Até agora</button></div>` : ''}</div>`;
}
const scaleBar = s => `<span class="scale ${scoreClass(s)}"><i style="left:${(Math.min(5, Math.max(1, s)) - 1) / 4 * 100}%"></i></span>`;

// ---------- Painel do time ----------
function renderTeam() {
  const list = members();
  if (!list.length) return pageTitle('Painel') + `<section class="panel hero-empty">${icon('users')}<h2>Monte o seu time</h2><p>Adicione os membros, ajuste as metas de cada um e estime o MEREO do mês e do semestre. O cálculo é o mesmo do Rico Pipeline.</p><div class="row wrap center">${button('Adicionar membro', 'add-member', 'plus', 'primary')}${button('Ver com time de exemplo', 'demo', 'arrow')}</div></section>`;
  const rows = periodResults().sort((a, b) => b.r.score - a.r.score);
  const sum = C.teamSummary(state, rows.map(x => x.r));
  const filledTxt = view === 'month' ? `${sum.filled}/${list.length}` : `${rows.reduce((s, x) => s + x.r.filledCount, 0)}/${list.length * 6}`;
  const strip = `<div class="kpis"><div class="kpi lead ${scoreClass(sum.avg)}"><span class="eyebrow">MEREO médio do time</span><strong>${C.fmtScore(sum.avg)}</strong><small>de 5,00 · ${scoreText(sum.avg).toLowerCase()}</small></div><div class="kpi"><span class="eyebrow">Na meta (≥ 3,00)</span><strong>${sum.above}<em>/${list.length}</em></strong><small>${list.length - sum.above ? (list.length - sum.above) + ' abaixo de 3,00' : 'time inteiro na meta'}</small></div><div class="kpi"><span class="eyebrow">Captação ${view === 'month' ? 'do mês' : semMode === 'proj' ? 'projetada' : 'até agora'}</span><strong>${C.shortMoney(sum.cap)}</strong><small>meta ${C.shortMoney(sum.capGoal)} · ${pctTxt(sum.capGoal ? sum.cap / sum.capGoal * 100 : 0)}</small><span class="progress"><span style="width:${Math.min(100, sum.capGoal ? sum.cap / sum.capGoal * 100 : 0)}%"></span></span></div><div class="kpi"><span class="eyebrow">${view === 'month' ? 'Membros lançados' : 'Meses lançados'}</span><strong>${filledTxt}</strong><small>${view === 'month' ? `${sum.real} realizado${sum.real === 1 ? '' : 's'} · ${sum.filled - sum.real} estimativa${sum.filled - sum.real === 1 ? '' : 's'}` : semMode === 'proj' ? 'vazios projetados pela média' : 'vazios fora da conta'}</small></div></div>`;
  return pageTitle('Painel', periodBar()) + strip + (view === 'month' ? teamMonth(rows) : teamSemester(rows));
}
function teamMonth(rows) {
  return `<section class="panel ranking"><div class="rank-head"><span>#</span><span>Membro</span><span>MEREO</span>${C.COMPONENTS.map(c => `<span class="hide-sm">${c.short} <small>${c.weight * 100}%</small></span>`).join('')}<span class="hide-xs">Captação × meta</span></div>${rows.map(({ m, r }, i) => {
    const cap = r.components[0];
    return `<button class="rank-row" data-member="${m.id}"><span class="pos">${i + 1}</span><span class="who">${avatar(m)}<span><b>${esc(m.name)}</b><small>${statusPill(r.status)}</small></span></span><span class="sc ${scoreClass(r.score)}"><b>${r.filled ? C.fmtScore(r.score) : '—'}</b>${r.filled ? scaleBar(r.score) : ''}</span>${r.components.map(c => `<span class="hide-sm comp ${r.filled ? scoreClass(c.score) : 'none'}" title="${c.name}: ${fmtVal(c, c.value)} de ${fmtVal(c, c.goal)}">${r.filled ? `<b>${c.score.toFixed(1).replace('.', ',')}</b><small>${c.assumed ? 'ref.' : pctTxt(c.pct)}</small>` : '<b>—</b>'}</span>`).join('')}<span class="hide-xs capcol"><small>${C.shortMoney(cap.value)} <em>de ${C.shortMoney(cap.goal)}</em></small><span class="progress"><span style="width:${Math.min(100, cap.pct)}%"></span></span></span></button>`;
  }).join('')}</section><p class="footnote">Toque em um membro para estimar ou lançar o realizado de ${monthName(month)}. “ref.” = IC/NPS sem lançamento, contando a referência da meta (nota 3), como no Pipeline.</p>`;
}
function teamSemester(rows) {
  const months = C.semesterMonths(sem);
  return `<section class="panel ranking heat"><div class="heat-head"><span class="hpos">#</span><span>Membro</span>${months.map(m => `<span class="${m === todayMonth ? 'now' : ''}">${monthShort(m)}</span>`).join('')}<span>Semestre</span></div>${rows.map(({ m, r }, i) => `<button class="heat-row" data-member="${m.id}"><span class="pos">${i + 1}</span><span class="who">${avatar(m)}<span><b>${esc(m.name)}</b><small>${r.filledCount}/6 meses · ${r.realCount} realizado${r.realCount === 1 ? '' : 's'}</small></span></span>${r.months.map(x => `<span class="cell ${x.filled ? scoreClass(x.score) : 'none'} ${x.status === 'est' ? 'est' : ''}" title="${monthName(x.month)}">${x.filled ? C.fmtScore(x.score) : semMode === 'proj' && r.filledCount ? '<em>proj.</em>' : '—'}</span>`).join('')}<span class="cell total ${r.filledCount ? scoreClass(r.score) : 'none'}"><b>${r.filledCount ? C.fmtScore(r.score) : '—'}</b></span></button>`).join('')}</section><p class="footnote"><span class="legend"><i class="s-top"></i>≥ 4 excelente <i class="s-ok"></i>3–4 na meta <i class="s-mid"></i>2–3 atenção <i class="s-low"></i>&lt; 2 abaixo · <span class="dash">tracejado</span> = estimativa</span><br>Semestre: captação, cesta e crossell somam os 6 meses contra a soma das metas mensais; IC e NPS usam a média dos meses lançados. ${semMode === 'proj' ? 'Projeção: meses sem lançamento recebem a média dos meses lançados.' : 'Até agora: só os meses lançados, contra as metas desses meses.'}</p>`;
}
const statusPill = s => s === 'real' ? '<span class="pill ok">Realizado</span>' : s === 'est' ? '<span class="pill est">Estimativa</span>' : '<span class="pill">Sem lançamento</span>';

// ---------- Membro ----------
function renderMember() {
  const m = member(memberId); if (!m || m.removedAt) { screen = 'team'; return renderTeam(); }
  const list = members(), idx = list.findIndex(x => x.id === m.id);
  const nav = `<div class="member-nav"><button class="icon-btn" data-action="member-prev" aria-label="Membro anterior" ${list.length < 2 ? 'disabled' : ''}>${icon('back')}</button><span class="small muted">${idx + 1} de ${list.length}</span><button class="icon-btn" data-action="member-next" aria-label="Próximo membro" ${list.length < 2 ? 'disabled' : ''}>${icon('chevron')}</button></div>`;
  const head = `<div class="member-head"><button class="btn ghost" data-nav="team">${icon('back')}Painel</button><div class="who big">${avatar(m, 'big')}<div><h2>${esc(m.name)}</h2><small>${m.code ? esc(m.code) + ' · ' : ''}${m.role ? esc(m.role) : 'Membro do time'}</small></div></div>${nav}<div class="spacer"></div>${periodBar()}${button('Metas', 'edit-goals', 'edit', '', `data-id="${m.id}"`)}</div>`;
  return head + (view === 'month' ? memberMonth(m) : memberSemester(m));
}
function scorePanel(m) {
  const r = C.monthResult(state, m, month);
  return `<div class="score-hero ${scoreClass(r.score)}"><span class="eyebrow">MEREO · ${monthName(month)}</span><strong>${C.fmtScore(r.score)}</strong><span class="muted small">de 5,00 · ${r.filled ? scoreText(r.score) : 'sem lançamento'}</span>${scaleBar(r.score)}<div class="scale-labels"><span>1</span><span>2</span><span>3 · meta</span><span>4</span><span>5</span></div></div><div class="comp-list">${r.components.map(c => compRow(c)).join('')}</div>`;
}
const compRow = c => `<div class="comp-row ${scoreClass(c.score)}"><div class="comp-top"><span><b>${c.name}</b> <small>${c.weight * 100}%</small></span><span class="comp-score ${scoreClass(c.score)}">${c.score.toFixed(2).replace('.', ',')}</span></div><div class="comp-val">${fmtVal(c, c.value)} <em>de ${fmtVal(c, c.goal)}</em><span>${c.assumed ? 'referência' : pctTxt(c.pct)}</span></div><span class="progress"><span style="width:${Math.min(100, c.pct / c.curve[4] * 100)}%"></span><i style="left:${100 / c.curve[4] * 100}%"></i></span></div>`;

// Controles deslizantes: tocar, não digitar. O valor pode ser digitado tocando no número.
function slider({ key, label, value, min, max, step, fmt, presets = [], hint = '', nullable = false, isNull = false, scope = 'entry' }) {
  const shown = isNull ? value : value;
  return `<div class="sl ${isNull ? 'is-null' : ''}" data-sl="${key}"><div class="sl-head"><span>${label}</span><button type="button" class="sl-out" data-type="${key}" data-scope="${scope}" title="Digitar valor">${isNull ? 'Referência' : fmt(shown)}</button></div><input type="range" data-${scope}="${key}" min="${min}" max="${max}" step="${step}" value="${shown}" aria-label="${label}">${presets.length || nullable ? `<div class="sl-presets">${nullable ? `<button type="button" class="chip-btn ${isNull ? 'on' : ''}" data-null="${key}" data-scope="${scope}">Referência</button>` : ''}${presets.map(([t, v]) => `<button type="button" class="chip-btn ${!isNull && Math.abs(+v - shown) < step / 2 ? 'on' : ''}" data-preset="${key}" data-scope="${scope}" data-v="${v}">${t}</button>`).join('')}</div>` : ''}${hint ? `<small class="sl-hint" data-hint="${key}">${hint}</small>` : ''}</div>`;
}
const FMT = { money: v => C.shortMoney(v), int: v => C.fmtNum(v, 0), pct: v => C.fmtNum(v) + '%', nps: v => C.fmtNum(v) };
const roundStep = (v, s) => Math.round(v / s) * s;
function moneyStep(goal) { return goal >= 2e6 ? 25000 : goal >= 5e5 ? 10000 : goal >= 1e5 ? 5000 : 1000; }
function goalPresets(goal, step) { return [0, 50, 80, 100, 120, 150].map(p => [p === 0 ? 'Zero' : p + '%', roundStep(goal * p / 100, step)]); }

function entryFields(m, e) {
  const g = C.goalsFor(m, month), v = C.values(e, g.cross);
  const capStep = moneyStep(g.cap), cestaStep = moneyStep(g.cesta);
  const cap = +e.cap || 0;
  return `<div class="entry-group"><h3>${icon('wallet')}Captação <small>meta ${C.shortMoney(g.cap)}</small></h3>${slider({ key: 'cap', label: 'Captação líquida do mês', value: cap, min: 0, max: Math.max(g.cap * 3, cap), step: capStep, fmt: FMT.money, presets: goalPresets(g.cap, capStep) })}<details class="sub" ${(+e.prev || +e.stvm) ? 'open' : ''}><summary>Previdência e STVM dentro da captação <em>pesam 1,25×</em></summary>${slider({ key: 'prev', label: 'Previdência', value: +e.prev || 0, min: 0, max: Math.max(cap, +e.prev || 0, capStep), step: capStep, fmt: FMT.money, presets: [['Zero', 0], ['25%', roundStep(cap * .25, capStep)], ['50%', roundStep(cap * .5, capStep)]], hint: 'Também entra na cesta de investimento (1,25×).' })}${slider({ key: 'stvm', label: 'STVM', value: +e.stvm || 0, min: 0, max: Math.max(cap, +e.stvm || 0, capStep), step: capStep, fmt: FMT.money, presets: [['Zero', 0], ['25%', roundStep(cap * .25, capStep)]] })}</details><small class="calc" data-calc="cap">Captação MEREO: <b>${C.shortMoney(v.cap)}</b></small></div>
  <div class="entry-group"><h3>${icon('arrow')}Cesta investimento <small>meta ${C.shortMoney(g.cesta)}</small></h3>${slider({ key: 'aloc', label: 'Alocação do mês', value: +e.aloc || 0, min: 0, max: Math.max(g.cesta * 3, +e.aloc || 0), step: cestaStep, fmt: FMT.money, presets: goalPresets(g.cesta, cestaStep) })}<small class="calc" data-calc="cesta">Cesta MEREO (alocação + previdência 1,25×): <b>${C.shortMoney(v.cesta)}</b></small></div>
  <div class="entry-group"><h3>${icon('plus')}Crossell <small>meta ${C.fmtNum(g.cross)} pts</small></h3>${slider({ key: 'cards', label: 'Cartões (1 pt cada)', value: +e.cards || 0, min: 0, max: Math.max(Math.ceil(g.cross * 2), +e.cards || 0, 10), step: 1, fmt: FMT.int, presets: [0, 5, 10, 15, 20, 25].map(n => [String(n), n]) })}${slider({ key: 'seg', label: 'Seguros (1 pt a cada R$ 1 mil)', value: +e.seg || 0, min: 0, max: Math.max(30000, +e.seg || 0), step: 500, fmt: FMT.money, presets: [['Zero', 0], ['R$ 2 mil', 2000], ['R$ 5 mil', 5000], ['R$ 10 mil', 10000]] })}${slider({ key: 'con', label: 'Consórcio (1 pt a cada R$ 10 mil)', value: +e.con || 0, min: 0, max: Math.max(300000, +e.con || 0), step: 5000, fmt: FMT.money, presets: [['Zero', 0], ['R$ 50 mil', 50000], ['R$ 100 mil', 100000], ['R$ 200 mil', 200000]] })}<small class="calc" data-calc="cross">Pontos de crossell: <b>${C.fmtNum(v.cross)} pts</b>${(+e.seg || 0) / 1000 < C.CROSS_MIN_SEG ? ' · faltam ' + C.fmtNum(C.CROSS_MIN_SEG - (+e.seg || 0) / 1000) + ' pts de seguros para o mínimo' : ''}</small></div>
  <div class="entry-group two"><div><h3>${icon('target')}Índice comercial <small>meta ${C.fmtNum(g.ic)}%</small></h3>${slider({ key: 'ic', label: 'IC do mês', value: e.ic ?? g.ic, isNull: e.ic == null, nullable: true, min: 0, max: 120, step: .5, fmt: FMT.pct, presets: [[C.fmtNum(g.ic * .9) + '%', roundStep(g.ic * .9, .5)], [C.fmtNum(g.ic) + '%', g.ic], [C.fmtNum(g.ic * 1.1) + '%', roundStep(g.ic * 1.1, .5)]] })}</div><div><h3>${icon('users')}NPS <small>meta ${C.fmtNum(g.nps)}</small></h3>${slider({ key: 'nps', label: 'NPS do mês', value: e.nps ?? g.nps, isNull: e.nps == null, nullable: true, min: -100, max: 100, step: .5, fmt: FMT.nps, presets: [['30', 30], [C.fmtNum(g.nps), g.nps], ['60', 60], ['80', 80]] })}</div></div>`;
}
function memberMonth(m) {
  const key = entryKey(m.id, month), raw = state.entries[key], e = raw && !raw.cleared ? raw : {};
  const filled = C.hasData(raw), status = filled ? (raw.status || 'est') : 'est';
  return `<div class="member-grid"><section class="panel score-panel" id="scorePanel">${scorePanel(m)}</section><section class="panel entry-panel"><div class="entry-head"><div><span class="eyebrow">${filled ? 'Lançamento de ' : 'Estimar '}${monthName(month)}</span><div class="segment status-seg"><button class="${status === 'est' ? 'on' : ''}" data-status="est">Estimativa</button><button class="${status === 'real' ? 'on' : ''}" data-status="real">Realizado</button></div></div><div class="row wrap">${button('Copiar mês anterior', 'copy-prev', 'copy', 'sm')}${button('Repetir até ' + monthShort(C.semesterMonths(C.semesterOf(month))[5]), 'repeat-sem', 'repeat', 'sm')}${filled ? button('Limpar', 'clear-month', 'trash', 'sm danger') : ''}</div></div><div class="entry-body">${entryFields(m, e)}</div></section></div>`;
}
function memberSemester(m) {
  const r = C.semesterResult(state, m, sem, semMode);
  const bars = r.months.map(x => { const h = x.filled ? (x.score - 1) / 4 * 100 : 0; return `<button class="bar ${x.filled ? scoreClass(x.score) : 'none'} ${x.status === 'est' ? 'est' : ''}" data-open-month="${x.month}" title="Abrir ${monthName(x.month)}"><span class="bar-val">${x.filled ? C.fmtScore(x.score) : '—'}</span><span class="bar-track"><span style="height:${Math.max(3, h)}%"></span></span><span class="bar-lbl">${monthShort(x.month)}</span><small>${x.status === 'real' ? 'real' : x.status === 'est' ? 'estim.' : 'vazio'}</small></button>`; }).join('');
  const goalRows = r.months.map(x => `<tr class="${x.filled ? '' : 'dim'}"><td>${monthName(x.month, { month: 'long' })}</td><td>${x.filled ? C.shortMoney(C.values(x.entry).cap) : '—'} <em>/ ${C.shortMoney(x.goals.cap)}</em></td><td class="hide-xs">${x.filled ? C.shortMoney(C.values(x.entry).cesta) : '—'} <em>/ ${C.shortMoney(x.goals.cesta)}</em></td><td class="hide-xs">${x.filled ? C.fmtNum(C.values(x.entry, x.goals.cross).cross) : '—'} <em>/ ${C.fmtNum(x.goals.cross)}</em></td><td><span class="sc-chip ${x.filled ? scoreClass(x.score) : 'none'}">${x.filled ? C.fmtScore(x.score) : '—'}</span></td></tr>`).join('');
  const capC = r.components[0], gap = Math.max(0, capC.goal - capC.value);
  return `<div class="member-grid"><section class="panel score-panel"><div class="score-hero ${scoreClass(r.score)}"><span class="eyebrow">MEREO · ${semLabel(sem)} · ${semMode === 'proj' ? 'projeção' : 'até agora'}</span><strong>${r.filledCount ? C.fmtScore(r.score) : '—'}</strong><span class="muted small">de 5,00 · ${r.filledCount}/6 meses lançados</span>${scaleBar(r.score)}<div class="scale-labels"><span>1</span><span>2</span><span>3 · meta</span><span>4</span><span>5</span></div></div><div class="comp-list">${r.components.map(compRow).join('')}</div>${semMode === 'proj' || r.filledCount === 6 ? `<p class="gap">${gap > 0 ? `Faltam <b>${C.shortMoney(gap)}</b> de captação para fechar a meta do semestre (${C.shortMoney(capC.goal)}).` : `Captação do semestre ${semMode === 'proj' ? 'projetada ' : ''}acima da meta.`}</p>` : ''}</section><section class="panel sem-panel"><div class="entry-head"><span class="eyebrow">Mês a mês · linha tracejada = nota 3 (meta)</span>${button('Metas do semestre', 'edit-sem-goals', 'calendar', 'sm')}</div><div class="bars">${bars}</div><table class="sem-table"><thead><tr><th>Mês</th><th>Captação / meta</th><th class="hide-xs">Cesta / meta</th><th class="hide-xs">Crossell / meta</th><th>MEREO</th></tr></thead><tbody>${goalRows}</tbody><tfoot><tr><td>Semestre</td><td>${C.shortMoney(r.totals.cap)} <em>/ ${C.shortMoney(r.goals.cap)}</em></td><td class="hide-xs">${C.shortMoney(r.totals.cesta)} <em>/ ${C.shortMoney(r.goals.cesta)}</em></td><td class="hide-xs">${C.fmtNum(r.totals.cross)} <em>/ ${C.fmtNum(r.goals.cross)}</em></td><td><span class="sc-chip ${r.filledCount ? scoreClass(r.score) : 'none'}">${r.filledCount ? C.fmtScore(r.score) : '—'}</span></td></tr></tfoot></table></section></div>`;
}

// ---------- Equipe ----------
function renderManage() {
  const list = members(), removed = Object.values(state.members).filter(m => m.removedAt).sort((a, b) => b.removedAt - a.removedAt);
  const goalsTxt = m => { const g = { ...C.DEFAULT_GOALS, ...(m.goals || {}) }; return `Capt. ${C.shortMoney(g.cap)} · Cesta ${C.shortMoney(g.cesta)} · Cross ${C.fmtNum(g.cross)} pts · IC ${C.fmtNum(g.ic)}% · NPS ${C.fmtNum(g.nps)}`; };
  return pageTitle('Equipe', `${list.length > 1 ? button('Metas para todos', 'goals-all', 'users') : ''}${button('Adicionar membro', 'add-member', 'plus', 'primary')}`) + (list.length ? `<section class="panel member-list">${list.map(m => `<div class="member-row"><button class="who" data-member="${m.id}">${avatar(m)}<span><b>${esc(m.name)}</b><small>${m.code ? esc(m.code) + ' · ' : ''}${goalsTxt(m)}</small></span></button><div class="row">${button('Metas', 'edit-goals', 'edit', 'sm', `data-id="${m.id}"`)}<button class="icon-btn danger" data-action="remove-member" data-id="${m.id}" aria-label="Remover ${esc(m.name)}" title="Remover do time">${icon('trash')}</button></div></div>`).join('')}</section>` : `<section class="panel hero-empty">${icon('users')}<h2>Nenhum membro ainda</h2><p>Comece adicionando quem faz parte do time. As metas padrão vêm do Pipeline e podem ser ajustadas por pessoa.</p>${button('Adicionar membro', 'add-member', 'plus', 'primary')}</section>`) + (removed.length ? `<details class="panel removed"><summary>Removidos do time (${removed.length})</summary>${removed.map(m => `<div class="member-row">${`<span class="who">${avatar(m)}<span><b>${esc(m.name)}</b><small>Removido em ${new Date(m.removedAt).toLocaleDateString('pt-BR')} · lançamentos preservados</small></span></span>`}${button('Restaurar', 'restore-member', 'undo', 'sm', `data-id="${m.id}"`)}</div>`).join('')}</details>` : '');
}

// ---------- Minha base ----------
function renderSettings() {
  const rules = C.COMPONENTS.map(c => `<tr><td>${c.name}</td><td>${c.weight * 100}%</td><td>${c.curve.map(p => p + '%').join(' · ')}</td></tr>`).join('');
  return pageTitle('Minha base') + `<div class="settings-grid"><section class="panel panel-pad"><div class="row">${icon('users')}<h3>Time</h3></div><p>Nome do time e do líder, exibidos no menu.</p><div class="fields one"><label class="field">Nome do time<input id="teamName" value="${esc(state.settings.team || '')}" placeholder="Ex.: Time Bauru"></label><label class="field">Líder<input id="leaderName" value="${esc(state.settings.leader || '')}" placeholder="Seu nome"></label></div>${button('Salvar', 'save-team', 'check')}</section>
  <section class="panel panel-pad"><div class="row">${icon('cloud')}<h3>Sincronizar entre aparelhos</h3></div>${cloud ? `<p>Conectado. Use a mesma chave no iPad e no notebook para ver o mesmo time.</p><p><span class="sync ${syncStatus}" data-sync><i class="dot"></i>${statusLabel()}</span></p><div class="row wrap">${button('Ver chave', 'show-key', 'key')}${button('Sincronizar agora', 'sync-now', 'cloud')}${button('Desconectar', 'disconnect', 'exit', 'danger')}</div>` : `<p>Hoje tudo fica salvo neste aparelho. Crie uma chave para ter a mesma base em outro aparelho — os dados vão criptografados para a nuvem do Pipeline.</p><div class="row wrap">${button('Criar chave', 'create-key', 'plus', 'primary')}</div><form id="keyForm" class="key-form"><label class="field">Já tenho uma chave<input name="key" type="password" autocomplete="off" placeholder="MEREO-…" spellcheck="false" autocapitalize="off"></label><button class="btn" type="submit">${icon('key')}Conectar</button></form>`}</section>
  <section class="panel panel-pad"><div class="row">${icon('download')}<h3>Cópia de segurança</h3></div><p>Exporte a base completa (membros, metas e lançamentos) ou importe um arquivo exportado. A importação mescla sem apagar.</p><div class="row wrap">${button('Exportar', 'export', 'download')}${button('Importar arquivo', 'import', 'upload')}</div><input id="importFile" type="file" accept="application/json,.json" hidden></section>
  <section class="panel panel-pad"><div class="row">${icon('palette')}<h3>Aparência</h3></div><p>Mesma lava lamp do Pipeline e do Hub.</p><div class="theme-grid">${THEMES.map(([id, name, desc, [bg, a, b, c]]) => `<button type="button" class="theme-card ${theme === id ? 'on' : ''}" data-theme-pick="${id}"><span class="theme-swatch" style="background:${bg}"><i style="background:${a};left:-10%;top:-30%"></i><i style="background:${b};right:-15%;top:10%"></i><i style="background:${c};left:30%;bottom:-70%"></i></span><b>${name}</b><small>${desc}</small></button>`).join('')}</div></section>
  <section class="panel panel-pad wide"><div class="row">${icon('info')}<h3>Como o MEREO é calculado</h3></div><p>Mesmas regras do Rico Pipeline. Cada indicador vira uma nota de 1 a 5 pela curva de atingimento (o 3º ponto é 100% da meta = nota 3; linear entre os pontos). A nota final é a média ponderada.</p><table class="rules"><thead><tr><th>Indicador</th><th>Peso</th><th>Curva (notas 1 → 5)</th></tr></thead><tbody>${rules}</tbody></table><ul class="rule-notes"><li>Previdência e STVM dentro da captação pesam <b>1,25×</b>; a previdência ponderada também soma na cesta.</li><li>Cesta de investimento = alocação + previdência ponderada. Meta padrão R$ 2,2 mi.</li><li>Crossell: cartão = 1 ponto · consórcio = 1 ponto a cada R$ 10 mil · seguro = 1 ponto a cada R$ 1 mil. Meta 25 pts com <b>mínimo de 10 pts em seguros</b> (sem ele, os demais produtos contam até 15).</li><li>NPS com meta mensal do card 2S2026: jul 35 · ago 37,5 · set 40 · out 42,5 · nov 45 · dez 47,5.</li><li>Índice comercial (83%) e NPS sem lançamento contam como referência — nota 3.</li><li>Semestre: fluxos somam os 6 meses contra a soma das metas mensais; IC e NPS pela média dos meses lançados.</li></ul></section></div>`;
}

// ---------- Diálogos ----------
function showModal(title, body, onSubmit, submitLabel = 'Salvar', { wide = false, onOpen } = {}) {
  dialog.className = wide ? 'wide' : '';
  dialog.innerHTML = `<form method="dialog" id="modalForm"><div class="dialog-head"><h2>${title}</h2><button type="button" class="icon-btn" data-close aria-label="Fechar">${icon('close')}</button></div><div class="dialog-body">${body}<div class="form-error" role="alert"></div></div><div class="dialog-foot"><button type="button" class="btn" data-close>Cancelar</button><button type="submit" class="btn primary">${submitLabel}</button></div></form>`;
  const form = $('#modalForm');
  form.onsubmit = async e => { e.preventDefault(); try { const r = await onSubmit(new FormData(form), form); if (r !== false) dialog.close(); } catch (err) { form.querySelector('.form-error').textContent = err.message; } };
  dialog.querySelectorAll('[data-close]').forEach(b => b.onclick = () => dialog.close());
  dialog.showModal(); onOpen?.(form);
}
function goalSliders(g, prefix = '') {
  const cs = moneyStep(g.cap), ces = moneyStep(g.cesta);
  return `${slider({ key: prefix + 'cap', label: 'Captação mensal', value: g.cap, min: 0, max: Math.max(5e6, g.cap), step: 50000, fmt: FMT.money, presets: [['500 mil', 5e5], ['800 mil', 8e5], ['1 mi', 1e6], ['1,5 mi', 1.5e6], ['2 mi', 2e6]], scope: 'goal' })}${slider({ key: prefix + 'cesta', label: 'Cesta investimento mensal', value: g.cesta, min: 0, max: Math.max(1e7, g.cesta), step: 100000, fmt: FMT.money, presets: [['1,5 mi', 1.5e6], ['2,2 mi', 2.2e6], ['3 mi', 3e6], ['4 mi', 4e6]], scope: 'goal' })}${slider({ key: prefix + 'cross', label: 'Crossell mensal (pontos)', value: g.cross, min: 0, max: Math.max(80, g.cross), step: 1, fmt: v => C.fmtNum(v) + ' pts', presets: [['15', 15], ['20', 20], ['25', 25], ['30', 30]], scope: 'goal' })}${slider({ key: prefix + 'ic', label: 'Índice comercial', value: g.ic, min: 50, max: 100, step: .5, fmt: FMT.pct, presets: [['80%', 80], ['83%', 83], ['85%', 85], ['90%', 90]], scope: 'goal' })}${slider({ key: prefix + 'nps', label: 'NPS', value: g.nps, min: 0, max: 100, step: .1, fmt: FMT.nps, presets: [['35', 35], ['41,3', 41.3], ['50', 50], ['60', 60]], scope: 'goal' })}`;
}
const readGoals = form => Object.fromEntries(['cap', 'cesta', 'cross', 'ic', 'nps'].map(k => [k, +form.querySelector(`[data-goal="${k}"]`).value]));
function addMember() {
  const g = teamDefaults();
  showModal('Adicionar membro', `<div class="fields"><label class="field full">Nome<input name="name" required autocomplete="off" placeholder="Nome do assessor"></label><label class="field">Código A <small>opcional</small><input name="code" autocomplete="off" placeholder="A12345" autocapitalize="characters"></label><div class="field"><span>Função</span><div class="chips-radio chips">${['Assessor', 'Especialista', 'Trainee'].map((r, i) => `<label class="chip-check"><input type="radio" name="role" value="${r}" ${i === 0 ? 'checked' : ''}><span>${r}</span></label>`).join('')}</div></div></div><div class="goal-box"><span class="eyebrow">Metas mensais</span>${goalSliders(g)}</div>`, (f, form) => {
    const name = String(f.get('name') || '').trim(); if (!name) throw Error('Informe o nome.');
    const id = uid(), goals = readGoals(form);
    commit(s => { s.members[id] = { id, name, code: String(f.get('code') || '').trim().toUpperCase(), role: f.get('role') || 'Assessor', goals, createdAt: now(), order: now(), updatedAt: now() }; });
    notify(`${name} entrou no time.`);
  }, 'Adicionar', { onOpen: f => setTimeout(() => f.querySelector('[name=name]').focus(), 50) });
}
function editGoals(id) {
  const m = member(id); if (!m) return;
  const g = { ...C.DEFAULT_GOALS, ...(m.goals || {}) };
  showModal('Metas · ' + esc(m.name), `<div class="fields"><label class="field">Nome<input name="name" value="${esc(m.name)}" required autocomplete="off"></label><label class="field">Código A<input name="code" value="${esc(m.code || '')}" autocomplete="off" autocapitalize="characters"></label></div><div class="goal-box"><span class="eyebrow">Metas mensais padrão</span>${goalSliders(g)}<small class="muted">Para variar a meta mês a mês no semestre, use “Metas do semestre” na visão semestral do membro.</small></div>`, (f, form) => {
    const name = String(f.get('name') || '').trim(); if (!name) throw Error('Informe o nome.');
    commit(s => { s.members[id] = { ...s.members[id], name, code: String(f.get('code') || '').trim().toUpperCase(), goals: readGoals(form), updatedAt: now() }; });
    notify('Metas atualizadas.');
  });
}
function goalsAll() {
  const g = teamDefaults();
  showModal('Metas para todo o time', `<p class="muted small" style="margin-bottom:14px">Aplica as mesmas metas mensais padrão a todos os ${members().length} membros e aos próximos que entrarem. Ajustes mês a mês do semestre continuam valendo.</p>${goalSliders(g)}`, (f, form) => {
    const goals = readGoals(form);
    commit(s => { s.settings = { ...s.settings, defaultGoals: goals, updatedAt: now() }; for (const m of members()) s.members[m.id] = { ...s.members[m.id], goals, updatedAt: now() }; });
    notify('Metas aplicadas ao time.');
  }, 'Aplicar a todos');
}
function editSemGoals(id) {
  const m = member(id); if (!m) return;
  const months = C.semesterMonths(sem), base = { ...C.DEFAULT_GOALS, ...(m.goals || {}) };
  const metas = [['cap', 'Captação', 50000, FMT.money], ['cesta', 'Cesta', 100000, FMT.money], ['cross', 'Crossell', 1, v => C.fmtNum(v) + ' pts']];
  const block = ([k, label, step, fmt]) => {
    const vals = months.map(mo => C.goalsFor(m, mo)[k]), total = vals.reduce((a, b) => a + b, 0), max = Math.max(base[k] * 3, ...vals);
    return `<fieldset class="semgoal" data-metric="${k}" ${k !== 'cap' ? 'hidden' : ''}><div class="sl total"><div class="sl-head"><span>${label} · total do semestre</span><b data-total="${k}">${fmt(total)}</b></div><input type="range" data-semtotal="${k}" min="0" max="${max * 6}" step="${step * 6}" value="${total}" aria-label="Total do semestre"><small class="sl-hint">Arraste o total para distribuir igualmente pelos 6 meses, ou ajuste mês a mês.</small></div><div class="month-sliders">${months.map((mo, i) => `<div class="sl mini"><div class="sl-head"><span>${monthName(mo, { month: 'long' })}</span><b data-mout="${k}-${i}">${fmt(vals[i])}</b></div><input type="range" data-semmonth="${k}" data-i="${i}" min="0" max="${max}" step="${step}" value="${vals[i]}" aria-label="${label} ${monthName(mo)}"></div>`).join('')}</div></fieldset>`;
  };
  showModal(`Metas do ${semLabel(sem)} · ${esc(m.name)}`, `<div class="chip-group" style="margin-bottom:16px"><div class="chips">${metas.map(([k, l], i) => `<button type="button" class="chip ${i === 0 ? 'on' : ''}" data-semtab="${k}">${l}</button>`).join('')}</div></div>${metas.map(block).join('')}<p class="small muted" style="margin-top:14px">Padrão mensal: ${C.shortMoney(base.cap)} captação · ${C.shortMoney(base.cesta)} cesta · ${C.fmtNum(base.cross)} pts. Meses iguais ao padrão não ficam marcados como ajuste.</p>`, (f, form) => {
    const mg = { ...(m.monthGoals || {}) };
    months.forEach((mo, i) => {
      const o = { ...(mg[mo] || {}) };
      for (const [k] of metas) { const v = +form.querySelector(`[data-semmonth="${k}"][data-i="${i}"]`).value; if (Math.abs(v - base[k]) < 1e-9) delete o[k]; else o[k] = v; }
      if (Object.keys(o).length) mg[mo] = o; else delete mg[mo];
    });
    commit(s => { s.members[id] = { ...s.members[id], monthGoals: mg, updatedAt: now() }; });
    notify('Metas do semestre salvas.');
  }, 'Salvar metas', {
    wide: true, onOpen: form => {
      const fmts = Object.fromEntries(metas.map(([k, , , f]) => [k, f]));
      form.addEventListener('click', e => { const t = e.target.closest('[data-semtab]'); if (!t) return; form.querySelectorAll('[data-semtab]').forEach(b => b.classList.toggle('on', b === t)); form.querySelectorAll('.semgoal').forEach(fs => fs.hidden = fs.dataset.metric !== t.dataset.semtab); });
      form.addEventListener('input', e => {
        const t = e.target;
        if (t.dataset.semtotal) { const k = t.dataset.semtotal, step = metas.find(x => x[0] === k)[2], each = roundStep(+t.value / 6, step); form.querySelectorAll(`[data-semmonth="${k}"]`).forEach(s => { s.value = each; form.querySelector(`[data-mout="${k}-${s.dataset.i}"]`).textContent = fmts[k](+s.value); }); form.querySelector(`[data-total="${k}"]`).textContent = fmts[k](+t.value); }
        if (t.dataset.semmonth) { const k = t.dataset.semmonth; form.querySelector(`[data-mout="${k}-${t.dataset.i}"]`).textContent = fmts[k](+t.value); const tot = [...form.querySelectorAll(`[data-semmonth="${k}"]`)].reduce((s, x) => s + +x.value, 0); form.querySelector(`[data-total="${k}"]`).textContent = fmts[k](tot); form.querySelector(`[data-semtotal="${k}"]`).value = tot; }
      });
    }
  });
}
function removeMember(id) {
  const m = member(id); if (!m) return;
  commit(s => { s.members[id] = { ...s.members[id], removedAt: now(), updatedAt: now() }; });
  if (memberId === id) { screen = screen === 'member' ? 'team' : screen; render(); }
  notify(`${m.name} saiu do time.`, () => commit(s => { s.members[id] = { ...s.members[id], removedAt: null, updatedAt: now() }; }));
}
function showKey() {
  if (!cloud) return;
  showModal('Sua chave de sincronização', `<p class="small muted" style="margin-bottom:14px">Cole esta chave em “Já tenho uma chave” no outro aparelho. Quem tiver a chave vê e edita a base — guarde em local seguro.</p><div class="key">${esc(cloud.access)}</div>`, async () => { try { await navigator.clipboard.writeText(cloud.access); notify('Chave copiada.'); } catch { notify('Selecione a chave e copie manualmente.'); return false; } }, 'Copiar chave');
}

// ---------- Lançamento ao vivo ----------
function currentEntry() { const k = entryKey(memberId, month), e = state.entries[k]; return e && !e.cleared ? e : null; }
function setEntry(patch) {
  const k = entryKey(memberId, month), cur = currentEntry() || { status: 'est' };
  state.entries[k] = { ...cur, ...patch, updatedAt: now() };
}
function liveRefresh() {
  const m = member(memberId), e = currentEntry() || {}, v = C.values(e, C.goalsFor(m, month).cross);
  $('#scorePanel').innerHTML = scorePanel(m);
  const calc = { cap: `Captação MEREO: <b>${C.shortMoney(v.cap)}</b>`, cesta: `Cesta MEREO (alocação + previdência 1,25×): <b>${C.shortMoney(v.cesta)}</b>`, cross: `Pontos de crossell: <b>${C.fmtNum(v.cross)} pts</b>${(+e.seg || 0) / 1000 < C.CROSS_MIN_SEG ? ' · faltam ' + C.fmtNum(C.CROSS_MIN_SEG - (+e.seg || 0) / 1000) + ' pts de seguros para o mínimo' : ''}` };
  for (const [k, h] of Object.entries(calc)) { const el = $(`[data-calc="${k}"]`); if (el) el.innerHTML = h; }
  const cap = +e.cap || 0;
  for (const k of ['prev', 'stvm']) { const s = $(`[data-entry="${k}"]`); if (s) s.max = Math.max(cap, +s.value, +s.step); }
}
const sliderFmt = key => ({ cap: FMT.money, prev: FMT.money, stvm: FMT.money, aloc: FMT.money, seg: FMT.money, con: FMT.money, cards: FMT.int, ic: FMT.pct, nps: FMT.nps })[key];
function onEntrySlide(input) {
  const k = input.dataset.entry, val = +input.value;
  setEntry({ [k]: val });
  const box = input.closest('.sl'); box.classList.remove('is-null');
  box.querySelector('.sl-out').textContent = sliderFmt(k)(val);
  box.querySelectorAll('[data-preset]').forEach(b => b.classList.toggle('on', Math.abs(+b.dataset.v - val) < +input.step / 2));
  box.querySelector('[data-null]')?.classList.remove('on');
  liveRefresh();
}
function typeValue(btn) {
  const key = btn.dataset.type, scope = btn.dataset.scope, range = btn.closest('.sl').querySelector('input[type=range]');
  const inp = document.createElement('input'); inp.type = 'number'; inp.inputMode = 'decimal'; inp.step = 'any'; inp.value = range.value; inp.className = 'sl-type';
  btn.replaceWith(inp); inp.focus(); inp.select();
  const done = () => {
    const v = parseFloat(String(inp.value).replace(',', '.'));
    const out = document.createElement('button'); out.type = 'button'; out.className = 'sl-out'; out.dataset.type = key; out.dataset.scope = scope;
    inp.replaceWith(out);
    if (isFinite(v)) {
      if (v > +range.max) range.max = v; if (v < +range.min) range.min = v;
      range.step = 'any'; range.value = v;
      if (scope === 'entry') { setEntry({ [key]: v }); persist(); render(); return; }
      range.dispatchEvent(new Event('input', { bubbles: true }));
    }
    out.textContent = (scope === 'entry' ? sliderFmt(key) : goalFmt(key))(+range.value);
  };
  inp.addEventListener('blur', done, { once: true });
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } });
}
const goalFmt = k => ({ cap: FMT.money, cesta: FMT.money, cross: v => C.fmtNum(v) + ' pts', ic: FMT.pct, nps: FMT.nps })[k] || FMT.nps;

// ---------- Exemplo ----------
function demoState() {
  const s = C.emptyState(); s.settings = { team: 'Time Exemplo', leader: 'Líder Exemplo', updatedAt: 1 };
  const names = [['Ana Ribeiro', 1.15], ['Bruno Tavares', .95], ['Carla Mendes', 1.3], ['Diego Souza', .7], ['Elisa Prado', 1.05], ['Felipe Nogueira', .55]];
  const sm = C.semesterMonths(C.semesterOf(todayMonth)), cur = sm.indexOf(todayMonth);
  names.forEach(([name, f], i) => {
    const id = 'demo-' + i; s.members[id] = { id, name, code: 'A' + (70310 + i * 137), role: 'Assessor', goals: { ...C.DEFAULT_GOALS }, createdAt: i, order: i, updatedAt: 1 };
    sm.forEach((mo, j) => {
      if (j > Math.max(cur, 0) + 1) return;
      const w = f * (0.8 + ((i * 7 + j * 3) % 5) / 10);
      s.entries[C.monthKey(id, mo)] = { cap: Math.round(800000 * w / 10000) * 10000, prev: j % 2 ? 100000 : 0, stvm: 0, aloc: Math.round(2200000 * (w * .9 + .1) / 25000) * 25000, cards: Math.round(12 * w), seg: Math.round(4000 * w / 500) * 500, con: j % 3 === 0 ? 100000 : 0, ic: Math.round(83 * (0.95 + w / 20) * 2) / 2, nps: Math.round(41.3 * (0.8 + w / 4)), status: j < cur ? 'real' : 'est', updatedAt: 1 };
    });
  });
  return s;
}

// ---------- Eventos ----------
const actions = {
  'toggle-sidebar': () => { sidebarCollapsed = !sidebarCollapsed; store.set(LS.sidebar, sidebarCollapsed ? 'collapsed' : 'open'); render(); },
  'cycle-theme': () => { const i = THEMES.findIndex(t => t[0] === theme); applyTheme(THEMES[(i + 1) % THEMES.length][0]); notify('Tema ' + THEMES.find(t => t[0] === theme)[1] + '.'); if (screen === 'settings') render(); },
  'period-prev': () => { if (view === 'month') month = shiftMonth(month, -1); else sem = C.shiftSemester(sem, -1); render(); },
  'period-next': () => { if (view === 'month') month = shiftMonth(month, 1); else sem = C.shiftSemester(sem, 1); render(); },
  'add-member': addMember, 'goals-all': goalsAll,
  'edit-goals': b => editGoals(b.dataset.id), 'remove-member': b => removeMember(b.dataset.id),
  'restore-member': b => { commit(s => { s.members[b.dataset.id] = { ...s.members[b.dataset.id], removedAt: null, updatedAt: now() }; }); notify('Membro restaurado.'); },
  'edit-sem-goals': () => editSemGoals(memberId),
  'member-prev': () => stepMember(-1), 'member-next': () => stepMember(1),
  'copy-prev': () => {
    const prev = state.entries[entryKey(memberId, shiftMonth(month, -1))];
    if (!C.hasData(prev)) { notify('O mês anterior não tem lançamento.'); return; }
    const before = state.entries[entryKey(memberId, month)];
    const { updatedAt, status, ...vals } = prev;
    commit(s => { s.entries[entryKey(memberId, month)] = { ...vals, status: 'est', updatedAt: now() }; });
    notify('Estimativa copiada de ' + monthName(shiftMonth(month, -1), { month: 'long' }) + '.', () => commit(s => { s.entries[entryKey(memberId, month)] = before ? { ...before, updatedAt: now() } : { cleared: true, updatedAt: now() }; }));
  },
  'repeat-sem': () => {
    const cur = currentEntry(); if (!C.hasData(cur)) { notify('Estime este mês primeiro.'); return; }
    const months = C.semesterMonths(C.semesterOf(month)).filter(mo => mo > month);
    if (!months.length) { notify('Este já é o último mês do semestre.'); return; }
    const targets = months.filter(mo => !C.hasData(state.entries[entryKey(memberId, mo)]) || (state.entries[entryKey(memberId, mo)].status || 'est') === 'est');
    const backup = Object.fromEntries(targets.map(mo => [mo, state.entries[entryKey(memberId, mo)]]));
    const { updatedAt, status, ...vals } = cur;
    commit(s => { for (const mo of targets) s.entries[entryKey(memberId, mo)] = { ...vals, status: 'est', updatedAt: now() }; });
    notify(`Estimativa repetida em ${targets.length} ${targets.length === 1 ? 'mês' : 'meses'} (realizados preservados).`, () => commit(s => { for (const mo of targets) s.entries[entryKey(memberId, mo)] = backup[mo] ? { ...backup[mo], updatedAt: now() } : { cleared: true, updatedAt: now() }; }));
  },
  'clear-month': () => {
    const before = currentEntry();
    commit(s => { s.entries[entryKey(memberId, month)] = { cleared: true, updatedAt: now() }; });
    notify('Lançamento de ' + monthName(month, { month: 'long' }) + ' limpo.', () => commit(s => { s.entries[entryKey(memberId, month)] = { ...before, updatedAt: now() }; }));
  },
  'demo': () => { demoBackup = state; state = demoState(); demo = true; screen = 'team'; render(); },
  'exit-demo': () => { state = demoBackup || C.emptyState(); demo = false; demoBackup = null; screen = 'team'; render(); },
  'save-team': () => { const team = $('#teamName').value.trim() || 'Meu time', leader = $('#leaderName').value.trim(); commit(s => { s.settings = { ...s.settings, team, leader, updatedAt: now() }; }); notify('Time atualizado.'); },
  'create-key': async b => { if (demo) { notify('Saia do exemplo para criar sua chave.'); return; } b.disabled = true; try { await connectCloud(genKey(), true); render(); if (syncStatus === 'synced') showKey(); } catch (e) { cloud = null; store.del(LS.key); notify(e.message); render(); } },
  'show-key': showKey, 'sync-now': () => sync({ quiet: false }).then(() => syncStatus === 'synced' && notify('Base sincronizada.')),
  'disconnect': () => { store.del(LS.key); cloud = null; setStatus('local'); render(); notify('Desconectado. Os dados continuam neste aparelho.'); },
  'export': () => { const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `mereo-time-${new Date().toISOString().slice(0, 10)}.json`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); },
  'import': () => $('#importFile').click()
};
function shiftMonth(m, d) { const dt = new Date(+m.slice(0, 4), +m.slice(5, 7) - 1 + d, 1); return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}`; }
function stepMember(d) { const list = members(), i = list.findIndex(x => x.id === memberId); if (list.length < 2) return; memberId = list[(i + d + list.length) % list.length].id; render(); }
function openMember(id) { memberId = id; screen = 'member'; render(); }

document.addEventListener('click', e => {
  const t = e.target;
  if (dialog.open && dialog.contains(t)) {
    const p = t.closest('[data-preset]'); if (p) { const r = p.closest('.sl').querySelector('input[type=range]'); if (+p.dataset.v > +r.max) r.max = p.dataset.v; r.value = p.dataset.v; r.dispatchEvent(new Event('input', { bubbles: true })); }
    const o = t.closest('.sl-out'); if (o) typeValue(o);
    return;
  }
  const nav = t.closest('[data-nav]'); if (nav) { screen = nav.dataset.nav; render(); return; }
  const mem = t.closest('[data-member]'); if (mem) { openMember(mem.dataset.member); return; }
  const vw = t.closest('[data-view]'); if (vw) { view = vw.dataset.view; if (view === 'semester') sem = C.semesterOf(month); else if (!C.semesterMonths(sem).includes(month)) month = C.semesterMonths(sem).includes(todayMonth) ? todayMonth : C.semesterMonths(sem)[0]; render(); return; }
  const sm = t.closest('[data-semmode]'); if (sm) { semMode = sm.dataset.semmode; render(); return; }
  const om = t.closest('[data-open-month]'); if (om) { month = om.dataset.openMonth; view = 'month'; render(); return; }
  const st = t.closest('[data-status]'); if (st) { setEntry({ status: st.dataset.status }); persist(); render(); return; }
  const th = t.closest('[data-theme-pick]'); if (th) { applyTheme(th.dataset.themePick); render(); return; }
  const pr = t.closest('[data-preset]'); if (pr && pr.dataset.scope === 'entry') { setEntry({ [pr.dataset.preset]: +pr.dataset.v }); persist(); render(); return; }
  const nl = t.closest('[data-null]'); if (nl && nl.dataset.scope === 'entry') { setEntry({ [nl.dataset.null]: null }); persist(); render(); return; }
  const out = t.closest('.sl-out'); if (out) { typeValue(out); return; }
  const a = t.closest('[data-action]'); if (a && actions[a.dataset.action]) { actions[a.dataset.action](a); }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.entry) { isSliding = true; onEntrySlide(t); return; }
  if (dialog.open && t.dataset.goal) { const box = t.closest('.sl'); box.querySelector('.sl-out').textContent = goalFmt(t.dataset.goal)(+t.value); box.querySelectorAll('[data-preset]').forEach(b => b.classList.toggle('on', Math.abs(+b.dataset.v - +t.value) < (+t.step || 1e-6) / 2)); }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.entry) { isSliding = false; persist(); return; }
  if (t.id === 'importFile' && t.files[0]) {
    t.files[0].text().then(txt => { const inc = C.validate(JSON.parse(txt)); commit(s => { const m = C.merge(s, inc); Object.assign(s, m); }); notify(`Importado: ${Object.keys(inc.members).length} membros, ${Object.keys(inc.entries).length} lançamentos.`); }).catch(err => notify('Não foi possível importar: ' + err.message));
    t.value = '';
  }
});
document.addEventListener('submit', async e => {
  if (e.target.id !== 'keyForm') return; e.preventDefault();
  if (demo) { notify('Saia do exemplo para conectar.'); return; }
  const k = new FormData(e.target).get('key'); const btn = e.target.querySelector('button'); btn.disabled = true;
  try { await connectCloud(k, false); render(); notify('Conectado. Base sincronizada.'); } catch (err) { cloud = null; store.del(LS.key); btn.disabled = false; notify(err.message); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && dialog.open) dialog.close(); });

render();
})();
