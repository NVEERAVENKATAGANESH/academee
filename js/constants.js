// ════════════════════════════════════════════════════════
//  CONSTANTS  —  single source of truth for all config
// ════════════════════════════════════════════════════════

const C = {
  // ── Grading ──────────────────────────────────────────
  GRADE: {
    A: 90, B: 80, C: 70, D: 60,   // min marks for grade
    GPA: { A: 4.0, B: 3.0, C: 2.0, D: 1.0, F: 0.0 },
    LABELS: { A: 'Excellent', B: 'Good', C: 'Average', D: 'Below Average', F: 'Fail' },
  },

  // ── Academic Standing ─────────────────────────────────
  STANDING: {
    DEANS_LIST:  3.7,   // GPA ≥ this → Dean's List
    GOOD:        2.0,   // GPA ≥ this → Good Standing
    PROBATION:   1.5,   // GPA ≥ this → Academic Probation
    // below PROBATION → Risk of Dismissal
  },

  // ── Enrollment ───────────────────────────────────────
  ENROLLMENT: {
    MIN_CREDITS: 9,     // minimum credits per semester
    MAX_CREDITS: 21,    // maximum credits per semester
    WAITLIST_LIMIT: 10, // max waitlist per course
  },

  // ── Attendance ───────────────────────────────────────
  ATTENDANCE: {
    WARNING_PCT:  75,   // below this → warning
    RESTRICT_PCT: 60,   // below this → exam restriction
    MAX_CLASSES:  30,   // typical classes per course
  },

  // ── Session ──────────────────────────────────────────
  SESSION: {
    TIMEOUT_MS: 30 * 60 * 1000,  // 30 minutes inactivity
    KEY: 'acs_session',
  },

  // ── DB / Storage ─────────────────────────────────────
  DB: {
    PREFIX: 'acs_',
    VERSION: 'v6',
    MAX_AUDIT: 100,
  },

  // ── Semester ─────────────────────────────────────────
  SEMESTER: {
    CURRENT: 'Spring 2026',
    START: '2026-01-12',
    END:   '2026-05-08',
    MID:   '2026-03-02',
  },

  // ── Pagination ───────────────────────────────────────
  PAGE_SIZE: 10,

  // ── Academic Halls ───────────────────────────────────
  HALLS: ['Hall A', 'Hall B', 'Hall C', 'Hall D', 'Auditorium'],

  // ── Departments ──────────────────────────────────────
  DEPT_COLORS: [
    'var(--blue)', 'var(--purple)', 'var(--green)',
    'var(--amber)', 'var(--teal)', 'var(--orange)'
  ],

  // ── Leave Types ──────────────────────────────────────
  LEAVE_TYPES: ['Medical', 'Personal', 'Family', 'Academic', 'Emergency'],

  // ── Fee Types ────────────────────────────────────────
  FEE_TYPES: ['Tuition', 'Library', 'Lab', 'Hostel', 'Transport', 'Sports', 'Exam'],

  // ── Announcement Priorities ───────────────────────────
  ANN_PRIORITIES: ['Normal', 'High', 'Urgent'],

  // ── Event Types ──────────────────────────────────────
  EVENT_TYPES: ['Event', 'Exam', 'Holiday', 'Deadline', 'Meeting'],
};
