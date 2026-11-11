# Lagune History

## Closed findings

### Outbound destinations controlled by accounts

- **Classification:** High
- **Category:** SSRF / CWE-918
- **What it is:** Calendar feeds accept arbitrary HTTPS destinations and redirects; push subscriptions accept any URL.
- **Closed:** 2026-11-11

### Cross-origin mutations lack a central guard

- **Classification:** High
- **Category:** CSRF / CWE-352
- **What it is:** JSON handlers rely on session cookies without validating request origin; middleware does not cover APIs.
- **Closed:** 2026-11-11

### Quadratic regular expressions

- **Classification:** High
- **Category:** ReDoS / CWE-1333
- **What it is:** Lagune's full regex scan found eight unsafe patterns in text cleanup and AI JSON extraction.
- **Closed:** 2026-11-11

### Spreadsheet formula injection

- **Classification:** Medium
- **Category:** CSV injection / CWE-1236
- **What it is:** CSV exports interpolate user titles and categories without neutralizing spreadsheet formulas or consistently quoting cells.
- **Closed:** 2026-11-11

### Vulnerable dependency versions

- **Classification:** High
- **Category:** Vulnerable dependencies / CWE-1395
- **What it is:** npm audit reports 29 dependency alerts, including critical Next.js and DOMPurify advisories.
- **Closed:** 2026-11-11

### Incomplete financial insight cache identity

- **Classification:** Medium
- **Category:** Cross-account cache confusion / CWE-524
- **What it is:** The in-memory insight cache key omits previous-month totals, balance, trend and account identity, and rounds category amounts.
- **Closed:** 2026-11-11

### Transaction edits can attach another account's card

- **Classification:** High
- **Category:** Broken object authorization / CWE-639
- **What it is:** Editing an owned transaction accepts a foreign card identifier without checking the card owner.
- **Closed:** 2026-11-11

### Session lifecycle and current permissions

- **Classification:** High
- **Category:** Stale authorization / CWE-613
- **What it is:** Session JWTs originally remained valid after password changes and carried roles from login time. The first fix bound credentials and current permissions but logout still left copied tokens valid.
- **Closed:** 2026-11-11

### Unauthenticated payment renewal replay

- **Classification:** High
- **Category:** Improper authentication / CWE-287
- **What it is:** The AbacatePay fallback accepted events without the configured secret after looking up an active subscription, while using the untrusted event ID to distinguish renewals.
- **Closed:** 2026-11-11
