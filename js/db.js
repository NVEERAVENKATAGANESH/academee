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

  // ── Settings helpers ───────────────────────────────
  function getSetting(key, fallback = undefined) {
    const settings = go('settings');
    return settings[key] !== undefined ? settings[key] : fallback;
  }
  function setSetting(key, val) {
    const settings = go('settings');
    settings[key] = val;
    s('settings', settings);
  }

  // ── Version / migration ────────────────────────────
  function isSeeded() {
    return g(C.DB.VERSION).length > 0;
  }
  function markSeeded() {
    s(C.DB.VERSION, [1]);
  }

  // ── Export all data ────────────────────────────────
  const KEYS = [
    'users','faculty','students','depts','courses','enrollments',
    'grades','attendance','fees','scholarships','exams','announcements',
    'assignments','submissions','leaves','appeals','events','messages',
    'notifications','wishlist','waitlist','audit'
  ];

  function exportAll() {
    const data = { version: C.DB.VERSION, exportedAt: new Date().toISOString() };
    KEYS.forEach(k => { data[k] = g(k); });
    return data;
  }

  // ── Import data ────────────────────────────────────
  function importAll(data) {
    if (!data || !data.version) throw new Error('Invalid backup file — missing version field');
    // Validate that all present keys are arrays (not objects or primitives)
    for (const k of KEYS) {
      if (data[k] !== undefined && !Array.isArray(data[k])) {
        throw new Error(`Invalid backup format: "${k}" must be an array`);
      }
    }
    // Validate that records in key arrays are objects
    const criticalKeys = ['users', 'students', 'faculty'];
    for (const k of criticalKeys) {
      if (Array.isArray(data[k]) && data[k].some(r => typeof r !== 'object' || r === null)) {
        throw new Error(`Invalid backup format: "${k}" contains non-object entries`);
      }
    }
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

  return { g, s, go, nid, update, getSetting, setSetting, isSeeded, markSeeded, exportAll, importAll, clearAll, usageKB };
})();
