// ════════════════════════════════════════════════════════
//  AUTH  —  login, logout, session management
//           Passwords hashed with SHA-256 + username salt
// ════════════════════════════════════════════════════════

const Auth = (() => {
  let _sessionTimer = null;
  const TIMEOUT = C.SESSION.TIMEOUT_MS;

  // ── BroadcastChannel for cross-tab logout sync ────────
  const _bc = typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('acs_auth')
    : null;
  if (_bc) {
    _bc.onmessage = e => {
      if (e.data?.type === 'logout' && State.getUser()) doLogout();
    };
  }

  // ── Hash (username is salt — same password → different hash per user) ─
  function hashPw(raw, username) {
    return CryptoJS.SHA256((username || '') + ':' + raw).toString();
  }

  // ── Rate limiting ─────────────────────────────────────
  const _attempts  = {};   // username → { count, lockedUntil }
  const MAX_FAILS  = 5;
  const LOCK_MS    = 15 * 60 * 1000;  // 15 minutes

  function _checkLock(u) {
    const a = _attempts[u];
    if (!a) return null;
    if (a.lockedUntil && Date.now() < a.lockedUntil) {
      const mins = Math.ceil((a.lockedUntil - Date.now()) / 60000);
      return `Too many failed attempts. Try again in ${mins} minute${mins > 1 ? 's' : ''}.`;
    }
    return null;
  }

  function _recordFail(u) {
    if (!_attempts[u]) _attempts[u] = { count: 0, lockedUntil: null };
    _attempts[u].count++;
    if (_attempts[u].count >= MAX_FAILS) {
      _attempts[u].lockedUntil = Date.now() + LOCK_MS;
      _attempts[u].count = 0;
    }
  }

  function _clearFails(u) {
    delete _attempts[u];
  }

  // ── Login ─────────────────────────────────────────────
  function doLogin() {
    const u     = $('lu').value.trim();
    const raw   = $('lp').value;
    const errEl = $('lerr');

    errEl.style.display = 'none';

    if (!u || !raw) {
      errEl.textContent = 'Please enter username and password.';
      errEl.style.display = 'block';
      return;
    }

    const lockMsg = _checkLock(u);
    if (lockMsg) {
      errEl.textContent = lockMsg;
      errEl.style.display = 'block';
      return;
    }

    const hashed = hashPw(raw, u);
    const users  = DB.g('users');
    const user   = users.find(x => x.u === u && x.p === hashed);

    if (!user) {
      _recordFail(u);
      const a = _attempts[u];
      const remaining = a ? Math.max(0, MAX_FAILS - a.count) : MAX_FAILS;
      const hint = remaining > 0
        ? ` (${remaining} attempt${remaining > 1 ? 's' : ''} remaining)`
        : '';
      errEl.textContent = 'Incorrect username or password.' + hint;
      errEl.style.display = 'block';
      $('lp').value = '';
      $('lp').focus();
      addAudit('Login Failed', `Failed login attempt for "${esc(u)}"`, 'system', 'var(--red)');
      return;
    }

    _clearFails(u);
    State.setUser(user);
    saveSession(user);
    _startSessionTimer();
    _renderShell(user);
    addAudit('Login', `${esc(user.name || user.u)} signed in as ${user.role}`, user.u, 'var(--green)');
  }

  // ── Logout ────────────────────────────────────────────
  function doLogout() {
    const u = State.getUser();
    if (!u) return; // already logged out (e.g. from another tab)

    if (u) addAudit('Logout', `${esc(u.name || u.u)} signed out`, u.u, 'var(--blue)');

    // Notify other tabs before clearing state
    if (_bc) _bc.postMessage({ type: 'logout' });

    clearSession();
    _clearSessionTimer();
    State.reset();

    $('app').style.display   = 'none';
    $('login').style.display = 'block';
    $('lu').value  = '';
    $('lp').value  = '';
    $('lerr').style.display = 'none';
    $('land-overlay')?.classList.remove('show');
    $('land-modal')?.classList.remove('show');
    const loginEl = $('login');
    if (loginEl) loginEl.scrollTop = 0;
  }

  // ── Sign Up ───────────────────────────────────────────
  function doSignup() {
    const name  = $('su-name').value.trim();
    const u     = $('su-user').value.trim().toLowerCase();
    const role  = $('su-role').value;
    const dept  = $('su-dept').value;
    const pass  = $('su-pass').value;
    const conf  = $('su-conf').value;
    const errEl = $('su-err');

    errEl.style.display = 'none';

    if (!name || !u || !pass || !conf) {
      errEl.textContent = 'All fields are required.';
      errEl.style.display = 'block'; return;
    }
    if (!/^[a-z0-9_]{3,20}$/.test(u)) {
      errEl.textContent = 'Username: 3–20 characters, letters / numbers / _ only.';
      errEl.style.display = 'block'; return;
    }
    if (pass.length < 8) {
      errEl.textContent = 'Password must be at least 8 characters.';
      errEl.style.display = 'block'; return;
    }
    if (pass !== conf) {
      errEl.textContent = 'Passwords do not match.';
      errEl.style.display = 'block'; return;
    }

    const users = DB.g('users');
    if (users.find(x => x.u === u)) {
      errEl.textContent = 'Username already taken — please choose another.';
      errEl.style.display = 'block'; return;
    }

    const nameParts = name.split(' ');
    const fn = nameParts[0];
    const ln = nameParts.slice(1).join(' ');
    const newId = Math.max(0, ...users.map(x => x.id)) + 1;
    const year  = new Date().getFullYear().toString();
    let lid = null;

    if (role === 'student') {
      const list = DB.g('students');
      lid = Math.max(0, ...list.map(x => x.id)) + 1;
      list.push({ id:lid, fn, ln, em:u+'@uni.edu', ph:'', dept, yr:'1', dob:'', status:'Active', addr:'', adm:year });
      DB.s('students', list);
    } else if (role === 'faculty') {
      const list = DB.g('faculty');
      lid = Math.max(0, ...list.map(x => x.id)) + 1;
      list.push({ id:lid, fn, ln, em:u+'@uni.edu', ph:'', dept, qual:'', spec:'', join:year });
      DB.s('faculty', list);
    }

    const newUser = { id:newId, u, p:hashPw(pass, u), role, lid, name };
    users.push(newUser);
    DB.s('users', users);

    addAudit('Sign Up', `New ${role} account created: ${esc(name)} (${esc(u)})`, u, 'var(--green)');

    State.setUser(newUser);
    saveSession(newUser);
    _startSessionTimer();
    _renderShell(newUser);
  }

  // ── Session persistence (localStorage so all tabs share session) ───
  function saveSession(user) {
    const sess = { uid: user.id, role: user.role, ts: Date.now() };
    localStorage.setItem(C.SESSION.KEY, JSON.stringify(sess));
  }

  function loadSession() {
    try {
      const raw = localStorage.getItem(C.SESSION.KEY);
      if (!raw) return null;
      const sess = JSON.parse(raw);
      if (Date.now() - sess.ts > TIMEOUT) { clearSession(); return null; }
      const user = DB.g('users').find(x => x.id === sess.uid && x.role === sess.role);
      return user || null;
    } catch { return null; }
  }

  function clearSession() {
    localStorage.removeItem(C.SESSION.KEY);
  }

  // ── Inactivity timer ──────────────────────────────────
  function _startSessionTimer() {
    _clearSessionTimer();
    _resetTimer();
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evt =>
      document.addEventListener(evt, _resetTimer, { passive: true })
    );
  }

  let _warnTimer = null;

  function _resetTimer() {
    clearTimeout(_sessionTimer);
    clearTimeout(_warnTimer);
    // Warn 60s before expiry
    if (TIMEOUT > 90000) {
      _warnTimer = setTimeout(() => {
        if (State.getUser()) toast('⚠ Session expires in 60 seconds — interact to stay logged in.', false);
      }, TIMEOUT - 60000);
    }
    _sessionTimer = setTimeout(() => {
      if (State.getUser()) {
        toast('Session expired due to inactivity.', false);
        setTimeout(doLogout, 1500);
      }
    }, TIMEOUT);
  }

  function _clearSessionTimer() {
    clearTimeout(_sessionTimer);
    clearTimeout(_warnTimer);
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evt =>
      document.removeEventListener(evt, _resetTimer)
    );
  }

  // ── Restore session on page load ──────────────────────
  function tryRestoreSession() {
    const user = loadSession();
    if (user) {
      State.setUser(user);
      _startSessionTimer();
      _renderShell(user);
      return true;
    }
    return false;
  }

  // ── Render app shell after login ──────────────────────
  function _renderShell(user) {
    $('login').style.display = 'none';
    $('app').style.display   = 'flex';

    const initials = (user.name || user.u).slice(0, 2).toUpperCase();
    $('sbav').textContent    = initials;
    $('sbav').className      = 'sb-av role-' + user.role;
    $('sbname').textContent  = esc(user.name || user.u);
    $('sbrole').textContent  = { admin:'Administrator', faculty:'Faculty Member', student:'Student' }[user.role] || user.role;

    ['admin','faculty','student'].forEach(r => {
      const el = $('tnav-' + r);
      if (el) el.style.display = (user.role === r) ? 'flex' : 'none';
    });

    updateNotifBadge();

    const defaults = { admin:'dash', faculty:'fdash', student:'sdash' };
    go(defaults[user.role]);
  }

  // ── Change password ───────────────────────────────────
  function changePassword(userId, oldRaw, newRaw) {
    if (!V.minLen(newRaw, 8)) return 'Password must be at least 8 characters';
    const users = DB.g('users');
    const idx   = users.findIndex(u => u.id === userId);
    if (idx < 0) return 'User not found';
    const username = users[idx].u;
    if (users[idx].p !== hashPw(oldRaw, username)) return 'Current password is incorrect';
    users[idx].p = hashPw(newRaw, username);
    DB.s('users', users);
    addAudit('Password Changed', `Password updated for user ID ${userId}`, State.getUser()?.u || 'system');
    return null; // success
  }

  return { doLogin, doLogout, doSignup, tryRestoreSession, hashPw, changePassword };
})();

// ── Global shorthands ─────────────────────────────────
function doLogin()  { Auth.doLogin(); }
function doLogout() { Auth.doLogout(); }
function doSignup() { Auth.doSignup(); }
