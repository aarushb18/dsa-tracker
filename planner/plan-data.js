// Plan data for Aarush's first-year Software Developer internship prep.
// Pure data — the scheduler (scheduler.js) turns this into a day-by-day plan.

export const PLAN_START = "2026-10-01";
export const PLAN_END = "2027-07-03";

// Blocks where no day-by-day tasks are generated.
export const BLOCKS = [
  { from: "2026-10-01", to: "2026-10-04", type: "exam", label: "CAT 2 (fall) — exams only" },
  { from: "2026-11-16", to: "2026-11-30", type: "exam", label: "FAT (fall) — exams only; 1 easy problem on free days between papers is optional" },
  { from: "2027-01-24", to: "2027-01-31", type: "exam", label: "CAT 1 (winter) — exams only" },
  { from: "2027-02-11", to: "2027-02-14", type: "rest", label: "Riviera 2027 — enjoy it, no plan work" },
  { from: "2027-03-07", to: "2027-03-14", type: "exam", label: "CAT 2 (winter) — exams only" },
  { from: "2027-04-17", to: "2027-05-09", type: "exam", label: "FAT (winter) — exams only; take interview calls, nothing else" },
  { from: "2027-05-10", to: "2027-07-03", type: "internship", label: "Internship window (~8 weeks)" },
];

// Calendar reminders shown on the day itself.
export const EVENTS = [
  { date: "2026-10-01", label: "CAT 2 paper" },
  { date: "2026-10-03", label: "CAT 2 paper" },
  { date: "2026-10-04", label: "CAT 2 paper" },
  { date: "2026-10-05", label: "Course wish-list registration (winter sem) — 5 & 6 Oct" },
  { date: "2026-10-06", label: "Course wish-list registration (last day)" },
  { date: "2026-10-28", label: "Mock course registration for freshers" },
  { date: "2026-11-01", label: "Course registration — don't miss it" },
  { date: "2026-11-16", label: "FAT paper" },
  { date: "2026-11-21", label: "FAT paper" },
  { date: "2026-11-24", label: "FAT paper" },
  { date: "2026-11-26", label: "FAT paper" },
  { date: "2026-11-30", label: "FAT paper (last)" },
  { date: "2026-12-02", label: "Winter semester starts · course add/drop 2–4 Dec" },
  { date: "2026-12-11", label: "Last date: re-registration fee payment" },
  { date: "2027-02-22", label: "Course withdrawal window 22–24 Feb" },
  { date: "2027-04-16", label: "Last instructional day (theory)" },
];

const H = { WD: 1.5, WE: 3 }; // normal class-week hours: weekday / weekend day

// Hours available for plan work on a normal study day.
export function baseHours(date, dow) {
  const special = {
    "2026-11-01": 1.5, // course registration
    "2026-12-01": 3, // free day between FAT and winter sem
    "2026-12-25": 2,
    "2027-01-01": 2,
    "2027-01-15": 4, "2027-01-16": 4, "2027-01-17": 4, // Pongal
    "2027-03-22": 3, "2027-03-26": 3, "2027-04-08": 3, "2027-04-14": 3, // holidays
  };
  if (special[date] != null) return special[date];
  const weekend = dow === 0 || dow === 6;
  if (date >= "2026-10-31" && date <= "2026-11-07") return 3; // break week 1 (FAT prep in the day)
  if (date >= "2026-11-08" && date <= "2026-11-15") return 1; // break week 2 (heavy FAT prep)
  if (date >= "2026-12-20" && date <= "2027-01-03") return 4; // winter vacation sprint
  if (date >= "2026-12-02" && date <= "2026-12-19") return weekend ? 3.5 : 1.5; // light start of sem
  return weekend ? H.WE : H.WD;
}

