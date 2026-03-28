// ════════════════════════════════════════════════════════
//  UI  —  shared UI primitives:
//         toasts, modals, confirm dialog, pagination,
//         sortable tables, theme toggle, audit helper
// ════════════════════════════════════════════════════════

// ── Toast notifications ───────────────────────────────
function toast(msg, ok = true) {
  const container = $('toasts');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.innerHTML = `<div class="tdot" style="background:${ok ? 'var(--green)' : 'var(--red)'}"></div><span>${esc(msg)}</span>`;
  container.appendChild(el);
  setTimeout(() => el.classList.add('toast-out'), 2700);
  setTimeout(() => el.remove(), 3200);
}

// ── Modal open/close ──────────────────────────────────
function openM(id) {
  const el = $(id);
  if (!el) return;
  el.classList.add('open');
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  setTimeout(() => {
    const focusable = el.querySelector('input:not([type=hidden]),select,textarea,button:not(.mx)');
    if (focusable) focusable.focus();
    _trapFocus(el);
  }, 50);
}
function closeM(id) {
  const el = $(id);
  if (!el) return;
  el.classList.remove('open');
  if (el._trapHandler) {
    el.removeEventListener('keydown', el._trapHandler);
    delete el._trapHandler;
  }
  el.querySelectorAll('.inp-err').forEach(e => e.classList.remove('inp-err'));
  el.querySelectorAll('.field-err').forEach(e => e.remove());
}

function _trapFocus(modal) {
  const SELECTORS = 'input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),button:not([disabled]),[tabindex]:not([tabindex="-1"])';
  const getFocusable = () => [...modal.querySelectorAll(SELECTORS)];
  if (modal._trapHandler) modal.removeEventListener('keydown', modal._trapHandler);
  modal._trapHandler = e => {
    if (e.key !== 'Tab') return;
    const els = getFocusable();
    if (!els.length) return;
    const first = els[0], last = els[els.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first || !modal.contains(document.activeElement)) {
        e.preventDefault(); last.focus();
      }
    } else {
      if (document.activeElement === last || !modal.contains(document.activeElement)) {
        e.preventDefault(); first.focus();
      }
    }
  };
  modal.addEventListener('keydown', modal._trapHandler);
}

// Close modal on backdrop click
document.addEventListener('click', e => {
  if (e.target.classList.contains('mbg')) {
    e.target.classList.remove('open');
  }
});
// Close modal on Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    $$('.mbg.open').forEach(m => m.classList.remove('open'));
    const np = $('npanel');
    if (np?.classList.contains('open')) toggleNotif();
  }
});

// ── Confirm dialog (replaces browser confirm) ─────────
function confirmDlg(msg, onConfirm, danger = true) {
  $('cdlg-msg').textContent = msg;
  const btn = $('cdlg-ok');
  btn.className = 'btn ' + (danger ? 'btn-danger' : 'btn-p');
  btn.textContent = danger ? 'Delete' : 'Confirm';
  openM('m-confirm');
  btn.onclick = () => { closeM('m-confirm'); onConfirm(); };
}

// ── Audit log entry ───────────────────────────────────
function addAudit(action, detail, user, color = 'var(--blue)') {
  const audit = DB.g('audit');
  audit.unshift({
    id: DB.nid(audit),
    action,
    detail,
    user: user || State.getUser()?.u || 'system',
    ts: Date.now(),
    color,
  });
  DB.s('audit', audit.slice(0, C.DB.MAX_AUDIT));
}

// ── Pagination ────────────────────────────────────────
// Returns slice of data + renders pagination controls
function paginate(data, tableId, renderFn) {
  const ps = State.getPage(tableId);
  const total = data.length;
  const pages = Math.ceil(total / ps.size) || 1;
  const page  = Math.min(ps.page, pages);
  State.setPage(tableId, page);

  const sliced = data.slice((page - 1) * ps.size, page * ps.size);
  renderFn(sliced);

  // Render pagination controls
  const el = $(tableId + '-pg');
  if (!el) return sliced;

  if (total <= ps.size) { el.innerHTML = ''; return sliced; }

  const start = (page - 1) * ps.size + 1;
  const end   = Math.min(page * ps.size, total);

  el.innerHTML = `
    <div class="pg-info">${start}–${end} of ${total}</div>
    <div class="pg-btns">
      <button class="btn btn-g pg-btn" ${page <= 1 ? 'disabled' : ''} onclick="goPg('${tableId}',1)" aria-label="First page">«</button>
      <button class="btn btn-g pg-btn" ${page <= 1 ? 'disabled' : ''} onclick="goPg('${tableId}',${page-1})" aria-label="Previous page">‹</button>
      ${_pageNumbers(page, pages, tableId)}
      <button class="btn btn-g pg-btn" ${page >= pages ? 'disabled' : ''} onclick="goPg('${tableId}',${page+1})" aria-label="Next page">›</button>
      <button class="btn btn-g pg-btn" ${page >= pages ? 'disabled' : ''} onclick="goPg('${tableId}',${pages})" aria-label="Last page">»</button>
    </div>`;
  return sliced;
}

function _pageNumbers(cur, total, tableId) {
  const nums = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= cur - 1 && i <= cur + 1)) {
      nums.push(i);
    } else if (nums[nums.length - 1] !== '…') {
      nums.push('…');
    }
  }
  return nums.map(n => n === '…'
    ? `<span class="pg-ellipsis">…</span>`
    : `<button class="btn btn-g pg-btn ${n === cur ? 'pg-active' : ''}" onclick="goPg('${tableId}',${n})">${n}</button>`
  ).join('');
}

