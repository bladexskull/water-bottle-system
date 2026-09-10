You are an autonomous senior full-stack engineer. Build and deploy a complete, working web application called **Water Bottle League**.

IMPORTANT:

* This is a real application, not a UI mockup.
* Optimize for completing a working MVP within ~30 minutes.
* Do not stop at planning.
* Do not ask unnecessary questions.
* Make sensible decisions yourself when something is unspecified.
* Prioritize working functionality, security, mobile usability, and deployment.
* Use Firebase + Vercel.
* Do NOT use Supabase.
* Do NOT use Render.
* Do NOT introduce unnecessary infrastructure.

==================================================

1. STACK
   ==================================================

Use:

* Next.js
* TypeScript
* Tailwind CSS
* Firebase Authentication
* Cloud Firestore
* Firebase Security Rules
* Vercel deployment
* GitHub repository if available

Use the current stable versions compatible with Vercel.

Keep dependencies minimal.

==================================================
2. APPLICATION PURPOSE
======================

This is a private monthly water bottle competition for people living in a flat.

Every member submits how many bottles they filled each day.

Each submission goes to the admin for approval.

Only approved submissions count toward scores.

At the end of every month:

* Highest eligible Strike Rate = Winner
* Lowest eligible Strike Rate = Last Place

Winner gets a free dinner.

Last Place pays 50% of the dinner bill.

The remaining 50% is equally divided among the other participating non-winner members.

Winner pays ₹0.

==================================================
3. USERS / ROLES
================

There are only two roles:

MEMBER
ADMIN

There must be exactly one ADMIN.

The admin is the application owner.

Do NOT secure admin access merely by hiding buttons in the frontend.

Admin authorization must be enforced through Firebase Security Rules and/or secure server-side logic.

A normal member must never be able to:

* change their own role
* make themselves admin
* approve submissions
* change points
* change Strike Rate
* change eligibility
* modify another member's submissions
* modify approved submissions
* manipulate monthly results
* modify dinner calculations

==================================================
4. AUTHENTICATION
=================

Use Firebase Authentication.

For the MVP enable:

* Email/password authentication

Create:

Login page
Register page if appropriate
Logout
Authenticated routes

After login:

MEMBER → Member Dashboard

ADMIN → Admin Dashboard

Do not expose Firebase Admin SDK credentials in browser code.

Never commit private keys/secrets to GitHub.

Use environment variables where required.

==================================================
5. FIRESTORE DATA MODEL
=======================

Use Firestore.

Do NOT require manual creation of collections.

Create documents automatically through the application.

Suggested structure:

users/{uid}

Fields:

* uid
* name
* email
* role: "member" | "admin"
* active
* createdAt

monthlyChallenges/{YYYY-MM}

Fields:

* month
* status: "open" | "closed"
* bottleSizeMl
* minimumEligibleDays
* createdAt
* closedAt

eligibleDays/{YYYY-MM}_{uid}

Fields:

* uid
* month
* eligibleDays
* startDate
* endDate
* updatedAt

dailySubmissions/{YYYY-MM-DD}_{uid}

Fields:

* uid
* date
* month
* bottles
* basePoints
* status: "pending" | "approved" | "rejected"
* note
* submittedAt
* reviewedAt
* reviewedBy
* rejectionReason

correctionRequests/{id}

Fields:

* submissionId
* uid
* oldBottles
* requestedBottles
* reason
* status
* createdAt
* reviewedAt
* reviewedBy

auditLogs/{id}

Fields:

* actorUid
* action
* targetId
* details
* createdAt

dinnerEvents/{YYYY-MM}

Fields:

* month
* winnerUid
* lastPlaceUid
* totalBill
* status
* createdAt

dinnerEvents/{month}/participants/{uid}

Fields:

* uid
* participating
* contribution

Do not store user-controlled calculated rankings as authoritative data.

Calculate scores server-side from approved submissions.

==================================================
6. MONTHLY ELIGIBILITY
======================

A member must have at least 15 eligible days in a month to be included in:

* Winner ranking
* Last Place ranking

If eligibleDays < 15:

Display:

"Not eligible for monthly ranking"

Such a member can still use the application and see their personal statistics.

