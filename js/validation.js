// ════════════════════════════════════════════════════════
//  VALIDATION  —  form validation with inline errors
// ════════════════════════════════════════════════════════

// ── Primitive checkers ─────────────────────────────────
const V = {
  required: v  => v != null && String(v).trim() !== '',
  email:    v  => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim()),
  phone:    v  => !v || /^[\d\s\-\+\(\)]{7,15}$/.test(String(v).trim()),
  minLen:  (v, n) => String(v).trim().length >= n,
  maxLen:  (v, n) => String(v).trim().length <= n,
  numeric:  v  => !isNaN(Number(v)) && String(v).trim() !== '',
  range:   (v, min, max) => Number(v) >= min && Number(v) <= max,
  date:     v  => v && /^\d{4}-\d{2}-\d{2}$/.test(v),
  noXSS:    v  => !/<script|javascript:|on\w+=/i.test(String(v)),
};

// ── Show / clear field error ───────────────────────────
function fieldError(inputId, msg) {
  const el = $(inputId);
  if (!el) return;
  el.classList.add('inp-err');
  const eid = inputId + '-err';
  let err = $(eid);
  if (!err) {
    err = document.createElement('div');
    err.id = eid;
    err.className = 'field-err';
    el.parentNode.insertBefore(err, el.nextSibling);
  }
  err.textContent = msg;
}
function clearFieldError(inputId) {
  const el = $(inputId);
  if (el) el.classList.remove('inp-err');
  const err = $(inputId + '-err');
  if (err) err.remove();
}
function clearAllErrors(formId) {
  const form = $(formId);
  if (!form) return;
  form.querySelectorAll('.inp-err').forEach(el => el.classList.remove('inp-err'));
  form.querySelectorAll('.field-err').forEach(el => el.remove());
}

// ── Validate a set of rules ────────────────────────────
// rules: [{ id, rules: [{check, msg}] }]
// Returns true if all pass
function validateRules(rules) {
  let valid = true;
  rules.forEach(({ id, rules: checks }) => {
    clearFieldError(id);
    for (const { check, msg } of checks) {
      if (!check) { fieldError(id, msg); valid = false; break; }
    }
  });
  return valid;
}

// ── Domain validators ──────────────────────────────────
function validateStudent(d, id = null) {
  const students = DB.g('students');
  const emailTaken = students.some(s => s.em === d.em && s.id !== id);
  return validateRules([
    { id: 'mst-fn', rules: [
      { check: V.required(d.fn),          msg: 'First name is required' },
      { check: V.maxLen(d.fn, 50),        msg: 'Max 50 characters' },
      { check: V.noXSS(d.fn),             msg: 'Invalid characters' },
    ]},
    { id: 'mst-ln', rules: [
      { check: V.maxLen(d.ln || '', 50),  msg: 'Max 50 characters' },
    ]},
    { id: 'mst-em', rules: [
      { check: V.required(d.em),          msg: 'Email is required' },
      { check: V.email(d.em),             msg: 'Enter a valid email' },
      { check: !emailTaken,               msg: 'Email already registered' },
    ]},
    { id: 'mst-ph', rules: [
      { check: V.phone(d.ph),             msg: 'Enter a valid phone number' },
    ]},
    { id: 'mst-yr', rules: [
      { check: V.required(d.yr),          msg: 'Year is required' },
    ]},
    { id: 'mst-dept', rules: [
      { check: V.required(d.dept),        msg: 'Department is required' },
    ]},
  ]);
}

function validateFaculty(d, id = null) {
  const faculty = DB.g('faculty');
  const emailTaken = faculty.some(f => f.em === d.em && f.id !== id);
  return validateRules([
    { id: 'mf-fn', rules: [
      { check: V.required(d.fn),          msg: 'First name is required' },
      { check: V.noXSS(d.fn),             msg: 'Invalid characters' },
    ]},
    { id: 'mf-ln', rules: [
      { check: V.required(d.ln),          msg: 'Last name is required' },
    ]},
    { id: 'mf-em', rules: [
      { check: V.required(d.em),          msg: 'Email is required' },
      { check: V.email(d.em),             msg: 'Enter a valid email' },
      { check: !emailTaken,               msg: 'Email already in use' },
    ]},
    { id: 'mf-dept', rules: [
      { check: V.required(d.dept),        msg: 'Department is required' },
    ]},
  ]);
}

