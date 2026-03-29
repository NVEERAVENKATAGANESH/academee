// ════════════════════════════════════════════════════════
//  APP  —  router, navigation, and initialization
//          Loaded last so all render functions are defined
// ════════════════════════════════════════════════════════
'use strict';

// ═══════════════════════════════════════════
//  ROUTER
// ═══════════════════════════════════════════
const PAGES = {
  // Admin
  dash:          rDash,
  students:      rStudents,
  faculty:       rFaculty,
  departments:   rDepts,
  courses:       rCourses,
  enrollment:    rEnroll,
  grades:        rGradesA,
  attendance:    rAttA,
  exams:         rExams,
  leaves:        rLeaves,
  fees:          rFees,
  scholarships:  rScholarships,
  announcements: rAnnouncements,
  messages:      rMessages,
  calendar:      rCalendar,
  reports:       rReports,
  users:         rUsers,
  auditlog:      rAudit,
  export:        rExport,
  // Faculty
  fdash:         rFDash,
  mycourses:     rMyCourses,
  gradeentry:    rGradeEntry,
  markatt:       rMarkAtt,
  assignments:   rAssignments,
  // Student
  sdash:         rSDash,
  myen:          rMyEn,
  mygrades:      rMyGrades,
  myatt:         rMyAtt,
  myassign:      rMyAssign,
  gcalc:         rGCalc,
  transcript:    rTranscript,
  hallticket:    rHallTicket,
  wishlist:      rWishlist,
  myfees:        rMyFees,
  achievements:  rAchievements,
  applyleave:    rApplyLeave,
  myprofile:     rProfile,
};

function go(id) {
  // Hide all pages, deactivate all nav items
  $$('.page').forEach(p => p.classList.remove('on'));
  $$('.tn-item,.tn-di').forEach(n => n.classList.remove('on','act'));

  // Show target page
  const pg = $('pg-' + id);
  if (pg) pg.classList.add('on');

  // Highlight nav item; if it's inside a dropdown, also mark parent trigger
  $$('.tn-item,.tn-di').forEach(n => {
    if ((n.getAttribute('onclick') || '').includes("'" + id + "'")) {
      n.classList.add('on');
      const grp = n.closest('.tn-grp');
      if (grp) grp.querySelector('.tn-item')?.classList.add('act');
    }
  });
  tnClose();

  // Update state
  State.set('page', id);

  // Run render function — error boundary prevents one bad page from crashing the whole app
  if (PAGES[id]) {
    try {
      PAGES[id]();
    } catch (err) {
      const pgEl = $('pg-' + id);
      if (pgEl) pgEl.innerHTML = `<div class="empty-state" style="padding:48px">
        <div class="empty-ico">⚠</div>
        <div class="empty-title">Page failed to load</div>
        <div class="empty-sub">Try refreshing or resetting demo data (Admin → Export → Reset).<br><span style="font-size:10px;font-family:monospace;color:var(--text4)">${esc(err.message)}</span></div>
      </div>`;
    }
  }

  // Update header breadcrumb
  const bc = $('hdr-breadcrumb');
  if (bc) {
    const h1 = pg && pg.querySelector('h1');
    if (h1) bc.textContent = h1.textContent;
  }

  // Scroll main area to top on page change
  const mainEl = document.querySelector('.main');
  if (mainEl) mainEl.scrollTop = 0;
}

// ═══════════════════════════════════════════
//  INITIALIZATION
// ═══════════════════════════════════════════
function loadSemesterSettings() {
  const sem   = DB.getSetting('semester');
  const start = DB.getSetting('semStart');
  const end   = DB.getSetting('semEnd');
  const mid   = DB.getSetting('semMid');
  if (sem)   C.SEMESTER.CURRENT = sem;
  if (start) C.SEMESTER.START   = start;
  if (end)   C.SEMESTER.END     = end;
  if (mid)   C.SEMESTER.MID     = mid;
}

function init() {
  // Load saved theme
  State.loadTheme();

  // Apply any admin-saved semester overrides before seeding
  loadSemesterSettings();

  // Seed demo data if first run
  seed();

  // Wire sign-in keyboard shortcuts
  const lu = $('lu'), lp = $('lp');
  if (lu) lu.addEventListener('keydown', e => { if (e.key === 'Enter') lp?.focus(); });
  if (lp) lp.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

  // Wire sign-up keyboard shortcuts
  const suConf = $('su-conf');
  if (suConf) suConf.addEventListener('keydown', e => { if (e.key === 'Enter') doSignup(); });

  // Try restoring previous session (same tab)
  if (!Auth.tryRestoreSession()) {
    $('login').style.display = 'block';
    $('app').style.display   = 'none';
  }

  // Escape / outside-click closes dropdowns and modals
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeUserMenu();
      if ($('land-modal')?.classList.contains('show')) hideSignIn();
    }
  });
  document.addEventListener('click', e => {
    if (!$('hdr-user-wrap')?.contains(e.target)) closeUserMenu();
  });

  // Storage notice (informs users about localStorage usage)
  initStorageNotice();

  // Register service worker for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // Restore sidebar collapsed state
  if (State.get('sbCollapsed')) {
    document.querySelector('.sb')?.classList.add('collapsed');
  }

  // Scroll-to-top button visibility
  const mainEl = document.querySelector('.main');
  if (mainEl) {
    mainEl.addEventListener('scroll', () => {
      $('scroll-top')?.classList.toggle('show', mainEl.scrollTop > 300);
    });
  }

  // Close topnav dropdowns on outside click
  document.addEventListener('click', e => {
    if (!e.target.closest('.tn-grp')) tnClose();
  });
}

