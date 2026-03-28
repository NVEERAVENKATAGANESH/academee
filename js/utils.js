// ════════════════════════════════════════════════════════
//  UTILS  —  pure helper functions
// ════════════════════════════════════════════════════════

// ── DOM shorthand ──────────────────────────────────────
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

// ── XSS-safe HTML escape ───────────────────────────────
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Grade / GPA ────────────────────────────────────────
function grade(marks) {
  const m = Number(marks);
  if (m >= C.GRADE.A) return 'A';
  if (m >= C.GRADE.B) return 'B';
  if (m >= C.GRADE.C) return 'C';
  if (m >= C.GRADE.D) return 'D';
  return 'F';
}
function gpa(marks)   { return C.GRADE.GPA[grade(marks)]; }
function gpaPts(g)    { return C.GRADE.GPA[g] ?? 0; }

// ── Academic standing from GPA value ──────────────────
function standing(gpaVal) {
  if (gpaVal == null) return { label: 'No Grades', cls: 'bx-gy' };
  if (gpaVal >= C.STANDING.DEANS_LIST) return { label: "Dean's List",       cls: 'bx-am' };
  if (gpaVal >= C.STANDING.GOOD)       return { label: 'Good Standing',     cls: 'bx-gr' };
  if (gpaVal >= C.STANDING.PROBATION)  return { label: 'Academic Probation',cls: 'bx-am' };
  return { label: 'Risk of Dismissal', cls: 'bx-rd' };
}

// ── Lookup helpers ─────────────────────────────────────
function sn(id) {
  const s = DB.g('students').find(x => x.id === id);
  return s ? esc(s.fn + ' ' + s.ln).trim() : '—';
}
function cn(id) {
  const c = DB.g('courses').find(x => x.id === id);
  return c ? esc(c.name) : '—';
}
function cc(id) {
  const c = DB.g('courses').find(x => x.id === id);
  return c ? esc(c.code) : '—';
}
function fn(id) {
  const f = DB.g('faculty').find(x => x.id === id);
  return f ? esc(f.fn + ' ' + f.ln) : '—';
}

// ── Math helpers ───────────────────────────────────────
function pct(p, t)  { return t ? Math.round(p / t * 100) : 0; }
function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }
function usd(n)     { return '$' + Number(n).toLocaleString(); }
function round2(n)  { return Math.round(n * 100) / 100; }

// ── Student GPA (weighted by course credits) ───────────
function stuGPA(sid) {
  const gs = DB.g('grades').filter(g => g.sid === sid);
  if (!gs.length) return null;
  const courses = DB.g('courses');
  let totalPoints = 0, totalCredits = 0;
  gs.forEach(g => {
    const cr = courses.find(c => c.id === g.cid)?.cr || 3;
    totalPoints  += gpa(g.marks) * cr;
    totalCredits += cr;
  });
  return totalCredits ? round2(totalPoints / totalCredits) : null;
}

// ── Semester credit count for a student ───────────────
function stuCredits(sid, sem) {
  const enrolls = DB.g('enrollments').filter(e => e.sid === sid && (!sem || e.sem === sem));
  const courses = DB.g('courses');
  return enrolls.reduce((sum, e) => {
    return sum + (courses.find(c => c.id === e.cid)?.cr || 0);
  }, 0);
}

// ── Avatar colour class (cycles through 5) ────────────
const AV_CLASSES = ['av-bl', 'av-gr', 'av-pu', 'av-am', 'av-te'];
function avCls(i)  { return AV_CLASSES[i % 5]; }
function bxCls(i)  { return ['bx-bl','bx-gr','bx-pu','bx-am','bx-te'][i % 5]; }

// ── Time helpers ───────────────────────────────────────
function timeAgo(ts) {
  const d = (Date.now() - ts) / 1000;
  if (d < 60)    return 'just now';
  if (d < 3600)  return Math.floor(d / 60) + 'm ago';
  if (d < 86400) return Math.floor(d / 3600) + 'h ago';
  return Math.floor(d / 86400) + 'd ago';
}
function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[+m - 1]} ${+d}, ${y}`;
}
function fmtDateTime(ts) {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}
function today() { return new Date().toISOString().split('T')[0]; }

// ── HTML component helpers ─────────────────────────────
function gChip(g) {
  return `<span class="gd g${g}" aria-label="Grade ${g}">${esc(g)}</span>`;
}

function progBar(v, max = 100, showLabel = true) {
  const p = clamp(Math.round(v / max * 100), 0, 100);
  const c = p >= C.ATTENDANCE.WARNING_PCT ? 'var(--green)'
          : p >= C.ATTENDANCE.RESTRICT_PCT ? 'var(--amber)'
          : 'var(--red)';
  const label = showLabel ? `<span class="mono text2" style="font-size:11px">${p}%</span>` : '';
  return `<div style="display:flex;align-items:center;gap:6px">
    <div class="prog" role="progressbar" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100">
      <div class="pf" style="width:${p}%;background:${c}"></div>
    </div>${label}</div>`;
}

function sparkline(vals) {
  if (!vals.length) return '';
  const max = Math.max(...vals) || 1;
  return `<div class="spark" aria-hidden="true">${vals.map((v, i) =>
    `<div class="spark-bar" style="height:${Math.round(v / max * 28) + 2}px;background:${
      i === vals.length - 1 ? 'var(--blue)' : 'var(--bg4)'
    }"></div>`
  ).join('')}</div>`;
}

// ── Student ID format ─────────────────────────────────
function stuId(id) { return 'STU' + String(id).padStart(4, '0'); }
function facId(id) { return 'FAC' + String(id).padStart(3, '0'); }

// ── Deep clone ────────────────────────────────────────
function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

// ── Debounce ──────────────────────────────────────────
function debounce(fn, ms = 200) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ── CSV parsing ───────────────────────────────────────
function parseCSV(text) {
  return text.trim().split('\n').map(row =>
    row.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''))
  );
}

// ── Download helper ───────────────────────────────────
function downloadText(content, filename, type = 'text/plain') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
function downloadJSON(data, filename) {
  downloadText(JSON.stringify(data, null, 2), filename, 'application/json');
}
function downloadCSV(rows, filename) {
  downloadText(rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n'), filename, 'text/csv');
}

// ── Sort helper for tables ────────────────────────────
function sortArr(arr, key, dir = 'asc') {
  return [...arr].sort((a, b) => {
    let av = a[key], bv = b[key];
    if (typeof av === 'string') av = av.toLowerCase();
    if (typeof bv === 'string') bv = bv.toLowerCase();
    if (av < bv) return dir === 'asc' ? -1 : 1;
    if (av > bv) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}
