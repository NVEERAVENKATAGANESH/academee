// ════════════════════════════════════════════════════════
//  PDF  —  client-side PDF generation via jsPDF
// ════════════════════════════════════════════════════════

const PDF = (() => {
  function _doc() {
    // jsPDF loaded via CDN
    return new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
  }

  function _header(doc, title, subtitle = '') {
    // Background header bar
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 28, 'F');
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 28, 210, 1.5, 'F');

    doc.setTextColor(250, 250, 250);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Academe SIS', 14, 12);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(161, 161, 170);
    doc.text('Student Information System', 14, 19);

    doc.setTextColor(250, 250, 250);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 210 - 14, 12, { align: 'right' });

    if (subtitle) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(161, 161, 170);
      doc.text(subtitle, 210 - 14, 19, { align: 'right' });
    }
  }

  function _footer(doc, pageNum = 1) {
    const y = 287;
    doc.setDrawColor(39, 39, 42);
    doc.line(14, y, 196, y);
    doc.setFontSize(8);
    doc.setTextColor(113, 113, 122);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on ${new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}`, 14, y + 4);
    doc.text(`Page ${pageNum}`, 196, y + 4, { align: 'right' });
    doc.text('This is an official Academe SIS document', 105, y + 4, { align: 'center' });
  }

  function _infoRow(doc, label, value, x1, x2, y) {
    doc.setFontSize(8);
    doc.setTextColor(113, 113, 122);
    doc.setFont('helvetica', 'normal');
    doc.text(label.toUpperCase(), x1, y);
    doc.setFontSize(10);
    doc.setTextColor(24, 24, 27);
    doc.setFont('helvetica', 'bold');
    doc.text(String(value || '—'), x2, y + 5);
  }

  // ── Transcript PDF ─────────────────────────────────────
  function transcript(sid) {
    const student = DB.g('students').find(s => s.id === sid);
    if (!student) { toast('Student not found', false); return; }

    const doc = _doc();
    _header(doc, 'Academic Transcript', C.SEMESTER.CURRENT);

    // Student info box
    let y = 36;
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(14, y, 182, 28, 2, 2, 'F');
    _infoRow(doc, 'Student Name',   `${student.fn} ${student.ln}`, 18, 18, y + 8);
    _infoRow(doc, 'Student ID',     stuId(student.id),              18, 18, y + 20);
    _infoRow(doc, 'Department',     student.dept,                   105, 105, y + 8);
    _infoRow(doc, 'Year',           `Year ${student.yr}`,           105, 105, y + 20);
    _infoRow(doc, 'Email',          student.em,                     155, 155, y + 8);
    _infoRow(doc, 'Status',         student.status,                 155, 155, y + 20);

    y += 34;

    // Grades table header
    doc.setFillColor(15, 23, 42);
    doc.rect(14, y, 182, 8, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(250, 250, 250);
    doc.text('COURSE CODE', 18, y + 5.5);
    doc.text('COURSE NAME', 45, y + 5.5);
    doc.text('CREDITS', 130, y + 5.5);
    doc.text('MARKS', 152, y + 5.5);
    doc.text('GRADE', 168, y + 5.5);
    doc.text('GPA', 183, y + 5.5);

    y += 10;
    const grades   = DB.g('grades').filter(g => g.sid === sid);
    const courses  = DB.g('courses');
    let totalPts   = 0, totalCr = 0;

    grades.forEach((g, i) => {
      const course = courses.find(c => c.id === g.cid);
      if (!course) return;
      const gr = grade(g.marks);
      const gp = gpa(g.marks);

      if (i % 2 === 0) {
        doc.setFillColor(249, 249, 250);
        doc.rect(14, y - 1, 182, 7, 'F');
      }
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(24, 24, 27);
      doc.text(esc(course.code),                14 + 4, y + 4);
      doc.text(esc(course.name).substring(0,32),45,     y + 4);
      doc.text(String(course.cr),               133,    y + 4);
      doc.text(String(g.marks),                 155,    y + 4);

      // Grade with colour
      const gradeColors = { A:[34,197,94], B:[59,130,246], C:[245,158,11], D:[249,115,22], F:[239,68,68] };
      const [r,gg,b] = gradeColors[gr] || [100,100,100];
      doc.setTextColor(r, gg, b);
      doc.setFont('helvetica', 'bold');
      doc.text(gr, 170, y + 4);
      doc.setTextColor(24, 24, 27);
      doc.setFont('helvetica', 'normal');
      doc.text(gp.toFixed(1), 185, y + 4);

      totalPts += gp * course.cr;
      totalCr  += course.cr;
      y += 8;
    });

    // GPA Summary
    y += 4;
    doc.setDrawColor(59, 130, 246);
    doc.line(14, y, 196, y);
    y += 6;

    const cumGPA = totalCr ? (totalPts / totalCr).toFixed(2) : 'N/A';
    const stand  = standing(totalCr ? totalPts / totalCr : null);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(24, 24, 27);
    doc.text(`Total Credits: ${totalCr}`, 18, y);
    doc.text(`Cumulative GPA: ${cumGPA}`, 105, y);
    doc.text(`Standing: ${stand.label}`, 155, y, { align: 'right' });

    _footer(doc);
    doc.save(`transcript_${stuId(sid)}_${Date.now()}.pdf`);
    addAudit('Transcript Downloaded', `Transcript PDF generated for ${student.fn} ${student.ln}`);
  }

  // ── Hall Ticket PDF ────────────────────────────────────
  function hallTicket(sid) {
    const student = DB.g('students').find(s => s.id === sid);
    if (!student) { toast('Student not found', false); return; }

    const enrolls = DB.g('enrollments').filter(e => e.sid === sid && e.sem === C.SEMESTER.CURRENT);
    const exams   = DB.g('exams');
    const courses = DB.g('courses');

    const doc = _doc();
    _header(doc, 'Hall Ticket', C.SEMESTER.CURRENT);

    let y = 36;

    // Warning box
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(14, y, 182, 7, 1, 1, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(146, 64, 14);
    doc.text('⚠  This hall ticket must be presented at the examination hall. Keep it safe.', 18, y + 4.5);

    y += 13;

    // Student details
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(14, y, 182, 28, 2, 2, 'F');
    _infoRow(doc, 'Student Name', `${student.fn} ${student.ln}`, 18, 18, y + 8);
    _infoRow(doc, 'Roll Number',  stuId(student.id),              18, 18, y + 20);
    _infoRow(doc, 'Department',   student.dept,                  105, 105, y + 8);
    _infoRow(doc, 'Semester',     C.SEMESTER.CURRENT,            105, 105, y + 20);

    y += 34;

    // Exam table
    doc.setFillColor(15, 23, 42);
    doc.rect(14, y, 182, 8, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(250, 250, 250);
    doc.text('COURSE', 18, y + 5.5);
    doc.text('DATE', 80, y + 5.5);
    doc.text('TIME', 115, y + 5.5);
    doc.text('HALL', 145, y + 5.5);
    doc.text('DURATION', 170, y + 5.5);

    y += 10;
    enrolls.forEach((e, i) => {
      const course = courses.find(c => c.id === e.cid);
      const exam   = exams.find(x => x.cid === e.cid);
      if (!course) return;

      if (i % 2 === 0) {
        doc.setFillColor(249, 249, 250);
        doc.rect(14, y - 1, 182, 9, 'F');
      }
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(24, 24, 27);
      doc.text(`${esc(course.code)} — ${esc(course.name).substring(0, 25)}`, 18, y + 5);
      doc.text(exam ? fmtDate(exam.date) : 'TBD',  80,  y + 5);
      doc.text(exam ? exam.time          : 'TBD',  115, y + 5);
      doc.text(exam ? esc(exam.hall)     : 'TBD',  145, y + 5);
      doc.text(exam ? `${exam.dur} min`  : 'TBD',  172, y + 5);
      y += 9;
    });

    // Signature area
    y += 10;
    doc.setDrawColor(200, 200, 200);
    doc.line(18, y + 12, 70, y + 12);
    doc.line(140, y + 12, 192, y + 12);
    doc.setFontSize(8);
    doc.setTextColor(113, 113, 122);
    doc.text("Student's Signature", 18, y + 16);
    doc.text("Controller of Examinations", 140, y + 16);

    _footer(doc);
    doc.save(`hallticket_${stuId(sid)}_${Date.now()}.pdf`);
    addAudit('Hall Ticket Downloaded', `Hall ticket PDF generated for ${student.fn} ${student.ln}`);
  }

  // ── Fee Receipt PDF ────────────────────────────────────
  function feeReceipt(feeId) {
    const fee     = DB.g('fees').find(f => f.id === feeId);
    if (!fee || fee.status !== 'Paid') { toast('No paid fee record found', false); return; }
    const student = DB.g('students').find(s => s.id === fee.sid);
    if (!student) { toast('Student not found', false); return; }

    const doc = _doc();
    _header(doc, 'Fee Receipt', `Receipt #RCP${String(fee.id).padStart(5,'0')}`);

    let y = 36;

    doc.setFillColor(240, 253, 244);
    doc.roundedRect(14, y, 182, 9, 2, 2, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(21, 128, 61);
    doc.text('✓  Payment Confirmed', 18, y + 6);

    y += 16;
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(14, y, 182, 38, 2, 2, 'F');
    _infoRow(doc, 'Student Name', `${student.fn} ${student.ln}`, 18, 18, y + 8);
    _infoRow(doc, 'Student ID',   stuId(student.id),             18, 18, y + 20);
    _infoRow(doc, 'Department',   student.dept,                  105, 105, y + 8);
    _infoRow(doc, 'Fee Type',     fee.type,                      105, 105, y + 20);
    _infoRow(doc, 'Amount Paid',  usd(fee.amt),                  18, 18, y + 32);
    _infoRow(doc, 'Payment Date', fmtDate(fee.paid),             105, 105, y + 32);

    _footer(doc);
    doc.save(`fee_receipt_${stuId(fee.sid)}_${fee.id}.pdf`);
  }

  return { transcript, hallTicket, feeReceipt };
})();