// ═══════════════════════════════════════════
//  STORAGE NOTICE
// ═══════════════════════════════════════════
function initStorageNotice() {
  if (!localStorage.getItem('acs_storage_ok')) {
    setTimeout(() => $('cookie-bar')?.classList.add('show'), 800);
  }
}
function acceptCookies() {
  localStorage.setItem('acs_storage_ok', '1');
  $('cookie-bar')?.classList.remove('show');
}

// ═══════════════════════════════════════════
//  LEGAL MODALS
// ═══════════════════════════════════════════
const _legalContent = {
  privacy: {
    title: 'Privacy Policy',
    body: `
      <h3>Overview</h3>
      <p>Academe is a client-side academic management platform. All data you enter is stored exclusively in your browser's localStorage. We do not operate any servers, collect personal information, or transmit any data externally.</p>
      <h3>Data We Store</h3>
      <ul>
        <li>Account credentials (username + SHA-256 hashed password)</li>
        <li>Student and faculty profile information you enter</li>
        <li>Academic records: grades, attendance, enrollments, assignments</li>
        <li>Application preferences: theme, sidebar state</li>
      </ul>
      <h3>Where Your Data Lives</h3>
      <p>All data is stored in your browser's localStorage under the key prefix <code>acs_</code>. It never leaves your device. Clearing your browser data will permanently delete all Academe data.</p>
      <h3>Third-Party Services</h3>
      <p>Academe loads the following resources from CDNs at runtime:</p>
      <ul>
        <li>Google Fonts (Geist typeface) — font delivery only</li>
        <li>Chart.js via jsDelivr — data visualisation</li>
        <li>CryptoJS via jsDelivr — password hashing</li>
        <li>jsPDF via jsDelivr — PDF export</li>
      </ul>
      <p>These services may log your IP address per their own privacy policies. No academic data is shared with them.</p>
      <h3>Cookies</h3>
      <p>Academe does not use cookies. Session state is stored in <code>sessionStorage</code> and expires when you close the browser tab.</p>
      <h3>Your Rights</h3>
      <p>You can export all your data via Admin → Export, or clear it entirely via browser settings. Since we store nothing on our end, there is no account to delete with us.</p>
      <h3>Contact</h3>
      <p>For privacy questions, open an issue on the project repository.</p>
    `
  },
  terms: {
    title: 'Terms of Service',
    body: `
      <h3>Acceptance</h3>
      <p>By using Academe you agree to these terms. If you do not agree, please do not use the application.</p>
      <h3>Description</h3>
      <p>Academe is an open-source, browser-based academic management platform provided free of charge for educational and demonstration purposes.</p>
      <h3>Use of the Application</h3>
      <ul>
        <li>You may use Academe for personal, educational, or institutional purposes</li>
        <li>You must not use Academe for any unlawful purpose</li>
        <li>You are responsible for maintaining the security of your account credentials</li>
        <li>Demo accounts are shared — do not store sensitive real data in demo sessions</li>
      </ul>
      <h3>Data Responsibility</h3>
      <p>Since all data is stored locally in your browser, you are solely responsible for backing up your data. We recommend using the Export feature regularly. We are not liable for data loss due to browser storage clearing, device failure, or any other cause.</p>
      <h3>Disclaimer of Warranties</h3>
      <p>Academe is provided "as is" without warranty of any kind. We make no guarantees regarding uptime, data integrity, or fitness for a particular purpose.</p>
      <h3>Limitation of Liability</h3>
      <p>To the maximum extent permitted by law, the authors of Academe shall not be liable for any indirect, incidental, or consequential damages arising from your use of the application.</p>
      <h3>Changes</h3>
      <p>These terms may be updated at any time. Continued use of the application constitutes acceptance of the updated terms.</p>
    `
  },
  data: {
    title: 'Data Handling',
    body: `
      <h3>Storage Mechanism</h3>
      <p>Academe uses the browser's <strong>localStorage API</strong> to persist all application data. Data is stored under the prefix <code>acs_</code> and remains in your browser until you clear it manually.</p>
      <h3>What Is Stored</h3>
      <ul>
        <li><strong>acs_users</strong> — usernames and SHA-256 hashed passwords</li>
        <li><strong>acs_students</strong> — student profiles and records</li>
        <li><strong>acs_faculty</strong> — faculty profiles</li>
        <li><strong>acs_grades, acs_attendance, acs_enrollments</strong> — academic data</li>
        <li><strong>acs_fees, acs_scholarships, acs_leaves</strong> — administrative records</li>
        <li><strong>acs_audit</strong> — action log for accountability</li>
        <li><strong>acs_cookie_ok</strong> — records that you acknowledged this notice</li>
      </ul>
      <h3>Password Security</h3>
      <p>Passwords are never stored in plain text. They are hashed using SHA-256 via CryptoJS before being written to localStorage. The original password cannot be recovered from the stored hash.</p>
      <h3>Session Handling</h3>
      <p>Login sessions are stored in <code>sessionStorage</code> (not localStorage), meaning they expire automatically when you close the browser tab. Sessions also expire after 30 minutes of inactivity.</p>
      <h3>Data Export & Deletion</h3>
      <p>You can export a full JSON backup of all data from Admin → Export. To delete all data, clear your browser's localStorage for this site, or use the browser's "Clear site data" option in DevTools.</p>
      <h3>GDPR Note</h3>
      <p>Since no data is transmitted to or stored on any external server, Academe's data processing is entirely local. There is no data controller in the GDPR sense. You are the sole controller of your own data.</p>
    `
  }
};