function validateCourse(d, id = null) {
  const courses = DB.g('courses');
  const codeTaken = courses.some(c => c.code === d.code && c.id !== id);
  return validateRules([
    { id: 'mc-code', rules: [
      { check: V.required(d.code),        msg: 'Course code is required' },
      { check: V.maxLen(d.code, 10),      msg: 'Max 10 characters' },
      { check: !codeTaken,                msg: 'Course code already exists' },
    ]},
    { id: 'mc-name', rules: [
      { check: V.required(d.name),        msg: 'Course name is required' },
    ]},
    { id: 'mc-cr', rules: [
      { check: V.numeric(d.cr),           msg: 'Credits must be a number' },
      { check: V.range(d.cr, 1, 6),       msg: 'Credits must be 1–6' },
    ]},
    { id: 'mc-seats', rules: [
      { check: V.numeric(d.seats),        msg: 'Seats must be a number' },
      { check: V.range(d.seats, 1, 300),  msg: 'Seats must be 1–300' },
    ]},
  ]);
}

function validateEnrollment(sid, cid, sem) {
  const enrollments = DB.g('enrollments');
  const courses = DB.g('courses');
  const course = courses.find(c => c.id === cid);

  // Already enrolled?
  const already = enrollments.some(e => e.sid === sid && e.cid === cid && e.sem === sem);
  if (already) return 'Already enrolled in this course';

  if (!course) return 'Course not found';

  // Seat availability (including waitlist logic handled separately)
  const enrolled = enrollments.filter(e => e.cid === cid && e.sem === sem && e.status === 'Active').length;
  if (enrolled >= course.seats) {
    // Check waitlist
    const waitlist = DB.g('waitlist').filter(w => w.cid === cid && w.sem === sem);
    if (waitlist.length >= C.ENROLLMENT.WAITLIST_LIMIT) return 'Course is full and waitlist is at capacity';
    return 'WAITLIST'; // caller will handle
  }

  // Credit limit check
  const currentCredits = stuCredits(sid, sem);
  const newCredits = currentCredits + (course.cr || 0);
  if (newCredits > C.ENROLLMENT.MAX_CREDITS) {
    return `Exceeds max credit limit (${C.ENROLLMENT.MAX_CREDITS}). Current: ${currentCredits}, Adding: ${course.cr}`;
  }

  // Prerequisite check
  if (course.prereqs && course.prereqs.length) {
    const studentGrades = DB.g('grades').filter(g => g.sid === sid);
    const passed = course.prereqs.every(prereqCid => {
      const g = studentGrades.find(x => x.cid === prereqCid);
      return g && grade(g.marks) !== 'F';
    });
    if (!passed) {
      const prereqNames = course.prereqs.map(id => cc(id)).join(', ');
      return `Prerequisites not met: ${prereqNames}`;
    }
  }

  // Time conflict check
  const studentEnrolls = enrollments.filter(e => e.sid === sid && e.sem === sem && e.status === 'Active');
  if (course.schedule) {
    const conflict = studentEnrolls.some(e => {
      const ec = courses.find(c => c.id === e.cid);
      return ec?.schedule && schedulesConflict(course.schedule, ec.schedule);
    });
    if (conflict) return 'Schedule conflict with another enrolled course';
  }

  return null; // no error
}

function schedulesConflict(a, b) {
  if (!a || !b || !a.days || !b.days) return false;
  const dayOverlap = a.days.some(d => b.days.includes(d));
  if (!dayOverlap) return false;
  // Simple time overlap check (HH:MM strings)
  const [as, ae] = [a.start, a.end];
  const [bs, be] = [b.start, b.end];
  return as < be && ae > bs;
}