// Share of each day's hours per track, by phase. Empty tracks hand their share to the rest.
export const PHASES = [
  { from: "2026-10-05", to: "2026-10-30", name: "Java + Arrays", weights: { java: 0.5, dsa: 0.42, git: 0.08 } },
  { from: "2026-10-31", to: "2026-11-07", name: "Break week 1: Arrays + SQL", weights: { sql: 0.45, dsa: 0.35, java: 0.2 } },
  { from: "2026-11-08", to: "2026-11-15", name: "Break week 2: FAT prep (DSA light)", weights: { dsa: 1 } },
  { from: "2026-12-01", to: "2026-12-19", name: "Binary Search + Spring Boot basics", weights: { spring: 0.5, dsa: 0.35, java: 0.15 } },
  { from: "2026-12-20", to: "2027-01-03", name: "Winter vacation sprint: build the PrepPilot backend", weights: { project: 0.6, dsa: 0.35, spring: 0.05 } },
  { from: "2027-01-04", to: "2027-01-23", name: "PrepPilot backend + Recursion", weights: { project: 0.6, dsa: 0.35, java: 0.05 } },
  { from: "2027-02-01", to: "2027-03-06", name: "Deploy PrepPilot + resume + start applying", weights: { project: 0.35, career: 0.35, dsa: 0.3 } },
  { from: "2027-03-15", to: "2027-04-16", name: "Application push + interview prep", weights: { career: 0.45, dsa: 0.4, project: 0.15 } },
];

export const TRACK_LABELS = {
  dsa: "DSA", java: "Java", git: "Git", sql: "SQL", spring: "Spring Boot", project: "Project", career: "Career",
};

// ---- DSA: Striver A2Z, first pass (hard ones skipped, come back later) ----
// done = already ticked on the sheet (29 Sep 2026). firstPass = how many to do this year.
// Order is deliberate: Sliding Window + Stack/Queue, then Graphs (BFS/DFS) and 1D DP basics, before
// Trees/Greedy/Bit. To make room, Linked List, Binary Search and Recursion stop before their hardest
// problems this year (those move to 2nd year with the rest of Graphs/DP).
export const DSA_STEPS = [
  { key: "sorting", name: "Sorting", total: 7, done: 2, firstPass: 7, hrs: 0.6 },
  { key: "arrays", name: "Arrays", total: 32, done: 0, firstPass: 26, hrs: 0.8 },
  { key: "hashing", name: "Hashing", total: 6, done: 1, firstPass: 6, hrs: 0.6 },
  { key: "bs", name: "Binary Search", total: 32, done: 0, firstPass: 22, hrs: 0.85 },
  { key: "strings", name: "Strings (Basic and Medium)", total: 7, done: 0, firstPass: 7, hrs: 0.8 },
  { key: "recursion", name: "Recursion", total: 22, done: 0, firstPass: 15, hrs: 1.0 },
  { key: "ll", name: "Linked-List", total: 49, done: 0, firstPass: 26, hrs: 0.75 },
  { key: "sliding", name: "Sliding Window / 2 Pointer", total: 13, done: 0, firstPass: 10, hrs: 1.0 },
  { key: "stack", name: "Stack / Queues", total: null, done: 0, firstPass: 24, hrs: 0.9 },
  { key: "graphs", name: "Graphs", total: null, done: 0, firstPass: 8, hrs: 1.0 },
  { key: "dp", name: "Dynamic Programming", total: null, done: 0, firstPass: 8, hrs: 1.0 },
  { key: "trees", name: "Binary Trees", total: 32, done: 0, firstPass: 15, hrs: 0.9, stretch: true },
  { key: "greedy", name: "Greedy Algorithms", total: 14, done: 0, firstPass: 10, hrs: 0.9, stretch: true },
  { key: "bit", name: "Bit Manipulation", total: 14, done: 0, firstPass: 10, hrs: 0.7, stretch: true },
];
export const DSA_DONE_AT_START = 38; // whole sheet, incl. Beginner Problems

// Fixed Sunday items (taken off the top of Sunday's hours).
export const SUNDAY_FIXED = [
  { id: "rev", track: "dsa", title: "Revision: redo 3 old problems without notes", hours: 0.75, from: "2026-10-11" },
  { id: "review", track: "review", title: "Weekly review: sync Striver sheet + check next week", hours: 0.25, from: "2026-10-11" },
];