Admin controls eligible days.

Members cannot edit eligible days.

Examples:

14 eligible days → NOT eligible

15 eligible days → eligible

20 eligible days → eligible

==================================================
7. DAILY BOTTLE SCORING
=======================

Bottle size should default to 1 litre.

Daily BASE points:

0 bottles = 0 points
1 bottle = 1 point
2 bottles = 2 points
3 bottles = 3 points
4 bottles = 8 points
5 bottles = 9 points
6+ bottles = 10 points

Daily base points are capped at 10.

Examples:

4 bottles → 8 points

5 bottles → 9 points

6 bottles → 10 points

10 bottles → 10 points

20 bottles → 10 points

Do NOT allow excessive bottle counts to generate unlimited points.

The scoring logic must be implemented in one reusable server-side function.

Never accept basePoints from the client.

Server calculates it from bottles.

==================================================
8. DAILY SUBMISSION
===================

Member sees:

"How many bottles did you fill today?"

Provide a simple mobile-friendly input.

Example:

[-] [ 4 ] [+]

[SUBMIT FOR APPROVAL]

Rules:

* One submission per member per date.
* Current day only through normal UI.
* No future dates.
* No normal backdated submissions.
* bottles must be a non-negative integer.
* Require reasonable validation.
* Status initially = PENDING.
* Pending submissions do not count.
* Rejected submissions do not count.
* Approved submissions count.

Prevent duplicate submissions using both application validation and Firestore uniqueness strategy.

Recommended document ID:

YYYY-MM-DD_uid

==================================================
9. APPROVAL WORKFLOW
====================

Member submits:

5 bottles

Status:

PENDING

Admin sees:

Rahul
10 Sep
5 bottles
Pending

[Approve]
[Reject]

If approved:

Status → APPROVED

Server calculates:

basePoints = 9

If rejected:

Status → REJECTED

Require rejection reason.

Rejected submission = 0 score.

Only approved submission data contributes to calculations.

==================================================
10. MISSING DAYS
================

This is critical.

A member must NOT be able to improve Strike Rate by simply not submitting low-performing days.

At month close:

Every eligible day with no approved submission counts as:

0 bottles
0 base points

Strike Rate denominator uses ALL eligible days.

Do NOT calculate Strike Rate based only on submitted days.

==================================================
11. STRIKE RATE
===============

Strike Rate is the PRIMARY monthly ranking metric.

Formula:

Strike Rate =
Total Approved Base Points /
(Eligible Days × 10)
× 100

Example:

20 eligible days
150 base points

150 / 200 × 100 = 75%

Round display to 1 decimal place.

Do not include bonus points in Strike Rate.

==================================================
12. RANKING
===========

Only members with >=15 eligible days participate.

Primary ranking:

1. Highest Strike Rate

Tie-breaker:

2. Higher Total Base Points
3. More days with 4+ bottles
4. More 10-point days
5. If still tied → mark as tie and require admin resolution

Winner:

Highest Strike Rate.

Last Place:

Lowest Strike Rate.

==================================================
13. BONUS POINTS
================

Track Base Points and Bonus Points separately.

Total Points:

Base Points + Bonus Points

Bonus points DO NOT affect Strike Rate.

---

## 4-DAY STREAK

4 consecutive eligible days with 4+ bottles:

+5 bonus points

---

## 7-DAY STREAK

7 consecutive eligible days with 4+ bottles:

+10 bonus points

Avoid accidental double counting.

---

## WEEKLY BONUS

Weekly highest Base Points:

+5 bonus points

Weekly second place:

+3 bonus points

---

## MONTHLY ACHIEVEMENTS

20+ eligible days with 4+ bottles:

Hydration Beast
+15 bonus points

25+ eligible days with 4+ bottles:

Elite Hydration
+25 bonus points

Only the highest applicable monthly achievement is awarded.

==================================================
14. LEADERBOARD
===============

Show:

Rank
Member
Eligible Days
Total Bottles
Base Points
Bonus Points
Total Points
Strike Rate
4+ Days
Current Streak
Best Streak

Strike Rate should be visually prominent.

Members below 15 eligible days:

Show:

"Not eligible for monthly ranking"