function validateFee(d) {
  return validateRules([
    { id: 'mfe-sid', rules: [
      { check: V.required(d.sid), msg: 'Student is required' },
    ]},
    { id: 'mfe-type', rules: [
      { check: V.required(d.type), msg: 'Fee type is required' },
    ]},
    { id: 'mfe-amt', rules: [
      { check: V.numeric(d.amt),       msg: 'Amount must be a number' },
      { check: V.range(d.amt, 1, 1e7), msg: 'Enter a valid amount' },
    ]},
    { id: 'mfe-due', rules: [
      { check: V.date(d.due), msg: 'Due date is required' },
    ]},
  ]);
}

function validateLeaveRequest(d) {
  return validateRules([
    { id: 'sl-cid', rules: [
      { check: V.required(d.cid), msg: 'Course is required' },
    ]},
    { id: 'sl-from', rules: [
      { check: V.date(d.from), msg: 'Start date is required' },
    ]},
    { id: 'sl-to', rules: [
      { check: V.date(d.to), msg: 'End date is required' },
      { check: !d.from || !d.to || d.to >= d.from, msg: 'End date must be after start date' },
    ]},
    { id: 'sl-reason', rules: [
      { check: V.required(d.reason),     msg: 'Reason is required' },
      { check: V.minLen(d.reason, 10),   msg: 'Reason must be at least 10 characters' },
      { check: V.noXSS(d.reason),        msg: 'Invalid characters in reason' },
    ]},
  ]);
}

function validateExam(d) {
  return validateRules([
    { id: 'me-cid', rules: [
      { check: V.required(d.cid), msg: 'Course is required' },
    ]},
    { id: 'me-date', rules: [
      { check: V.date(d.date), msg: 'Exam date is required' },
    ]},
    { id: 'me-time', rules: [
      { check: V.required(d.time), msg: 'Time is required' },
    ]},
    { id: 'me-hall', rules: [
      { check: V.required(d.hall), msg: 'Hall is required' },
    ]},
    { id: 'me-dur', rules: [
      { check: V.numeric(d.dur),        msg: 'Duration must be a number' },
      { check: V.range(d.dur, 30, 360), msg: 'Duration must be 30–360 minutes' },
    ]},
  ]);
}

function validateAnnouncement(d) {
  return validateRules([
    { id: 'ma-title', rules: [
      { check: V.required(d.title),    msg: 'Title is required' },
      { check: V.maxLen(d.title, 100), msg: 'Max 100 characters' },
      { check: V.noXSS(d.title),       msg: 'Invalid characters' },
    ]},
    { id: 'ma-body', rules: [
      { check: V.required(d.body),     msg: 'Body is required' },
      { check: V.noXSS(d.body),        msg: 'Invalid characters' },
    ]},
  ]);
}

function validateAssignment(d) {
  return validateRules([
    { id: 'mas-cid', rules: [
      { check: V.required(d.cid), msg: 'Course is required' },
    ]},
    { id: 'mas-title', rules: [
      { check: V.required(d.title),    msg: 'Title is required' },
      { check: V.noXSS(d.title),       msg: 'Invalid characters' },
    ]},
    { id: 'mas-due', rules: [
      { check: V.date(d.due), msg: 'Due date is required' },
    ]},
    { id: 'mas-marks', rules: [
      { check: V.numeric(d.marks),        msg: 'Marks must be a number' },
      { check: V.range(d.marks, 1, 1000), msg: 'Must be 1–1000' },
    ]},
  ]);
}

function validateGradeAppeal(d) {
  return validateRules([
    { id: 'gap-reason', rules: [
      { check: V.required(d.reason),    msg: 'Reason is required' },
      { check: V.minLen(d.reason, 20),  msg: 'Please provide at least 20 characters' },
      { check: V.noXSS(d.reason),       msg: 'Invalid characters' },
    ]},
  ]);
}
