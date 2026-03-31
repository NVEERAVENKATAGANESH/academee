// ════════════════════════════════════════════════════════
//  UI  —  shared UI primitives:
//         toasts, modals, confirm dialog, pagination,
//         sortable tables, theme toggle, audit helper
// ════════════════════════════════════════════════════════

// ── Toast notifications ───────────────────────────────
function toast(msg, ok = true) {
  // Show centered popup for all messages
  successPopup(msg, '', ok ? 'ok' : 'err');
}

// ── View detail modal ─────────────────────────────────
// rows: [{l:'Label', v:'Value', full:bool}]
function openViewModal(title, rows) {
  $('view-title').textContent = title;
  $('view-body').innerHTML = rows.map(r =>
    `<div class="vf-row${r.full ? ' full' : ''}">
       <span class="vf-lbl">${r.l}</span>
       <span class="vf-val">${r.v !== undefined && r.v !== null && r.v !== '' ? r.v : '—'}</span>
     </div>`
  ).join('');
  openM('m-view');
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

    // Wire inline validation: clear error as soon as user starts typing
    el.querySelectorAll('input:not([type=hidden]),select,textarea').forEach(inp => {
      if (!inp._clearErrWired) {
        inp.addEventListener('input', () => clearFieldError(inp.id), { passive: true });
        inp._clearErrWired = true;
      }
      // Wire draft autosave
      if (!inp._draftWired) {
        inp.addEventListener('input',  debounce(() => autosaveDraft(id), 400), { passive: true });
        inp.addEventListener('change', () => autosaveDraft(id), { passive: true });
        inp._draftWired = true;
      }
    });

    // Restore unsaved draft only when opening in add mode (hidden id field is empty)
    const idField = el.querySelector('input[type=hidden]');
    const isAddMode = !idField || !idField.value || parseInt(idField.value) === 0;
    if (isAddMode) restoreDraft(id);
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
function confirmDlg(msg, onConfirm, danger = true, btnLabel = '') {
  $('cdlg-msg').textContent = msg;
  const btn = $('cdlg-ok');
  btn.className = 'btn ' + (danger ? 'btn-danger' : 'btn-p');
  btn.textContent = btnLabel || (danger ? 'Delete' : 'Confirm');
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

// ── Undo toast ────────────────────────────────────────
// Shows the popup with an Undo button (5 s window)
function toastUndo(msg, undoFn) {
  const overlay = $('success-overlay');
  if (!overlay) return;

  // Show as warning-type popup
  $('success-msg').textContent = msg;
  $('success-sub').innerHTML = `<button class="popup-undo-btn" id="popup-undo-btn">↩ Undo</button>`;

  const check  = $('s-check');
  const cross1 = $('s-cross-1');
  const cross2 = $('s-cross-2');
  if (check)  check.style.display  = 'none';
  if (cross1) cross1.style.display = '';
  if (cross2) cross2.style.display = '';

  overlay.classList.remove('err', 'warn');
  overlay.classList.add('warn');

  clearTimeout(_successTimer);
  overlay.classList.remove('show');
  void overlay.offsetWidth;
  overlay.classList.add('show');

  let undone = false;
  const btn = $('popup-undo-btn');
  if (btn) btn.onclick = (e) => {
    e.stopPropagation();
    if (undone) return;
    undone = true;
    closeSuccessPopup();
    undoFn();
    successPopup('Action undone', '', 'ok');
  };

  _successTimer = setTimeout(() => { if (!undone) overlay.classList.remove('show'); }, 5000);
}

// ── Flash a table row green after a save ──────────────
function flashRow(tbodyId, id) {
  const tbody = $(tbodyId);
  if (!tbody) return;
  const row = tbody.querySelector(`[data-id="${id}"]`);
  if (!row) return;
  row.classList.remove('row-flash');
  void row.offsetWidth; // force reflow to restart animation
  row.classList.add('row-flash');
}

// ── Fade-out an element then execute delete callback ──
// Finds any [data-id="id"] element in the document, animates it out,
// then calls deleteFn() once the animation completes.
function fadeDeleteRow(id, deleteFn) {
  const el = document.querySelector(`[data-id="${id}"]`);
  if (!el) { deleteFn(); return; }
  el.classList.add('row-delete');
  el.addEventListener('animationend', deleteFn, { once: true });
}

// ── Draft auto-save / restore / clear ─────────────────
// Saves all visible form fields to sessionStorage while the user types
function autosaveDraft(modalId) {
  const el = $(modalId);
  if (!el) return;
  const data = {};
  el.querySelectorAll('input:not([type=hidden]),select,textarea').forEach(inp => {
    if (inp.id) data[inp.id] = inp.value;
  });
  try { sessionStorage.setItem('draft_' + modalId, JSON.stringify(data)); } catch {}
}

// Restores saved draft values into the form
function restoreDraft(modalId) {
  try {
    const raw = sessionStorage.getItem('draft_' + modalId);
    if (!raw) return false;
    const data = JSON.parse(raw);
    let restored = false;
    Object.entries(data).forEach(([fid, val]) => {
      const inp = $(fid);
      if (inp) { inp.value = val; restored = true; }
    });
    if (restored) toast('Unsaved draft restored', true);
    return restored;
  } catch { return false; }
}

// Clears the draft after a successful save
function clearDraft(modalId) {
  try { sessionStorage.removeItem('draft_' + modalId); } catch {}
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

// ── Success/Error/Warn popup ──────────────────────────
let _successTimer = null;
function successPopup(msg, sub = '', type = 'ok') {
  const overlay = $('success-overlay');
  if (!overlay) return;

  // Set message text
  $('success-msg').textContent = msg;
  $('success-sub').textContent = sub;

  // Swap icon: check for ok/warn, X for err
  const check  = $('s-check');
  const cross1 = $('s-cross-1');
  const cross2 = $('s-cross-2');
  const isErr  = type === 'err';
  if (check)  check.style.display  = isErr ? 'none' : '';
  if (cross1) cross1.style.display = isErr ? '' : 'none';
  if (cross2) cross2.style.display = isErr ? '' : 'none';

  // Apply colour class
  overlay.classList.remove('err', 'warn');
  if (type === 'err')  overlay.classList.add('err');
  if (type === 'warn') overlay.classList.add('warn');

  // Re-trigger animation
  clearTimeout(_successTimer);
  overlay.classList.remove('show');
  void overlay.offsetWidth;
  overlay.classList.add('show');

  const duration = type === 'err' ? 3000 : 2200;
  _successTimer = setTimeout(() => overlay.classList.remove('show'), duration);
}
function closeSuccessPopup() {
  clearTimeout(_successTimer);
  $('success-overlay')?.classList.remove('show');
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
