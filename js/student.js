// ════════════════════════════════════════════════════════
//  STUDENT  —  student portal page render & action fns
// ════════════════════════════════════════════════════════
'use strict';

// ═══════════════════════════════════════════
//  STUDENT DASHBOARD
// ═══════════════════════════════════════════
function rSDash() {
  const user = State.getUser();
  const s    = DB.g('students').find(x => x.id === user.lid);
  if (s) $('sdash-t').textContent = `Hey, ${s.fn} 👋`;

  const enrs  = DB.g('enrollments').filter(e => e.sid === user.lid);
  const gs    = DB.g('grades').filter(g => g.sid === user.lid);
  const att   = DB.g('attendance').filter(a => a.sid === user.lid);
  const myGPA = gs.length ? (gs.reduce((t, g) => t + gpa(g.marks), 0) / gs.length) : null;
  const avgAtt = att.length ? Math.round(att.reduce((t, a) => t + pct(a.pres, a.tot), 0) / att.length) : null;

  $('sstats').innerHTML = `
    <div class="stat"><div class="stat-top"><span class="stat-lbl">Courses</span></div><div class="stat-val">${enrs.length}</div></div>
    <div class="stat"><div class="stat-top"><span class="stat-lbl">GPA</span></div><div class="stat-val">${myGPA !== null ? myGPA.toFixed(2) : '—'}</div></div>
    <div class="stat"><div class="stat-top"><span class="stat-lbl">Avg Attendance</span></div><div class="stat-val">${avgAtt !== null ? avgAtt + '%' : '—'}</div></div>
    <div class="stat"><div class="stat-top"><span class="stat-lbl">Grades</span></div><div class="stat-val">${gs.length}</div></div>`;

  // Semester progress
  const semStart = new Date(C.SEMESTER.START);
  const semEnd   = new Date(C.SEMESTER.END);
  const now      = new Date();
  const prog     = Math.min(100, Math.max(0, Math.round((now - semStart) / (semEnd - semStart) * 100)));
  $('sem-progress').innerHTML = `
    <div style="font-size:12px;color:var(--text2);margin-bottom:6px">${esc(C.SEMESTER.CURRENT)} · ${prog}% complete</div>
    <div class="sem-bar"><div class="sem-fill" style="width:${prog}%"></div></div>
    <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text4);margin-top:4px">
      <span>${esc(C.SEMESTER.START)}</span><span>${esc(C.SEMESTER.END)}</span>
    </div>`;

  // Upcoming deadlines
  const myCs    = enrs.map(e => e.cid);
  const assigns = DB.g('assignments').filter(a => myCs.includes(a.cid)).sort((a, b) => a.due.localeCompare(b.due));
  const exams   = DB.g('exams').filter(e => myCs.includes(e.cid)).sort((a, b) => a.date.localeCompare(b.date));
  const deadlines = [
    ...assigns.map(a => ({ label: a.title, date: a.due, color: 'var(--purple)' })),
    ...exams.map(e => ({ label: `${cc(e.cid)} Exam`, date: e.date, color: 'var(--red)' })),
  ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);

  $('deadlines').innerHTML = deadlines.map(d => `
    <div class="deadline-item">
      <div class="deadline-dot" style="background:${d.color}"></div>
      <div style="flex:1;font-size:12px">${esc(d.label)}</div>
      <div style="font-size:11px;color:var(--text4)">${esc(d.date)}</div>
    </div>`).join('') || '<div class="empty" style="padding:16px"><p>No upcoming deadlines</p></div>';

  // Enrolled courses mini-table
  $('senroll-tbl').innerHTML = `<thead><tr><th>Code</th><th>Course</th><th>Credits</th></tr></thead><tbody>${
    enrs.map(e => {
      const c = DB.g('courses').find(x => x.id === e.cid);
      return c ? `<tr><td class="mono" style="color:var(--blue)">${esc(c.code)}</td><td>${esc(c.name)}</td><td class="mono">${c.cr}</td></tr>` : '';
    }).join('')
  }</tbody>`;

  // Recent grades
  $('sgrades-tbl').innerHTML = `<thead><tr><th>Course</th><th>Marks</th><th>Grade</th></tr></thead><tbody>${
    gs.map(g => `<tr>
      <td class="mono" style="color:var(--blue);font-size:11px">${cc(g.cid)}</td>
      <td class="mono">${g.marks}</td>
      <td>${gChip(grade(g.marks))}</td>
    </tr>`).join('')
  }</tbody>`;
}