function openLegal(type) {
  const content = _legalContent[type];
  if (!content) return;
  $('legal-title').textContent = content.title;
  $('legal-body').innerHTML = content.body;
  $('legal-overlay').classList.add('show');
  $('legal-modal').classList.add('show');
}
function closeLegal() {
  $('legal-overlay').classList.remove('show');
  $('legal-modal').classList.remove('show');
}

// ═══════════════════════════════════════════
//  LANDING PAGE
// ═══════════════════════════════════════════
function showSignIn(tab) {
  switchAuthTab(tab || 'signin');
  $('land-overlay')?.classList.add('show');
  $('land-modal')?.classList.add('show');
  setTimeout(() => {
    ((tab === 'signup') ? $('su-name') : $('lu'))?.focus();
  }, 150);
}

function hideSignIn() {
  $('land-overlay')?.classList.remove('show');
  $('land-modal')?.classList.remove('show');
}

function switchAuthTab(tab) {
  const isSignup = tab === 'signup';
  $('pane-signin').style.display = isSignup ? 'none' : 'block';
  $('pane-signup').style.display = isSignup ? 'block' : 'none';
  $('tab-signin').classList.toggle('on', !isSignup);
  $('tab-signup').classList.toggle('on',  isSignup);
  // clear errors when switching
  $('lerr').style.display   = 'none';
  $('su-err').style.display = 'none';
}

function suRoleChange() {
  const role = $('su-role')?.value;
  const wrap = $('su-dept-wrap');
  if (wrap) wrap.style.display = (role === 'admin') ? 'none' : 'block';
}

function quickLogin(u, p) {
  $('lu').value = u;
  $('lp').value = p;
  doLogin();
}

// ═══════════════════════════════════════════
//  CONFIRM DIALOG helpers
// ═══════════════════════════════════════════
// confirmDlg is defined in ui.js — this is just a belt-and-suspenders
// fallback if the m-confirm modal is missing
(function patchConfirmDlg() {
  const orig = window.confirmDlg;
  window.confirmDlg = function(msg, onConfirm, danger = true) {
    const dlg = $('m-confirm');
    if (dlg) { orig(msg, onConfirm, danger); }
    else { if (confirm(msg)) onConfirm(); }
  };
})();

// ═══════════════════════════════════════════════════════════
//  PROFILE PAGE  —  universal renderer for all three roles
// ═══════════════════════════════════════════════════════════

function goProfile() { go('myprofile'); }

function toggleUserMenu() {
  const chip = $('hdr-user-chip');
  const dd   = $('hdr-dropdown');
  const open = dd.classList.toggle('open');
  chip.classList.toggle('open', open);
  chip.setAttribute('aria-expanded', open);
  // sync mini-avatar in dropdown
  $('hdr-dd-av').textContent   = $('sbav').textContent;
  $('hdr-dd-av').className     = $('sbav').className + ' hdr-dd-av';
  $('hdr-dd-name').textContent = $('sbname').textContent;
  $('hdr-dd-role').textContent = $('sbrole').textContent;
}

function closeUserMenu() {
  $('hdr-dropdown')?.classList.remove('open');
  $('hdr-user-chip')?.classList.remove('open');
  $('hdr-user-chip')?.setAttribute('aria-expanded','false');
}

function userMenuGo(page, tab) {
  closeUserMenu();
  go(page);
  if (tab) setTimeout(() => profTab(tab), 50);
}

function profTab(name) {
  $$('.prof-tab').forEach(t => t.classList.toggle('on', t.dataset.tab === name));
  $$('.prof-pane').forEach(p => p.classList.toggle('on', p.id === 'ptab-' + name));
}

function rProfile() {
  const user = State.getUser();
  if (!user) return;
  const root = $('profile-root');
  if (!root) return;
  if (user.role === 'student')      _profStudent(root, user);
  else if (user.role === 'faculty') _profFaculty(root, user);
  else                              _profAdmin(root, user);
}

