# Appendix B — Non-Code Materials (Study Instruments)

Adapted to the study *"Optimizing Recruitment with Intelligent AI Screening"*,
prototype name **Searchera** (HORAI Labs careers portal). All instruments assume
the actual system behaviour documented in Appendix A: PDF CV ingestion, hosted-LLM
or heuristic screening, per-requirement evidence, and the recruiter's ranked
shortlist UI.

---

## B.1 Informed Consent Form

**Study title:** Optimizing Recruitment with Intelligent AI Screening — User Evaluation of the Searchera Prototype
**Researchers:** [Student name], Department of [Computing/IT], [Institution]
**Supervisor:** [Supervisor name]

### 1. Purpose of the study
This evaluation measures whether an AI-assisted recruitment prototype (Searchera)
reduces the time recruiters spend screening applications, produces candidate
rankings that recruiters find accurate and explainable, and is usable and
satisfactory in a realistic hiring workflow. Participation involves using the
prototype with **synthetic/demo candidate data only** — no real applicants' CVs.

### 2. Participation procedure
1. Briefing and prototype demonstration (≈10 minutes).
2. Hands-on session: review a pre-seeded shortlist of AI-ranked applications
   for one or two demo roles; optionally accept/reject candidates with comments
   (≈20–30 minutes).
3. Completion of the UAT questionnaire in Section B.2 (≈10 minutes).

### 3. Confidentiality and data handling
- No personal, identifying data is collected. Screen recordings or notes, if
  any, are anonymised with participant codes (e.g. P01).
- All evaluation data (ratings, timings, free-text comments) are stored on the
  researcher's password-protected machine and used **only** in the project
  report; raw data are not shared with third parties.
- The demo database is deleted after analysis, or at your request, immediately.

### 4. Voluntary participation
Participation is entirely voluntary. You may pause, skip any task, or withdraw
at any point without penalty and without needing to give a reason. Withdrawal
will not affect any relationship with [Institution] or HORAI Labs.

### 5. Risks and benefits
The evaluation uses low-fidelity demo data, so risks are minimal (comparable to
ordinary software use). There is no direct benefit beyond contributing to
academic research; findings may guide improvements of AI screening tools.

### 6. Contact
Questions may be directed to [Student email] or the supervisor at
[Supervisor email].

### Consent statement
By signing below, I confirm that I:
- [ ] have read and understood this form;
- [ ] understand my participation is voluntary and I may withdraw freely;
- [ ] consent to my anonymised ratings and comments being used in the project
      report.

| | |
|---|---|
| Participant name (print) | Signature |
| Date | Researcher signature |

---

## B.2 UAT Questionnaire (Likert-Scale, KPI-Aligned)

**Participant code:** ______   **Role:** Recruiter / HR practitioner / Other: ______
**Date:** ______   **Scenario used:** Single-role shortlist / Multi-role queue

*Rate each statement:* 1 = Strongly disagree, 2 = Disagree, 3 = Neutral,
4 = Agree, 5 = Strongly agree.

### Section A — Screening time & efficiency (KPI: screening time)
| ID | Statement | 1 | 2 | 3 | 4 | 5 |
|----|-----------|---|---|---|---|---|
| A1 | I identified the strongest candidates faster than with a manual CV review. | | | | | |
| A2 | The ranked list reduced the number of CVs I had to read in full. | | | | | |
| A3 | AI screening cut the time from application receipt to a shortlist decision. | | | | | |
| A4 | Re-running the AI screening on one candidate was quick and reliable. | | | | | |

### Section B — Ranking accuracy & explainability (KPI: ranking accuracy)
| ID | Statement | 1 | 2 | 3 | 4 | 5 |
|----|-----------|---|---|---|---|---|
| B1 | The top-ranked candidates genuinely matched the role requirements. | | | | | |
| B2 | The match score (0–100) reflected my own judgement of candidate fit. | | | | | |
| B3 | The fit tier (excellent/strong/moderate/weak/poor) was consistent with the score. | | | | | |
| B4 | The skill-match matrix correctly identified met vs not-met requirements. | | | | | |
| B5 | The strengths/gaps panel explained *why* a candidate was ranked that way. | | | | | |
| B6 | I could justify a shortlist decision to a colleague using the shown evidence. | | | | | |

### Section C — Usability (System Usability-aligned)
| ID | Statement | 1 | 2 | 3 | 4 | 5 |
|----|-----------|---|---|---|---|---|
| C1 | I found the screening desk easy to navigate without training. | | | | | |
| C2 | Ranking, filtering (score/tier/status) and search behaved as I expected. | | | | | |
| C3 | The score ring and badges made each application easy to assess at a glance. | | | | | |
| C4 | Accept/reject actions and comments were straightforward to perform. | | | | | |
| C5 | I encountered no errors or confusing states during the session. | | | | | |