// ═══════════════════════════════════════════
//  MY ENROLLMENT
// ═══════════════════════════════════════════
function rMyEn() {
  const user = State.getUser();
  const enrs = DB.g('enrollments').filter(e => e.sid === user.lid);
  const myIds = enrs.map(e => e.cid);

  // Populate self-enroll modal
  const avail = DB.g('courses').filter(c => !myIds.includes(c.id));
  $('se-courses').innerHTML = avail.map(c => {
    const seats = DB.g('enrollments').filter(e => e.cid === c.id).length;
    const full  = seats >= c.seats;
    return `<label style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);cursor:${full ? 'not-allowed' : 'pointer'};opacity:${full ? '.5' : '1'}">
      <input type="radio" name="sec" value="${c.id}" ${full ? 'disabled' : ''} style="accent-color:var(--blue)">
      <div>
        <div class="bold" style="font-size:13px">${esc(c.code)} — ${esc(c.name)}</div>
        <div class="text3" style="font-size:11px">${seats}/${c.seats} enrolled · ${c.cr} credits · ${esc(c.dept)}</div>
      </div>
    </label>`;
  }).join('') || '<div class="empty"><p>No available courses</p></div>';

  $('myenbody').innerHTML = enrs.map(e => {
    const c = DB.g('courses').find(x => x.id === e.cid);
    if (!c) return '';
    const g = DB.g('grades').find(x => x.sid === user.lid && x.cid === e.cid);
    return `<tr>
      <td class="mono" style="color:var(--blue)">${esc(c.code)}</td>
      <td><div class="bold">${esc(c.name)}</div><div class="text4" style="font-size:11px">${esc(c.desc)}</div></td>
      <td class="text2">${fn(c.fid)}</td>
      <td class="mono">${c.cr}</td>
      <td><span class="bx bx-gy">${esc(e.sem)}</span></td>
      <td>${g ? gChip(grade(g.marks)) : '<span class="text4">—</span>'}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="6"><div class="empty"><p>Not enrolled in any courses</p></div></td></tr>`;
}

function selfEnroll() {
  const user = State.getUser();
  const cid  = parseInt(document.querySelector('input[name="sec"]:checked')?.value);
  if (!cid) { toast('Please select a course', false); return; }

  const enrs = DB.g('enrollments');
  if (enrs.find(e => e.sid === user.lid && e.cid === cid)) {
    toast('Already enrolled in this course', false); return;
  }

  enrs.push({ id: DB.nid(enrs), sid: user.lid, cid, sem: C.SEMESTER.CURRENT, status: 'Active' });
  DB.s('enrollments', enrs);
  toast('Successfully registered!');
  closeM('m-self-enroll');
  rMyEn();
}

// ═══════════════════════════════════════════
//  MY GRADES
// ═══════════════════════════════════════════
function rMyGrades() {
  const user  = State.getUser();
  const gs    = DB.g('grades').filter(g => g.sid === user.lid);
  const courses = DB.g('courses');

  // Weighted GPA
  let totalPoints = 0, totalCredits = 0;
  gs.forEach(g => {
    const cr = courses.find(c => c.id === g.cid)?.cr || 3;
    totalPoints  += gpa(g.marks) * cr;
    totalCredits += cr;
  });
  const gpaVal = totalCredits ? round2(totalPoints / totalCredits) : 0;

  const circ   = 2 * Math.PI * 76;
  const filled = circ * (gpaVal / 4);
  const ring = $('gpa-ring');
  if (ring) ring.setAttribute('stroke-dasharray', `${filled} ${circ}`);
  const gpaNum = $('gpa-num'); if (gpaNum) gpaNum.textContent = gpaVal.toFixed(2);

  const st = standing(gpaVal);
  const gpaLabel = $('gpa-label'); if (gpaLabel) gpaLabel.textContent = st.label;
  const gpaSub   = $('gpa-sub');   if (gpaSub)   gpaSub.textContent = `${gs.length} grade${gs.length !== 1 ? 's' : ''} · ${C.SEMESTER.CURRENT}`;

  $('mygradesbody').innerHTML = gs.map(g => `<tr>
    <td>
      <div class="bold">${cn(g.cid)}</div>
      <div class="mono" style="font-size:11px;color:var(--blue)">${cc(g.cid)}</div>
    </td>
    <td><span class="mono" style="font-size:15px;font-weight:600">${g.marks}</span><span class="text4">/100</span></td>
    <td>${gChip(grade(g.marks))}</td>
    <td class="mono">${gpa(g.marks).toFixed(1)}</td>
    <td><span class="bx bx-gy">${esc(g.sem)}</span></td>
  </tr>`).join('') || `<tr><td colspan="5"><div class="empty"><p>No grades yet</p></div></td></tr>`;
}

// ═══════════════════════════════════════════
//  MY ATTENDANCE
// ═══════════════════════════════════════════
function rMyAtt() {
  const user = State.getUser();
  const att  = DB.g('attendance').filter(a => a.sid === user.lid);

  $('myatt-cards').innerHTML = att.map(a => {
    const p     = pct(a.pres, a.tot);
    const color = p >= C.ATTENDANCE.WARNING_PCT ? 'var(--green)'
                : p >= C.ATTENDANCE.RESTRICT_PCT ? 'var(--amber)'
                : 'var(--red)';
    const dots  = Array.from({ length: a.tot }, (_, i) =>
      `<div style="width:8px;height:8px;border-radius:2px;background:${i < a.pres ? color : 'var(--bg3)'}"></div>`
    ).join('');

    return `<div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 18px">
        <div>
          <div class="bold">${cn(a.cid)}</div>
          <div class="mono" style="font-size:11px;color:var(--blue)">${cc(a.cid)}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:24px;font-weight:600;color:${color}">${p}%</div>
          <div class="text4" style="font-size:11px">${a.pres} of ${a.tot} classes</div>
        </div>
      </div>
      <div style="padding:0 18px 14px">
        <div style="display:flex;gap:3px;flex-wrap:wrap">${dots}</div>
        <div style="height:3px;background:var(--bg3);border-radius:2px;overflow:hidden;margin-top:10px">
          <div style="width:${p}%;height:100%;background:${color};border-radius:2px"></div>
        </div>
      </div>
      <div style="padding:8px 18px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
        <span class="text4" style="font-size:11px">Min required: ${C.ATTENDANCE.WARNING_PCT}%</span>
        <span class="bx ${p >= C.ATTENDANCE.WARNING_PCT ? 'bx-gr' : p >= C.ATTENDANCE.RESTRICT_PCT ? 'bx-am' : 'bx-rd'}">${p >= C.ATTENDANCE.WARNING_PCT ? 'Good' : p >= C.ATTENDANCE.RESTRICT_PCT ? 'Warning' : 'At Risk'}</span>
      </div>
    </div>`;
  }).join('') || `<div class="card"><div class="empty"><p>No attendance data yet</p></div></div>`;
}

// ═══════════════════════════════════════════
//  MY ASSIGNMENTS (student)
// ═══════════════════════════════════════════
function rMyAssign() {
  const user   = State.getUser();
  const myCs   = DB.g('enrollments').filter(e => e.sid === user.lid).map(e => e.cid);
  const assigns = DB.g('assignments').filter(a => myCs.includes(a.cid)).sort((a, b) => a.due.localeCompare(b.due));
  const tod     = today();

  $('myassigntbl').innerHTML = assigns.map(a => {
    const overdue = a.due < tod;
    return `<tr>
      <td class="bold">${esc(a.title)}</td>
      <td class="mono" style="color:var(--blue)">${cc(a.cid)}</td>
      <td style="color:${overdue ? 'var(--red)' : ''}">${esc(a.due)}</td>
      <td class="mono">${a.marks}</td>
      <td><span class="bx ${overdue ? 'bx-rd' : 'bx-am'}">${overdue ? 'Overdue' : 'Pending'}</span></td>
    </tr>`;
  }).join('') || `<tr><td colspan="5"><div class="empty"><p>No assignments</p></div></td></tr>`;
}

// ═══════════════════════════════════════════
//  GRADE CALCULATOR
// ═══════════════════════════════════════════
function rGCalc() {
  const user = State.getUser();
  const enrs = DB.g('enrollments').filter(e => e.sid === user.lid);
  const gs   = DB.g('grades').filter(g => g.sid === user.lid);

  $('gcalc-body').innerHTML = enrs.map(e => {
    const c = DB.g('courses').find(x => x.id === e.cid);
    if (!c) return '';
    const g = gs.find(x => x.cid === e.cid);
    return `<div class="gc-row">
      <div class="gc-name">
        <div class="bold">${esc(c.code)}</div>
        <div class="text4" style="font-size:11px">${esc(c.name)}</div>
      </div>
      <input class="gc-inp" id="gc${e.cid}" type="number" min="0" max="100"
        value="${g ? g.marks : ''}" placeholder="0" oninput="calcGPA()">
      <div class="gc-result" id="gcr${e.cid}">${g ? gChip(grade(g.marks)) : ''}</div>
    </div>`;
  }).join('') || '<div class="empty"><p>Not enrolled in any courses</p></div>';

  calcGPA();
}

function calcGPA() {
  const user  = State.getUser();
  const enrs  = DB.g('enrollments').filter(e => e.sid === user.lid);
  const courses = DB.g('courses');
  let totalPoints = 0, totalCredits = 0;

  enrs.forEach(e => {
    const inp = $('gc' + e.cid);
    if (!inp) return;
    const v = parseInt(inp.value);
    if (!isNaN(v) && v >= 0 && v <= 100) {
      const cr = courses.find(c => c.id === e.cid)?.cr || 3;
      $('gcr' + e.cid).innerHTML = gChip(grade(v));
      totalPoints  += gpa(v) * cr;
      totalCredits += cr;
    }
  });

  const gpaVal = totalCredits ? round2(totalPoints / totalCredits) : 0;
  const st     = standing(gpaVal);

  $('gcalc-result').innerHTML = `
    <div style="text-align:center;padding:16px">
      <div style="font-size:11px;color:var(--text4);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">Projected GPA</div>
      <div style="font-size:40px;font-weight:700;letter-spacing:-1px;color:var(--blue)">${gpaVal.toFixed(2)}</div>
      <div style="font-size:14px;font-weight:500;margin-top:6px">${esc(st.label)}</div>
      <div class="text4" style="font-size:11px;margin-top:4px">Based on ${totalCredits} credit${totalCredits !== 1 ? 's' : ''}</div>
    </div>
    <div style="margin-top:16px;background:var(--bg2);border-radius:var(--r);overflow:hidden;height:8px">
      <div style="width:${Math.min(100, Math.round(gpaVal / 4 * 100))}%;height:100%;background:${gpaVal >= 3 ? 'var(--green)' : gpaVal >= 2 ? 'var(--amber)' : 'var(--red)'};transition:width .3s"></div>
    </div>`;
}

// ═══════════════════════════════════════════
//  TRANSCRIPT
// ═══════════════════════════════════════════
function rTranscript() {
  const user = State.getUser();
  const s    = DB.g('students').find(x => x.id === user.lid);
  if (!s) { $('transcript-content').innerHTML = '<div class="empty"><p>Profile not found</p></div>'; return; }

  const gs      = DB.g('grades').filter(g => g.sid === user.lid);
  const courses = DB.g('courses');
  let totalPoints = 0, totalCredits = 0, earnedCr = 0;
  gs.forEach(g => {
    const cr = courses.find(c => c.id === g.cid)?.cr || 3;
    totalPoints  += gpa(g.marks) * cr;
    totalCredits += cr;
    if (g.marks >= 60) earnedCr += cr;
  });
  const gpaVal = totalCredits ? (totalPoints / totalCredits).toFixed(2) : '0.00';

  $('transcript-content').innerHTML = `
    <div class="tx-head">
      <div class="tx-logo">ACADEME UNIVERSITY</div>
      <div class="tx-sub">Official Academic Transcript</div>
    </div>
    <div class="tx-info">
      <div>
        <div class="text4" style="font-size:10px;margin-bottom:2px">STUDENT NAME</div>
        <div class="bold">${esc(s.fn)} ${esc(s.ln)}</div>
        <div class="text3" style="font-size:11px;margin-top:2px">${stuId(s.id)}</div>
      </div>
      <div>
        <div class="text4" style="font-size:10px;margin-bottom:2px">PROGRAM</div>
        <div class="bold">${esc(s.dept)}</div>
        <div class="text3" style="font-size:11px;margin-top:2px">Year ${esc(s.yr)} · Admitted ${esc(s.adm)}</div>
      </div>
      <div>
        <div class="text4" style="font-size:10px;margin-bottom:2px">CUMULATIVE GPA</div>
        <div style="font-size:22px;font-weight:700;color:var(--blue)">${gpaVal}</div>
      </div>
      <div>
        <div class="text4" style="font-size:10px;margin-bottom:2px">CREDITS EARNED</div>
        <div style="font-size:22px;font-weight:700">${earnedCr}/${totalCredits}</div>
      </div>
    </div>
    <div style="padding:14px 18px;font-size:11px;font-weight:500;color:var(--text4);text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid var(--border)">
      Academic Record — ${esc(C.SEMESTER.CURRENT)}
    </div>
    ${gs.map(g => {
      const c = courses.find(x => x.id === g.cid);
      if (!c) return '';
      return `<div class="tx-row">
        <span class="mono">${esc(c.code)}</span>
        <span>${esc(c.name)}</span>
        <span class="mono">${c.cr} cr</span>
        <span>${gChip(grade(g.marks))}</span>
        <span class="mono">${g.marks}</span>
        <span class="mono">${gpa(g.marks).toFixed(1)}</span>
      </div>`;
    }).join('')}
    <div class="tx-foot">Issued: ${new Date().toLocaleDateString()} · This is a computer-generated transcript.</div>`;
}

function printTranscript() {
  window.print();
}

// ═══════════════════════════════════════════
//  HALL TICKET
// ═══════════════════════════════════════════
function rHallTicket() {
  const user  = State.getUser();
  const s     = DB.g('students').find(x => x.id === user.lid);
  if (!s) { $('hallticket-content').innerHTML = '<div class="empty"><p>Profile not found</p></div>'; return; }

  const myCs   = DB.g('enrollments').filter(e => e.sid === user.lid).map(e => e.cid);
  const myExams = DB.g('exams').filter(e => myCs.includes(e.cid)).sort((a, b) => a.date.localeCompare(b.date));

  $('hallticket-content').innerHTML = `
    <div class="ht">
      <div class="ht-head">
        <div style="font-size:18px;font-weight:700;margin-bottom:4px">ACADEME UNIVERSITY</div>
        <div style="font-size:12px;opacity:.7">Examination Hall Ticket — ${esc(C.SEMESTER.CURRENT)}</div>
      </div>
      <div class="ht-body">
        <div class="ht-grid" style="margin-bottom:16px">
          <div class="ht-field"><div class="ht-lbl">Student Name</div><div class="ht-val">${esc(s.fn)} ${esc(s.ln)}</div></div>
          <div class="ht-field"><div class="ht-lbl">Roll Number</div><div class="ht-val mono">${stuId(s.id)}</div></div>
          <div class="ht-field"><div class="ht-lbl">Department</div><div class="ht-val">${esc(s.dept)}</div></div>
          <div class="ht-field"><div class="ht-lbl">Year</div><div class="ht-val">Year ${esc(s.yr)}</div></div>
        </div>
        <div class="ht-exams">
          <div class="text4" style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Examination Schedule</div>
          ${myExams.map(e => `
            <div class="ht-exam-row">
              <span class="mono" style="color:var(--blue)">${cc(e.cid)}</span>
              <span>${cn(e.cid)}</span>
              <span>${esc(e.date)}</span>
              <span>${esc(e.time)}</span>
              <span class="bx bx-gy">${esc(e.hall)}</span>
            </div>`).join('') || '<div class="text3" style="font-size:12px">No exams scheduled</div>'}
        </div>
        <div style="margin-top:16px;padding:10px;background:var(--amber-d);border:1px solid var(--amber-b);border-radius:var(--r);font-size:11px;color:var(--amber)">
          ⚠ Bring this ticket and a valid photo ID to every examination. Admit one student only.
        </div>
      </div>
    </div>`;
}

// ═══════════════════════════════════════════
//  COURSE WISHLIST
// ═══════════════════════════════════════════
function rWishlist() {
  const user     = State.getUser();
  const myCs     = DB.g('enrollments').filter(e => e.sid === user.lid).map(e => e.cid);
  const wishlist = DB.g('wishlist').filter(w => w.sid === user.lid).map(w => w.cid);
  const avail    = DB.g('courses').filter(c => !myCs.includes(c.id));

  $('wishlist-avail').innerHTML = avail.map(c => {
    const seats = DB.g('enrollments').filter(e => e.cid === c.id).length;
    const saved = wishlist.includes(c.id);
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
      <div>
        <div class="bold">${esc(c.code)} — ${esc(c.name)}</div>
        <div class="text3" style="font-size:11px">${seats}/${c.seats} enrolled · ${c.cr} credits · ${esc(c.dept)}</div>
      </div>
      <button class="btn ${saved ? 'btn-amber' : 'btn-g'}" onclick="toggleWish(${c.id})" style="font-size:11px">${saved ? '★ Saved' : '☆ Save'}</button>
    </div>`;
  }).join('') || '<div class="empty"><p>No available courses</p></div>';

  $('wishlist-saved').innerHTML = wishlist.length
    ? wishlist.map(cid => {
        const c = DB.g('courses').find(x => x.id === cid);
        if (!c) return '';
        return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
          <div><div class="bold">${esc(c.code)}</div><div class="text3" style="font-size:11px">${esc(c.name)}</div></div>
          <button class="bico del" onclick="toggleWish(${c.id})" title="Remove">✕</button>
        </div>`;
      }).join('')
    : '<div class="empty"><p>No saved courses yet</p></div>';
}

function toggleWish(cid) {
  const user = State.getUser();
  const wl   = DB.g('wishlist');
  const i    = wl.findIndex(w => w.sid === user.lid && w.cid === cid);
  if (i >= 0) wl.splice(i, 1);
  else wl.push({ sid: user.lid, cid });
  DB.s('wishlist', wl);
  rWishlist();
}

// ═══════════════════════════════════════════
//  MY FEES
// ═══════════════════════════════════════════
function rMyFees() {
  const user = State.getUser();
  const fs   = DB.g('fees').filter(f => f.sid === user.lid);
  const tot  = fs.reduce((s, f) => s + Number(f.amt), 0);
  const paid = fs.filter(f => f.status === 'Paid').reduce((s, f)  => s + Number(f.amt), 0);
  const pend = fs.filter(f => f.status !== 'Paid').reduce((s, f)  => s + Number(f.amt), 0);

  $('myfstats').innerHTML = `
    <div class="stat"><div class="stat-top"><span class="stat-lbl">Total</span></div><div class="stat-val">${usd(tot)}</div></div>
    <div class="stat"><div class="stat-top"><span class="stat-lbl">Paid</span></div><div class="stat-val" style="color:var(--green)">${usd(paid)}</div></div>
    <div class="stat"><div class="stat-top"><span class="stat-lbl">Outstanding</span></div><div class="stat-val" style="color:${pend ? 'var(--amber)' : 'var(--text2)'}">${usd(pend)}</div></div>`;

  const paidFees = fs.filter(f => f.paid).sort((a, b) => a.paid.localeCompare(b.paid));
  $('fee-timeline').innerHTML = paidFees.length
    ? `<div style="position:relative;padding-left:20px">${paidFees.map(f => `
        <div style="display:flex;gap:12px;margin-bottom:12px;align-items:flex-start">
          <div style="position:absolute;left:0;width:8px;height:8px;border-radius:50%;background:var(--green);margin-top:4px"></div>
          <div style="flex:1"><div style="font-size:12px;font-weight:500">${esc(f.type)}</div><div style="font-size:11px;color:var(--text3)">${esc(f.paid)}</div></div>
          <div class="mono" style="font-weight:500;color:var(--green)">${usd(f.amt)}</div>
        </div>`).join('')}</div>`
    : '<div class="empty" style="padding:16px"><p>No payments recorded</p></div>';

  $('myfeebody').innerHTML = fs.map(f => `<tr>
    <td>${esc(f.type)}</td>
    <td class="mono bold">${usd(f.amt)}</td>
    <td class="text3" style="font-size:11px">${esc(f.due)}</td>
    <td><span class="bx ${f.status === 'Paid' ? 'bx-gr' : f.status === 'Pending' ? 'bx-am' : 'bx-rd'}">${esc(f.status)}</span></td>
    <td class="text3" style="font-size:11px">${esc(f.paid) || '—'}</td>
  </tr>`).join('') || `<tr><td colspan="5"><div class="empty"><p>No fees</p></div></td></tr>`;
}

// ═══════════════════════════════════════════
//  ACHIEVEMENTS
// ═══════════════════════════════════════════
function rAchievements() {
  const user = State.getUser();
  const gs   = DB.g('grades').filter(g => g.sid === user.lid);
  const att  = DB.g('attendance').filter(a => a.sid === user.lid);
  const gpaVal = gs.length
    ? (() => {
        const courses = DB.g('courses');
        let tp = 0, tc = 0;
        gs.forEach(g => { const cr = courses.find(c => c.id === g.cid)?.cr || 3; tp += gpa(g.marks) * cr; tc += cr; });
        return tc ? tp / tc : 0;
      })()
    : 0;

  const perfectAtt = att.length > 0 && att.every(a => pct(a.pres, a.tot) === 100);
  const allA       = gs.length > 0 && gs.every(g => g.marks >= C.GRADE.A);
  const enrCount   = DB.g('enrollments').filter(e => e.sid === user.lid).length;

  const badges = [
    { ico:'🎓', name:"Dean's List",     desc:`GPA ≥ ${C.STANDING.DEANS_LIST}`,  earned: gpaVal >= C.STANDING.DEANS_LIST },
    { ico:'⭐', name:'Perfect Attendance',desc:'100% in all courses',             earned: perfectAtt },
    { ico:'🏆', name:'All-A Student',   desc:'A in every course',                earned: allA },
    { ico:'📚', name:'Multi-Enroller',  desc:'5+ courses enrolled',              earned: enrCount >= 5 },
    { ico:'💡', name:'Quick Learner',   desc:'Received first grade',             earned: gs.length > 0 },
    { ico:'🌟', name:'GPA 3.0+',        desc:'Above 3.0 GPA',                    earned: gpaVal >= 3.0 },
    { ico:'🎯', name:'Consistent',      desc:'No failed courses',                earned: gs.length > 0 && gs.every(g => g.marks >= 60) },
    { ico:'🔥', name:'Top Scorer',      desc:'Scored 90+ somewhere',             earned: gs.some(g => g.marks >= 90) },
    { ico:'📋', name:'Organised',       desc:'Applied for leave',                earned: DB.g('leaves').some(l => l.sid === user.lid) },
  ];

  $('ach-grid').innerHTML = badges.map(b => `
    <div class="ach ${b.earned ? 'earned' : 'locked'}">
      <div class="ach-ico">${b.ico}</div>
      <div class="ach-name">${esc(b.name)}</div>
      <div class="ach-desc">${esc(b.desc)}</div>
      ${b.earned
        ? '<div style="font-size:10px;color:var(--amber);margin-top:4px;font-weight:500">Earned ✓</div>'
        : '<div style="font-size:10px;color:var(--text4);margin-top:4px">Locked</div>'}
    </div>`).join('');
}

// ═══════════════════════════════════════════
//  APPLY LEAVE
// ═══════════════════════════════════════════
function rApplyLeave() {
  const user  = State.getUser();
  const myCs  = DB.g('enrollments').filter(e => e.sid === user.lid).map(e => e.cid);
  const lvc   = $('lv-course');
  if (lvc) lvc.innerHTML = myCs.map(cid => `<option value="${cid}">${cc(cid)} — ${cn(cid)}</option>`).join('');

  const lvf = $('lv-from'); if (lvf && !lvf.value) lvf.value = today();
  const lvt = $('lv-to');   if (lvt && !lvt.value) lvt.value = today();

  const myLeaves = DB.g('leaves').filter(l => l.sid === user.lid);
  $('my-leaves').innerHTML = myLeaves.map(l => `
    <div class="leave-item">
      <div class="leave-top">
        <div><span class="bold">${cc(l.cid)}</span></div>
        <span class="bx ${l.status === 'Approved' ? 'bx-gr' : l.status === 'Rejected' ? 'bx-rd' : 'bx-am'}">${esc(l.status)}</span>
      </div>
      <div class="text3" style="font-size:11px">${esc(l.from)} to ${esc(l.to)} · ${esc(l.reason)}</div>
    </div>`).join('') || '<div class="text4" style="font-size:12px;padding:8px">No applications yet</div>';
}

function submitLeave() {
  const user = State.getUser();
  const d = {
    sid:    user.lid,
    cid:    parseInt($('lv-course')?.value),
    from:   $('lv-from')?.value,
    to:     $('lv-to')?.value,
    reason: $('lv-reason')?.value.trim(),
    type:   'Personal',
    status: 'Pending',
    date:   today(),
  };
  if (!d.reason) { toast('Please provide a reason', false); return; }
  if (!d.from || !d.to) { toast('Please set dates', false); return; }

  const leaves = DB.g('leaves');
  leaves.push({ id: DB.nid(leaves), ...d });
  DB.s('leaves', leaves);
  toast('Leave application submitted');
  if ($('lv-reason')) $('lv-reason').value = '';
  rApplyLeave();
}

// ═══════════════════════════════════════════
//  MY PROFILE
// ═══════════════════════════════════════════
function rMyProfile() {
  const user = State.getUser();
  const s    = DB.g('students').find(x => x.id === user.lid);
  if (!s) { $('profile-card').innerHTML = '<div class="empty"><p>Profile not found</p></div>'; return; }

  const enrs = DB.g('enrollments').filter(e => e.sid === s.id);
  const gs   = DB.g('grades').filter(g => g.sid === s.id);
  const gpaVal = (() => {
    if (!gs.length) return null;
    const courses = DB.g('courses');
    let tp = 0, tc = 0;
    gs.forEach(g => { const cr = courses.find(c => c.id === g.cid)?.cr || 3; tp += gpa(g.marks) * cr; tc += cr; });
    return tc ? (tp / tc).toFixed(2) : null;
  })();

  $('profile-card').innerHTML = `
    <div style="display:flex;align-items:center;gap:18px;padding:22px;border-bottom:1px solid var(--border)">
      <div class="av ${avCls(0)}" style="width:60px;height:60px;font-size:20px">
        ${esc(s.fn[0])}${esc((s.ln || '')[0] || '')}
      </div>
      <div>
        <div style="font-size:18px;font-weight:600">${esc(s.fn)} ${esc(s.ln)}</div>
        <div class="text2" style="font-size:12px;margin-top:2px">${stuId(s.id)} · ${esc(s.dept)} · Year ${esc(s.yr)}</div>
        <div style="margin-top:8px;display:flex;gap:6px">
          <span class="bx ${s.status === 'Active' ? 'bx-gr' : 'bx-gy'}">${esc(s.status)}</span>
          ${gpaVal ? `<span class="bx bx-bl">GPA ${gpaVal}</span>` : ''}
        </div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr">
      <div style="padding:18px;border-right:1px solid var(--border)">
        <div class="section-title">Personal</div>
        ${[['Email', s.em], ['Phone', s.ph || '—'], ['Date of Birth', s.dob || '—'], ['Address', s.addr || '—']].map(([k, v]) => `
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px">
            <span class="text2">${k}</span><span class="bold">${esc(v)}</span>
          </div>`).join('')}
      </div>
      <div style="padding:18px">
        <div class="section-title">Academic</div>
        ${[['Department', s.dept], ['Year', 'Year ' + s.yr], ['Admission Year', s.adm || '—'], ['Enrolled Courses', enrs.length], ['Cumulative GPA', gpaVal || '—']].map(([k, v]) => `
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px">
            <span class="text2">${k}</span><span class="bold">${esc(String(v))}</span>
          </div>`).join('')}
      </div>
    </div>`;
}
