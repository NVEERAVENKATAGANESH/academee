// ════════════════════════════════════════════════════════
//  FACULTY  —  faculty portal page render & action fns
// ════════════════════════════════════════════════════════
'use strict';

// ═══════════════════════════════════════════
//  FACULTY DASHBOARD
// ═══════════════════════════════════════════
function rFDash() {
  const user = State.getUser();
  const fac  = DB.g('faculty').find(f => f.id === user.lid);
  if (fac) {
    const hr = new Date().getHours();
    const greeting = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
    $('fdash-t').textContent = `${greeting}, ${fac.fn}`;
  }

  const mc = DB.g('courses').filter(c => c.fid === user.lid);
  const me = DB.g('enrollments').filter(e => mc.find(c => c.id === e.cid));
  const mg = DB.g('grades').filter(g => mc.find(c => c.id === g.cid));
  const ss = new Set(me.map(e => e.sid));

  $('fstats').innerHTML = `
    <div class="stat"><div class="stat-top"><span class="stat-lbl">My Courses</span></div><div class="stat-val">${mc.length}</div></div>
    <div class="stat"><div class="stat-top"><span class="stat-lbl">Students</span></div><div class="stat-val">${ss.size}</div></div>
    <div class="stat"><div class="stat-top"><span class="stat-lbl">Grades Entered</span></div><div class="stat-val">${mg.length}<span class="text4" style="font-size:14px">/${me.length}</span></div></div>
    <div class="stat"><div class="stat-top"><span class="stat-lbl">Avg Score</span></div><div class="stat-val">${mg.length ? Math.round(mg.reduce((s, g) => s + g.marks, 0) / mg.length) : '—'}</div></div>`;

  $('fcourse-tbl').innerHTML = `<thead><tr><th>Code</th><th>Course</th><th>Students</th><th>Avg</th></tr></thead><tbody>${
    mc.map(c => {
      const e  = DB.g('enrollments').filter(x => x.cid === c.id).length;
      const cg = DB.g('grades').filter(g => g.cid === c.id);
      const avg = cg.length ? Math.round(cg.reduce((s, g) => s + g.marks, 0) / cg.length) : null;
      return `<tr>
        <td class="mono" style="color:var(--blue)">${esc(c.code)}</td>
        <td>${esc(c.name)}</td>
        <td class="mono">${e}</td>
        <td>${avg !== null ? `<span class="mono">${avg}</span> ${gChip(grade(avg))}` : '—'}</td>
      </tr>`;
    }).join('')
  }</tbody>`;

  const dist = { A:0, B:0, C:0, D:0, F:0 };
  mg.forEach(g => dist[grade(g.marks)]++);
  Charts.make('ch-fgrade', 'bar', {
    labels: Object.keys(dist),
    datasets: [{ data: Object.values(dist), backgroundColor: Charts.P.grade, borderRadius: 4 }],
  }, { plugins:{ legend:{ display:false } } });
}

// ═══════════════════════════════════════════
//  MY COURSES (faculty)
// ═══════════════════════════════════════════
function rMyCourses() {
  const user = State.getUser();
  const mc   = DB.g('courses').filter(c => c.fid === user.lid);
  const sel  = $('mcsel');
  if (sel && !sel.innerHTML.trim()) {
    sel.innerHTML = mc.map(c => `<option value="${c.id}">${esc(c.code)} — ${esc(c.name)}</option>`).join('');
  }
  rMyCourseStudents();
}

function rMyCourseStudents() {
  const cid  = parseInt($('mcsel')?.value);
  const enrs = DB.g('enrollments').filter(e => e.cid === cid);

  $('mcbody').innerHTML = enrs.map((e, i) => {
    const s = DB.g('students').find(x => x.id === e.sid);
    if (!s) return '';
    const g = DB.g('grades').find(x => x.sid === e.sid && x.cid === cid);
    const a = DB.g('attendance').find(x => x.sid === e.sid && x.cid === cid);
    return `<tr data-id="${e.id}">
      <td><div style="display:flex;align-items:center;gap:8px">
        <div class="av ${avCls(i)}">${esc(s.fn[0])}${esc((s.ln || '')[0] || '')}</div>
        <div class="bold">${esc(s.fn)} ${esc(s.ln)}</div>
      </div></td>
      <td class="mono text3" style="font-size:11px">${stuId(s.id)}</td>
      <td>${esc(s.dept)}</td>
      <td>Yr ${esc(s.yr)}</td>
      <td>${g ? gChip(grade(g.marks)) : '<span class="text4">—</span>'}</td>
      <td>${a ? progBar(pct(a.pres, a.tot)) : '<span class="text4">—</span>'}</td>
      <td><div class="act-btns">
        <button class="bico view" onclick="viewCourseStudent(${s.id},${cid})" title="View student">${_iEye}</button>
        <button class="bico edit" onclick="editCourseStudentGrade(${s.id},${cid})" title="Edit grade">${_iPen}</button>
        <button class="bico del"  onclick="removeCourseStudent(${e.id})" title="Remove from course">${_iTrash}</button>
      </div></td>
    </tr>`;
  }).join('') || `<tr><td colspan="7"><div class="empty"><p>No students enrolled</p></div></td></tr>`;
}

