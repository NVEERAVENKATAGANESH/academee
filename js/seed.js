// ════════════════════════════════════════════════════════
//  SEED  —  demo data (runs once on first load)
//           Each password hash includes username as salt:
//           hashPw(password, username)
//           admin123, faculty123, student123
// ════════════════════════════════════════════════════════
function seed() {
  if (DB.isSeeded()) return;

  // Per-user hashes — username is mixed in as salt
  DB.s('users', [
    {id:1,  u:'admin',    p:Auth.hashPw('admin123',   'admin'),    role:'admin',   lid:null, name:'Admin'},
    {id:2,  u:'srk',      p:Auth.hashPw('faculty123', 'srk'),      role:'faculty', lid:1,    name:'Shah Rukh Khan'},
    {id:3,  u:'priyanka', p:Auth.hashPw('faculty123', 'priyanka'), role:'faculty', lid:2,    name:'Priyanka Chopra'},
    {id:4,  u:'rajini',   p:Auth.hashPw('faculty123', 'rajini'),   role:'faculty', lid:3,    name:'Rajini Kanth'},
    {id:5,  u:'rashmika', p:Auth.hashPw('faculty123', 'rashmika'), role:'faculty', lid:4,    name:'Rashmika Mandanna'},
    {id:6,  u:'prabhas',  p:Auth.hashPw('student123', 'prabhas'),  role:'student', lid:1,    name:'Prabhas'},
    {id:7,  u:'katrina',  p:Auth.hashPw('student123', 'katrina'),  role:'student', lid:2,    name:'Katrina Kaif'},
    {id:8,  u:'allu',     p:Auth.hashPw('student123', 'allu'),     role:'student', lid:3,    name:'Allu Arjun'},
    {id:9,  u:'samantha', p:Auth.hashPw('student123', 'samantha'), role:'student', lid:4,    name:'Samantha Prabhu'},
    {id:10, u:'yash',     p:Auth.hashPw('student123', 'yash'),     role:'student', lid:5,    name:'Yash'},
    {id:11, u:'mrunal',   p:Auth.hashPw('student123', 'mrunal'),   role:'student', lid:6,    name:'Mrunal Thakur'},
    {id:12, u:'ram',      p:Auth.hashPw('student123', 'ram'),      role:'student', lid:7,    name:'Ram Charan'},
    {id:13, u:'nani',     p:Auth.hashPw('student123', 'nani'),     role:'student', lid:8,    name:'Nani'},
    {id:14, u:'pawan',    p:Auth.hashPw('student123', 'pawan'),    role:'student', lid:9,    name:'Pawan Kalyan'},
    {id:15, u:'raashi',   p:Auth.hashPw('student123', 'raashi'),   role:'student', lid:10,   name:'Raashi Khanna'},
    {id:16, u:'ranveer',  p:Auth.hashPw('student123', 'ranveer'),  role:'student', lid:11,   name:'Ranveer Singh'},
  ]);

  DB.s('faculty', [
    {id:1, fn:'Shah Rukh', ln:'Khan',     em:'srk@uni.edu',      ph:'555-0201', dept:'Computer Science', qual:'Ph.D.',  spec:'Algorithms',      join:'2015'},
    {id:2, fn:'Priyanka',  ln:'Chopra',   em:'priyanka@uni.edu', ph:'555-0202', dept:'Mathematics',      qual:'Ph.D.',  spec:'Linear Algebra',  join:'2017'},
    {id:3, fn:'Rajini',    ln:'Kanth',    em:'rajini@uni.edu',   ph:'555-0203', dept:'Physics',          qual:'M.Sc.',  spec:'Mechanics',       join:'2012'},
    {id:4, fn:'Rashmika',  ln:'Mandanna', em:'rashmika@uni.edu', ph:'555-0204', dept:'Business',         qual:'MBA',    spec:'Finance',         join:'2019'},
  ]);

  DB.s('students', [
    {id:1,  fn:'Prabhas',  ln:'',          em:'prabhas@uni.edu',   ph:'555-0101', dept:'Computer Science', yr:'2', dob:'2003-05-12', status:'Active',   addr:'12 Main St',   adm:'2024'},
    {id:2,  fn:'Katrina',  ln:'Kaif',      em:'katrina@uni.edu',   ph:'555-0102', dept:'Mathematics',      yr:'3', dob:'2002-08-22', status:'Active',   addr:'45 Oak Ave',   adm:'2023'},
    {id:3,  fn:'Allu',     ln:'Arjun',     em:'allu@uni.edu',      ph:'555-0103', dept:'Computer Science', yr:'1', dob:'2004-01-15', status:'Active',   addr:'78 Pine Rd',   adm:'2025'},
    {id:4,  fn:'Samantha', ln:'Prabhu',    em:'samantha@uni.edu',  ph:'555-0104', dept:'Physics',          yr:'4', dob:'2001-11-30', status:'Active',   addr:'33 Elm St',    adm:'2022'},
    {id:5,  fn:'Yash',     ln:'',          em:'yash@uni.edu',      ph:'555-0105', dept:'Business',         yr:'2', dob:'2003-03-18', status:'Active',   addr:'90 Maple Dr',  adm:'2024'},
    {id:6,  fn:'Mrunal',   ln:'Thakur',    em:'mrunal@uni.edu',    ph:'555-0106', dept:'Computer Science', yr:'3', dob:'2002-06-07', status:'Active',   addr:'14 Oak St',    adm:'2023'},
    {id:7,  fn:'Ram',      ln:'Charan',    em:'ram@uni.edu',       ph:'555-0107', dept:'Engineering',      yr:'2', dob:'2003-09-20', status:'Inactive', addr:'67 Birch Ln',  adm:'2024'},
    {id:8,  fn:'Nani',     ln:'',          em:'nani@uni.edu',      ph:'555-0108', dept:'Mathematics',      yr:'1', dob:'2004-02-10', status:'Active',   addr:'22 Cedar St',  adm:'2025'},
    {id:9,  fn:'Pawan',    ln:'Kalyan',    em:'pawan@uni.edu',     ph:'555-0109', dept:'Business',         yr:'3', dob:'2002-09-02', status:'Active',   addr:'55 River Rd',  adm:'2023'},
    {id:10, fn:'Raashi',   ln:'Khanna',    em:'raashi@uni.edu',    ph:'555-0110', dept:'Computer Science', yr:'2', dob:'2003-07-05', status:'Active',   addr:'18 Hill Ave',  adm:'2024'},
    {id:11, fn:'Ranveer',  ln:'Singh',     em:'ranveer@uni.edu',   ph:'555-0111', dept:'Business',         yr:'1', dob:'2004-04-20', status:'Active',   addr:'99 Park Blvd', adm:'2025'},
  ]);

  DB.s('depts', [
    {id:1, name:'Computer Science', code:'CS',   hod:1, budget:500000},
    {id:2, name:'Mathematics',      code:'MATH', hod:2, budget:300000},
    {id:3, name:'Physics',          code:'PHY',  hod:3, budget:350000},
    {id:4, name:'Business',         code:'BUS',  hod:4, budget:450000},
    {id:5, name:'Engineering',      code:'ENG',  hod:1, budget:600000},
  ]);

  DB.s('courses', [
    {id:1, code:'CS101',  name:'Intro to Programming',  dept:'Computer Science', fid:1, cr:3, seats:40, sem:C.SEMESTER.CURRENT, desc:'Python fundamentals and problem solving', prereqs:[], schedule:{days:['Mon','Wed'], start:'09:00', end:'10:30'}},
    {id:2, code:'CS201',  name:'Data Structures',       dept:'Computer Science', fid:1, cr:4, seats:35, sem:C.SEMESTER.CURRENT, desc:'Trees, graphs, sorting algorithms',       prereqs:[1], schedule:{days:['Tue','Thu'], start:'11:00', end:'12:30'}},
    {id:3, code:'MATH101',name:'Calculus I',             dept:'Mathematics',      fid:2, cr:4, seats:50, sem:C.SEMESTER.CURRENT, desc:'Limits, derivatives and integrals',       prereqs:[], schedule:{days:['Mon','Wed','Fri'], start:'08:00', end:'09:00'}},
    {id:4, code:'PHY101', name:'Classical Mechanics',   dept:'Physics',          fid:3, cr:3, seats:30, sem:C.SEMESTER.CURRENT, desc:'Newtonian mechanics and motion',          prereqs:[], schedule:{days:['Tue','Thu'], start:'09:00', end:'10:30'}},
    {id:5, code:'CS301',  name:'Database Systems',      dept:'Computer Science', fid:1, cr:3, seats:30, sem:C.SEMESTER.CURRENT, desc:'SQL, relational DB and query optimization',prereqs:[1,2], schedule:{days:['Mon','Wed'], start:'14:00', end:'15:30'}},
    {id:6, code:'BUS201', name:'Financial Accounting',  dept:'Business',         fid:4, cr:3, seats:45, sem:C.SEMESTER.CURRENT, desc:'Financial reporting and statements',      prereqs:[], schedule:{days:['Tue','Thu'], start:'14:00', end:'15:30'}},
    {id:7, code:'CS401',  name:'Machine Learning',      dept:'Computer Science', fid:1, cr:4, seats:25, sem:C.SEMESTER.CURRENT, desc:'Supervised and unsupervised learning',   prereqs:[2,5], schedule:{days:['Mon','Wed'], start:'16:00', end:'17:30'}},
    {id:8, code:'MATH201',name:'Calculus II',            dept:'Mathematics',      fid:2, cr:4, seats:40, sem:C.SEMESTER.CURRENT, desc:'Integration techniques and series',      prereqs:[3], schedule:{days:['Tue','Thu'], start:'08:00', end:'09:30'}},
  ]);

  DB.s('enrollments', [
    {id:1,  sid:1, cid:1, sem:C.SEMESTER.CURRENT, status:'Active'},
    {id:2,  sid:1, cid:2, sem:C.SEMESTER.CURRENT, status:'Active'},
    {id:3,  sid:1, cid:3, sem:C.SEMESTER.CURRENT, status:'Active'},
    {id:4,  sid:2, cid:3, sem:C.SEMESTER.CURRENT, status:'Active'},
    {id:5,  sid:2, cid:4, sem:C.SEMESTER.CURRENT, status:'Active'},
    {id:6,  sid:3, cid:1, sem:C.SEMESTER.CURRENT, status:'Active'},
    {id:7,  sid:4, cid:4, sem:C.SEMESTER.CURRENT, status:'Active'},
    {id:8,  sid:5, cid:6, sem:C.SEMESTER.CURRENT, status:'Active'},
    {id:9,  sid:3, cid:2, sem:C.SEMESTER.CURRENT, status:'Active'},
    {id:10, sid:6, cid:1, sem:C.SEMESTER.CURRENT, status:'Active'},
    {id:11, sid:6, cid:5, sem:C.SEMESTER.CURRENT, status:'Active'},
    {id:12, sid:9, cid:6, sem:C.SEMESTER.CURRENT, status:'Active'},
    {id:13, sid:10,cid:1, sem:C.SEMESTER.CURRENT, status:'Active'},
    {id:14, sid:10,cid:3, sem:C.SEMESTER.CURRENT, status:'Active'},
    {id:15, sid:11,cid:6, sem:C.SEMESTER.CURRENT, status:'Active'},
  ]);

  DB.s('grades', [
    {id:1,  sid:1, cid:1, marks:88, sem:C.SEMESTER.CURRENT},
    {id:2,  sid:1, cid:2, marks:74, sem:C.SEMESTER.CURRENT},
    {id:3,  sid:1, cid:3, marks:92, sem:C.SEMESTER.CURRENT},
    {id:4,  sid:2, cid:3, marks:81, sem:C.SEMESTER.CURRENT},
    {id:5,  sid:2, cid:4, marks:66, sem:C.SEMESTER.CURRENT},
    {id:6,  sid:3, cid:1, marks:55, sem:C.SEMESTER.CURRENT},
    {id:7,  sid:4, cid:4, marks:78, sem:C.SEMESTER.CURRENT},
    {id:8,  sid:5, cid:6, marks:91, sem:C.SEMESTER.CURRENT},
    {id:9,  sid:3, cid:2, marks:62, sem:C.SEMESTER.CURRENT},
    {id:10, sid:6, cid:1, marks:95, sem:C.SEMESTER.CURRENT},
    {id:11, sid:6, cid:5, marks:87, sem:C.SEMESTER.CURRENT},
    {id:12, sid:9, cid:6, marks:73, sem:C.SEMESTER.CURRENT},
    {id:13, sid:10,cid:1, marks:84, sem:C.SEMESTER.CURRENT},
    {id:14, sid:10,cid:3, marks:79, sem:C.SEMESTER.CURRENT},
    {id:15, sid:11,cid:6, marks:90, sem:C.SEMESTER.CURRENT},
  ]);

  DB.s('attendance', [
    {id:1,  sid:1,  cid:1, pres:18, tot:20},
    {id:2,  sid:1,  cid:2, pres:14, tot:20},
    {id:3,  sid:1,  cid:3, pres:20, tot:20},
    {id:4,  sid:2,  cid:3, pres:16, tot:20},
    {id:5,  sid:2,  cid:4, pres:12, tot:20},
    {id:6,  sid:3,  cid:1, pres:9,  tot:20},
    {id:7,  sid:4,  cid:4, pres:19, tot:20},
    {id:8,  sid:5,  cid:6, pres:17, tot:20},
    {id:9,  sid:3,  cid:2, pres:15, tot:20},
    {id:10, sid:6,  cid:1, pres:20, tot:20},
    {id:11, sid:6,  cid:5, pres:18, tot:20},
    {id:12, sid:9,  cid:6, pres:15, tot:20},
    {id:13, sid:10, cid:1, pres:17, tot:20},
    {id:14, sid:10, cid:3, pres:19, tot:20},
    {id:15, sid:11, cid:6, pres:11, tot:20},
  ]);

  DB.s('fees', [
    {id:1,  sid:1,  type:'Tuition', amt:5000, due:'2026-02-15', status:'Paid',    paid:'2026-02-10'},
    {id:2,  sid:1,  type:'Library', amt:100,  due:'2026-02-15', status:'Paid',    paid:'2026-02-10'},
    {id:3,  sid:1,  type:'Lab',     amt:200,  due:'2026-03-01', status:'Paid',    paid:'2026-02-28'},
    {id:4,  sid:2,  type:'Tuition', amt:5000, due:'2026-02-15', status:'Pending', paid:''},
    {id:5,  sid:3,  type:'Tuition', amt:5000, due:'2026-02-15', status:'Overdue', paid:''},
    {id:6,  sid:4,  type:'Tuition', amt:5000, due:'2026-02-15', status:'Paid',    paid:'2026-02-08'},
    {id:7,  sid:5,  type:'Tuition', amt:5000, due:'2026-02-15', status:'Paid',    paid:'2026-02-12'},
    {id:8,  sid:6,  type:'Tuition', amt:5000, due:'2026-02-15', status:'Pending', paid:''},
    {id:9,  sid:9,  type:'Tuition', amt:5000, due:'2026-02-15', status:'Paid',    paid:'2026-02-05'},
    {id:10, sid:10, type:'Tuition', amt:5000, due:'2026-02-15', status:'Overdue', paid:''},
    {id:11, sid:11, type:'Tuition', amt:5000, due:'2026-02-15', status:'Pending', paid:''},
  ]);

  DB.s('scholarships', [
    {id:1, sid:6,  name:'Merit Scholarship',  amt:2000, crit:'GPA ≥ 3.5',         status:'Active'},
    {id:2, sid:1,  name:'Sports Excellence',  amt:1000, crit:'Sports achievement', status:'Active'},
    {id:3, sid:4,  name:'Need-Based Grant',   amt:1500, crit:'Financial need',     status:'Active'},
  ]);

  DB.s('exams', [
    {id:1, cid:1, date:'2026-04-27', time:'09:00', hall:'Hall A', dur:120},
    {id:2, cid:2, date:'2026-04-29', time:'14:00', hall:'Hall B', dur:180},
    {id:3, cid:3, date:'2026-05-01', time:'09:00', hall:'Hall A', dur:120},
    {id:4, cid:5, date:'2026-05-04', time:'10:00', hall:'Hall C', dur:150},
    {id:5, cid:4, date:'2026-05-05', time:'09:00', hall:'Hall B', dur:120},
    {id:6, cid:6, date:'2026-05-06', time:'14:00', hall:'Hall D', dur:120},
  ]);

  DB.s('announcements', [
    {id:1, title:'Spring 2026 Final Exam Schedule', body:'Final exams begin April 27. Please review the timetable on the portal and ensure your hall ticket is downloaded.',                    aud:'All',      pri:'High',   date:'2026-03-20', author:'Admin'},
    {id:2, title:'Library Extended Hours',          body:'Library will be open until 11 PM during exam prep week (Apr 20–26). Silence must be maintained in all reading rooms.',              aud:'Students', pri:'Normal', date:'2026-03-18', author:'Admin'},
    {id:3, title:'Faculty Meeting — Friday',        body:'Mandatory faculty meeting in Conference Room B at 3 PM. Attendance is compulsory. Please bring grade submission reports.',          aud:'Faculty',  pri:'Urgent', date:'2026-03-15', author:'Admin'},
    {id:4, title:'Fee Payment Reminder',            body:'Tuition fees for Spring 2026 are due by February 15. Students with overdue fees may be blocked from exam registration.',           aud:'Students', pri:'High',   date:'2026-02-01', author:'Admin'},
    {id:5, title:'Campus Placement Drive',          body:'TechCorp and FinanceHub will be visiting campus on April 9 for placement. Final-year students are encouraged to register by Apr 4.',aud:'Students', pri:'Normal', date:'2026-03-25', author:'Admin'},
  ]);

  DB.s('assignments', [
    {id:1, cid:1, title:'Python Basics Quiz',          due:'2026-02-28', marks:20,  wt:10, inst:'Complete all 20 questions. Covers variables, loops and functions.'},
    {id:2, cid:2, title:'Binary Tree Implementation',  due:'2026-03-10', marks:50,  wt:20, inst:'Implement insert, delete and search. Include time complexity analysis.'},
    {id:3, cid:3, title:'Differentiation Problem Set', due:'2026-03-15', marks:30,  wt:15, inst:'Solve problems 1–20 from Chapter 4. Show all working steps.'},
    {id:4, cid:5, title:'ER Diagram Assignment',       due:'2026-03-20', marks:40,  wt:25, inst:'Design a complete database schema for a library management system.'},
    {id:5, cid:1, title:'OOP Mini Project',            due:'2026-04-05', marks:100, wt:30, inst:'Build a small OOP project (e.g., bank system, inventory). Include UML diagram.'},
    {id:6, cid:6, title:'Financial Statement Analysis',due:'2026-04-01', marks:60,  wt:20, inst:'Analyse provided P&L and balance sheet. Prepare ratio analysis report.'},
  ]);

  DB.s('submissions', []);

  DB.s('leaves', [
    {id:1, sid:3,  cid:1, from:'2026-02-20', to:'2026-02-22', reason:'Medical appointment — doctor visit for chronic condition.', type:'Medical', status:'Pending',  date:'2026-02-18'},
    {id:2, sid:2,  cid:3, from:'2026-02-15', to:'2026-02-16', reason:'Family event — sister wedding.',                             type:'Family',  status:'Approved', date:'2026-02-12'},
    {id:3, sid:1,  cid:2, from:'2026-02-10', to:'2026-02-10', reason:'Doctor visit for annual check-up.',                          type:'Medical', status:'Rejected', date:'2026-02-08'},
  ]);

  DB.s('appeals', []);

  DB.s('waitlist', []);

  DB.s('events', [
    {id:1, title:'Spring Semester Begins',        date:'2026-01-12', type:'Event'},
    {id:2, title:'Mid-term Exams',                date:'2026-03-02', type:'Exam'},
    {id:3, title:'Spring Break',                  date:'2026-03-16', type:'Holiday'},
    {id:4, title:'Final Exams Begin',             date:'2026-04-27', type:'Exam'},
    {id:5, title:'Summer Break',                  date:'2026-05-11', type:'Holiday'},
    {id:6, title:'Assignment — CS101 Python Quiz',date:'2026-02-28', type:'Deadline'},
    {id:7, title:'Assignment — CS201 Binary Tree',date:'2026-03-10', type:'Deadline'},
    {id:8, title:'Campus Placement Drive',        date:'2026-04-09', type:'Event'},
  ]);

  DB.s('messages', [
    {id:1, from:'prabhas',  to:'srk',      fromRole:'student', toRole:'faculty', text:'Hello sir, when is the next assignment due?',                  ts:Date.now()-3600000},
    {id:2, from:'srk',      to:'prabhas',  fromRole:'faculty', toRole:'student', text:'Hi Prabhas, the OOP assignment is due April 5.',               ts:Date.now()-1800000},
    {id:3, from:'prabhas',  to:'srk',      fromRole:'student', toRole:'faculty', text:'Thank you, sir!',                                               ts:Date.now()-900000},
    {id:4, from:'katrina',  to:'priyanka', fromRole:'student', toRole:'faculty', text:'Can you clarify the differentiation assignment requirements?',  ts:Date.now()-7200000},
    {id:5, from:'priyanka', to:'katrina',  fromRole:'faculty', toRole:'student', text:'Sure Katrina, show all working steps for each problem.',        ts:Date.now()-5400000},
  ]);

  DB.s('notifications', [
    {id:1, title:'Grade Released',     body:'Your CS101 grade has been posted — 88/100 (B+).',          tag:'grade',      read:false, uid:6,  ts:Date.now()-7200000},
    {id:2, title:'Fee Overdue',        body:'Your tuition fee for Spring 2026 is overdue.',              tag:'fee',        read:false, uid:3,  ts:Date.now()-86400000},
    {id:3, title:'New Assignment',     body:'Binary Tree Implementation due March 10.',                  tag:'assign',     read:false, uid:6,  ts:Date.now()-43200000},
    {id:4, title:'Attendance Warning', body:'Your CS201 attendance is 70% — below the 75% threshold.',  tag:'attendance', read:false, uid:6,  ts:Date.now()-3600000},
    {id:5, title:'New Announcement',   body:'Final exam schedule has been posted.',                      tag:'announce',   read:false, uid:6,  ts:Date.now()-1800000},
    {id:6, title:'Grade Released',     body:'Your MATH101 grade has been posted — 81/100 (B).',         tag:'grade',      read:false, uid:7,  ts:Date.now()-7200000},
    {id:7, title:'Leave Approved',     body:'Your leave request for Feb 15–16 has been approved.',      tag:'leave',      read:false, uid:7,  ts:Date.now()-3600000},
  ]);

  DB.s('wishlist', []);

  DB.s('audit', [
    {id:1, action:'Student Added',    detail:'Prabhas added to system',                      user:'admin', ts:Date.now()-86400000*3, color:'var(--green)'},
    {id:2, action:'Grade Updated',    detail:'CS101 grade updated for Prabhas',              user:'srk',   ts:Date.now()-86400000*2, color:'var(--blue)'},
    {id:3, action:'Fee Recorded',     detail:'Tuition fee recorded for Katrina Kaif',        user:'admin', ts:Date.now()-86400000,   color:'var(--amber)'},
    {id:4, action:'Enrollment Added', detail:'Mrunal Thakur enrolled in BUS201',             user:'admin', ts:Date.now()-3600000*4,  color:'var(--purple)'},
    {id:5, action:'Exam Scheduled',   detail:'CS101 exam scheduled for April 27',            user:'admin', ts:Date.now()-3600000,    color:'var(--teal)'},
    {id:6, action:'Leave Approved',   detail:'Leave request approved for Katrina Kaif',      user:'srk',   ts:Date.now()-1800000,    color:'var(--green)'},
    {id:7, action:'Scholarship Added',detail:'Merit Scholarship awarded to Mrunal Thakur',   user:'admin', ts:Date.now()-900000,     color:'var(--amber)'},
  ]);

  DB.markSeeded();
}