// ---- Other tracks: ordered task lists (hours are estimates) ----
const t = (id, title, hours, extra = {}) => ({ id, title, hours, ...extra });

export const TASKS = {
  git: [
    t("git-01", "Git basics: init, add, commit, push, .gitignore — create the dsa-java repo and push all solved problems", 1.5),
    t("git-02", "Git branches, merge, a PR on your own repo; write the dsa-java README", 1.5),
  ],
  java: [
    t("java-01", "Java refresher: types, loops, methods, arrays, String vs StringBuilder", 4),
    t("java-02", "OOP 1: classes, objects, constructors, this, static", 3),
    t("java-03", "OOP 2: inheritance, super, method overriding", 3),
    t("java-04", "OOP 3: polymorphism, abstract classes, interfaces", 3),
    t("java-05", "Encapsulation, access modifiers, packages", 2),
    t("java-06", "Exceptions: try/catch/finally, checked vs unchecked, custom exceptions", 2.5),
    t("java-07", "Collections 1: List, ArrayList, LinkedList, iterating", 2.5),
    t("java-08", "Collections 2: HashMap, HashSet, TreeMap — redo 3 hashing problems with them", 3),
    t("java-09", "Collections 3: ArrayDeque, PriorityQueue, Comparable vs Comparator", 3),
    t("java-10", "Generics basics", 2),
    t("java-11", "Mini project: CLI expense/grades manager (OOP + collections + file I/O), push to GitHub", 6),
  ],
  sql: [
    t("sql-00", "Install PostgreSQL locally + a GUI (pgAdmin or DBeaver)", 0.5),
    t("sql-01", "SQL basics: SELECT, WHERE, ORDER BY, LIMIT — LeetCode SQL 50 #1–5", 1.5),
    t("sql-02", "Aggregates: COUNT/SUM/AVG, GROUP BY, HAVING — SQL 50 practice", 1.5),
    t("sql-03", "JOINs: inner, left, self — SQL 50 practice", 2),
    t("sql-04", "Subqueries + CASE — SQL 50 practice", 1.5),
    t("sql-05", "Schema design: PK/FK, normalization basics — draw the PrepPilot schema", 2),
  ],
  spring: [
    t("spring-01", "HTTP + REST refresher: methods, status codes, JSON; install Postman", 1.5),
    t("spring-02", "Spring Initializr + Maven; first @RestController returning hello", 2),
    t("spring-03", "Controllers: @GetMapping/@PostMapping, @PathVariable, @RequestBody, DTOs", 3),
    t("spring-04", "Spring Data JPA + PostgreSQL: entity, repository, application.properties", 4),
    t("spring-05", "Service layer + dependency injection basics", 2),
    t("spring-06", "Validation (@Valid) + global error handling (@ControllerAdvice)", 2.5),
    t("spring-07", "Practice build: Notes CRUD API end to end, pushed to GitHub", 3),
  ],
  project: [
    // PrepPilot v2 — your own rebuild of the tracker: Java + Spring Boot + PostgreSQL backend.
    t("proj-01", "PrepPilot design: feature list, ER diagram (users, calendar blocks, tasks, progress, week plans), API endpoint list in README", 3),
    t("proj-02", "Repo setup: Spring Boot + Postgres project, GitHub, branch-per-feature workflow", 2),
    t("proj-03", "User entity + registration endpoint", 3),
    t("proj-04", "Auth: Spring Security + JWT login, BCrypt password hashing", 10),
    t("proj-05", "Plan data model: calendar blocks, daily hours, phases, task backlog — entities + seed data", 4),
    t("proj-06", "Progress API: tick tasks / log hours + Striver sync endpoint (bookmarklet POST, merge-only)", 5),
    t("proj-07", "Scheduler engine in Java: day-by-day allocation (your own design, v1 as reference) + unit tests", 8),
    t("proj-08", "Weekly re-plan: catch-up limit, rescope flag, deadline boosts; @Scheduled Monday job", 5),
    t("proj-09", "Today + milestones endpoints", 2),
    t("proj-10", "Tests: service unit tests + integration tests; GitHub Actions CI on every push", 5),
    t("proj-11", "API docs with Swagger / OpenAPI (springdoc)", 1),
    t("proj-12", "Deploy backend + managed Postgres to a free host", 5),
    t("proj-13a", "Frontend basics: HTML, CSS, JavaScript + fetch()", 6),
    t("proj-13", "Frontend: connect the UI to your API (login, today view, planner, sync)", 7),
    t("proj-14", "Deploy frontend + point it at the live backend; get 3 friends to try it", 2),
    t("proj-15", "README polish: screenshots, live link, architecture diagram, how the re-planner works", 2),
  ],
  career: [
    t("car-01", "Resume v1: one page, project-first (get 2 people to review it)", 3, { notBefore: "2027-02-01" }),
    t("car-02", "LinkedIn profile + GitHub profile README + pin best repos", 2, { notBefore: "2027-02-01" }),
    t("car-03", "Target list: 60 startups/companies + contacts (founders, eng leads)", 3, { notBefore: "2027-02-01" }),
    ...buildCareerSlots(),
  ],
};