function viewCourseStudent(sid, cid) {
  const s = DB.g('students').find(x => x.id === sid); if (!s) return;
  const g = DB.g('grades').find(x => x.sid === sid && x.cid === cid);
  const a = DB.g('attendance').find(x => x.sid === sid && x.cid === cid);
  openViewModal(`${esc(s.fn)} ${esc(s.ln)}`, [
    { l: 'Student ID',  v: stuId(sid) },
    { l: 'Department',  v: esc(s.dept) },
    { l: 'Year',        v: `Year ${s.yr}` },
    { l: 'Email',       v: esc(s.em) },
    { l: 'Course',      v: `${cc(cid)} — ${cn(cid)}` },
    { l: 'Grade',       v: g ? `${g.marks}/100 (${grade(g.marks)})` : '—' },
    { l: 'Attendance',  v: a ? `${pct(a.pres, a.tot)}% (${a.pres}/${a.tot})` : '—' },
  ]);
}
function editCourseStudentGrade(sid, cid) {
  // Navigate to grade entry and pre-select this course
  go('gradeentry');
  setTimeout(() => {
    const sel = $('gesel');
    if (sel) { sel.value = cid; rGradeRows(); }
    const inp = $('m' + sid);
    if (inp) inp.focus();
  }, 150);
}
function removeCourseStudent(eid) {
  const e = DB.g('enrollments').find(x => x.id === eid); if (!e) return;
  confirmDlg(`Remove ${sn(e.sid)} from ${cn(e.cid)}?`, () => fadeDeleteRow(eid, () => {
    DB.s('enrollments', DB.g('enrollments').filter(x => x.id !== eid));
    const user = State.getUser();
    addAudit('Enrollment Removed', `${sn(e.sid)} from ${cn(e.cid)}`, user.u, 'var(--red)');
    toast('Student removed from course');
    rMyCourseStudents();
  }), true, 'Remove');
}

// ═══════════════════════════════════════════
//  GRADE ENTRY  (reworked)
// ═══════════════════════════════════════════
let _geFilter = 'all';

const _GE_COLORS = { A:'#16a34a', B:'#2563eb', C:'#9333ea', D:'#d97706', F:'#dc2626' };
const _GE_AV_COLORS = ['#6366f1','#0ea5e9','#f59e0b','#10b981','#f43f5e','#8b5cf6','#06b6d4'];

