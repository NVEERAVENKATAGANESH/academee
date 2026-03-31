# Academe — Academic Management System

A fully client-side academic management platform for educational institutions. No backend, no server — runs entirely in the browser using localStorage.

**Live demo:** [nveeravenkataganesh.github.io/academee](https://nveeravenkataganesh.github.io/academee/)

---

## What It Does

Academe is an Academic Management System that lets educational institutions manage students, faculty, courses, grades, attendance, fees, and more — all from a single web app with zero setup.

Three role-based portals:
- **Admin** — full control over students, faculty, courses, enrollments, fees, reports, and system settings
- **Faculty** — manage courses, enter grades, mark attendance, handle assignments and leave requests
- **Student** — view courses, grades, attendance, fees, generate transcripts and hall tickets

---

## Tech Stack

| Layer | Technology |
|---|---|
| Structure | HTML5 |
| Styling | CSS3 (custom design system, dark/light theme) |
| Logic | Vanilla JavaScript (ES6+) |
| Charts | [Chart.js 4.4](https://www.chartjs.org/) |
| PDF generation | [jsPDF](https://github.com/parallax/jsPDF) |
| Password hashing | [CryptoJS SHA-256](https://github.com/brix/crypto-js) |
| Storage | Browser `localStorage` |
| PWA | Service Worker + Web App Manifest |
| Fonts | Geist (Google Fonts) |
| Hosting | GitHub Pages |

---

## Features

### General
- Dark / light theme toggle
- Installable PWA (works offline)
- Responsive layout
- Toast notifications
- Audit log for all key actions
- Cookie consent notice
- Privacy Policy, Terms of Service, Data Handling modals

### Admin Portal
- Dashboard with live charts (enrollment trends, grade distribution, fee collection)
- Student management — add, edit, delete, search, filter
- Faculty management — profiles, departments, qualifications
- Course management — create courses, assign faculty
- Enrollment — enroll students into courses
- Grades — view and manage all student grades
- Attendance — track student attendance records
- Exams — schedule and manage exams
- Leave Requests — approve / reject leave applications
- Fees — manage fee records, payment status
- Scholarships — track scholarship awards
- Announcements & Messages
- Academic Calendar
- Reports — generate summary reports
- User Accounts — manage all system users
- Audit Log — view all system activity
- Data Export — export data as CSV

### Faculty Portal
- Dashboard with grade distribution chart
- My Courses — view assigned courses
- Enter Grades — grade students per course
- Mark Attendance — record daily attendance
- Assignments — create and track assignments
- Leave Requests — apply for leave
- Messages

### Student Portal
- Dashboard — GPA, attendance, upcoming exams
- My Courses — enrolled course list
- Grades & GPA — semester-wise grade view
- Attendance — per-course attendance percentage
- Assignments — view and track submissions
- Grade Calculator — simulate GPA scenarios
- Transcript — generate official transcript (PDF)
- Hall Ticket — download exam hall ticket (PDF)
- Course Wishlist
- My Fees — fee status and payment history
- Achievements
- Apply Leave

---

## Demo Accounts

Sign in at the landing page using demo credentials:

You can also **Sign Up** to create your own account. Credentials are saved in `localStorage` and persist across sessions.

---

## Project Structure

```
Academe/
├── index.html          # App shell + all page templates
├── css/
│   └── style.css       # Complete design system
├── js/
│   ├── constants.js    # App-wide config (grades, departments, etc.)
│   ├── db.js           # localStorage abstraction layer
│   ├── state.js        # Centralized state management
│   ├── utils.js        # Helper functions and formatters
│   ├── validation.js   # Form validation
│   ├── ui.js           # Shared UI components (modals, toasts, tables)
│   ├── charts.js       # Chart.js wrapper
│   ├── pdf.js          # PDF generation (transcripts, hall tickets)
│   ├── seed.js         # Demo data seeding on first load
│   ├── auth.js         # Authentication (login, signup, session)
│   ├── admin.js        # Admin portal pages
│   ├── faculty.js      # Faculty portal pages
│   ├── student.js      # Student portal pages
│   └── app.js          # Routing, navigation, profile pages
├── icons/
│   └── icon.svg        # PWA app icon
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker (offline support)
├── robots.txt          # Search engine directives
└── sitemap.xml         # Sitemap for SEO
```

---

## Data & Privacy

All data is stored locally in your browser's `localStorage` — nothing is sent to any server. Clearing browser data will reset the app to its seeded demo state.

---

## License

MIT — free to use, modify, and distribute.