// ── shared HTML builders ──────────────────────────────────
const _PROF_ICONS = {
  user:   `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`,
  email:  `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></svg>`,
  phone:  `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7 12.8 12.8 0 0 0 .7 2.8 2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5 12.8 12.8 0 0 0 2.8.7A2 2 0 0 1 22 16.9z"/></svg>`,
  id:     `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 10h2M16 14h2M6 10h6M6 14h4"/></svg>`,
  dept:   `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`,
  book:   `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  cal:    `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  lock:   `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  logout: `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  chart:  `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  check:  `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
  addr:   `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
};

function _profHero(initials, avClass, name, metaItems, badges, actions) {
  const meta = metaItems.map((m, i) =>
    i === 0 ? esc(m) : `<span class="prof-meta-sep"></span>${esc(m)}`
  ).join('');
  return `<div class="prof-wrap">
    <div class="prof-cover"><div class="prof-cover-pattern"></div></div>
    <div class="prof-identity">
      <div class="prof-av-wrap"><div class="prof-av ${avClass}">${esc(initials)}</div></div>
      <div class="prof-id-center">
        <div class="prof-name">${esc(name)}</div>
        <div class="prof-meta">${meta}</div>
        <div class="prof-badges">${badges}</div>
      </div>
      <div class="prof-id-actions">${actions}</div>
    </div>
  </div>`;
}

function _profTabs(tabs) {
  return `<div class="prof-tabs">${tabs.map((t, i) =>
    `<button class="prof-tab${i === 0 ? ' on' : ''}" data-tab="${t.id}" onclick="profTab('${t.id}')">${t.label}</button>`
  ).join('')}</div>`;
}

function _profStats(items) {
  return `<div class="prof-stats">${items.map(([val, lbl, color, ico, icoBg]) =>
    `<div class="prof-stat">
      <div class="prof-stat-ico" style="background:${icoBg||'var(--bg3)'}">${ico||''}</div>
      <div class="prof-stat-body">
        <div class="prof-stat-val" style="${color ? 'color:' + color : ''}">${esc(String(val))}</div>
        <div class="prof-stat-lbl">${lbl}</div>
      </div>
    </div>`
  ).join('')}</div>`;
}

function _profOvField(lbl, val, ico) {
  const icoHtml = ico ? `<span style="color:var(--text4);margin-right:4px">${_PROF_ICONS[ico]||''}</span>` : '';
  const valHtml = typeof val === 'string' && val.startsWith('<') ? val : esc(String(val??'—'));
  return `<div class="prof-ov-field">
    <div class="prof-ov-lbl">${icoHtml}${lbl}</div>
    <div class="prof-ov-val">${valHtml}</div>
  </div>`;
}

function _profField(lbl, val, ico) {
  const icoHtml = ico ? `<span style="color:var(--text4)">${_PROF_ICONS[ico]||''}</span>` : '';
  return `<div class="prof-field">
    <span class="prof-field-lbl">${icoHtml}${lbl}</span>
    <span class="prof-field-val">${typeof val === 'string' && val.startsWith('<') ? val : esc(String(val ?? '—'))}</span>
  </div>`;
}

function _profCard(title, body, action) {
  const act = action ? `<div style="margin-left:auto">${action}</div>` : '';
  return `<div class="card"><div class="card-h"><div class="card-t">${title}</div>${act}</div><div class="card-b">${body}</div></div>`;
}

function _profCourseRow(code, name, meta, right, color) {
  return `<div class="prof-course-row">
    <div class="prof-course-ico" style="background:${color||'var(--bg3)'};color:var(--text2)">${esc(code.slice(0,2))}</div>
    <div class="prof-course-body">
      <div class="prof-course-name">${esc(name)}</div>
      <div class="prof-course-meta">${esc(meta)}</div>
    </div>
    <div class="prof-course-right">${right}</div>
  </div>`;
}

function _profSecurityPane(username, roleLabel) {
  return `<div class="prof-pane" id="ptab-security">
    <div class="two-col" style="align-items:start">
      ${_profCard('Change Password', `
        <p style="font-size:13px;color:var(--text3);line-height:1.65;margin-bottom:18px">
          Use a strong password with uppercase letters, numbers, and symbols. Minimum 8 characters.
        </p>
        <div style="display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--green)">
            ${_PROF_ICONS.check} Password is hashed with SHA-256
          </div>
          <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--green)">
            ${_PROF_ICONS.check} Never stored in plain text
          </div>
          <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--green)">
            ${_PROF_ICONS.check} Stored only on this device
          </div>
        </div>
        <div style="margin-top:18px">
          <button class="btn btn-p" onclick="openChangePw()">
            ${_PROF_ICONS.lock} Change Password
          </button>
        </div>
      `)}
      ${_profCard('Session & Sign Out', [
        _profField('Username', username, 'user'),
        _profField('Role', roleLabel, 'id'),
        _profField('Session type', 'Browser (localStorage)', 'lock'),
        _profField('Timeout', '30 min inactivity', 'cal'),
        _profField('Data storage', 'localStorage · this device only', 'check'),
      ].join('') + `
        <div style="margin-top:18px;padding-top:16px;border-top:1px solid var(--border)">
          <button class="btn btn-danger" onclick="confirmDlg('Sign out of Academe?', doLogout, false, 'Sign out')" style="width:100%;justify-content:center;gap:8px">
            ${_PROF_ICONS.logout} Sign out of Academe
          </button>
        </div>
      `)}
    </div>
  </div>`;
}

function _profNotifsPane(userId) {
  const notifs = DB.g('notifications').filter(n => n.uid === userId).sort((a, b) => b.ts - a.ts).slice(0, 12);
  const TAG_COLORS = {
    grade:'var(--blue)', fee:'var(--red)', assign:'var(--purple)',
    attendance:'var(--amber)', announce:'var(--green)', leave:'var(--teal)'
  };
  const rows = notifs.length
    ? notifs.map(n => `<div class="prof-notif-row">
        <div class="prof-notif-dot" style="background:${TAG_COLORS[n.tag]||'var(--blue)'};${n.read?'opacity:.3':''}"></div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:500;${n.read?'color:var(--text3)':''}">${esc(n.title)}</div>
          <div style="font-size:12px;color:var(--text4);margin-top:2px;line-height:1.4">${esc(n.body)}</div>
          ${n.tag ? `<span class="bx" style="margin-top:5px;display:inline-flex;font-size:10px;background:${TAG_COLORS[n.tag]+'22'};color:${TAG_COLORS[n.tag]||'var(--blue)'};border-color:${TAG_COLORS[n.tag]+'44'}">${esc(n.tag)}</span>` : ''}
        </div>
        <div style="font-size:11px;color:var(--text4);white-space:nowrap;margin-left:12px;flex-shrink:0">${timeAgo(n.ts)}</div>
      </div>`).join('')
    : `<div class="empty-state"><div class="empty-ico">🔔</div><div class="empty-title">No notifications</div><div class="empty-sub">You're all caught up</div></div>`;
  return `<div class="prof-pane" id="ptab-activity">
    ${_profCard('Notifications', rows)}
  </div>`;
}

