// ════════════════════════════════════════════════════════
//  ADMIN  —  all administrator page render & action fns
// ════════════════════════════════════════════════════════
'use strict';

// Module-level UI state
let _clockInterval = null;
let _calDate       = new Date();
let _activeConv    = null;

// ═══════════════════════════════════════════
//  HELPERS (admin-local)
// ═══════════════════════════════════════════
function _deptOpts() {
  return DB.g('depts').map(d => `<option>${esc(d.name)}</option>`).join('');
}
function _facOpts() {
  const facs = DB.g('faculty');
  return facs.map(f => `<option value="${f.id}">${esc(f.fn)} ${esc(f.ln)}</option>`).join('');
}
function _stuOpts() {
  return DB.g('students').map(s => `<option value="${s.id}">${esc(s.fn)} ${esc(s.ln)}</option>`).join('');
}
function _courseOpts() {
  return DB.g('courses').map(c => `<option value="${c.id}">${esc(c.code)} — ${esc(c.name)}</option>`).join('');
}

// ═══════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════
function rDash() {
  const students = DB.g('students'), courses = DB.g('courses'),
        enrolls  = DB.g('enrollments'), fees = DB.g('fees');
  const rev = fees.filter(f => f.status === 'Paid').reduce((s, f) => s + Number(f.amt), 0);

  const now = new Date();
  const dd = $('dash-date');
  if (dd) dd.textContent = now.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  clearInterval(_clockInterval);
  const tick = () => { const el = $('dash-time'); if (el) el.textContent = new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', second:'2-digit' }); };
  tick();
  _clockInterval = setInterval(tick, 1000);

  $('astats').innerHTML = `
    <div class="stat"><div class="stat-top"><span class="stat-lbl">Total Students</span><div class="stat-ico" style="background:var(--blue-d)">👤</div></div><div class="stat-val">${students.length}</div><div class="stat-meta">${students.filter(s => s.status === 'Active').length} active</div></div>
    <div class="stat"><div class="stat-top"><span class="stat-lbl">Courses</span><div class="stat-ico" style="background:var(--purple-d)">📚</div></div><div class="stat-val">${courses.length}</div><div class="stat-meta">${esc(C.SEMESTER.CURRENT)}</div></div>
    <div class="stat"><div class="stat-top"><span class="stat-lbl">Enrollments</span><div class="stat-ico" style="background:var(--green-d)">✓</div></div><div class="stat-val">${enrolls.length}</div><div class="stat-meta">Active semester</div></div>
    <div class="stat"><div class="stat-top"><span class="stat-lbl">Fee Revenue</span><div class="stat-ico" style="background:var(--amber-d)">$</div></div><div class="stat-val">${usd(rev)}</div><div class="stat-meta stat-up">Collected</div></div>`;

  Charts.bar('ch-enroll',
    ['Jul','Aug','Sep','Oct','Nov','Dec'],
    [{ label:'Enrollments', data:[8,22,35,45,51,enrolls.length], backgroundColor:'rgba(59,130,246,0.6)', borderRadius:4 }],
    { plugins:{ legend:{ display:false } } }
  );

  const grades = DB.g('grades');
  const dist = { A:0, B:0, C:0, D:0, F:0 };
  grades.forEach(g => dist[grade(g.marks)]++);
  Charts.doughnut('ch-grade', Object.keys(dist), Object.values(dist), Charts.P.grade, { plugins:{ legend:{ position:'right' } } });

  const paid = fees.filter(f => f.status === 'Paid').reduce((s, f)   => s + Number(f.amt), 0);
  const pend = fees.filter(f => f.status === 'Pending').reduce((s, f) => s + Number(f.amt), 0);
  const ovrd = fees.filter(f => f.status === 'Overdue').reduce((s, f) => s + Number(f.amt), 0);
  Charts.pie('ch-fee', ['Paid','Pending','Overdue'], [paid, pend, ovrd], Charts.P.fee, { plugins:{ legend:{ position:'right' } } });

  // At-risk students
  const risk = [];
  students.forEach(s => {
    const g   = stuGPA(s.id);
    const att = DB.g('attendance').filter(a => a.sid === s.id);
    const avg = att.length ? att.reduce((t, a) => t + pct(a.pres, a.tot), 0) / att.length : 100;
    if ((g !== null && g < 2.0) || avg < 60) risk.push({ ...s, gpa: g, att: Math.round(avg) });
  });
  $('risk-count').textContent = risk.length;
  $('risk-tbl').innerHTML = `<thead><tr><th>Student</th><th>GPA</th><th>Att%</th></tr></thead><tbody>${
    risk.map(s => `<tr><td>${esc(s.fn)} ${esc(s.ln)}</td><td class="mono">${s.gpa !== null ? s.gpa.toFixed(2) : '—'}</td><td class="mono">${s.att}%</td></tr>`).join('')
    || '<tr><td colspan="3"><div class="empty"><p>No at-risk students</p></div></td></tr>'
  }</tbody>`;

  // Recent activity
  const audit = DB.g('audit').slice(0, 8);
  $('recent-act').innerHTML = audit.map(a => `
    <div class="alog-item">
      <div class="alog-dot" style="background:${a.color}"></div>
      <div class="alog-body"><div class="alog-action">${esc(a.action)}</div><div class="alog-detail">${esc(a.detail)}</div></div>
      <div class="alog-time">${timeAgo(a.ts)}</div>
    </div>`).join('');
}

// ═══════════════════════════════════════════
//  STUDENTS
// ═══════════════════════════════════════════
function rStudents() {
  let sts = DB.g('students');
  const q  = ($('ss')?.value  || '').toLowerCase();
  const df = $('sd')?.value   || '';
  const yf = $('sy')?.value   || '';
  const sf = $('sst')?.value  || '';

  // Populate dept filter
  const depts = [...new Set(sts.map(s => s.dept))];
  const ds = $('sd');
  if (ds) { const cv = ds.value; ds.innerHTML = '<option value="">All Departments</option>' + depts.map(d => `<option${d === cv ? ' selected' : ''}>${esc(d)}</option>`).join(''); }

  sts = sts.filter(s =>
    (s.fn + ' ' + s.ln + ' ' + s.em).toLowerCase().includes(q) &&
    (!df || s.dept === df) && (!yf || s.yr === yf) && (!sf || s.status === sf)
  );

  const sc = $('sc'); if (sc) sc.textContent = sts.length + ' students';
  const enrolls = DB.g('enrollments'), att = DB.g('attendance');

  $('stbody').innerHTML = sts.map((s, i) => {
    const g      = stuGPA(s.id);
    const enrCnt = enrolls.filter(e => e.sid === s.id).length;
    const satt   = att.filter(a => a.sid === s.id);
    const avgAtt = satt.length ? satt.reduce((t, a) => t + pct(a.pres, a.tot), 0) / satt.length : 100;
    const atRisk = (g !== null && g < 2) || avgAtt < 60;
    return `<tr data-id="${s.id}">
      <td><div style="display:flex;align-items:center;gap:8px">
        <div class="av ${avCls(i)}">${esc(s.fn[0])}${esc((s.ln || '')[0] || '')}</div>
        <div><div class="bold">${esc(s.fn)} ${esc(s.ln)}</div><div class="text4" style="font-size:11px">${esc(s.em)}</div></div>
      </div></td>
      <td class="mono text3" style="font-size:11px">${stuId(s.id)}</td>
      <td>${esc(s.dept)}</td>
      <td>Yr ${esc(s.yr)}</td>
      <td class="text2" style="font-size:11px">${esc(s.ph)}</td>
      <td><span class="bx ${s.status === 'Active' ? 'bx-gr' : s.status === 'Alumni' ? 'bx-bl' : 'bx-gy'}">${esc(s.status)}</span></td>
      <td class="mono">${enrCnt}</td>
      <td class="mono">${g !== null ? g.toFixed(2) : '—'}</td>
      <td>${atRisk ? '<span class="bx bx-rd">At risk</span>' : ''}</td>
      <td><div style="display:flex;gap:3px">
        <button class="bico" onclick="editStudent(${s.id})" title="Edit">✎</button>
        <button class="bico del" onclick="delStudent(${s.id})" title="Delete">✕</button>
      </div></td>
    </tr>`;
  }).join('') || `<tr><td colspan="10"><div class="empty"><p>No students found</p></div></td></tr>`;
}

function editStudent(id) {
  const s = DB.g('students').find(x => x.id === id);
  if (!s) return;
  $('mst-title').textContent = 'Edit Student';
  $('mst-id').value = id;
  ['fn','ln','em','ph','dob','addr','adm'].forEach(k => { const el = $('mst-' + k); if (el) el.value = s[k] || ''; });
  $('mst-dept').value = s.dept; $('mst-yr').value = s.yr; $('mst-st').value = s.status;
  openM('m-student');
}

function saveStudent() {
  const id = parseInt($('mst-id').value) || null;
  const d = {
    fn: $('mst-fn').value.trim(), ln: $('mst-ln').value.trim(),
    em: $('mst-em').value.trim(), ph: $('mst-ph').value.trim(),
    dob: $('mst-dob').value, dept: $('mst-dept').value,
    yr: $('mst-yr').value, status: $('mst-st').value,
    addr: $('mst-addr').value.trim(), adm: $('mst-adm').value,
  };
  if (!d.fn || !d.em) { toast('First name and email are required', false); return; }

  const sts = DB.g('students');
  const user = State.getUser();
  let savedId;
  if (id) {
    const i = sts.findIndex(x => x.id === id);
    sts[i] = { ...sts[i], ...d };
    savedId = id;
    toast('Student updated');
    addAudit('Student Updated', `${d.fn} ${d.ln} record updated`, user.u, 'var(--blue)');
  } else {
    savedId = DB.nid(sts);
    sts.push({ id: savedId, ...d });
    toast('Student added');
    addAudit('Student Added', `${d.fn} ${d.ln} added to system`, user.u, 'var(--green)');
  }
  DB.s('students', sts);
  clearDraft('m-student');
  closeM('m-student');
  rStudents();
  flashRow('stbody', savedId);
}

function delStudent(id) {
  const s = DB.g('students').find(x => x.id === id);
  if (!s) return;
  const relKeys = ['enrollments','grades','attendance','fees','leaves','submissions'];
  const counts = { enrollments: DB.g('enrollments').filter(e => e.sid === id).length, grades: DB.g('grades').filter(g => g.sid === id).length, fees: DB.g('fees').filter(f => f.sid === id).length };
  const cascade = Object.entries(counts).filter(([,n]) => n > 0).map(([k,n]) => `${n} ${k}`).join(', ');
  const msg = `Delete ${s.fn} ${s.ln}?${cascade ? ` This will also remove ${cascade}.` : ''}`;
  confirmDlg(msg, () => {
    const snapshot = { student: s };
    relKeys.forEach(k => { snapshot[k] = DB.g(k).filter(x => x.sid === id); });
    DB.s('students', DB.g('students').filter(x => x.id !== id));
    relKeys.forEach(k => DB.s(k, DB.g(k).filter(x => x.sid !== id)));
    addAudit('Student Deleted', `${s.fn} ${s.ln} removed`, State.getUser().u, 'var(--red)');
    rStudents();
    toastUndo(`${s.fn} ${s.ln} deleted`, () => {
      DB.s('students', [...DB.g('students'), snapshot.student]);
      relKeys.forEach(k => { if (snapshot[k].length) DB.s(k, [...DB.g(k), ...snapshot[k]]); });
      addAudit('Student Restore', `${s.fn} ${s.ln} deletion undone`, State.getUser().u, 'var(--green)');
      rStudents();
    });
  });
}

function importStudentsCSV() {
  const csv = prompt('Paste CSV (fn,ln,email,dept,year):\nExample: John,Doe,j.doe@uni.edu,Computer Science,1');
  if (!csv) return;
  const sts = DB.g('students');
  let added = 0;
  csv.trim().split('\n').forEach(row => {
    const [fn, ln, em, dept, yr] = row.split(',').map(x => x.trim());
    if (fn && em) {
      sts.push({ id: DB.nid(sts), fn, ln: ln || '', em, ph: '', dept: dept || 'Computer Science', yr: yr || '1', dob: '', status: 'Active', addr: '', adm: new Date().getFullYear().toString() });
      added++;
    }
  });
  DB.s('students', sts);
  toast(`Imported ${added} student${added !== 1 ? 's' : ''}`);
  addAudit('CSV Import', `${added} students imported`, State.getUser().u, 'var(--purple)');
  rStudents();
}

// ═══════════════════════════════════════════
//  FACULTY
// ═══════════════════════════════════════════
function rFaculty() {
  const q    = ($('fs')?.value || '').toLowerCase();
  const facs = DB.g('faculty').filter(f => (f.fn + ' ' + f.ln).toLowerCase().includes(q));

  $('ftbody').innerHTML = facs.map((f, i) => {
    const cs = DB.g('courses').filter(c => c.fid === f.id);
    const ss = new Set(DB.g('enrollments').filter(e => cs.find(c => c.id === e.cid)).map(e => e.sid));
    return `<tr data-id="${f.id}">
      <td><div style="display:flex;align-items:center;gap:8px">
        <div class="av ${avCls(i)}">${esc(f.fn[0])}${esc((f.ln || '')[0] || '')}</div>
        <div><div class="bold">${esc(f.fn)} ${esc(f.ln)}</div><div class="text4" style="font-size:11px">${esc(f.em)}</div></div>
      </div></td>
      <td class="mono text3" style="font-size:11px">${facId(f.id)}</td>
      <td>${esc(f.dept)}</td>
      <td><span class="bx bx-gy">${esc(f.qual)}</span></td>
      <td class="mono">${cs.length}</td>
      <td class="mono">${ss.size}</td>
      <td><div style="display:flex;gap:3px">
        <button class="bico" onclick="editFaculty(${f.id})" title="Edit">✎</button>
        <button class="bico del" onclick="delFaculty(${f.id})" title="Delete">✕</button>
      </div></td>
    </tr>`;
  }).join('') || `<tr><td colspan="7"><div class="empty"><p>No faculty found</p></div></td></tr>`;
}

function editFaculty(id) {
  const f = DB.g('faculty').find(x => x.id === id);
  if (!f) return;
  $('mf-title').textContent = 'Edit Faculty'; $('mf-id').value = id;
  ['fn','ln','em','ph','qual','spec'].forEach(k => { const el = $('mf-' + k); if (el) el.value = f[k] || ''; });
  $('mf-dept').value = f.dept;
  openM('m-faculty');
}

function saveFaculty() {
  const id = parseInt($('mf-id').value) || null;
  const d = {
    fn: $('mf-fn').value.trim(), ln: $('mf-ln').value.trim(),
    em: $('mf-em').value.trim(), dept: $('mf-dept').value,
    qual: $('mf-qual').value.trim(), spec: $('mf-spec').value.trim(),
    ph: $('mf-ph').value.trim(),
  };
  if (!d.fn) { toast('First name required', false); return; }

  const facs = DB.g('faculty');
  const user = State.getUser();
  let savedId;
  if (id) {
    const i = facs.findIndex(x => x.id === id);
    facs[i] = { ...facs[i], ...d };
    savedId = id;
    toast('Faculty updated');
    addAudit('Faculty Updated', `${d.fn} ${d.ln} record updated`, user.u, 'var(--blue)');
  } else {
    savedId = DB.nid(facs);
    facs.push({ id: savedId, ...d, join: new Date().getFullYear().toString() });
    toast('Faculty added');
    addAudit('Faculty Added', `${d.fn} ${d.ln}`, user.u, 'var(--green)');
  }
  DB.s('faculty', facs);
  clearDraft('m-faculty');
  closeM('m-faculty');
  rFaculty();
  flashRow('ftbody', savedId);
}

function delFaculty(id) {
  const f = DB.g('faculty').find(x => x.id === id);
  if (!f) return;
  const courseCount = DB.g('courses').filter(c => c.fid === id).length;
  const suffix = courseCount ? ` They are assigned to ${courseCount} course${courseCount !== 1 ? 's' : ''}.` : '';
  confirmDlg(`Delete ${f.fn} ${f.ln}?${suffix}`, () => {
    DB.s('faculty', DB.g('faculty').filter(x => x.id !== id));
    addAudit('Faculty Deleted', `${f.fn} ${f.ln} removed`, State.getUser().u, 'var(--red)');
    rFaculty();
    toastUndo(`${f.fn} ${f.ln} deleted`, () => {
      DB.s('faculty', [...DB.g('faculty'), f]);
      addAudit('Faculty Restore', `${f.fn} ${f.ln} deletion undone`, State.getUser().u, 'var(--green)');
      rFaculty();
    });
  });
}

// ═══════════════════════════════════════════
//  DEPARTMENTS
// ═══════════════════════════════════════════
function rDepts() {
  const depts    = DB.g('depts');
  const students = DB.g('students');
  const courses  = DB.g('courses');

  // Populate HOD dropdown
  const hod = $('mdept-hod');
  if (hod) hod.innerHTML = _facOpts();

  $('dept-grid').innerHTML = depts.map((d, i) => {
    const color = C.DEPT_COLORS[i % C.DEPT_COLORS.length];
    return `<div class="dept-card" style="position:relative;overflow:hidden">
      <div style="position:absolute;top:0;left:0;right:0;height:2px;background:${color}"></div>
      <div style="margin-bottom:12px"><span class="bx bx-gy mono">${esc(d.code)}</span></div>
      <div style="font-size:15px;font-weight:600;margin-bottom:4px">${esc(d.name)}</div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:14px">HOD: ${fn(d.hod)}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
        <div style="background:var(--bg2);padding:8px;border-radius:6px;text-align:center">
          <div class="mono" style="font-size:16px;font-weight:600">${students.filter(s => s.dept === d.name).length}</div>
          <div class="text4" style="font-size:10px">Students</div>
        </div>
        <div style="background:var(--bg2);padding:8px;border-radius:6px;text-align:center">
          <div class="mono" style="font-size:16px;font-weight:600">${courses.filter(c => c.dept === d.name).length}</div>
          <div class="text4" style="font-size:10px">Courses</div>
        </div>
      </div>
      <div style="font-size:11px;color:var(--text3)">Budget: <span class="mono">${usd(d.budget)}</span></div>
      <button class="bico del" style="position:absolute;top:12px;right:12px" onclick="delDept(${d.id})" title="Delete">✕</button>
    </div>`;
  }).join('');
}

function saveDept() {
  const depts = DB.g('depts');
  depts.push({
    id: DB.nid(depts),
    name: $('mdept-n').value.trim(),
    code: $('mdept-c').value.trim().toUpperCase(),
    hod:  parseInt($('mdept-hod').value) || 1,
    budget: parseFloat($('mdept-b').value) || 0,
  });
  DB.s('depts', depts);
  closeM('m-dept');
  toast('Department added');
  rDepts();
}

function delDept(id) {
  const d = DB.g('depts').find(x => x.id === id);
  if (!d) return;
  confirmDlg(`Delete ${d.name} department?`, () => {
    DB.s('depts', DB.g('depts').filter(x => x.id !== id));
    addAudit('Department Deleted', d.name, State.getUser().u, 'var(--red)');
    rDepts();
    toastUndo(`${d.name} department deleted`, () => {
      DB.s('depts', [...DB.g('depts'), d]);
      rDepts();
    });
  });
}

// ═══════════════════════════════════════════
//  COURSES
// ═══════════════════════════════════════════
function rCourses() {
  const q   = ($('cs')?.value || '').toLowerCase();
  const fac = $('mco-fac');
  if (fac) fac.innerHTML = _facOpts();

  const cs = DB.g('courses').filter(c => (c.code + ' ' + c.name).toLowerCase().includes(q));
  $('ctbody').innerHTML = cs.map(c => {
    const enr = DB.g('enrollments').filter(e => e.cid === c.id).length;
    const pf  = c.seats ? Math.round(enr / c.seats * 100) : 0;
    return `<tr data-id="${c.id}">
      <td class="mono" style="color:var(--blue);font-weight:500">${esc(c.code)}</td>
      <td><div class="bold">${esc(c.name)}</div><div class="text4" style="font-size:11px">${esc(c.desc)}</div></td>
      <td>${esc(c.dept)}</td>
      <td class="text2">${fn(c.fid)}</td>
      <td class="mono">${c.cr}</td>
      <td><div style="display:flex;align-items:center;gap:6px">
        <div class="prog"><div class="pf" style="width:${pf}%;background:${pf > 85 ? 'var(--red)' : pf > 60 ? 'var(--amber)' : 'var(--blue)'}"></div></div>
        <span class="mono text2" style="font-size:11px">${enr}/${c.seats}</span>
      </div></td>
      <td><div style="display:flex;gap:3px">
        <button class="bico" onclick="editCourse(${c.id})" title="Edit">✎</button>
        <button class="bico del" onclick="delCourse(${c.id})" title="Delete">✕</button>
      </div></td>
    </tr>`;
  }).join('') || `<tr><td colspan="7"><div class="empty"><p>No courses found</p></div></td></tr>`;
}

function editCourse(id) {
  const c = DB.g('courses').find(x => x.id === id);
  if (!c) return;
  $('mc-title').textContent = 'Edit Course'; $('mco-id').value = id;
  ['code','name','desc'].forEach(k => { const el = $('mco-' + k); if (el) el.value = c[k] || ''; });
  $('mco-dept').value  = c.dept;
  $('mco-cr').value    = c.cr;
  $('mco-seats').value = c.seats;
  $('mco-fac').value   = c.fid;
  $('mco-sem').value   = c.sem;
  openM('m-course');
}

function saveCourse() {
  const id = parseInt($('mco-id').value) || null;
  const d = {
    code:  $('mco-code').value.trim().toUpperCase(),
    name:  $('mco-name').value.trim(),
    dept:  $('mco-dept').value,
    fid:   parseInt($('mco-fac').value),
    cr:    parseInt($('mco-cr').value),
    seats: parseInt($('mco-seats').value),
    sem:   $('mco-sem').value,
    desc:  $('mco-desc').value.trim(),
    prereqs: [], schedule: { days:[], start:'', end:'' },
  };
  if (!d.code || !d.name) { toast('Code and name required', false); return; }

  const cs   = DB.g('courses');
  const user = State.getUser();
  let savedId;
  if (id) {
    const i = cs.findIndex(x => x.id === id);
    cs[i] = { ...cs[i], ...d };
    savedId = id;
    toast('Course updated');
    addAudit('Course Updated', `${d.code} — ${d.name}`, user.u, 'var(--blue)');
  } else {
    savedId = DB.nid(cs);
    cs.push({ id: savedId, ...d });
    toast('Course added');
    addAudit('Course Added', `${d.code} — ${d.name}`, user.u, 'var(--purple)');
  }
  DB.s('courses', cs);
  clearDraft('m-course');
  closeM('m-course');
  rCourses();
  flashRow('ctbody', savedId);
}

function delCourse(id) {
  const c = DB.g('courses').find(x => x.id === id);
  if (!c) return;
  const enrCount   = DB.g('enrollments').filter(e => e.cid === id).length;
  const gradeCount = DB.g('grades').filter(g => g.cid === id).length;
  const parts = [enrCount && `${enrCount} enrollment${enrCount !== 1 ? 's' : ''}`, gradeCount && `${gradeCount} grade${gradeCount !== 1 ? 's' : ''}`].filter(Boolean).join(', ');
  const msg = `Delete ${c.code} — ${c.name}?${parts ? ` This will also remove ${parts}.` : ''}`;
  confirmDlg(msg, () => {
    const snapshot = { course: c, enrollments: DB.g('enrollments').filter(e => e.cid === id), grades: DB.g('grades').filter(g => g.cid === id) };
    DB.s('courses', DB.g('courses').filter(x => x.id !== id));
    DB.s('enrollments', DB.g('enrollments').filter(e => e.cid !== id));
    DB.s('grades', DB.g('grades').filter(g => g.cid !== id));
    addAudit('Course Deleted', `${c.code} — ${c.name}`, State.getUser().u, 'var(--red)');
    rCourses();
    toastUndo(`${c.code} deleted`, () => {
      DB.s('courses', [...DB.g('courses'), snapshot.course]);
      if (snapshot.enrollments.length) DB.s('enrollments', [...DB.g('enrollments'), ...snapshot.enrollments]);
      if (snapshot.grades.length) DB.s('grades', [...DB.g('grades'), ...snapshot.grades]);
      addAudit('Course Restore', `${c.code} deletion undone`, State.getUser().u, 'var(--green)');
      rCourses();
    });
  });
}

// ═══════════════════════════════════════════
//  ENROLLMENT
// ═══════════════════════════════════════════
function rEnroll() {
  const cs   = DB.g('courses');
  const enrs = DB.g('enrollments');
  const cf   = $('ef')?.value  || '';
  const sf   = $('esf')?.value || '';

  const sems = [...new Set(enrs.map(e => e.sem))];
  const ef = $('ef');
  if (ef) ef.innerHTML = '<option value="">All Courses</option>' + cs.map(c => `<option value="${c.id}"${String(c.id) === cf ? ' selected' : ''}>${esc(c.code)} — ${esc(c.name)}</option>`).join('');
  const esf = $('esf');
  if (esf) esf.innerHTML = '<option value="">All Semesters</option>' + sems.map(s => `<option${s === sf ? ' selected' : ''}>${esc(s)}</option>`).join('');

  const filtered = enrs.filter(e => (!cf || String(e.cid) === cf) && (!sf || e.sem === sf));
  $('enbody').innerHTML = filtered.map(e => {
    const c = cs.find(x => x.id === e.cid);
    return `<tr>
      <td>${sn(e.sid)}</td>
      <td><span class="mono" style="color:var(--blue)">${cc(e.cid)}</span> ${cn(e.cid)}</td>
      <td class="text2">${c ? fn(c.fid) : '—'}</td>
      <td><span class="bx bx-gy">${esc(e.sem)}</span></td>
      <td><span class="bx bx-gr">${esc(e.status)}</span></td>
      <td><button class="bico del" onclick="delEnr(${e.id})" title="Remove">✕</button></td>
    </tr>`;
  }).join('') || `<tr><td colspan="6"><div class="empty"><p>No enrollments found</p></div></td></tr>`;
}

function openEnrollModal() {
  $('men-stu').innerHTML = _stuOpts();
  $('men-co').innerHTML  = _courseOpts();
  openM('m-enroll');
}

function saveEnroll() {
  const sid = parseInt($('men-stu').value);
  const cid = parseInt($('men-co').value);
  const sem = $('men-sem').value;
  const enrs = DB.g('enrollments');
  if (enrs.find(e => e.sid === sid && e.cid === cid)) { toast('Already enrolled', false); return; }
  enrs.push({ id: DB.nid(enrs), sid, cid, sem, status: 'Active' });
  DB.s('enrollments', enrs);
  toast('Student enrolled');
  addAudit('Enrollment Added', `${sn(sid)} → ${cn(cid)}`, State.getUser().u, 'var(--green)');
  closeM('m-enroll');
  rEnroll();
}

function delEnr(id) {
  const e = DB.g('enrollments').find(x => x.id === id);
  if (!e) return;
  confirmDlg(`Remove ${sn(e.sid)} from ${cn(e.cid)}?`, () => {
    DB.s('enrollments', DB.g('enrollments').filter(x => x.id !== id));
    addAudit('Enrollment Removed', `${sn(e.sid)} from ${cn(e.cid)}`, State.getUser().u, 'var(--red)');
    rEnroll();
    toastUndo('Enrollment removed', () => {
      DB.s('enrollments', [...DB.g('enrollments'), e]);
      rEnroll();
    });
  });
}

// ═══════════════════════════════════════════
//  GRADES (admin view)
// ═══════════════════════════════════════════
function rGradesA() {
  const cs  = DB.g('courses');
  const cf  = $('gaf')?.value || '';
  const gf  = $('ggf')?.value || '';
  const gaf = $('gaf');
  if (gaf) gaf.innerHTML = '<option value="">All Courses</option>' + cs.map(c => `<option value="${c.id}"${String(c.id) === cf ? ' selected' : ''}>${esc(c.name)}</option>`).join('');

  const gs = DB.g('grades').filter(g => (!cf || String(g.cid) === cf) && (!gf || grade(g.marks) === gf));
  $('grabody').innerHTML = gs.map(g => {
    const gr = grade(g.marks);
    return `<tr>
      <td>${sn(g.sid)}</td>
      <td><span class="mono" style="color:var(--blue)">${cc(g.cid)}</span> ${cn(g.cid)}</td>
      <td class="mono">${g.marks}<span class="text4">/100</span></td>
      <td>${gChip(gr)}</td>
      <td class="mono">${gpa(g.marks).toFixed(1)}</td>
      <td><span class="bx bx-gy">${esc(g.sem)}</span></td>
      <td><span class="bx ${gr === 'F' ? 'bx-rd' : 'bx-gr'}">${gr === 'F' ? 'Fail' : 'Pass'}</span></td>
    </tr>`;
  }).join('') || `<tr><td colspan="7"><div class="empty"><p>No grades found</p></div></td></tr>`;
}

// ═══════════════════════════════════════════
//  ATTENDANCE (admin view)
// ═══════════════════════════════════════════
function rAttA() {
  const cs  = DB.g('courses');
  const cf  = $('aaf')?.value || '';
  const aaf = $('aaf');
  if (aaf) aaf.innerHTML = '<option value="">All Courses</option>' + cs.map(c => `<option value="${c.id}"${String(c.id) === cf ? ' selected' : ''}>${esc(c.name)}</option>`).join('');

  const att = DB.g('attendance').filter(a => !cf || String(a.cid) === cf);
  $('attabody').innerHTML = att.map(a => {
    const p = pct(a.pres, a.tot);
    return `<tr>
      <td>${sn(a.sid)}</td>
      <td class="mono" style="color:var(--blue)">${cc(a.cid)}</td>
      <td class="mono">${a.pres}/${a.tot}</td>
      <td>${progBar(p)}</td>
      <td><span class="bx ${p >= 75 ? 'bx-gr' : p >= 60 ? 'bx-am' : 'bx-rd'}">${p >= 75 ? 'Good' : p >= 60 ? 'Warning' : 'Low'}</span></td>
    </tr>`;
  }).join('') || `<tr><td colspan="5"><div class="empty"><p>No attendance data</p></div></td></tr>`;
}

// ═══════════════════════════════════════════
//  EXAMS
// ═══════════════════════════════════════════
function rExams() {
  const mex = $('mex-co');
  if (mex) mex.innerHTML = _courseOpts();

  const exams = DB.g('exams').sort((a, b) => a.date.localeCompare(b.date));
  $('examtbl').innerHTML = exams.map(e => {
    const enr = DB.g('enrollments').filter(x => x.cid === e.cid).length;
    return `<tr>
      <td><span class="mono" style="color:var(--blue)">${cc(e.cid)}</span> ${cn(e.cid)}</td>
      <td>${esc(e.date)}</td>
      <td>${esc(e.time)}</td>
      <td><span class="bx bx-gy">${esc(e.hall)}</span></td>
      <td class="mono">${e.dur} min</td>
      <td class="mono">${enr}</td>
      <td><button class="bico del" onclick="delExam(${e.id})" title="Delete">✕</button></td>
    </tr>`;
  }).join('') || `<tr><td colspan="7"><div class="empty"><p>No exams scheduled</p></div></td></tr>`;
}

function saveExam() {
  const cid  = parseInt($('mex-co').value);
  const date = $('mex-date').value;
  const time = $('mex-time').value;
  const hall = $('mex-hall').value.trim();
  const dur  = parseInt($('mex-dur').value);
  if (!date || !hall) { toast('Date and hall required', false); return; }

  const exams = DB.g('exams');
  exams.push({ id: DB.nid(exams), cid, date, time, hall, dur });
  DB.s('exams', exams);
  toast('Exam scheduled');
  addAudit('Exam Scheduled', `${cc(cid)} on ${date}`, State.getUser().u, 'var(--teal)');
  closeM('m-exam');
  rExams();
}

function delExam(id) {
  const e = DB.g('exams').find(x => x.id === id);
  if (!e) return;
  confirmDlg(`Delete ${cc(e.cid)} exam on ${e.date}?`, () => {
    DB.s('exams', DB.g('exams').filter(x => x.id !== id));
    addAudit('Exam Deleted', `${cc(e.cid)} exam on ${e.date}`, State.getUser().u, 'var(--red)');
    rExams();
    toastUndo(`${cc(e.cid)} exam deleted`, () => {
      DB.s('exams', [...DB.g('exams'), e]);
      rExams();
    });
  });
}

// ═══════════════════════════════════════════
//  LEAVE REQUESTS  (admin + faculty)
// ═══════════════════════════════════════════
function rLeaves() {
  const user    = State.getUser();
  const leaves  = DB.g('leaves');
  const pending = leaves.filter(l => l.status === 'Pending');
  const decided = leaves.filter(l => l.status !== 'Pending');
  const isAdmin = user.role !== 'student';

  const card = (l, actions) => `<div class="leave-item">
    <div class="leave-top">
      <div><span class="bold">${sn(l.sid)}</span> <span class="text3">— ${cc(l.cid)}</span></div>
      <span class="bx ${l.status === 'Approved' ? 'bx-gr' : l.status === 'Rejected' ? 'bx-rd' : 'bx-am'}">${esc(l.status)}</span>
    </div>
    <div class="text2" style="font-size:12px;margin-bottom:4px">${esc(l.from)} to ${esc(l.to)}</div>
    <div class="text3" style="font-size:11px;margin-bottom:${actions ? '10px' : '0'}">${esc(l.reason)}</div>
    ${actions ? `<div style="display:flex;gap:6px">
      <button class="btn btn-g" style="font-size:11px;padding:4px 10px" onclick="decideLeave(${l.id},'Approved')">Approve</button>
      <button class="btn btn-dg" style="font-size:11px;padding:4px 10px" onclick="decideLeave(${l.id},'Rejected')">Reject</button>
    </div>` : ''}
  </div>`;

  $('leaves-pending').innerHTML = pending.map(l => card(l, isAdmin)).join('')
    || '<div class="text3" style="font-size:12px;padding:12px">No pending requests</div>';
  $('leaves-decided').innerHTML = decided.map(l => card(l, false)).join('')
    || '<div class="text3" style="font-size:12px;padding:12px">No decisions yet</div>';
}

function decideLeave(id, status) {
  const leaves = DB.g('leaves');
  const i = leaves.findIndex(x => x.id === id);
  if (i >= 0) { leaves[i].status = status; DB.s('leaves', leaves); }
  toast(`Leave ${status.toLowerCase()}`);
  addAudit('Leave ' + status, `Leave #${id} ${status.toLowerCase()}`, State.getUser().u, status === 'Approved' ? 'var(--green)' : 'var(--red)');
  rLeaves();
}

// ═══════════════════════════════════════════
//  FEES
// ═══════════════════════════════════════════
function rFees() {
  const fs   = DB.g('fees');
  const tot  = fs.reduce((s, f) => s + Number(f.amt), 0);
  const col  = fs.filter(f => f.status === 'Paid').reduce((s, f)   => s + Number(f.amt), 0);
  const pend = fs.filter(f => f.status === 'Pending').reduce((s, f) => s + Number(f.amt), 0);
  const ovrd = fs.filter(f => f.status === 'Overdue').reduce((s, f) => s + Number(f.amt), 0);

  $('feestats').innerHTML = `
    <div class="stat"><div class="stat-top"><span class="stat-lbl">Total</span></div><div class="stat-val">${usd(tot)}</div></div>
    <div class="stat"><div class="stat-top"><span class="stat-lbl">Collected</span></div><div class="stat-val" style="color:var(--green)">${usd(col)}</div></div>
    <div class="stat"><div class="stat-top"><span class="stat-lbl">Pending</span></div><div class="stat-val" style="color:var(--amber)">${usd(pend)}</div></div>
    <div class="stat"><div class="stat-top"><span class="stat-lbl">Overdue</span></div><div class="stat-val" style="color:var(--red)">${usd(ovrd)}</div></div>`;

  // Populate modal student dropdown
  const mfe = $('mfe-stu');
  if (mfe) mfe.innerHTML = _stuOpts();
  const mfeDue = $('mfe-due');
  if (mfeDue && !mfeDue.value) mfeDue.value = today();

  const q  = ($('fes')?.value  || '').toLowerCase();
  const sf = $('fest')?.value || '';
  const filtered = fs.filter(f => sn(f.sid).toLowerCase().includes(q) && (!sf || f.status === sf));

  $('feebody').innerHTML = filtered.map(f => `<tr>
    <td>${sn(f.sid)}</td>
    <td>${esc(f.type)}</td>
    <td class="mono bold">${usd(f.amt)}</td>
    <td class="text3" style="font-size:11px">${esc(f.due)}</td>
    <td class="text3" style="font-size:11px">${esc(f.paid) || '—'}</td>
    <td><span class="bx ${f.status === 'Paid' ? 'bx-gr' : f.status === 'Pending' ? 'bx-am' : 'bx-rd'}">${esc(f.status)}</span></td>
    <td><button class="bico del" onclick="delFee(${f.id})" title="Delete">✕</button></td>
  </tr>`).join('') || `<tr><td colspan="7"><div class="empty"><p>No fee records</p></div></td></tr>`;
}

function saveFee() {
  const d = {
    sid:    parseInt($('mfe-stu').value),
    type:   $('mfe-type').value,
    amt:    parseFloat($('mfe-amt').value),
    due:    $('mfe-due').value,
    status: $('mfe-st').value,
    paid:   $('mfe-paid').value,
  };
  if (!d.amt || isNaN(d.amt)) { toast('Amount required', false); return; }
  const fs = DB.g('fees');
  fs.push({ id: DB.nid(fs), ...d });
  DB.s('fees', fs);
  toast('Fee recorded');
  addAudit('Fee Recorded', `${usd(d.amt)} for ${sn(d.sid)}`, State.getUser().u, 'var(--amber)');
  closeM('m-fee');
  rFees();
}

function delFee(id) {
  const f = DB.g('fees').find(x => x.id === id);
  if (!f) return;
  confirmDlg(`Delete ${esc(f.type)} fee (${usd(f.amt)}) for ${sn(f.sid)}?`, () => {
    DB.s('fees', DB.g('fees').filter(x => x.id !== id));
    addAudit('Fee Deleted', `${f.type} ${usd(f.amt)} for ${sn(f.sid)}`, State.getUser().u, 'var(--red)');
    rFees();
    toastUndo('Fee record deleted', () => {
      DB.s('fees', [...DB.g('fees'), f]);
      rFees();
    });
  });
}

// ═══════════════════════════════════════════
//  SCHOLARSHIPS
// ═══════════════════════════════════════════
function rScholarships() {
  const sc     = DB.g('scholarships');
  const total  = sc.reduce((s, x) => s + Number(x.amt), 0);
  const active = sc.filter(x => x.status === 'Active').length;

  $('schstats').innerHTML = `
    <div class="stat"><div class="stat-top"><span class="stat-lbl">Total</span></div><div class="stat-val">${sc.length}</div></div>
    <div class="stat"><div class="stat-top"><span class="stat-lbl">Active</span></div><div class="stat-val" style="color:var(--green)">${active}</div></div>
    <div class="stat"><div class="stat-top"><span class="stat-lbl">Total Amount</span></div><div class="stat-val">${usd(total)}</div></div>`;

  const msc = $('msc-stu');
  if (msc) msc.innerHTML = _stuOpts();

  $('schtbl').innerHTML = sc.map(s => `<tr>
    <td>${sn(s.sid)}</td>
    <td class="bold">${esc(s.name)}</td>
    <td class="mono">${usd(s.amt)}</td>
    <td class="text2" style="font-size:12px">${esc(s.crit)}</td>
    <td><span class="bx ${s.status === 'Active' ? 'bx-gr' : s.status === 'Pending' ? 'bx-am' : 'bx-gy'}">${esc(s.status)}</span></td>
    <td><button class="bico del" onclick="delSch(${s.id})" title="Delete">✕</button></td>
  </tr>`).join('') || `<tr><td colspan="6"><div class="empty"><p>No scholarships</p></div></td></tr>`;
}

function saveScholarship() {
  const d = {
    sid:    parseInt($('msc-stu').value),
    name:   $('msc-name').value.trim(),
    amt:    parseFloat($('msc-amt').value),
    crit:   $('msc-crit').value.trim(),
    status: $('msc-st').value,
  };
  if (!d.name) { toast('Scholarship name required', false); return; }
  const sc = DB.g('scholarships');
  sc.push({ id: DB.nid(sc), ...d });
  DB.s('scholarships', sc);
  toast('Scholarship added');
  closeM('m-scholarship');
  rScholarships();
}

function delSch(id) {
  const s = DB.g('scholarships').find(x => x.id === id);
  if (!s) return;
  confirmDlg(`Delete "${s.name}" scholarship?`, () => {
    DB.s('scholarships', DB.g('scholarships').filter(x => x.id !== id));
    addAudit('Scholarship Deleted', s.name, State.getUser().u, 'var(--red)');
    rScholarships();
    toastUndo(`"${s.name}" deleted`, () => {
      DB.s('scholarships', [...DB.g('scholarships'), s]);
      rScholarships();
    });
  });
}

// ═══════════════════════════════════════════
//  ANNOUNCEMENTS
// ═══════════════════════════════════════════
function rAnnouncements() {
  const anns = DB.g('announcements').sort((a, b) => b.id - a.id);
  const PRI_COLOR = { Normal:'var(--blue)', High:'var(--amber)', Urgent:'var(--red)' };
  $('ann-list').innerHTML = anns.map(a => `
    <div class="ann-item">
      <div class="ann-meta">
        <span class="bx bx-gy">${esc(a.aud)}</span>
        <span class="bx" style="background:${(PRI_COLOR[a.pri] || 'var(--blue)') + '22'};color:${PRI_COLOR[a.pri] || 'var(--blue)'};border-color:${(PRI_COLOR[a.pri] || 'var(--blue)') + '44'}">${esc(a.pri)}</span>
        <span class="text4" style="font-size:11px">${esc(a.date)} · ${esc(a.author)}</span>
      </div>
      <div class="ann-title">${esc(a.title)}</div>
      <div class="ann-body">${esc(a.body)}</div>
      <button class="bico del" style="margin-top:8px" onclick="delAnn(${a.id})">✕ Delete</button>
    </div>`).join('') || '<div class="empty"><p>No announcements</p></div>';
}

function saveAnn() {
  const user = State.getUser();
  const d = {
    id:     DB.nid(DB.g('announcements')),
    title:  $('mann-t').value.trim(),
    body:   $('mann-b').value.trim(),
    aud:    $('mann-aud').value,
    pri:    $('mann-pri').value,
    date:   today(),
    author: user.u,
  };
  if (!d.title) { toast('Title required', false); return; }

  const anns = DB.g('announcements');
  anns.push(d);
  DB.s('announcements', anns);

  // Notify relevant users
  DB.g('users').filter(u =>
    d.aud === 'All' ||
    (d.aud === 'Students' && u.role === 'student') ||
    (d.aud === 'Faculty'  && u.role === 'faculty')
  ).forEach(u => addNotif(u.id, 'New Announcement', d.title, 'announce'));

  toast('Announcement posted');
  addAudit('Announcement Posted', d.title, user.u, 'var(--blue)');
  closeM('m-ann');
  rAnnouncements();
}

function delAnn(id) {
  const a = DB.g('announcements').find(x => x.id === id);
  if (!a) return;
  confirmDlg(`Delete "${a.title}" announcement?`, () => {
    DB.s('announcements', DB.g('announcements').filter(x => x.id !== id));
    addAudit('Announcement Deleted', a.title, State.getUser().u, 'var(--red)');
    rAnnouncements();
    toastUndo(`"${a.title}" deleted`, () => {
      DB.s('announcements', [...DB.g('announcements'), a]);
      rAnnouncements();
    });
  });
}

// ═══════════════════════════════════════════
//  MESSAGES  (admin + faculty + student)
// ═══════════════════════════════════════════
function rMessages() {
  const user  = State.getUser();
  const msgs  = DB.g('messages');

  // Determine peer list based on role
  let peers;
  if (user.role === 'student') {
    peers = DB.g('faculty').map(f => ({ id: 'fac_' + f.id, name: f.fn + ' ' + f.ln, uid: f.id, role: 'faculty' }));
  } else if (user.role === 'faculty') {
    peers = DB.g('students').map(s => ({ id: 'stu_' + s.id, name: s.fn + ' ' + s.ln, uid: s.id, role: 'student' }));
  } else {
    // admin sees all users
    const facPeers = DB.g('faculty').map(f => ({ id: 'fac_' + f.id, name: f.fn + ' ' + f.ln, uid: f.id, role: 'faculty' }));
    const stuPeers = DB.g('students').map(s => ({ id: 'stu_' + s.id, name: s.fn + ' ' + s.ln, uid: s.id, role: 'student' }));
    peers = [...facPeers, ...stuPeers];
  }

  $('msg-list').innerHTML = peers.map(p => {
    const thread = msgs.filter(m =>
      (m.fromUid === user.id && m.toUid === p.uid) ||
      (m.toUid === user.id && m.fromUid === p.uid)
    );
    const last = thread[thread.length - 1];
    return `<div class="msg-item${_activeConv === p.id ? ' on' : ''}" onclick="openConv('${p.id}','${esc(p.name)}')">
      <div class="msg-name">${esc(p.name)}</div>
      <div class="msg-preview">${last ? esc(last.text) : 'No messages yet'}</div>
    </div>`;
  }).join('');

  if (_activeConv) renderConv(_activeConv);
}

function openConv(id, name) {
  _activeConv = id;
  $('msg-chathead').textContent = name;
  $$('.msg-item').forEach(m => m.classList.toggle('on', m.querySelector('.msg-name')?.textContent === name));
  renderConv(id);
}

function renderConv(pid) {
  const user = State.getUser();
  const parts = (pid || '').split('_');
  const peerUid = parseInt(parts[1]);
  const msgs = DB.g('messages').filter(m =>
    (m.fromUid === user.id && m.toUid === peerUid) ||
    (m.toUid === user.id && m.fromUid === peerUid)
  );
  $('msg-msgs').innerHTML = msgs.map(m => `
    <div class="msg-bubble ${m.fromUid === user.id ? 'me' : 'them'}">
      ${esc(m.text)}
      <div style="font-size:9px;opacity:.5;margin-top:3px;text-align:${m.fromUid === user.id ? 'right' : 'left'}">${timeAgo(m.ts)}</div>
    </div>`).join('');
  const mc = $('msg-msgs');
  if (mc) mc.scrollTop = mc.scrollHeight;
}

function sendMsg() {
  const user = State.getUser();
  const txt  = $('msg-inp')?.value.trim();
  if (!txt || !_activeConv) return;

  // Resolve peer UID from conv id (e.g. 'stu_3' or 'fac_2')
  const parts  = _activeConv.split('_');
  const peerUid = parseInt(parts[1]);

  const msgs = DB.g('messages');
  msgs.push({ id: DB.nid(msgs), fromUid: user.id, toUid: peerUid, from: user.u, text: txt, ts: Date.now() });
  DB.s('messages', msgs);
  $('msg-inp').value = '';
  renderConv(_activeConv);
}

// ═══════════════════════════════════════════
//  ACADEMIC CALENDAR
// ═══════════��═══════════════════════════════
function rCalendar() { _renderCal(); }

function calNav(d) { _calDate.setMonth(_calDate.getMonth() + d); _renderCal(); }

function _renderCal() {
  const y = _calDate.getFullYear(), m = _calDate.getMonth();
  $('cal-month-title').textContent = _calDate.toLocaleDateString('en-US', { month:'long', year:'numeric' });

  const first  = new Date(y, m, 1).getDay();
  const days   = new Date(y, m + 1, 0).getDate();
  const events = DB.g('events');
  const todt   = new Date();

  let html = '';
  ['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(d => html += `<div class="cal-day-lbl">${d}</div>`);
  for (let i = 0; i < first; i++) html += `<div class="cal-cell other-month"></div>`;

  for (let d = 1; d <= days; d++) {
    const dateStr = `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const evts    = events.filter(e => e.date === dateStr);
    const isToday = d === todt.getDate() && m === todt.getMonth() && y === todt.getFullYear();
    const isExam  = evts.some(e => e.type === 'Exam');
    const isHol   = evts.some(e => e.type === 'Holiday');
    html += `<div class="cal-cell${isToday?' today':''}${isExam?' exam-day':''}${isHol?' holiday':''}" title="${esc(evts.map(e => e.title).join(', '))}">${d}${evts.length ? '<div style="position:absolute;bottom:2px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:currentColor;opacity:.6"></div>' : ''}</div>`;
  }
  $('cal-grid').innerHTML = html;

  const prefix = `${y}-${String(m + 1).padStart(2,'0')}`;
  const curEvts = events.filter(e => e.date.startsWith(prefix));
  const TC = { Holiday:'var(--green)', Exam:'var(--red)', Event:'var(--blue)', Deadline:'var(--amber)', Meeting:'var(--purple)' };
  $('cal-events').innerHTML = curEvts.length
    ? curEvts.map(e => `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
        <div style="width:8px;height:8px;border-radius:50%;background:${TC[e.type] || 'var(--blue)'};flex-shrink:0"></div>
        <div><div style="font-size:12px;font-weight:500">${esc(e.title)}</div><div style="font-size:10px;color:var(--text4)">${esc(e.date)} · ${esc(e.type)}</div></div>
      </div>`).join('')
    : '<div class="empty" style="padding:16px"><p>No events this month</p></div>';
}

function saveEvent() {
  const d = {
    id:    DB.nid(DB.g('events')),
    title: $('mev-t').value.trim(),
    date:  $('mev-d').value,
    type:  $('mev-type').value,
  };
  if (!d.title || !d.date) { toast('Title and date required', false); return; }
  const evs = DB.g('events');
  evs.push(d);
  DB.s('events', evs);
  toast('Event added');
  closeM('m-event');
  _renderCal();
}

// ═══════════════════════════════════════════
//  REPORTS
// ═══════════════════════════════════════════
function rReports() {
  const sts  = DB.g('students'), gs = DB.g('grades'),
        att  = DB.g('attendance'), enrs = DB.g('enrollments'),
        fees = DB.g('fees');
  const rev      = fees.filter(f => f.status === 'Paid').reduce((s, f) => s + Number(f.amt), 0);
  const avgGpa   = gs.length ? gs.reduce((s, g) => s + gpa(g.marks), 0) / gs.length : 0;
  const passRate = gs.length ? Math.round(gs.filter(g => g.marks >= 60).length / gs.length * 100) : 0;

  $('rpt-stats').innerHTML = `
    <div class="stat"><div class="stat-lbl">Revenue</div><div class="stat-val">${usd(rev)}</div></div>
    <div class="stat"><div class="stat-lbl">Avg GPA</div><div class="stat-val">${avgGpa.toFixed(2)}</div></div>
    <div class="stat"><div class="stat-lbl">Pass Rate</div><div class="stat-val">${passRate}%</div></div>
    <div class="stat"><div class="stat-lbl">Enrollments</div><div class="stat-val">${enrs.length}</div></div>`;

  const withGPA = sts.map(s => ({ ...s, gpa: stuGPA(s.id) || 0 }))
    .filter(s => s.gpa > 0).sort((a, b) => b.gpa - a.gpa).slice(0, 5);
  $('rpt-top').innerHTML = withGPA.map(s => `<tr>
    <td><div class="bold">${esc(s.fn)} ${esc(s.ln)}</div><div class="text4" style="font-size:11px">${esc(s.dept)}</div></td>
    <td class="mono">${s.gpa.toFixed(2)}</td>
    <td>${sparkline([3.2,3.4,3.3,3.6,s.gpa])}</td>
  </tr>`).join('');

  const lowAtt = att.filter(a => pct(a.pres, a.tot) < 75).sort((a, b) => pct(a.pres, a.tot) - pct(b.pres, b.tot));
  $('rpt-att').innerHTML = lowAtt.map(a => `<tr>
    <td>${sn(a.sid)}</td>
    <td class="mono" style="color:var(--blue)">${cc(a.cid)}</td>
    <td>${progBar(pct(a.pres, a.tot))}</td>
  </tr>`).join('') || `<tr><td colspan="3" class="empty">All good</td></tr>`;

  const deptMap = {};
  sts.forEach(s => deptMap[s.dept] = (deptMap[s.dept] || 0) + 1);
  const max = Math.max(...Object.values(deptMap), 1);
  $('rpt-dept').innerHTML = Object.entries(deptMap).sort((a, b) => b[1] - a[1]).map(([d, c]) => `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      <div style="width:110px;font-size:11px;color:var(--text2)">${esc(d.split(' ')[0])}</div>
      <div style="flex:1;height:6px;border-radius:3px;background:var(--bg3)"><div style="width:${Math.round(c/max*100)}%;height:100%;background:var(--blue);border-radius:3px;opacity:.8"></div></div>
      <div class="mono text3" style="font-size:11px;width:20px;text-align:right">${c}</div>
    </div>`).join('');

  Charts.line('ch-sos',
    ['Sem 1','Sem 2','Sem 3','Sem 4','Sem 5'],
    [
      { label:'CS',   data:[3.1,3.3,3.2,3.5,3.4], borderColor:'rgba(59,130,246,0.8)',  backgroundColor:'rgba(59,130,246,0.1)',  tension:0.4, fill:true },
      { label:'Math', data:[2.9,3.0,3.2,3.1,3.3], borderColor:'rgba(168,85,247,0.8)',  backgroundColor:'rgba(168,85,247,0.1)', tension:0.4, fill:true },
    ]
  );
}

// ═══════════════════════════════════════════
//  USER ACCOUNTS
// ═══════════════════════════════════════════
function rUsers() {
  $('usertbl').innerHTML = DB.g('users').map(u => `<tr>
    <td class="mono">${esc(u.u)}</td>
    <td><span class="bx ${u.role === 'admin' ? 'bx-pu' : u.role === 'faculty' ? 'bx-bl' : 'bx-gr'}">${esc(u.role)}</span></td>
    <td class="text2">${u.lid ? (u.role === 'faculty' ? fn(u.lid) : sn(u.lid)) : 'System Admin'}</td>
  </tr>`).join('');
}

// ═══════════════════════════════════════════
//  AUDIT LOG
// ═══════════════════════════════════════════
function rAudit() {
  const audit = DB.g('audit');
  $('auditbody').innerHTML = audit.map(a => `
    <div class="alog-item">
      <div class="alog-dot" style="background:${a.color}"></div>
      <div class="alog-body">
        <div class="alog-action">${esc(a.action)}</div>
        <div class="alog-detail">${esc(a.detail)} · by ${esc(a.user)}</div>
      </div>
      <div class="alog-time">${timeAgo(a.ts)}</div>
    </div>`).join('') || '<div class="empty"><p>No audit records</p></div>';
}

// ═══════════════════════════════════════════
//  DATA EXPORT
// ═══════════════════════════════════════════
function rExport() {
  const exports = [
    { label:'Students',    key:'students',    icon:'👤', desc:'All student records' },
    { label:'Faculty',     key:'faculty',     icon:'👩‍🏫', desc:'Faculty information' },
    { label:'Courses',     key:'courses',     icon:'📚', desc:'Course catalog' },
    { label:'Enrollments', key:'enrollments', icon:'✓',  desc:'Enrollment records' },
    { label:'Grades',      key:'grades',      icon:'📊', desc:'All grade data' },
    { label:'Attendance',  key:'attendance',  icon:'📅', desc:'Attendance logs' },
    { label:'Fees',        key:'fees',        icon:'💰', desc:'Fee records' },
    { label:'Scholarships',key:'scholarships',icon:'⭐', desc:'Scholarship data' },
  ];
  $('export-grid').innerHTML = exports.map(e => `
    <div class="card" style="cursor:pointer" onclick="_exportCSV('${e.key}','${e.label}')">
      <div class="card-b" style="text-align:center;padding:24px">
        <div style="font-size:32px;margin-bottom:10px">${e.icon}</div>
        <div style="font-size:14px;font-weight:500;margin-bottom:4px">${e.label}</div>
        <div style="font-size:11px;color:var(--text3);margin-bottom:14px">${e.desc}</div>
        <button class="btn btn-g" style="width:100%">⬇ Download CSV</button>
      </div>
    </div>`).join('');

  // Semester settings — shown below the CSV grid
  const semWrap = $('sem-settings');
  if (semWrap) semWrap.innerHTML = `
    <div class="card" style="margin-top:24px">
      <div class="card-hd"><h2>Semester Settings</h2></div>
      <div class="card-b">
        <p style="font-size:12px;color:var(--text3);margin-bottom:16px">
          Change the active semester name and dates. All new enrollments, courses, and grades will use this semester.
        </p>
        <div class="form-grid" style="gap:12px">
          <div class="fg"><label class="lbl">Semester Name</label>
            <input id="sem-name" class="inp" value="${esc(C.SEMESTER.CURRENT)}" placeholder="e.g. Fall 2026"></div>
          <div class="fg"><label class="lbl">Start Date</label>
            <input id="sem-start" type="date" class="inp" value="${esc(C.SEMESTER.START)}"></div>
          <div class="fg"><label class="lbl">End Date</label>
            <input id="sem-end" type="date" class="inp" value="${esc(C.SEMESTER.END)}"></div>
          <div class="fg"><label class="lbl">Mid-term Date</label>
            <input id="sem-mid" type="date" class="inp" value="${esc(C.SEMESTER.MID)}"></div>
        </div>
        <div style="margin-top:16px">
          <button class="btn btn-p" onclick="_saveSemester()">Save Semester</button>
        </div>
      </div>
    </div>`;

  // Also show full backup/restore controls
  const g = $('export-grid');
  if (g) g.innerHTML += `
    <div class="card">
      <div class="card-b" style="text-align:center;padding:24px">
        <div style="font-size:32px;margin-bottom:10px">💾</div>
        <div style="font-size:14px;font-weight:500;margin-bottom:4px">Full Backup</div>
        <div style="font-size:11px;color:var(--text3);margin-bottom:14px">Export all data as JSON</div>
        <button class="btn btn-g" style="width:100%;margin-bottom:6px" onclick="_exportBackup()">⬇ Export JSON</button>
        <label class="btn btn-g" style="width:100%;cursor:pointer">⬆ Import JSON<input type="file" accept=".json" style="display:none" onchange="_importBackup(this)"></label>
      </div>
    </div>
    <div class="card">
      <div class="card-b" style="text-align:center;padding:24px">
        <div style="font-size:32px;margin-bottom:10px">🗑</div>
        <div style="font-size:14px;font-weight:500;margin-bottom:4px">Reset Demo Data</div>
        <div style="font-size:11px;color:var(--text3);margin-bottom:14px">Clear all and re-seed</div>
        <button class="btn btn-dg" style="width:100%" onclick="_resetData()">Reset to Demo</button>
      </div>
    </div>`;
}

function _saveSemester() {
  const name  = $('sem-name')?.value.trim();
  const start = $('sem-start')?.value;
  const end   = $('sem-end')?.value;
  const mid   = $('sem-mid')?.value;
  if (!name || !start || !end) { toast('Semester name, start and end date are required', false); return; }
  if (end <= start) { toast('End date must be after start date', false); return; }
  DB.setSetting('semester', name);
  DB.setSetting('semStart', start);
  DB.setSetting('semEnd',   end);
  DB.setSetting('semMid',   mid || '');
  C.SEMESTER.CURRENT = name;
  C.SEMESTER.START   = start;
  C.SEMESTER.END     = end;
  C.SEMESTER.MID     = mid || C.SEMESTER.MID;
  toast('Semester settings saved');
  addAudit('Semester Updated', `Semester changed to "${name}"`, State.getUser()?.u || 'admin', 'var(--teal)');
}

function _exportCSV(key, label) {
  const data = DB.g(key);
  if (!data.length) { toast('No data to export', false); return; }
  const headers = Object.keys(data[0]);
  const rows = [headers, ...data.map(r => headers.map(h => String(r[h] ?? '')))];
  downloadCSV(rows, label + '.csv');
  toast(`${label}.csv downloaded`);
}

function _exportBackup() {
  const data = DB.exportAll();
  downloadJSON(data, 'academe-backup.json');
  toast('Backup downloaded');
}

function _importBackup(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      DB.importAll(data);
      toast('Data imported successfully');
      go('export');
    } catch (err) {
      toast('Invalid backup file', false);
    }
  };
  reader.readAsText(file);
}

function _resetData() {
  confirmDlg('Reset all data to demo state? This cannot be undone.', () => {
    DB.clearAll();
    location.reload();
  }, true, 'Reset');
}