function buildCareerSlots() {
  // 25 application slots (1 h ≈ 3 applications / personalised cold emails), interleaved with prep.
  const prep = [
    t("car-p1", "Project walkthrough: 2-minute and 10-minute versions, practise out loud", 2, { notBefore: "2027-03-01" }),
    t("car-p2", "Interview CS basics: OOP questions", 2, { notBefore: "2027-03-01" }),
    t("car-p3", "Interview CS basics: DBMS + SQL questions", 2, { notBefore: "2027-03-01" }),
    t("car-p4", "Interview CS basics: OS + networking basics", 2, { notBefore: "2027-03-01" }),
  ];
  const mocks = Array.from({ length: 6 }, (_, i) =>
    t(`car-m${i + 1}`, `Mock interview #${i + 1}: 1 DSA problem + project questions (friend or peer platform)`, 1.5, { notBefore: "2027-03-15" }));
  const out = [];
  let p = 0, m = 0;
  for (let i = 1; i <= 25; i++) {
    out.push(t(`car-a${String(i).padStart(2, "0")}`, `Applications batch #${i}: ~3 applications / cold emails (log them)`, 1, { notBefore: "2027-02-08", apps: 3 }));
    if (i % 3 === 1 && i > 1 && p < prep.length) out.push(prep[p++]);
    if (i % 3 === 2 && i > 9 && m < mocks.length) out.push(mocks[m++]);
  }
  while (p < prep.length) out.push(prep[p++]);
  while (m < mocks.length) out.push(mocks[m++]);
  return out;
}

// Milestones: checked against projected completion in the schedule.
export const MILESTONES = [
  { id: "m-java", label: "Java OOP + Collections done", task: "java-09", target: "2026-11-07" },
  { id: "m-arrays", label: "Arrays first pass done", task: "dsa:arrays:last", target: "2026-11-07" },
  { id: "m-sql", label: "SQL basics + PrepPilot schema done", task: "sql-05", target: "2026-11-07" },
  { id: "m-spring", label: "Spring Boot basics: Notes CRUD API", task: "spring-07", target: "2027-01-03" },
  { id: "m-backend", label: "PrepPilot backend core working locally (auth, data model, progress + sync API)", task: "proj-06", target: "2027-01-10" },
  { id: "m-resume", label: "Resume v1 ready", task: "car-01", target: "2027-02-15" },
  { id: "m-live", label: "PrepPilot v2 live (backend + frontend)", task: "proj-14", target: "2027-02-28" },
  { id: "m-apps20", label: "20+ applications sent", task: "car-a07", target: "2027-03-06" },
  { id: "m-apps75", label: "75+ applications sent", task: "car-a25", target: "2027-04-16" },
  { id: "m-dsa180", label: "180+ problems solved on the sheet", task: "dsa:count:180", target: "2027-04-16" },
];
