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
    return `<tr>
      <td><div style="display:flex;align-items:center;gap:8px">
        <div class="av ${avCls(i)}">${esc(s.fn[0])}${esc((s.ln || '')[0] || '')}</div>
        <div class="bold">${esc(s.fn)} ${esc(s.ln)}</div>
      </div></td>
      <td class="mono text3" style="font-size:11px">${stuId(s.id)}</td>
      <td>${esc(s.dept)}</td>
      <td>Yr ${esc(s.yr)}</td>
      <td>${g ? gChip(grade(g.marks)) : '<span class="text4">—</span>'}</td>
      <td>${a ? progBar(pct(a.pres, a.tot)) : '<span class="text4">—</span>'}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="6"><div class="empty"><p>No students enrolled</p></div></td></tr>`;
}

// ═══════════════════════════════════════════
//  GRADE ENTRY
// ═══════════════════════════════════════════
function rGradeEntry() {
  const user = State.getUser();
  const mc   = DB.g('courses').filter(c => c.fid === user.lid);
  const sel  = $('gesel');
  if (sel && !sel.innerHTML.trim()) {
    sel.innerHTML = mc.map(c => `<option value="${c.id}">${esc(c.code)} — ${esc(c.name)}</option>`).join('');
  }
  rGradeRows();
}

function rGradeRows() {
  const cid  = parseInt($('gesel')?.value);
  if (!cid) return;
  const enrs = DB.g('enrollments').filter(e => e.cid === cid);
  const cgs  = DB.g('grades').filter(g => g.cid === cid);

  // Bell curve: compute mean of existing marks
  const allMarks = cgs.map(g => g.marks);
  const mean     = allMarks.length ? allMarks.reduce((s, m) => s + m, 0) / allMarks.length : null;

  $('gebdy').innerHTML = enrs.map(e => {
    const s       = DB.g('students').find(x => x.id === e.sid);
    if (!s) return '';
    const g       = cgs.find(x => x.sid === e.sid);
    const curved  = mean && g ? Math.min(100, Math.round(g.marks + (100 - mean) * 0.1)) : null;
    return `<tr>
      <td><div class="bold">${esc(s.fn)} ${esc(s.ln)}</div></td>
      <td><input class="gc-inp" id="m${s.id}" type="number" min="0" max="100"
        value="${g ? g.marks : ''}" placeholder="—"
        oninput="updGradePreview(${s.id})"></td>
      <td id="gp${s.id}">${g ? gChip(grade(g.marks)) : '<span class="text4">—</span>'}</td>
      <td id="pp${s.id}" class="mono">${g ? gpa(g.marks).toFixed(1) : '—'}</td>
      <td class="text3" style="font-size:11px">${curved !== null ? `→ ${curved} (curved)` : ''}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="5"><div class="empty"><p>No students enrolled</p></div></td></tr>`;
}

function updGradePreview(sid) {
  const v = parseInt($('m' + sid)?.value);
  if (!isNaN(v) && v >= 0 && v <= 100) {
    $('gp' + sid).innerHTML  = gChip(grade(v));
    $('pp' + sid).textContent = gpa(v).toFixed(1);
  }
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
    if (i >= 0) gs[i].marks = m;
    else gs.push({ id: DB.nid(gs), sid: e.sid, cid, marks: m, sem: C.SEMESTER.CURRENT });
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
  const cid = parseInt($('gesel')?.value);
  const csv = prompt('Paste CSV (student_id,marks):\nExample:\n1,88\n2,74');
  if (!csv) return;
  const gs = DB.g('grades');
  let saved = 0;
  csv.trim().split('\n').forEach(row => {
    const [sidStr, marksStr] = row.split(',');
    const sid   = parseInt(sidStr?.trim());
    const marks = parseInt(marksStr?.trim());
    if (isNaN(sid) || isNaN(marks) || marks < 0 || marks > 100) return;
    const i = gs.findIndex(g => g.sid === sid && g.cid === cid);
    if (i >= 0) gs[i].marks = marks;
    else gs.push({ id: DB.nid(gs), sid, cid, marks, sem: C.SEMESTER.CURRENT });
    saved++;
  });
  DB.s('grades', gs);
  toast(`Imported ${saved} grade${saved !== 1 ? 's' : ''}`);
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
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" data-sid="${s.id}" checked
            style="width:14px;height:14px;accent-color:var(--blue)">
          <span class="text2" style="font-size:12px">Present</span>
        </label>
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="3"><div class="empty"><p>No students enrolled</p></div></td></tr>`;
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
    return `<tr>
      <td class="bold">${esc(a.title)}</td>
      <td class="mono" style="color:var(--blue)">${cc(a.cid)}</td>
      <td style="color:${overdue ? 'var(--red)' : ''}">${esc(a.due)}</td>
      <td class="mono">${a.marks}</td>
      <td class="mono">${a.wt}%</td>
      <td class="mono">${enr}</td>
      <td><button class="bico del" onclick="delAssign(${a.id})" title="Delete">✕</button></td>
    </tr>`;
  }).join('') || `<tr><td colspan="7"><div class="empty"><p>No assignments</p></div></td></tr>`;
}

function saveAssignment() {
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

  const as   = DB.g('assignments');
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
  confirmDlg(`Delete "${a.title}"?`, () => {
    DB.s('assignments', DB.g('assignments').filter(x => x.id !== id));
    addAudit('Assignment Deleted', a.title, State.getUser().u, 'var(--red)');
    rAssignments();
    toastUndo(`"${a.title}" deleted`, () => {
      DB.s('assignments', [...DB.g('assignments'), a]);
      rAssignments();
    });
  });
}
