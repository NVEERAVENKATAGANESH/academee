// ════════════════════════════════════════════════════════
//  STATE  —  centralised application state
// ════════════════════════════════════════════════════════

const State = (() => {
  let _state = {
    user:        null,      // logged-in user object
    page:        null,      // current page id
    charts:      {},        // Chart.js instances keyed by canvas id
    sort:        {},        // { tableId: { key, dir } }
    pagination:  {},        // { tableId: { page, size } }
    sessionTimer: null,     // inactivity timeout handle
    theme:       'dark',    // 'dark' | 'light'
  };

  // ── Getters ──────────────────────────────────────────
  function get(key)      { return _state[key]; }
  function getUser()     { return _state.user; }
  function getCharts()   { return _state.charts; }
  function getTheme()    { return _state.theme; }

  // ── Setters ──────────────────────────────────────────
  function set(key, val) { _state[key] = val; }
  function setUser(u)    { _state.user = u; }

  // ── Chart management ─────────────────────────────────
  function destroyChart(id) {
    if (_state.charts[id]) {
      try { _state.charts[id].destroy(); } catch {}
      delete _state.charts[id];
    }
  }
  function destroyAllCharts() {
    Object.keys(_state.charts).forEach(destroyChart);
  }
  function setChart(id, chart) { _state.charts[id] = chart; }
  function getChart(id) { return _state.charts[id]; }

  // ── Sort state ────────────────────────────────────────
  function getSort(tableId) {
    return _state.sort[tableId] || { key: null, dir: 'asc' };
  }
  function setSort(tableId, key) {
    const cur = _state.sort[tableId] || { key: null, dir: 'asc' };
    const dir = cur.key === key && cur.dir === 'asc' ? 'desc' : 'asc';
    _state.sort[tableId] = { key, dir };
    return _state.sort[tableId];
  }

  // ── Pagination state ──────────────────────────────────
  function getPage(tableId) {
    return _state.pagination[tableId] || { page: 1, size: C.PAGE_SIZE };
  }
  function setPage(tableId, page) {
    if (!_state.pagination[tableId]) _state.pagination[tableId] = { page: 1, size: C.PAGE_SIZE };
    _state.pagination[tableId].page = page;
  }
  function resetPage(tableId) {
    if (_state.pagination[tableId]) _state.pagination[tableId].page = 1;
  }

  // ── Theme ─────────────────────────────────────────────
  function setTheme(t) {
    _state.theme = t;
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('acs_theme', t);
  }
  function loadTheme() {
    const saved = localStorage.getItem('acs_theme') || 'dark';
    setTheme(saved);
  }

  // ── Reset (on logout) ────────────────────────────────
  function reset() {
    destroyAllCharts();
    clearTimeout(_state.sessionTimer);
    _state.user = null;
    _state.page = null;
    _state.sort = {};
    _state.pagination = {};
    _state.sessionTimer = null;
  }

  return {
    get, set, getUser, getCharts, getTheme,
    setUser,
    destroyChart, destroyAllCharts, setChart, getChart,
    getSort, setSort,
    getPage, setPage, resetPage,
    setTheme, loadTheme,
    reset,
  };
})();