const _DEPT_COLORS = ['rgba(59,130,246,0.15)','rgba(168,85,247,0.15)','rgba(20,184,166,0.15)','rgba(245,158,11,0.15)','rgba(34,197,94,0.15)','rgba(249,115,22,0.15)'];

// ── STUDENT profile ───────────────────────────────────────
function _profStudent(root, user) {
  const s = DB.g('students').find(x => x.id === user.lid);
  if (!s) { root.innerHTML = `<div class="empty-state"><div class="empty-ico">👤</div><div class="empty-title">Profile not found</div></div>`; return; }

  const enrs    = DB.g('enrollments').filter(e => e.sid === s.id);
  const gs      = DB.g('grades').filter(g => g.sid === s.id);
  const att     = DB.g('attendance').filter(a => a.sid === s.id);
  const fees    = DB.g('fees').filter(f => f.sid === s.id);
  const courses = DB.g('courses');

  let gpaVal = null;
  if (gs.length) {
    let tp = 0, tc = 0;
    gs.forEach(g => { const cr = courses.find(c => c.id === g.cid)?.cr || 3; tp += gpa(g.marks)*cr; tc += cr; });
    gpaVal = tc ? (tp/tc).toFixed(2) : null;
  }
  const attPct       = att.length ? Math.round(att.reduce((s,a) => s + pct(a.pres, a.tot),0)/att.length) : null;
  const totalCredits = enrs.reduce((s,e) => s + (courses.find(c=>c.id===e.cid)?.cr||0), 0);
  const feesPending  = fees.filter(f => f.status !== 'Paid').length;
  const st           = standing(gpaVal ? parseFloat(gpaVal) : null);
  const initials     = (s.fn[0]||'') + (s.ln[0]||'');
  const attColor     = attPct==null?'':attPct>=75?'var(--green)':attPct>=60?'var(--amber)':'var(--red)';
  const gpaColor     = !gpaVal?'':parseFloat(gpaVal)>=3.5?'var(--green)':parseFloat(gpaVal)>=2.0?'var(--blue)':'var(--amber)';

  const hero = _profHero(
    initials, `av ${avCls(s.id%5)}`, `${s.fn} ${s.ln}`,
    [stuId(s.id), s.dept, `Year ${s.yr}`, `Admitted ${s.adm||'—'}`],
    `<span class="bx ${s.status==='Active'?'bx-gr':'bx-gy'}">${esc(s.status)}</span>
     ${gpaVal?`<span class="bx bx-bl">GPA ${gpaVal}</span>`:''}
     <span class="bx ${st.cls}">${esc(st.label)}</span>`,
    `<button class="btn btn-p" onclick="profTab('security')">${_PROF_ICONS.lock} Security</button>
     <button class="btn btn-g" onclick="go('myfees')">${_PROF_ICONS.chart} My Fees</button>`
  );

  const stats = _profStats([
    [enrs.length,                         'Enrolled Courses', '',        _PROF_ICONS.book,  'rgba(59,130,246,0.12)'],
    [gpaVal||'—',                         'Cumulative GPA',   gpaColor,  _PROF_ICONS.chart, 'rgba(34,197,94,0.12)'],
    [attPct!=null?attPct+'%':'—',         'Avg Attendance',   attColor,  _PROF_ICONS.check, 'rgba(245,158,11,0.12)'],
    [totalCredits,                        'Total Credits',    '',        _PROF_ICONS.id,    'rgba(168,85,247,0.12)'],
  ]);

  const tabs = _profTabs([
    {id:'overview', label:'Overview'},
    {id:'academic', label:'Academic'},
    {id:'activity', label:'Activity'},
    {id:'security', label:'Security'},
  ]);

  const overviewPane = `<div class="prof-pane on" id="ptab-overview">
    ${_profCard('Profile Overview', `<div class="prof-ov-grid">
      ${_profOvField('Full Name',       `${s.fn} ${s.ln}`, 'user')}
      ${_profOvField('Student ID',       stuId(s.id),       'id')}
      ${_profOvField('Email',            s.em,              'email')}
      ${_profOvField('Department',       s.dept,            'dept')}
      ${_profOvField('Phone',            s.ph||'—',         'phone')}
      ${_profOvField('Year of Study',   'Year '+s.yr,       'book')}
      ${_profOvField('Date of Birth',    s.dob?fmtDate(s.dob):'—', 'cal')}
      ${_profOvField('Admission Year',   s.adm||'—',        'cal')}
      ${_profOvField('Address',          s.addr||'—',       'addr')}
      ${_profOvField('Academic Standing',`<span class="bx ${st.cls}">${st.label}</span>`)}
      ${_profOvField('Fee Status', feesPending
          ? `<span class="bx bx-rd">${feesPending} pending</span>`
          : `<span class="bx bx-gr">All clear</span>`)}
    </div>`)}
  </div>`;

  const enrolledRows = enrs.length
    ? enrs.map(e => {
        const c = courses.find(x => x.id===e.cid); if (!c) return '';
        const g = gs.find(x => x.cid===c.id);
        const ci = courses.indexOf(c) % _DEPT_COLORS.length;
        return _profCourseRow(c.code, c.name, `${c.dept} · ${c.cr} credits`,
          `${g ? gChip(grade(g.marks)) : '<span class="text4" style="font-size:11px">No grade</span>'}`,
          _DEPT_COLORS[ci]);
      }).join('')
    : `<div class="empty-state" style="padding:20px"><div class="empty-title">No enrollments</div></div>`;

  const recentGrades = gs.length
    ? [...gs].sort((a,b)=>b.id-a.id).slice(0,6).map(g => {
        const c = courses.find(x=>x.id===g.cid);
        const ci = courses.indexOf(c) % _DEPT_COLORS.length;
        return _profCourseRow(c?.code||'?', c?.name||'Unknown', `${g.marks}/100 marks`,
          gChip(grade(g.marks)), _DEPT_COLORS[ci]);
      }).join('')
    : `<div class="empty-state" style="padding:20px"><div class="empty-title">No grades yet</div></div>`;

  const academicPane = `<div class="prof-pane" id="ptab-academic">
    <div class="two-col">
      ${_profCard('Enrolled Courses', enrolledRows)}
      ${_profCard('Recent Grades', recentGrades)}
    </div>
  </div>`;

  root.innerHTML = hero + stats + tabs + overviewPane + academicPane + _profNotifsPane(user.id) + _profSecurityPane(user.u, 'Student');
}