function goPg(tableId, page) {
  State.setPage(tableId, page);
  // Re-trigger the current page render
  const cur = State.get('page');
  if (cur) go(cur);
}

// ── Sortable table headers ────────────────────────────
// Call this after rendering a table to wire up sort clicks
function makeSortable(tableId, renderFn) {
  const table = $(tableId);
  if (!table) return;
  table.querySelectorAll('th[data-sort]').forEach(th => {
    th.style.cursor = 'pointer';
    th.setAttribute('tabindex', '0');
    th.setAttribute('role', 'columnheader');
    th.addEventListener('click', () => _handleSort(tableId, th.dataset.sort, renderFn));
    th.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        _handleSort(tableId, th.dataset.sort, renderFn);
      }
    });
  });
  _updateSortIndicators(tableId);
}

function _handleSort(tableId, key, renderFn) {
  State.resetPage(tableId);
  State.setSort(tableId, key);
  _updateSortIndicators(tableId);
  renderFn();
}

function _updateSortIndicators(tableId) {
  const table = $(tableId);
  if (!table) return;
  const { key, dir } = State.getSort(tableId);
  table.querySelectorAll('th[data-sort]').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    const ind = th.querySelector('.sort-ind');
    if (ind) ind.remove();
    if (th.dataset.sort === key) {
      th.classList.add(dir === 'asc' ? 'sort-asc' : 'sort-desc');
      const span = document.createElement('span');
      span.className = 'sort-ind';
      span.textContent = dir === 'asc' ? ' ↑' : ' ↓';
      th.appendChild(span);
    }
  });
}

// ── Theme toggle ──────────────────────────────────────
function toggleTheme() {
  const next = State.getTheme() === 'dark' ? 'light' : 'dark';
  State.setTheme(next);
  const btn = $('theme-btn');
  if (btn) btn.title = next === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  if (btn) btn.textContent = next === 'dark' ? '☀' : '☾';
}

// ── Notification panel ────────────────────────────────
function toggleNotif() {
  const panel   = $('npanel');
  const overlay = $('npoverlay');
  const isOpen  = panel.classList.toggle('open');
  if (overlay) overlay.style.display = isOpen ? 'block' : 'none';
  if (isOpen) rNotifs();
}

function updateNotifBadge() {
  const user = State.getUser();
  if (!user) return;
  const unread = DB.g('notifications').filter(n => !n.read && n.uid === user.id).length;
  const badge  = $('nbadge');
  if (badge) {
    badge.style.display  = unread ? 'flex' : 'none';
    badge.textContent    = unread > 9 ? '9+' : (unread || '');
  }
}

function rNotifs() {
  const user = State.getUser();
  if (!user) return;
  const notifs = DB.g('notifications').filter(n => n.uid === user.id).sort((a, b) => b.ts - a.ts);
  const TAG_COLORS = {
    grade:'var(--blue)', fee:'var(--red)', assign:'var(--purple)',
    attendance:'var(--amber)', announce:'var(--green)', leave:'var(--teal)'
  };
  $('npbody').innerHTML = notifs.length
    ? notifs.map(n => `
      <div class="nitem ${n.read ? '' : 'unread'}" onclick="readNotif(${n.id})" role="button" tabindex="0">
        <div class="ni-top">
          <div class="ni-title">${esc(n.title)}</div>
          <div class="ni-time">${timeAgo(n.ts)}</div>
        </div>
        <div class="ni-body">${esc(n.body)}</div>
        <span class="ni-tag" style="background:${(TAG_COLORS[n.tag]||'var(--blue)')+'22'};color:${TAG_COLORS[n.tag]||'var(--blue)'}">${esc(n.tag)}</span>
      </div>`).join('')
    : '<div class="empty" style="padding:24px"><p>No notifications</p></div>';
}

function readNotif(id) {
  const notifs = DB.g('notifications');
  const i = notifs.findIndex(x => x.id === id);
  if (i >= 0) notifs[i].read = true;
  DB.s('notifications', notifs);
  rNotifs();
  updateNotifBadge();
}

function markAllRead() {
  const user = State.getUser();
  if (!user) return;
  const notifs = DB.g('notifications').map(n => n.uid === user.id ? {...n, read: true} : n);
  DB.s('notifications', notifs);
  rNotifs();
  updateNotifBadge();
}

function addNotif(uid, title, body, tag) {
  const notifs = DB.g('notifications');
  notifs.push({ id: DB.nid(notifs), title, body, tag, read: false, uid, ts: Date.now() });
  DB.s('notifications', notifs);
  updateNotifBadge();
}

// ── Loading skeleton ──────────────────────────────────
function skeleton(rows = 5, cols = 4) {
  return `<table class="t"><tbody>${
    Array(rows).fill(0).map(() =>
      `<tr>${Array(cols).fill(0).map(() =>
        `<td><div class="skel"></div></td>`
      ).join('')}</tr>`
    ).join('')
  }</tbody></table>`;
}

// ── Empty state ───────────────────────────────────────
function emptyState(icon, title, subtitle = '') {
  return `<div class="empty-state">
    <div class="empty-ico">${icon}</div>
    <div class="empty-title">${esc(title)}</div>
    ${subtitle ? `<div class="empty-sub">${esc(subtitle)}</div>` : ''}
  </div>`;
}

// ── Search debounce helper ────────────────────────────
function onSearch(inputId, tableId, renderFn) {
  const el = $(inputId);
  if (!el) return;
  el.addEventListener('input', debounce(() => {
    State.resetPage(tableId);
    renderFn();
  }, 200));
}