### Section D — Overall satisfaction (KPI: satisfaction)
| ID | Statement | 1 | 2 | 3 | 4 | 5 |
|----|-----------|---|---|---|---|---|
| D1 | Overall, I am satisfied with the AI screening system. | | | | | |
| D2 | I trust the system to support (not replace) my shortlisting decisions. | | | | | |
| D3 | I would use Searchera for real recruitment screening. | | | | | |
| D4 | I would recommend the system to another hiring team. | | | | | |

### Section E — Open-ended feedback
1. What slowed you down most during the session?
2. Which part of the AI explanation did you find most (or least) convincing?
3. What improvements would increase your trust in the rankings?

*Scoring note: each KPI is the mean of its Section (A: KPI-screening time;
B: KPI-ranking accuracy; C: usability; D: satisfaction), reported alongside SD
and the System Usability Scale-style overall score from Section C.*

---

## B.3 Project Plan — Gantt Chart Table (16 Weeks)

W = week of the semester; phases follow the SDLC with the NLP/API and UI built
in parallel modules. "🐍/⚛" markers denote workstream, not Emoji usage in report.

| # | Task | W1 | W2 | W3 | W4 | W5 | W6 | W7 | W8 | W9 | W10 | W11 | W12 | W13 | W14 | W15 | W16 |
|---|------|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|
| 1 | Literature review & feasibility | ██ | ██ | ██ |    |    |    |    |    |    |    |    |    |    |    |    |    |
| 2 | Requirements elicitation & KPIs |    | ██ | ██ |    |    |    |    |    |    |    |    |    |    |    |    |    |
| 3 | System architecture & data model |    |    | ██ | ██ |    |    |    |    |    |    |    |    |    |    |    |    |
| 4 | API scaffold: auth, JWT roles |    |    |    | ██ | ██ |    |    |    |    |    |    |    |    |    |    |    |
| 5 | CV upload & text extraction |    |    |    |    | ██ | ██ |    |    |    |    |    |    |    |    |    |    |
| 6 | AI/NLP screening service + explainability |    |    |    |    |    | ██ | ██ | ██ |    |    |    |    |    |    |    |
| 7 | Jobs, applications, ranking endpoints |    |    |    |    |    |    | ██ | ██ |    |    |    |    |    |    |    |    |
| 8 | React UI: seeker portal |    |    |    |    |    |    |    | ██ | ██ |    |    |    |    |    |    |    |
| 9 | React UI: recruiter ranked shortlist |    |    |    |    |    |    |    |    | ██ | ██ | ██ |    |    |    |    |
| 10 | Seed data, notifications, admin |    |    |    |    |    |    |    |    |    | ██ | ██ |    |    |    |    |    |
| 11 | Integration & end-to-end testing |    |    |    |    |    |    |    |    |    |    | ██ | ██ |    |    |    |    |
| 12 | UAT sessions & KPI measurement |    |    |    |    |    |    |    |    |    |    |    | ██ | ██ |    |    |    |
| 13 | Analysis of UAT results |    |    |    |    |    |    |    |    |    |    |    |    |    | ██ | ██ |    |
| 14 | Final report writing & corrections |    |    |    |    |    |    |    |    |    |    |    | ██ | ██ | ██ | ██ | ██ |
| 15 | Defence preparation |    |    |    |    |    |    |    |    |    |    |    |    |    |    |    | ██ |

---

## B.4 Budget

Indicative for a single-student final-year project (KES; ≈ KES 130 / USD 1 at the
time of writing). Development hardware and institution Wi-Fi are treated as
existing resources; all tooling used by the prototype is open-source, so licences
are zero-cost, matching the actual `package.json` dependency set.

| # | Item | Basis | Cost (KES) |
|---|------|-------|-----------:|
| 1 | Development laptop (existing asset) | in-kind | 0 |
| 2 | Internet subscription, 6 months (pro-rated share) | ~KES 1,500/mo | 9,000 |
| 3 | Hosted AI API credits for screening & CV analysis (≈15k short requests, gpt-4o-mini-class model) | pay-per-token, capped | 8,000 |
| 4 | Cloud hosting, demo domain & backup storage (Vercel/Free-tier + file store), 6 months | free tier + misc | 2,500 |
| 5 | Open-source licences (Node.js, React, Vite, Tailwind, Express, sql.js, spaCy — all MIT/BSD/Apache) | free | 0 |
| 6 | Printing, binding and poster for defence (3 copies + A1 poster) | local rates | 3,500 |
| 7 | Stationery and consumables | allowance | 1,500 |
| 8 | UAT participant facilitation (2 sessions, light refreshment for 10 participants) | ≈KES 300/head | 3,000 |
| 9 | Contingency (~10%) | of subtotal | 2,750 |
| | **Total** | | **30,250** |

*Notes: item 3 reflects the actual dual-mode design — with the hosted-LLM key
unset, screening falls back to the local heuristic scorer and cost drops to zero;
item 4 covers keeping the deployed demo live through UAT.*