// ── FACULTY profile ───────────────────────────────────────
function _profFaculty(root, user) {
  const f = DB.g('faculty').find(x => x.id===user.lid);
  if (!f) { root.innerHTML = `<div class="empty-state"><div class="empty-ico">👤</div><div class="empty-title">Profile not found</div></div>`; return; }

  const allCourses   = DB.g('courses');
  const myCourses    = allCourses.filter(c => c.fid===f.id);
  const allEnrolls   = DB.g('enrollments');
  const myStudentIds = new Set(allEnrolls.filter(e=>myCourses.some(c=>c.id===e.cid)).map(e=>e.sid));
  const assigns      = DB.g('assignments').filter(a=>myCourses.some(c=>c.id===a.cid));
  const gradesEntered= DB.g('grades').filter(g=>myCourses.some(c=>c.id===g.cid)).length;
  const initials     = (f.fn[0]||'')+(f.ln[0]||'');

  const hero = _profHero(
    initials, `av ${avCls(f.id%5)}`, `${f.fn} ${f.ln}`,
    [facId(f.id), f.dept, f.qual||'Faculty', f.spec||''],
    `<span class="bx bx-bl">Faculty</span>${f.spec?`<span class="bx bx-gy">${esc(f.spec)}</span>`:''}`,
    `<button class="btn btn-p" onclick="profTab('security')">${_PROF_ICONS.lock} Security</button>
     <button class="btn btn-g" onclick="go('mycourses')">${_PROF_ICONS.book} My Courses</button>`
  );

  const stats = _profStats([
    [myCourses.length,    'Courses Teaching', '', _PROF_ICONS.book,  'rgba(59,130,246,0.12)'],
    [myStudentIds.size,   'Total Students',   '', _PROF_ICONS.user,  'rgba(34,197,94,0.12)'],
    [assigns.length,      'Assignments Set',  '', _PROF_ICONS.check, 'rgba(168,85,247,0.12)'],
    [gradesEntered,       'Grades Entered',   '', _PROF_ICONS.chart, 'rgba(245,158,11,0.12)'],
  ]);

  const tabs = _profTabs([
    {id:'overview', label:'Overview'},
    {id:'teaching', label:'Teaching'},
    {id:'activity', label:'Activity'},
    {id:'security', label:'Security'},
  ]);

  const overviewPane = `<div class="prof-pane on" id="ptab-overview">
    ${_profCard('Profile Overview', `<div class="prof-ov-grid">
      ${_profOvField('Full Name',       `${f.fn} ${f.ln}`, 'user')}
      ${_profOvField('Faculty ID',       facId(f.id),       'id')}
      ${_profOvField('Email',            f.em,              'email')}
      ${_profOvField('Department',       f.dept,            'dept')}
      ${_profOvField('Phone',            f.ph||'—',         'phone')}
      ${_profOvField('Qualification',    f.qual||'—',       'id')}
      ${_profOvField('Specialization',   f.spec||'—',       'book')}
      ${_profOvField('Joined',           f.join||'—',       'cal')}
      ${_profOvField('Active Courses',   myCourses.length,  'book')}
      ${_profOvField('Total Students',   myStudentIds.size, 'user')}
      ${_profOvField('Assignments Set',  assigns.length,    'check')}
      ${_profOvField('Grades Entered',   gradesEntered,     'chart')}
    </div>`)}
  </div>`;

  const courseRows = myCourses.length
    ? myCourses.map(c => {
        const enrolled = allEnrolls.filter(e=>e.cid===c.id).length;
        const ci = allCourses.indexOf(c) % _DEPT_COLORS.length;
        return _profCourseRow(c.code, c.name, `${enrolled} students · ${c.cr} credits · ${c.sem||''}`,
          `<span class="bx bx-gy" style="font-size:11px">${c.cr} cr</span>`, _DEPT_COLORS[ci]);
      }).join('')
    : `<div class="empty-state" style="padding:20px"><div class="empty-title">No courses assigned</div></div>`;

  const assignRows = assigns.length
    ? [...assigns].sort((a,b)=>b.id-a.id).slice(0,6).map(a => {
        const c = allCourses.find(x=>x.id===a.cid);
        const ci = allCourses.indexOf(c) % _DEPT_COLORS.length;
        return _profCourseRow(c?.code||'?', a.title, `Due ${fmtDate(a.due)}`,
          `<span class="bx bx-am" style="font-size:11px">${a.marks||100} marks</span>`, _DEPT_COLORS[ci]);
      }).join('')
    : `<div class="empty-state" style="padding:20px"><div class="empty-title">No assignments</div></div>`;

  const teachingPane = `<div class="prof-pane" id="ptab-teaching">
    <div class="two-col">
      ${_profCard('My Courses', courseRows)}
      ${_profCard('Recent Assignments', assignRows)}
    </div>
  </div>`;

  root.innerHTML = hero + stats + tabs + overviewPane + teachingPane + _profNotifsPane(user.id) + _profSecurityPane(user.u, 'Faculty');
}