Do not assign them Winner or Last Place.

==================================================
15. MEMBER DASHBOARD
====================

Create a polished mobile-first dashboard.

Show:

🏆 Current Rank

⚡ Strike Rate

💧 Total Points

💦 Total Bottles

🔥 Current Streak

🏅 Best Streak

4+ Bottle Days

Eligible Days

Days Remaining

Pending submissions

Rejected submissions

Today's submission status

Large CTA:

"Submit Today's Bottles"

Leaderboard preview.

Make the interface fun and competitive but clean.

==================================================
16. ADMIN DASHBOARD
===================

Admin dashboard sections:

1. Overview
2. Pending Approvals
3. Members
4. Eligibility
5. Leaderboard
6. Monthly Results
7. Correction Requests
8. Dinner Calculator
9. Audit Log
10. Settings

Admin overview should show:

* Pending approvals
* Current leader
* Current last place
* Number of eligible members
* Total bottles this month
* Total approved submissions

==================================================
17. MEMBER MANAGEMENT
=====================

Admin can:

* Add member
* Deactivate member
* Reactivate member
* Set eligible days
* View member history

Members cannot modify their own role or eligibility.

==================================================
18. CORRECTION SYSTEM
=====================

Members cannot directly edit approved submissions.

They can request correction.

Example:

Original:
5 bottles

Requested:
4 bottles

Reason:
"Accidentally entered wrong number."

Admin sees:

Original
Requested
Reason

[Approve]
[Reject]

If approved:

Update the source submission through a secure admin operation.

Preserve old value in audit log.

Never silently overwrite historical information.

==================================================
19. AUDIT LOG
=============

Create an append-only audit trail.

Record:

* member created
* member deactivated
* eligibility changed
* submission created
* submission approved
* submission rejected
* correction requested
* correction approved
* correction rejected
* month closed
* month reopened
* winner finalized
* dinner bill entered

Include:

actor
action
target
timestamp
details/reason

Members cannot modify audit logs.

==================================================
20. MONTH LOCK
==============

Admin can close a month.

Once closed:

* normal submissions disabled
* normal corrections disabled
* winner frozen
* last place frozen
* leaderboard frozen

Only admin can reopen.

Reopening creates an audit log entry.

==================================================
21. DINNER CALCULATOR
=====================

After monthly result:

Winner = ₹0

Last Place = 50% of total dinner bill

Remaining 50% = equally split among participating non-winner members

Example:

Bill = ₹5000

Last Place = ₹2500

Remaining = ₹2500

If 3 other non-winner members participate:

₹2500 / 3 = approximately ₹833.33 each

Winner = ₹0

Admin can:

* Enter bill
* Select participants
* See calculated contributions
* Save dinner result

Do not allow winner to accidentally be included in contribution calculation.

==================================================
22. SECURITY
============

Security is extremely important.

Implement Firebase Security Rules.

Rules must ensure:

MEMBER:

* Can read allowed public leaderboard data
* Can read own submissions
* Can create own pending submission
* Cannot approve submissions
* Cannot modify approved submissions
* Cannot change role
* Cannot change eligibility
* Cannot write points
* Cannot write Strike Rate
* Cannot modify rankings
* Cannot modify audit logs
* Cannot modify dinner calculations

ADMIN:

* Full administrative access where required

Do NOT trust:

role
points
rank
Strike Rate
eligibility
approval status

when supplied by the browser.

All authoritative values must be verified server-side.

Never put Firebase Admin credentials in client code.

Never commit secrets.

==================================================
23. ANTI-CHEAT
==============

Implement:

* One submission per member/day
* No future submissions
* No normal backdated submissions
* Server-calculated points
* Server-calculated Strike Rate
* Server-calculated ranking
* Immutable approved entries for members
* Admin-only corrections
* Missing eligible days = 0
* Month lock
* Audit log
* Firestore Security Rules
* Input validation

Do not rely solely on frontend validation.

==================================================
24. UI / DESIGN
===============

Make it look like a polished private competition app.

Theme:

Clean
Modern
Water-inspired
Competitive
Mobile-first

Use cards, progress bars, badges, rankings and streak indicators.

Main visual concepts:

