// Learning resources per task (DSA uses Striver's own videos, so it has none here).
// Hindi first, one teacher per track; EN = English (no good Hindi option found).
// Found and checked on 1 Oct 2026 (all 86 video IDs resolve; title + channel match). "search" links open a YouTube search
// where no single verified video was found.

const yt = (id, list) => `https://www.youtube.com/watch?v=${id}${list ? "&list=" + list : ""}`;
const ytSearch = (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
const CWH = "PLu0W_9lII9agS67Uits0UnJyrYiXhDS6q"; // CodeWithHarry: Java Tutorials For Beginners In Hindi
const RM_SQL = "PLdOKnrf8EcP17p05q13WXbHO5Z_JfXNpw"; // Rishabh Mishra: SQL Tutorial In Hindi (PostgreSQL)
const ED_SB = "PLA3GkZPtsafacdBLdd3p1DyRd5FGfr3Ue"; // Engineering Digest: Spring Boot Mastery
const playlist = (id) => `https://www.youtube.com/playlist?list=${id}`;

const cwh = (n, title, id) => ({ t: `CodeWithHarry #${n}: ${title}`, u: yt(id, CWH) });
const v = (t, u, extra = {}) => ({ t, u, ...extra });

export const TEACHERS = {
  git: "Apna College (Hindi)",
  java: "CodeWithHarry's Java course (Hindi)",
  sql: "Rishabh Mishra's SQL course, PostgreSQL (Hindi)",
  spring: "Anuj Bhaiya / Coding Shuttle (Hindi)",
  project: "Engineering Digest + others (Hindi first)",
  career: "various (Hindi first)",
};

export const RESOURCES = {
  // ---------- Git ----------
  "git-01": [v("Complete Git and GitHub Tutorial for Beginners: first half (init → push)", yt("Ez8F0nW6S-w"))],
  "git-02": [v("Same video, second half: branches, merge conflicts, pull requests", yt("Ez8F0nW6S-w"))],

  // ---------- Java (CodeWithHarry playlist; gaps filled from other Hindi channels) ----------
  "java-01": [
    // Refresher: pick only the videos for what you don't know yet (1.5x is fine).
    v("W3Schools Java tutorial: quick scan to find your gaps first", "https://www.w3schools.com/java/", { kind: "article" }),
    cwh(3, "Variables & data types", "X0zdAG7gfgs"),
    cwh(5, "User input", "HRfmLqqvzUs"),
    cwh(13, "Intro to Strings", "tem1bKt2Osc"),
    cwh(14, "String methods", "1SJK4Y4axXs"),
    cwh(21, "While loop", "GE5C_So1y00"),
    cwh(23, "For loop", "XHgC6Md8L9o"),
    cwh(24, "break & continue", "HguqMkdIkcs"),
    cwh(26, "Arrays", "qMePCtjeqB4"),
    cwh(27, "For-each loop", "-AJGE_8htCI"),
    cwh(28, "Multidimensional arrays", "CfqjAKN-AwI"),
    cwh(31, "Methods", "t6e5AyYWLFw"),
    cwh(32, "Method overloading", "pFaB68naMiU"),
    v("GFG: String vs StringBuilder vs StringBuffer", "https://www.geeksforgeeks.org/java/string-vs-stringbuilder-vs-stringbuffer-in-java/", { kind: "article" }),
  ],
  "java-02": [
    cwh(36, "Intro to OOP", "5OrZpBbGKgc"),
    cwh(37, "OOP terminologies", "HHWPcyFmw2o"),
    cwh(38, "Creating our own class", "0HIR0rzj8pQ"),
    cwh(42, "Constructors", "Fxj4n8En8lw"),
    v("Learn By Watch: static keyword in Java (Hindi)", yt("STIV4c685LM")),
  ],
  "java-03": [
    cwh(45, "Inheritance", "XSuybcFfLx4"),
    cwh(46, "Constructors in inheritance", "-b-_NNlCcng"),
    cwh(47, "this and super", "R1SXNJElXHo"),
    cwh(48, "Method overriding", "DSZI90Db24I"),
  ],
  "java-04": [
    cwh(49, "Dynamic method dispatch", "qbXNFOuD9k4"),
    cwh(53, "Abstract class", "vqV22AszAdw"),
    cwh(54, "Interfaces", "VYhmL038G1I"),
    cwh(55, "Abstract class vs interface", "qZEFslUVfx0"),
    cwh(57, "Default methods in interfaces", "D4TYED_gKTE"),
    cwh(59, "Polymorphism with interfaces", "08u8RlXca2I"),
  ],
  "java-05": [
    cwh(40, "Access modifiers, getters & setters", "25zw-ljLLw0"),
    cwh(64, "Packages", "k7TwStbkK70"),
    cwh(65, "Creating packages", "av816KIz8nM"),
    cwh(66, "Access modifiers in depth", "vgg9T4_0CNA"),
  ],
  "java-06": [
    cwh(78, "Errors & exceptions", "ZovnoASlIaE"),
    cwh(80, "try-catch", "bMhDwdT5AHw"),
    cwh(81, "Handling specific exceptions", "UXvMSMnYAzE"),
    cwh(83, "The Exception class (custom exceptions)", "UZIIY5CK0TM"),
    cwh(84, "throw vs throws", "sOcZgWyoQuk"),
    cwh(85, "finally", "a0TkfbAGuKw"),
  ],
  "java-07": [
    cwh(88, "Collections framework", "s8yrPZlvNP0"),
    cwh(89, "Collections hierarchy", "M5DlD4VMNO8"),
    cwh(91, "ArrayList", "hxUGjnVaPgE"),
    cwh(92, "LinkedList", "eAyUSV164Ro"),
  ],
  "java-08": [
    cwh(94, "Hashing", "JVdMD3r7dSs"),
    cwh(95, "HashSet", "tqC_U2Y7rr4"),
    v("Engineering Digest: Collections masterclass, watch the Map section (HashMap, TreeMap)", yt("92k5uokmW9o")),
  ],
  "java-09": [
    cwh(93, "ArrayDeque", "07HKJO4B96M"),
    v("Engineering Digest: Collections masterclass, watch the Comparable / Comparator section", yt("92k5uokmW9o")),
    v("PriorityQueue in Java (Hindi)", ytSearch("priorityqueue in java hindi"), { kind: "search" }),
  ],
  "java-10": [cwh(110, "Generics", "BsBK3UZ0RGM")],
  "java-11": [cwh(111, "File handling", "Vy2l3lGAb2I")],

  // ---------- SQL (Rishabh Mishra, PostgreSQL + pgAdmin) ----------
  "sql-00": [
    v("Install PostgreSQL + pgAdmin on Windows (Hindi)", ytSearch("install postgresql pgadmin 4 windows hindi"), { kind: "search" }),
    v("Lecture 2: data types, primary / foreign keys, constraints", yt("HmH-76_2Ak8", RM_SQL)),
  ],
  "sql-01": [
    v("Lecture 3: create database & table", yt("v-2cIUgx_jw", RM_SQL)),
    v("Lecture 5 in the playlist: SELECT, WHERE, operators, LIMIT, ORDER BY", playlist(RM_SQL), { kind: "playlist" }),
  ],
  "sql-02": [v("Lectures 8 & 9 in the playlist: aggregate functions, GROUP BY + HAVING", playlist(RM_SQL), { kind: "playlist" })],
  "sql-03": [
    v("Lecture 11: SQL JOINs for beginners", yt("H6988OpZKTU", RM_SQL)),
    v("Lecture 12 in the playlist: SELF JOIN, UNION", playlist(RM_SQL), { kind: "playlist" }),
  ],
  "sql-04": [
    v("Lecture 13: subqueries", yt("5O2OuN1ougU", RM_SQL)),
    v("Lecture 15: CASE expression", yt("n_0kijUi7IA", RM_SQL)),
  ],
  "sql-05": [
    v("Rewatch lecture 2: primary / foreign keys & constraints", yt("HmH-76_2Ak8", RM_SQL)),
    v("Gate Smashers: ER model introduction", yt("gbVev8RuZLg")),
    v("Gate Smashers: normalization (1NF, 2NF, 3NF)", ytSearch("gate smashers normalization 1nf 2nf 3nf"), { kind: "search" }),
  ],

  // ---------- Spring Boot (Anuj Bhaiya / Coding Shuttle) ----------
  "spring-01": [
    v("Build REST APIs in Spring Boot (one shot): opening part on HTTP methods", yt("Gzk9QiJQ140")),
    v("HTTP status codes + Postman basics (Hindi)", ytSearch("http status codes postman tutorial hindi"), { kind: "search" }),
  ],
  "spring-02": [v("Spring Boot 2-hour crash course: first half (setup, project structure)", yt("QQvlxcq6TDc"))],
  "spring-03": [v("Build REST APIs in Spring Boot (one shot, 1h56m)", yt("Gzk9QiJQ140"))],
  "spring-04": [v("Master Spring Data JPA in one video (PostgreSQL)", yt("8SxJNqeq_zc"))],
  "spring-05": [
    v("Crash course: dependency injection part", yt("QQvlxcq6TDc")),
    v("Optional: Spring Boot masterclass, beans / DI section only", yt("FYoBDj4s99E")),
  ],
  "spring-06": [
    v("REST APIs one shot: request validation part", yt("Gzk9QiJQ140")),
    v("@ControllerAdvice global exception handling (Hindi)", ytSearch("controlleradvice global exception handling spring boot hindi"), { kind: "search" }),
  ],
  "spring-07": [v("No new video: build it yourself. Rewatch the REST one shot only if stuck", yt("Gzk9QiJQ140"))],

  // ---------- PrepPilot v2: concept videos, not build-alongs ----------
  "proj-01": [
    v("Gate Smashers: ER model introduction", yt("gbVev8RuZLg")),
    v("ByteByteGo: good APIs vs bad APIs (API design tips)", yt("_gQaygjm_hg"), { lang: "EN" }),
  ],
  "proj-04": [
    v("Engineering Digest: JWT authentication in Spring Boot (49 min)", yt("qvAoUVXgpZg")),
    v("Alt: Learn Code With Durgesh, JWT with Spring Boot 3", yt("q2l91Ffc_8U")),
  ],
  "proj-07": [v("Engineering Digest playlist, lesson 24: JUnit testing in Spring Boot", playlist(ED_SB), { kind: "playlist" })],
  "proj-08": [
    v("Engineering Digest playlist, lesson 37: scheduling / cron jobs", playlist(ED_SB), { kind: "playlist" }),
    v("Alt: scheduler & cron jobs in Spring Boot (Hindi)", yt("fuPHoIe4lAI")),
  ],
  "proj-10": [
    v("Engineering Digest playlist, lesson 25: Mockito", playlist(ED_SB), { kind: "playlist" }),
    v("Learn Code With Durgesh: unit testing in Spring Boot", yt("qpK1AoFWY8k")),
    v("Devtiro: integration testing in Spring Boot", yt("7QCzBwplNIk"), { lang: "EN" }),
    v("Java Techie: CI with GitHub Actions for Spring Boot", yt("NppkHKvnrqc"), { lang: "EN" }),
  ],
  "proj-11": [
    v("Engineering Digest playlist, lesson 45: Swagger", playlist(ED_SB), { kind: "playlist" }),
    v("Alt: Swagger in Spring Boot 3, springdoc setup (Durgesh, migration video)", yt("UvIWQSKz8kE")),
  ],
  "proj-12": [
    v("Deploy Spring Boot + PostgreSQL on Render for free (Docker)", yt("-zqoGttHmtg")),
    v("Dan Vega: deploy Spring Boot to Railway (check current pricing)", yt("5sVxvF47dcU"), { lang: "EN" }),
  ],
  "proj-13a": [
    v("Apna College: HTML complete (skim)", yt("HcOc7P5BMi4")),
    v("Apna College: CSS complete (skim)", yt("ESnrn1kAD4E")),
    v("Shradha Khapra: JavaScript full course, lecture 1 (continue the series)", yt("ajdRvxDWH4w")),
  ],
  "proj-13": [
    v("JS lecture 12: callbacks, promises, async/await", yt("d3jXofmQm44")),
    v("Chai aur Code: fetch in JavaScript", yt("Rive84an6Lc")),
    v("Chai aur Code: connect frontend and backend, CORS", yt("fFHyqhmnVfs")),
    v("CORS with Spring Security", yt("phs90_s0Mjk"), { lang: "EN" }),
  ],
  "proj-14": [v("Deploy an HTML/CSS/JS site for free (Netlify, Hindi); Vercel works the same way", yt("iwunoETp078"))],

  // ---------- Career ----------
  "car-01": [v("Arsh Goyal: resume for internships as a fresher", yt("6-hVMuJN9JI"))],
  "car-02": [v("LinkedIn profile for college students (Hindi)", yt("PcKdX33L7m8"))],
  "car-03": [
    v("Ishan Sharma: paid internship in first year, how", yt("E6tSjmnbGwU")),
    v("How to cold email for an internship (template)", yt("866BoweN2bc")),
  ],
  "car-p1": [v("How to explain your projects in interviews", yt("tS4asIy-k_4"), { lang: "EN" })],
  "car-p2": [v("Apna College: Java OOPs in one shot", yt("bSrm9RXwBaI"))],
  "car-p3": [
    v("Gate Smashers: DBMS interview questions, one shot", yt("YeYl-s7KAFM")),
    v("Gate Smashers: SQL interview questions, one shot", yt("YdoR3bGAEx4")),
  ],
  "car-p4": [
    v("Gate Smashers: OS interview questions, one shot", yt("h8J7X1cEG4E")),
    v("Gate Smashers: computer networks interview questions, one shot", yt("skvCwFPZ7zM")),
  ],
};