// ── ADMIN profile ─────────────────────────────────────────
function _profAdmin(root, user) {
  const totalStudents = DB.g('students').length;
  const totalFaculty  = DB.g('faculty').length;
  const totalCourses  = DB.g('courses').length;
  const allAudit      = DB.g('audit');
  const myAudit       = allAudit.filter(a => a.user===user.u);
  const storageKB     = DB.usageKB();
  const initials      = (user.name||user.u).slice(0,2).toUpperCase();

  const hero = _profHero(
    initials, 'av av-bl', user.name||user.u,
    [`@${user.u}`, 'System Administrator', `${storageKB} KB used`],
    `<span class="bx bx-am">Administrator</span><span class="bx bx-gy">Full Access</span>`,
    `<button class="btn btn-p" onclick="profTab('security')">${_PROF_ICONS.lock} Security</button>
     <button class="btn btn-g" onclick="go('export')">${_PROF_ICONS.chart} Export</button>`
  );

  const stats = _profStats([
    [totalStudents,  'Students',       '', _PROF_ICONS.user,  'rgba(59,130,246,0.12)'],
    [totalFaculty,   'Faculty',        '', _PROF_ICONS.book,  'rgba(168,85,247,0.12)'],
    [totalCourses,   'Courses',        '', _PROF_ICONS.dept,  'rgba(20,184,166,0.12)'],
    [myAudit.length, 'Actions Logged', '', _PROF_ICONS.chart, 'rgba(245,158,11,0.12)'],
  ]);

  const tabs = _profTabs([
    {id:'overview', label:'Overview'},
    {id:'system',   label:'System'},
    {id:'activity', label:'My Activity'},
    {id:'security', label:'Security'},
  ]);

  const overviewPane = `<div class="prof-pane on" id="ptab-overview">
    ${_profCard('Profile Overview', `<div class="prof-ov-grid">
      ${_profOvField('Username',        user.u,                'user')}
      ${_profOvField('Display Name',    user.name||user.u,     'id')}
      ${_profOvField('Role',            'System Administrator','lock')}
      ${_profOvField('Access Level',    'Full Access',         'check')}
      ${_profOvField('Total Students',  totalStudents,         'user')}
      ${_profOvField('Total Faculty',   totalFaculty,          'book')}
      ${_profOvField('Total Courses',   totalCourses,          'dept')}
      ${_profOvField('Audit Entries',   allAudit.length,       'chart')}
      ${_profOvField('Storage Used',    storageKB+' KB',       'check')}
      ${_profOvField('Current Semester',C.SEMESTER.CURRENT,    'cal')}
    </div>`)}
  </div>`;

  const systemPane = `<div class="prof-pane" id="ptab-system">
    <div class="two-col" style="align-items:start">
      ${_profCard('Data Management', `
        <p style="font-size:13px;color:var(--text3);line-height:1.65;margin-bottom:18px">
          Export all application data as JSON. Restoring from backup overwrites current data.
        </p>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-p" onclick="go('export')">${_PROF_ICONS.chart} Go to Export</button>
          <button class="btn btn-g" onclick="go('auditlog')">${_PROF_ICONS.id} Audit Log</button>
        </div>
      `)}
      ${_profCard('Storage Breakdown', [
        _profField('Engine',     'Browser localStorage', 'check'),
        _profField('Used',       storageKB+' KB',        'chart'),
        _profField('Students',   totalStudents+' records','user'),
        _profField('Faculty',    totalFaculty+' records', 'book'),
        _profField('Courses',    totalCourses+' records', 'dept'),
        _profField('Audit cap',  C.DB.MAX_AUDIT+' entries','id'),
      ].join(''))}
    </div>
  </div>`;

  const auditRows = myAudit.slice(0,12).map(a =>
    `<div class="prof-notif-row">
      <div class="prof-notif-dot" style="background:${a.color||'var(--blue)'}"></div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500">${esc(a.action)}</div>
        <div style="font-size:12px;color:var(--text4);margin-top:2px">${esc(a.detail)}</div>
      </div>
      <div style="font-size:11px;color:var(--text4);white-space:nowrap;flex-shrink:0;margin-left:12px">${timeAgo(a.ts)}</div>
    </div>`
  ).join('') || `<div class="empty-state" style="padding:20px"><div class="empty-title">No activity yet</div></div>`;

  const activityPane = `<div class="prof-pane" id="ptab-activity">${_profCard('My Recent Actions', auditRows)}</div>`;

  root.innerHTML = hero + stats + tabs + overviewPane + systemPane + activityPane + _profSecurityPane(user.u, 'Administrator');
}