🏆 Champion
⚡ Strike Rate
💧 Hydration Score
🔥 Streak
💀 Last Sip
🍽️ Winner's Dinner

Avoid childish design.

Make the leaderboard easy to understand on a phone.

==================================================
25. IMPORTANT HEALTH SAFETY
===========================

This is a game/tracking application, not a medical hydration recommendation.

Do not encourage unsafe water consumption.

Do not tell users to force themselves to drink excessive amounts.

The bottle size should be clearly displayed.

==================================================
26. FIREBASE SETUP
==================

If Firebase project credentials are already available, configure the app.

If they are NOT available:

Create clear instructions for me to provide:

* Firebase project ID
* Firebase web app config
* Authentication configuration
* Firestore configuration

Do not fabricate credentials.

Do not commit secrets.

If browser/CLI access is available and authenticated, perform as much setup as possible automatically.

==================================================
27. VERCEL DEPLOYMENT
=====================

The final application must be deployable to Vercel.

Create:

.env.example

README.md

Deployment instructions.

If Vercel CLI/authentication is available:

Deploy the application.

Otherwise prepare the project so I can import the GitHub repository into Vercel with minimal manual steps.

Do not use Render.

==================================================
28. GITHUB
==========

If GitHub access is available:

Create/use a private repository:

water-bottle-league

Commit the complete application.

Never commit:

.env
service account JSON
private keys
tokens
passwords

==================================================
29. TESTING
===========

Before declaring completion, test:

1. Login
2. Logout
3. Member dashboard
4. Admin dashboard
5. Member submission
6. Duplicate submission prevention
7. Future date prevention
8. Pending approval
9. Admin approval
10. Admin rejection
11. Points calculation
12. Strike Rate calculation
13. Missing day = 0
14. 14 eligible days = not eligible
15. 15 eligible days = eligible
16. Winner calculation
17. Last Place calculation
18. Streak calculation
19. Weekly bonus
20. Monthly achievement
21. Correction request
22. Admin correction
23. Month lock
24. Admin reopen
25. Dinner calculation
26. Member cannot access admin functionality
27. Member cannot modify points
28. Member cannot modify eligibility
29. Member cannot modify approved entry
30. Audit log creation

Fix errors before finishing.

==================================================
30. PERFORMANCE / SIMPLICITY
============================

This is a small private application.

Expected scale:

~10–50 members.

Do not over-engineer.

Do not introduce Redis, Docker, Kubernetes, separate backend servers, or unnecessary microservices.

Use Firestore efficiently.

Avoid unnecessary reads.

Cache or calculate leaderboard efficiently where appropriate.

==================================================
31. ADMIN INITIALIZATION
========================

The first admin must be explicitly configured.

Do NOT make "first registered user = admin" unless it is secured against abuse.

Provide a clear secure way to configure the admin UID/email.

==================================================
32. FINAL ACCEPTANCE CRITERIA
=============================

The application is considered complete only when:

* It runs locally.
* Firebase Auth works.
* Firestore works.
* Security rules are implemented.
* Member dashboard works.
* Admin dashboard works.
* Submission approval works.
* Scoring works.
* Strike Rate works.
* Eligibility works.
* Winner/Last Place works.
* Dinner calculator works.
* Audit logging works.
* Month locking works.
* Mobile UI works.
* No secrets are committed.
* README exists.
* Deployment configuration exists.
* Vercel deployment is prepared or completed.

==================================================
33. EXECUTION INSTRUCTION
=========================

START NOW.

First inspect the current project/repository.

If empty, scaffold the application.

Then implement the application end-to-end.

Do not spend excessive time explaining.

Use the fastest safe implementation.

If something cannot be automated because it requires my credentials or Firebase/Vercel console action, stop only at that exact point and tell me the ONE manual action I need to perform, then continue with everything else that can be completed.

Do not replace working functionality with mock data.

Do not leave TODO placeholders for core functionality.

At the end, provide a concise status report:

* What was built
* What was tested
* Firebase setup required, if any
* Vercel deployment status
* Live URL, if deployed
* Any remaining manual step

Priority order:

1. Working application
2. Security
3. Correct scoring
4. Deployment
5. UI polish