function setGeFilter(f, btn) {
  _geFilter = f;
  document.querySelectorAll('.ge-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  rGradeRows();
}

function rGradeEntry() {
  const user = State.getUser();
  const mc   = DB.g('courses').filter(c => c.fid === user.lid);
  const sel  = $('gesel');
  if (sel) {
    const cur = sel.value;
    sel.innerHTML = mc.map(c => `<option value="${c.id}">${esc(c.code)} — ${esc(c.name)}</option>`).join('');
    if (cur) sel.value = cur;
  }
  _geFilter = 'all';
  document.querySelectorAll('.ge-tab').forEach((t, i) => t.classList.toggle('active', i === 0));
  rGradeRows();
}

function rGradeRows() {
  const cid  = parseInt($('gesel')?.value);
  if (!cid) return;

  const q      = ($('ge-search')?.value || '').toLowerCase();
  let   enrs   = DB.g('enrollments').filter(e => e.cid === cid && e.status !== 'Dropped');
  const cgs    = DB.g('grades').filter(g => g.cid === cid);
  const attAll = DB.g('attendance');

  // Bell curve mean
  const allMarks = cgs.map(g => g.marks);
  const mean     = allMarks.length ? allMarks.reduce((s, m) => s + m, 0) / allMarks.length : null;

  // Stats
  const total   = enrs.length;
  const graded  = enrs.filter(e => cgs.find(g => g.sid === e.sid)).length;
  const ungraded = total - graded;
  const avgMark  = graded ? Math.round(allMarks.reduce((s, m) => s + m, 0) / allMarks.length) : null;
  const passCount = allMarks.filter(m => m >= 60).length;

  $('ge-stats').innerHTML = `
    <div class="stat"><div class="stat-top"><span class="stat-lbl">Enrolled</span></div><div class="stat-val">${total}</div><div class="stat-meta">${graded} graded</div></div>
    <div class="stat"><div class="stat-top"><span class="stat-lbl">Avg Score</span></div><div class="stat-val" style="color:var(--blue)">${avgMark !== null ? avgMark : '—'}</div><div class="stat-meta">${graded ? grade(avgMark) + ' avg' : 'no data'}</div></div>
    <div class="stat"><div class="stat-top"><span class="stat-lbl">Pass Rate</span></div><div class="stat-val" style="color:var(--green)">${graded ? Math.round(passCount/graded*100) + '%' : '—'}</div><div class="stat-meta">${passCount} passing</div></div>
    <div class="stat"><div class="stat-top"><span class="stat-lbl">Pending</span></div><div class="stat-val" style="color:${ungraded ? 'var(--amber)' : 'var(--green)'}">${ungraded}</div><div class="stat-meta">not graded yet</div></div>`;

  // Distribution bar
  const dist = { A:0, B:0, C:0, D:0, F:0 };
  cgs.forEach(g => dist[grade(g.marks)]++);
  const distCard = $('ge-dist-card');
  if (graded > 0) {
    if (distCard) distCard.style.display = '';
    $('ge-dist-bar').innerHTML = ['A','B','C','D','F'].map(gr => {
      const pct2 = Math.round(dist[gr] / graded * 100);
      return pct2 > 0 ? `<div class="ge-dist-seg" style="flex:${dist[gr]};background:${_GE_COLORS[gr]}" title="${gr}: ${dist[gr]} students (${pct2}%)"><span>${gr} ${pct2}%</span></div>` : '';
    }).join('');
    $('ge-dist-legend').innerHTML = ['A','B','C','D','F'].map(gr =>
      `<div class="ge-dist-leg"><div class="ge-dist-dot" style="background:${_GE_COLORS[gr]}"></div>${gr}: ${dist[gr]}</div>`
    ).join('');
  } else {
    if (distCard) distCard.style.display = 'none';
  }

  // Progress bar
  const pw = $('ge-progress-wrap');
  if (pw) pw.style.display = total > 0 ? '' : 'none';
  const pct3 = total ? Math.round(graded / total * 100) : 0;
  const pl = $('ge-progress-lbl'); if (pl) pl.textContent = `${graded} of ${total} graded`;
  const pp = $('ge-progress-pct'); if (pp) pp.textContent = pct3 + '%';
  const pf = $('ge-progress-fill'); if (pf) pf.style.width = pct3 + '%';

  // Filter + search
  if (_geFilter === 'graded')   enrs = enrs.filter(e => cgs.find(g => g.sid === e.sid));
  if (_geFilter === 'ungraded') enrs = enrs.filter(e => !cgs.find(g => g.sid === e.sid));
  if (q) enrs = enrs.filter(e => {
    const s = DB.g('students').find(x => x.id === e.sid);
    return s && (s.fn + ' ' + s.ln).toLowerCase().includes(q);
  });

  $('gebdy').innerHTML = enrs.map((e, idx) => {
    const s      = DB.g('students').find(x => x.id === e.sid);
    if (!s) return '';
    const g      = cgs.find(x => x.sid === e.sid);
    const att    = attAll.find(a => a.sid === e.sid && a.cid === cid);
    const curved = mean && g ? Math.min(100, Math.round(g.marks + (100 - mean) * 0.1)) : null;
    const gr     = g ? grade(g.marks) : null;
    const attPct = att ? pct(att.pres, att.tot) : null;
    const attColor = attPct === null ? 'var(--text4)' : attPct >= 75 ? 'var(--green)' : attPct >= 60 ? 'var(--amber)' : 'var(--red)';
    const inpCls  = gr ? 'ge-inp g' + gr.toLowerCase() : 'ge-inp';
    const avColor = _GE_AV_COLORS[idx % _GE_AV_COLORS.length];

    return `<tr data-id="${e.id}" style="transition:background .2s">
      <td class="mono text4" style="font-size:11px">${idx + 1}</td>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="ge-av" style="background:${avColor}">${esc(s.fn[0])}${esc((s.ln||'')[0]||'')}</div>
          <div>
            <div class="bold" style="font-size:13px">${esc(s.fn)} ${esc(s.ln)}</div>
            <div class="mono text4" style="font-size:10px">${stuId(s.id)} · ${esc(s.dept)}</div>
          </div>
        </div>
      </td>
      <td>
        ${attPct !== null
          ? `<div style="display:flex;align-items:center;gap:6px">
               <div class="prog" style="width:64px"><div class="pf" style="width:${attPct}%;background:${attColor}"></div></div>
               <span class="mono" style="font-size:11px;color:${attColor}">${attPct}%</span>
             </div>`
          : '<span class="text4" style="font-size:11px">—</span>'}
      </td>
      <td>
        <input class="${inpCls}" id="m${s.id}" type="number" min="0" max="100"
          value="${g ? g.marks : ''}" placeholder="—"
          oninput="updGradePreview(${s.id},${cid})">
      </td>
      <td id="gp${s.id}">${gr ? gChip(gr) : '<span class="text4">—</span>'}</td>
      <td id="pp${s.id}" class="mono" style="font-size:13px">${g ? gpa(g.marks).toFixed(1) : '<span class="text4">—</span>'}</td>
      <td class="text3" style="font-size:11px">${curved !== null ? `<span style="color:var(--teal)">→ ${curved}</span>` : '<span class="text4">—</span>'}</td>
      <td>${g
        ? `<span class="bx ${gr === 'F' ? 'bx-rd' : 'bx-gr'}" style="font-size:10px">${gr === 'F' ? 'Fail' : 'Pass'}</span>`
        : '<span class="bx bx-am" style="font-size:10px">Pending</span>'}</td>
      <td><div class="act-btns">
        <button class="bico view" onclick="viewGradeStudent(${s.id},${cid})" title="View student">${_iEye}</button>
        <button class="bico edit" onclick="openGradeEditModal(${s.id},${cid})" title="Edit grade">${_iPen}</button>
        <button class="bico del" onclick="clearStudentGrade(${s.id},${cid})" title="Clear grade" ${!g ? 'disabled style="opacity:.3"' : ''}>${_iTrash}</button>
      </div></td>
    </tr>`;
  }).join('') || `<tr><td colspan="9"><div class="empty"><p>${_geFilter !== 'all' ? 'No ' + _geFilter + ' students' : 'No students enrolled'}</p></div></td></tr>`;
}

function updGradePreview(sid, cid) {
  const v = parseInt($('m' + sid)?.value);
  const inp = $('m' + sid);
  if (!isNaN(v) && v >= 0 && v <= 100) {
    const gr = grade(v);
    $('gp' + sid).innerHTML   = gChip(gr);
    $('pp' + sid).innerHTML   = `<span class="mono" style="font-size:13px">${gpa(v).toFixed(1)}</span>`;
    if (inp) inp.className    = 'ge-inp g' + gr.toLowerCase();
  } else {
    $('gp' + sid).innerHTML   = '<span class="text4">—</span>';
    $('pp' + sid).innerHTML   = '<span class="text4">—</span>';
    if (inp) inp.className    = 'ge-inp';
  }
}

function viewGradeStudent(sid, cid) {
  const s = DB.g('students').find(x => x.id === sid); if (!s) return;
  const g = DB.g('grades').find(x => x.sid === sid && x.cid === cid);
  const a = DB.g('attendance').find(x => x.sid === sid && x.cid === cid);
  openViewModal(`${esc(s.fn)} ${esc(s.ln)}`, [
    { l: 'Student ID',    v: stuId(sid) },
    { l: 'Department',    v: esc(s.dept) },
    { l: 'Year',          v: `Year ${s.yr}` },
    { l: 'Email',         v: esc(s.em) },
    { l: 'Course',        v: `${cc(cid)} — ${cn(cid)}` },
    { l: 'Current Grade', v: g ? `${g.marks}/100 (${grade(g.marks)})` : 'Not entered' },
    { l: 'GPA Points',    v: g ? gpa(g.marks).toFixed(1) : '—' },
    { l: 'Attendance',    v: a ? `${pct(a.pres, a.tot)}% (${a.pres}/${a.tot})` : 'No record' },
  ]);
}

// ── Grade Edit Modal (per-student) ──────────────────────
let _gemSid = null, _gemCid = null;

function openGradeEditModal(sid, cid) {
  const s = DB.g('students').find(x => x.id === sid); if (!s) return;
  const g = DB.g('grades').find(x => x.sid === sid && x.cid === cid);
  const c = DB.g('courses').find(x => x.id === cid);
  _gemSid = sid; _gemCid = cid;

  $('mgem-title').textContent = g ? 'Edit Grade' : 'Enter Grade';

  // Avatar
  const avColors = ['#6366f1','#0ea5e9','#f59e0b','#10b981','#f43f5e','#8b5cf6','#06b6d4'];
  const av = $('mgem-av');
  av.textContent = s.fn[0].toUpperCase() + (s.ln?.[0] || '').toUpperCase();
  av.style.background = avColors[sid % avColors.length];

  // Student info
  $('mgem-name').textContent = `${s.fn} ${s.ln}`;
  $('mgem-meta').textContent  = `${stuId(sid)} · ${s.dept} · Year ${s.yr}`;
  $('mgem-course').textContent = c ? `${c.code} — ${c.name}` : cc(cid);

  // Current grade
  const cw = $('mgem-current-wrap');
  if (g) {
    const gr = grade(g.marks);
    $('mgem-current').innerHTML =
      `<span class="mono bold" style="font-size:18px;color:${_GE_COLORS[gr]}">${g.marks}<span class="text4" style="font-size:12px;font-weight:400">/100</span></span>
       &nbsp;${gChip(gr)}&nbsp;
       <span class="mono text4" style="font-size:12px">GPA ${gpa(g.marks).toFixed(1)}</span>`;
    cw.style.display = '';
  } else {
    cw.style.display = 'none';
  }

  // Input
  const inp = $('mgem-marks');
  inp.value     = g ? g.marks : '';
  inp.className = g ? `ge-inp g${grade(g.marks).toLowerCase()}` : 'ge-inp';
  inp.style.width = '100%';
  inp.style.boxSizing = 'border-box';

  updGemPreview();
  openM('m-ge-modal');
  setTimeout(() => inp.focus(), 150);
}

function updGemPreview() {
  const v   = parseInt($('mgem-marks')?.value);
  const pw  = $('mgem-preview-wrap');
  const inp = $('mgem-marks');
  if (!isNaN(v) && v >= 0 && v <= 100) {
    const gr = grade(v);
    $('mgem-grade-chip').innerHTML = gChip(gr);
    $('mgem-gpa').textContent      = gpa(v).toFixed(1);
    $('mgem-gpa').style.color      = _GE_COLORS[gr];
    $('mgem-pf-badge').innerHTML   = v >= 60
      ? '<span class="bx bx-gr" style="font-size:10px">Pass</span>'
      : '<span class="bx bx-rd" style="font-size:10px">Fail</span>';
    pw.style.display = 'flex';
    if (inp) { inp.className = `ge-inp g${gr.toLowerCase()}`; inp.style.width = '100%'; inp.style.boxSizing = 'border-box'; }
  } else {
    pw.style.display = 'none';
    if (inp) { inp.className = 'ge-inp'; inp.style.width = '100%'; inp.style.boxSizing = 'border-box'; }
  }
}

function saveGemGrade() {
  const sid = _gemSid, cid = _gemCid;
  if (!sid || !cid) return;
  const m = parseInt($('mgem-marks')?.value);
  if (isNaN(m) || m < 0 || m > 100) { toast('Enter valid marks (0–100)', false); return; }
  const gs = DB.g('grades');
  const i  = gs.findIndex(g => g.sid === sid && g.cid === cid);
  if (i >= 0) { gs[i].marks = m; gs[i].entered = Date.now(); }
  else gs.push({ id: DB.nid(gs), sid, cid, marks: m, sem: C.SEMESTER.CURRENT, entered: Date.now() });
  DB.s('grades', gs);
  addAudit('Grade Saved', `${sn(sid)} — ${cc(cid)}: ${m}`, State.getUser().u, 'var(--blue)');
  const u = DB.g('users').find(x => x.role === 'student' && x.lid === sid);
  if (u) addNotif(u.id, 'Grade Updated', `Your ${cc(cid)} grade has been updated to ${m}.`, 'grade');
  clearDraft('m-ge-modal');
  closeM('m-ge-modal');
  toast('Grade saved');
  rGradeRows();
}

function clearStudentGrade(sid, cid) {
  const gs = DB.g('grades');
  const g  = gs.find(x => x.sid === sid && x.cid === cid); if (!g) return;
  confirmDlg(`Clear grade for ${sn(sid)} in ${cc(cid)}?`, () => {
    DB.s('grades', gs.filter(x => !(x.sid === sid && x.cid === cid)));
    addAudit('Grade Cleared', `${sn(sid)} — ${cc(cid)}`, State.getUser().u, 'var(--red)');
    toast('Grade cleared');
    rGradeRows();
  }, true, 'Clear Grade');
}

function saveAllGrades() {
  const cid  = parseInt($('gesel')?.value);
  const gs   = DB.g('grades');
  const enrs = DB.g('enrollments').filter(e => e.cid === cid);
  const user = State.getUser();
  let saved  = 0;

  enrs.forEach(e => {
    const inp = $('m' + e.sid);
    if (!inp) return;
    const m = parseInt(inp.value);
    if (isNaN(m) || m < 0 || m > 100) return;
    const i = gs.findIndex(g => g.sid === e.sid && g.cid === cid);
    if (i >= 0) { gs[i].marks = m; gs[i].entered = Date.now(); }
    else gs.push({ id: DB.nid(gs), sid: e.sid, cid, marks: m, sem: C.SEMESTER.CURRENT, entered: Date.now() });
    saved++;
  });

  DB.s('grades', gs);
  toast(`Saved ${saved} grade${saved !== 1 ? 's' : ''}`);
  addAudit('Grades Saved', `${saved} grades for ${cc(cid)}`, user.u, 'var(--blue)');

  // Notify students
  enrs.forEach(e => {
    const u = DB.g('users').find(x => x.role === 'student' && x.lid === e.sid);
    if (u) addNotif(u.id, 'Grade Released', `Your ${cc(cid)} grade has been posted.`, 'grade');
  });
}

function importGradesCSV() {
  const inp = $('csv-inp'); if (inp) inp.value = '';
  const prev = $('csv-preview'); if (prev) prev.innerHTML = '';
  const btn = $('csv-import-btn'); if (btn) btn.style.display = 'none';
  openM('m-csv-import');
}

function previewCSV() {
  const cid  = parseInt($('gesel')?.value);
  const csv  = $('csv-inp')?.value || '';
  const rows = csv.trim().split('\n').filter(r => r.trim());
  const students = DB.g('students');
  const parsed = [];
  const errors = [];

  rows.forEach((row, i) => {
    const [sidStr, marksStr] = row.split(',');
    const sid   = parseInt(sidStr?.trim());
    const marks = parseInt(marksStr?.trim());
    const stu   = students.find(s => s.id === sid);
    if (!stu)                              { errors.push(`Row ${i+1}: Student ID ${sid} not found`); return; }
    if (isNaN(marks) || marks < 0 || marks > 100) { errors.push(`Row ${i+1}: Invalid marks "${marksStr?.trim()}"`); return; }
    parsed.push({ sid, marks, name: `${stu.fn} ${stu.ln}`, grade: grade(marks) });
  });

  const prev = $('csv-preview');
  if (!prev) return;
  if (!parsed.length && !errors.length) { prev.innerHTML = `<p class="text4" style="font-size:12px">Nothing to preview — check your CSV format.</p>`; return; }

  prev.innerHTML = `
    ${parsed.length ? `<div style="font-size:11px;color:var(--text4);margin-bottom:6px">${parsed.length} valid row${parsed.length!==1?'s':''} ready to import${errors.length?` · <span style="color:var(--red)">${errors.length} skipped</span>`:''}</div>
    <div class="tw"><table class="t"><thead><tr><th>Student</th><th>Marks</th><th>Grade</th></tr></thead><tbody>
      ${parsed.map(r=>`<tr><td>${esc(r.name)}</td><td class="mono">${r.marks}</td><td>${gChip(r.grade)}</td></tr>`).join('')}
    </tbody></table></div>` : ''}
    ${errors.length ? `<div style="margin-top:8px">${errors.map(e=>`<div style="font-size:11px;color:var(--red);padding:2px 0">${esc(e)}</div>`).join('')}</div>` : ''}`;

  const btn = $('csv-import-btn'); const cnt = $('csv-count');
  if (btn) btn.style.display = parsed.length ? 'inline-flex' : 'none';
  if (cnt) cnt.textContent = parsed.length;
  btn._parsed = parsed; btn._cid = cid;
}

function confirmCSVImport() {
  const btn = $('csv-import-btn');
  if (!btn?._parsed) return;
  const { _parsed: parsed, _cid: cid } = btn;
  const gs = DB.g('grades');
  parsed.forEach(({ sid, marks }) => {
    const i = gs.findIndex(g => g.sid === sid && g.cid === cid);
    if (i >= 0) { gs[i].marks = marks; gs[i].entered = Date.now(); }
    else gs.push({ id: DB.nid(gs), sid, cid, marks, sem: C.SEMESTER.CURRENT, entered: Date.now() });
  });
  DB.s('grades', gs);
  closeM('m-csv-import');
  toast(`Imported ${parsed.length} grade${parsed.length !== 1 ? 's' : ''}`);
  rGradeRows();
}

// ═══════════════════════════════════════════
//  MARK ATTENDANCE
// ═══════════════════════════════════════════
function rMarkAtt() {
  const user = State.getUser();
  const mc   = DB.g('courses').filter(c => c.fid === user.lid);
  const sel  = $('masel');
  if (sel && !sel.innerHTML.trim()) {
    sel.innerHTML = mc.map(c => `<option value="${c.id}">${esc(c.code)} — ${esc(c.name)}</option>`).join('');
  }
  const mdate = $('madate');
  if (mdate && !mdate.value) mdate.value = today();
  rAttEntry();
}

function rAttEntry() {
  const cid  = parseInt($('masel')?.value);
  const enrs = DB.g('enrollments').filter(e => e.cid === cid);
  const att  = DB.g('attendance');

  $('mabdy').innerHTML = enrs.map(e => {
    const s = DB.g('students').find(x => x.id === e.sid);
    if (!s) return '';
    const a = att.find(x => x.sid === e.sid && x.cid === cid);
    return `<tr>
      <td><div class="bold">${esc(s.fn)} ${esc(s.ln)}</div></td>
      <td>${a ? progBar(pct(a.pres, a.tot)) : '<span class="text4" style="font-size:11px">No record</span>'}</td>
      <td>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer" title="Check = Present · Uncheck = Absent">
          <input type="checkbox" data-sid="${s.id}" checked
            style="width:15px;height:15px;accent-color:var(--blue)"
            onchange="this.nextElementSibling.textContent=this.checked?'Present':'Absent';this.nextElementSibling.style.color=this.checked?'var(--green)':'var(--red)'">
          <span style="font-size:12px;font-weight:600;color:var(--green);min-width:44px">Present</span>
        </label>
      </td>
      <td><div class="act-btns">
        <button class="bico view" onclick="viewAttStudent(${s.id},${cid})" title="View student">${_iEye}</button>
        ${a ? `<button class="bico edit" onclick="editAttStudent(${a.id})" title="Edit attendance record">${_iPen}</button>
               <button class="bico del"  onclick="clearStudentAtt(${a.id})" title="Reset attendance">${_iTrash}</button>`
            : `<button class="bico edit" disabled style="opacity:.3">${_iPen}</button>
               <button class="bico del"  disabled style="opacity:.3">${_iTrash}</button>`}
      </div></td>
    </tr>`;
  }).join('') || `<tr><td colspan="4"><div class="empty"><p>No students enrolled</p></div></td></tr>`;
}

function saveAtt() {
  const cid  = parseInt($('masel')?.value);
  const cbs  = document.querySelectorAll('#mabdy input[type=checkbox]');
  const att  = DB.g('attendance');
  const user = State.getUser();
  let cnt    = 0;

  cbs.forEach(cb => {
    const sid = parseInt(cb.dataset.sid);
    const i   = att.findIndex(a => a.sid === sid && a.cid === cid);
    if (i >= 0) { att[i].tot++; if (cb.checked) att[i].pres++; }
    else att.push({ id: DB.nid(att), sid, cid, pres: cb.checked ? 1 : 0, tot: 1 });
    cnt++;
  });

  DB.s('attendance', att);
  toast(`Attendance saved for ${cnt} student${cnt !== 1 ? 's' : ''}`);
  addAudit('Attendance Marked', `${cc(cid)} — ${cnt} students`, user.u, 'var(--teal)');

  // Warn students with low attendance
  att.filter(a => a.cid === cid).forEach(a => {
    const p = pct(a.pres, a.tot);
    if (p < C.ATTENDANCE.WARNING_PCT) {
      const u = DB.g('users').find(x => x.role === 'student' && x.lid === a.sid);
      if (u) addNotif(u.id, 'Attendance Warning', `Your ${cc(cid)} attendance is ${p}%.`, 'attendance');
    }
  });

  rAttEntry();
}
function viewAttStudent(sid, cid) {
  const s = DB.g('students').find(x => x.id === sid); if (!s) return;
  const a = DB.g('attendance').find(x => x.sid === sid && x.cid === cid);
  const g = DB.g('grades').find(x => x.sid === sid && x.cid === cid);
  openViewModal(`${esc(s.fn)} ${esc(s.ln)}`, [
    { l: 'Student ID',  v: stuId(sid) },
    { l: 'Department',  v: esc(s.dept) },
    { l: 'Year',        v: `Year ${s.yr}` },
    { l: 'Course',      v: `${cc(cid)} — ${cn(cid)}` },
    { l: 'Present',     v: a ? `${a.pres}/${a.tot} classes` : 'No record' },
    { l: 'Percentage',  v: a ? `${pct(a.pres, a.tot)}%` : '—' },
    { l: 'Grade',       v: g ? `${g.marks}/100 (${grade(g.marks)})` : 'Not entered' },
  ]);
}
function editAttStudent(attId) {
  const a = DB.g('attendance').find(x => x.id === attId); if (!a) return;
  $('mae-id').value  = attId;
  $('mae-stu').textContent = sn(a.sid);
  $('mae-co').textContent  = `${cc(a.cid)} — ${cn(a.cid)}`;
  $('mae-pres').value = a.pres;
  $('mae-tot').value  = a.tot;
  openM('m-att-edit');
}
function clearStudentAtt(attId) {
  const a = DB.g('attendance').find(x => x.id === attId); if (!a) return;
  confirmDlg(`Reset all attendance for ${sn(a.sid)} in ${cc(a.cid)}?`, () => {
    DB.s('attendance', DB.g('attendance').filter(x => x.id !== attId));
    addAudit('Attendance Reset', `${sn(a.sid)} — ${cc(a.cid)}`, State.getUser().u, 'var(--red)');
    toast('Attendance record cleared');
    rAttEntry();
  }, true, 'Reset');
}

function viewAssign(id) {
  const a = DB.g('assignments').find(x => x.id === id); if (!a) return;
  const enr = DB.g('enrollments').filter(e => e.cid === a.cid).length;
  openViewModal(esc(a.title), [
    { l: 'Course',       v: `${cc(a.cid)} — ${cn(a.cid)}` },
    { l: 'Due Date',     v: esc(a.due) },
    { l: 'Total Marks',  v: a.marks },
    { l: 'Weight',       v: `${a.wt}%` },
    { l: 'Students',     v: `${enr} enrolled` },
    { l: 'Instructions', v: esc(a.inst), full: true },
  ]);
}

// ═══════════════════════════════════════════
//  ASSIGNMENTS
// ═══════════════════════════════════════════
function rAssignments() {
  const user = State.getUser();
  const mc   = user.role === 'faculty'
    ? DB.g('courses').filter(c => c.fid === user.lid)
    : DB.g('courses');

  const mas = $('mas-co');
  if (mas) mas.innerHTML = mc.map(c => `<option value="${c.id}">${esc(c.code)} — ${esc(c.name)}</option>`).join('');

  const assigns = DB.g('assignments').filter(a => mc.find(c => c.id === a.cid));
  const tod = today();

  $('assigntbl').innerHTML = assigns.map(a => {
    const enr     = DB.g('enrollments').filter(e => e.cid === a.cid).length;
    const overdue = a.due < tod;
    return `<tr data-id="${a.id}">
      <td class="bold">${esc(a.title)}</td>
      <td class="mono" style="color:var(--blue)">${cc(a.cid)}</td>
      <td style="color:${overdue ? 'var(--red)' : ''}">${esc(a.due)}</td>
      <td class="mono">${a.marks}</td>
      <td class="mono">${a.wt}%</td>
      <td class="mono">${enr}</td>
      <td><div class="act-btns">
        <button class="bico view" onclick="viewAssign(${a.id})"  title="View details">${_iEye}</button>
        <button class="bico edit" onclick="editAssign(${a.id})"  title="Edit assignment">${_iPen}</button>
        <button class="bico del"  onclick="delAssign(${a.id})"   title="Delete assignment">${_iTrash}</button>
      </div></td>
    </tr>`;
  }).join('') || `<tr><td colspan="7"><div class="empty"><p>No assignments</p></div></td></tr>`;
}

function editAssign(id) {
  const a = DB.g('assignments').find(x => x.id === id); if (!a) return;
  const user = State.getUser();
  const mc   = DB.g('courses').filter(c => c.fid === user.lid);
  const mas  = $('mas-co');
  if (mas) mas.innerHTML = mc.map(c => `<option value="${c.id}">${esc(c.code)} — ${esc(c.name)}</option>`).join('');
  $('mas-title').textContent = 'Edit Assignment';
  $('mas-id').value    = id;
  $('mas-t').value     = a.title;
  $('mas-co').value    = a.cid;
  $('mas-due').value   = a.due;
  $('mas-marks').value = a.marks;
  $('mas-wt').value    = a.wt;
  $('mas-inst').value  = a.inst || '';
  $('mas-save-btn').textContent = 'Save';
  openM('m-assign');
}
function saveAssignment() {
  const id = parseInt($('mas-id')?.value) || 0;
  const d = {
    cid:   parseInt($('mas-co')?.value),
    title: $('mas-t').value.trim(),
    due:   $('mas-due').value,
    marks: parseInt($('mas-marks').value),
    wt:    parseInt($('mas-wt').value),
    inst:  $('mas-inst').value.trim(),
  };
  if (!d.title) { toast('Title required', false); return; }
  if (!d.due)   { toast('Due date required', false); return; }

  const as = DB.g('assignments');
  if (id) {
    const i = as.findIndex(x => x.id === id);
    if (i >= 0) as[i] = { ...as[i], ...d };
    DB.s('assignments', as);
    toast('Assignment updated');
    addAudit('Assignment Updated', d.title, State.getUser().u, 'var(--purple)');
    $('mas-id').value = '';
    $('mas-title').textContent = 'Create Assignment';
    $('mas-save-btn').textContent = 'Create';
    clearDraft('m-assign');
    closeM('m-assign');
    rAssignments();
    return;
  }

  const newA = { id: DB.nid(as), ...d };
  as.push(newA);
  DB.s('assignments', as);
  toast('Assignment created');
  addAudit('Assignment Created', d.title, State.getUser().u, 'var(--purple)');

  // Notify enrolled students
  DB.g('enrollments').filter(e => e.cid === d.cid).forEach(e => {
    const u = DB.g('users').find(x => x.role === 'student' && x.lid === e.sid);
    if (u) addNotif(u.id, 'New Assignment', `${d.title} — due ${d.due}`, 'assign');
  });

  clearDraft('m-assign');
  closeM('m-assign');
  rAssignments();
}

function delAssign(id) {
  const a = DB.g('assignments').find(x => x.id === id);
  if (!a) return;
  confirmDlg(`Delete "${a.title}"?`, () => fadeDeleteRow(id, () => {
    DB.s('assignments', DB.g('assignments').filter(x => x.id !== id));
    addAudit('Assignment Deleted', a.title, State.getUser().u, 'var(--red)');
    rAssignments();
    toastUndo(`"${a.title}" deleted`, () => {
      DB.s('assignments', [...DB.g('assignments'), a]);
      rAssignments();
    });
  }));
}
