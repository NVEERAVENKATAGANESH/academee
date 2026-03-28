// ════════════════════════════════════════════════════════
//  DB  —  localStorage layer with schema validation,
//         versioning, quota handling, export/import
// ════════════════════════════════════════════════════════

const DB = (() => {
  const PFX = C.DB.PREFIX;

  // ── Core read/write ────────────────────────────────
  function g(k) {
    try { return JSON.parse(localStorage.getItem(PFX + k)) ?? []; }
    catch { return []; }
  }
  function s(k, v) {
    try {
      localStorage.setItem(PFX + k, JSON.stringify(v));
      return true;
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        toast('Storage full — export your data to free space', false);
      }
      return false;
    }
  }
  function go(k) {
    try { return JSON.parse(localStorage.getItem(PFX + k)) ?? {}; }
    catch { return {}; }
  }
  function so(k, v) { return s(k, v); }

  // ── Next ID ────────────────────────────────────────
  function nid(arr) {
    return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1;
  }

  // ── Transactional update ───────────────────────────
  // fn receives array clone, returns modified array
  function update(k, fn) {
    const arr = g(k);
    const result = fn([...arr]);
    s(k, result);
    return result;
  }

  // ── Version / migration ────────────────────────────
  function isSeeded() {
    return g(C.DB.VERSION).length > 0;
  }
  function markSeeded() {
    s(C.DB.VERSION, [1]);
  }

  // ── Export all data ────────────────────────────────
  function exportAll() {
    const KEYS = [
      'users','faculty','students','depts','courses','enrollments',
      'grades','attendance','fees','scholarships','exams','announcements',
      'assignments','submissions','leaves','appeals','events','messages',
      'notifications','wishlist','waitlist','audit'
    ];
    const data = { version: C.DB.VERSION, exportedAt: new Date().toISOString() };
    KEYS.forEach(k => { data[k] = g(k); });
    return data;
  }

  // ── Import data ────────────────────────────────────
  function importAll(data) {
    if (!data || !data.version) throw new Error('Invalid backup file');
    const KEYS = [
      'users','faculty','students','depts','courses','enrollments',
      'grades','attendance','fees','scholarships','exams','announcements',
      'assignments','submissions','leaves','appeals','events','messages',
      'notifications','wishlist','waitlist','audit'
    ];
    KEYS.forEach(k => { if (data[k]) s(k, data[k]); });
    markSeeded();
  }

  // ── Clear all (reset) ──────────────────────────────
  function clearAll() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PFX))
      .forEach(k => localStorage.removeItem(k));
  }

  // ── Storage usage estimate ─────────────────────────
  function usageKB() {
    let total = 0;
    Object.keys(localStorage)
      .filter(k => k.startsWith(PFX))
      .forEach(k => { total += localStorage.getItem(k).length * 2; }); // UTF-16
    return Math.round(total / 1024);
  }

  return { g, s, go, so, nid, update, isSeeded, markSeeded, exportAll, importAll, clearAll, usageKB };
})();
