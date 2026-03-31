// ════════════════════════════════════════════════════════
//  DB  —  localStorage layer with schema validation,
//         versioning, quota handling, export/import
// ════════════════════════════════════════════════════════

const DB = (() => {
  const PFX = C.DB.PREFIX;

  // ── Demo user detection ────────────────────────────
  // Returns true if the currently logged-in user is a seeded demo account.
  // Demo user IDs are 1–16 (set by seed.js). Using IDs avoids a circular
  // dependency — we can't call g('users') here without infinite recursion.
  const DEMO_USER_IDS = new Set([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]);
  function _isDemoSession() {
    try {
      const raw = localStorage.getItem('acs_session');
      if (!raw) return true; // not logged in yet — no filtering on landing page
      const sess = JSON.parse(raw);
      return DEMO_USER_IDS.has(sess?.uid);
    } catch { return true; }
  }

  // Keys that must always return ALL records regardless of demo status
  // Note: 'users' is intentionally NOT here — demo users are _demo-stamped and
  // should be hidden from non-demo admins. Auth reads happen before any session
  // exists (so _isDemoSession()===true anyway) and don't need the bypass.
  const _NO_FILTER_KEYS = new Set(['settings']);

  // ── Core read/write ────────────────────────────────
  function g(k) {
    try {
      const arr = JSON.parse(localStorage.getItem(PFX + k)) ?? [];
      // Non-demo users never see demo-only records (except auth-critical keys)
      if (!_isDemoSession() && !_NO_FILTER_KEYS.has(k) && Array.isArray(arr)) {
        return arr.filter(x => !x._demo);
      }
      return arr;
    } catch { return []; }
  }
  function s(k, v) {
    try {
      // Non-demo users only see/operate on their own records. When they write back
      // a table, we must re-merge any _demo records they never saw, so demo data
      // is never silently wiped by a non-demo write.
      if (!_isDemoSession() && Array.isArray(v)) {
        const stored = JSON.parse(localStorage.getItem(PFX + k)) ?? [];
        const demoRecs = stored.filter(x => x && x._demo);
        if (demoRecs.length) {
          const writtenIds = new Set(v.map(x => x.id));
          v = [...v, ...demoRecs.filter(x => !writtenIds.has(x.id))];
        }
      }
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