// ═══════════════════════════════════════
//  TOPNAV DROPDOWN
// ═══════════════════════════════════════
function tnToggle(id) {
  const drop = $(id);
  if (!drop) return;
  const isOpen = drop.classList.contains('open');
  tnClose();
  if (!isOpen) {
    drop.classList.add('open');
    drop.closest('.tn-grp')?.querySelector('.tn-item')?.classList.add('open');
  }
}
function tnClose() {
  $$('.tn-drop').forEach(d => d.classList.remove('open'));
  $$('.tn-item').forEach(t => t.classList.remove('open'));
}

// ═══════════════════════════════════════
//  SIDEBAR TOGGLE (legacy, no-op)
// ═══════════════════════════════════════
function toggleSidebar() {
  const sb  = document.querySelector('.sb');
  const ov  = $('sb-overlay');
  if (!sb) return;
  if (window.innerWidth <= 768) {
    const open = sb.classList.toggle('mob-open');
    ov?.classList.toggle('show', open);
  } else {
    const collapsed = sb.classList.toggle('collapsed');
    State.set('sbCollapsed', collapsed);
  }
}

// ═══════════════════════════════════════
//  SCROLL TO TOP
// ═══════════════════════════════════════
function scrollToTop() {
  document.querySelector('.main')?.scrollTo({ top: 0, behavior: 'smooth' });
}

// ═══════════════════════════════════════
//  CHANGE PASSWORD (modal helpers)
// ═══════════════════════════════════════
function openChangePw() { openM('m-changepw'); }

function checkPwStrength() {
  const pw  = $('cpw-new')?.value || '';
  const bar = $('cpw-bar');
  if (!bar) return;
  let score = 0;
  if (pw.length >= 8)               score++;
  if (/[A-Z]/.test(pw))             score++;
  if (/[0-9]/.test(pw))             score++;
  if (/[^A-Za-z0-9]/.test(pw))     score++;
  const colors = ['var(--red)','var(--red)','var(--amber)','var(--amber)','var(--green)'];
  bar.style.width      = (score * 25) + '%';
  bar.style.background = colors[score];
}

function doChangePw() {
  const oldPw  = $('cpw-old')?.value || '';
  const newPw  = $('cpw-new')?.value || '';
  const confPw = $('cpw-conf')?.value || '';
  if (!oldPw || !newPw || !confPw) { toast('Please fill all fields.', false); return; }
  if (newPw !== confPw)            { toast('New passwords do not match.', false); return; }
  const user = State.getUser();
  if (!user) return;
  const err = Auth.changePassword(user.id, oldPw, newPw);
  if (err) { toast(err, false); return; }
  toast('Password updated successfully.');
  closeM('m-changepw');
  $('cpw-old').value = $('cpw-new').value = $('cpw-conf').value = '';
  $('cpw-bar').style.width = '0%';
}

// ═══════════════════════════════════════════
//  START
// ═══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', init);
