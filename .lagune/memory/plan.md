# Vynta Defense Plan

- **Scope:** All findings from the static security scan.
- **Planned:** 2026-11-10

## Fixes

### Expensive operations without effective ceilings
- **Category:** Resource exhaustion / CWE-400
- **CVSS:** CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:N/VI:N/VA:H/SC:N/SI:N/SA:N (8.7, High)
- **Priority:** High
- **Why this priority:** Public requests can reach the database and paid services; autoscaling amplifies cost.
- **Upholds:** None directly
- **Fix:** Fail closed with a temporary service error on limiter failure. Add durable per-account quotas before expensive work, public detach quotas, bounded request bodies and provider timeouts. Trust IP forwarding only on Vercel. Document edge firewall controls separately from application limits.
