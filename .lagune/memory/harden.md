# Vynta Hardening Record

- **Scope:** Remaining application findings, copied-token logout revocation and payment authentication; additive session table and two Vercel Hobby WAF rules applied. No production attack or load test.
- **Hardened:** 2026-11-10

## Applied

### Expensive operations without effective ceilings
- **Status:** Partial
- **What changed:** Durable quotas precede expensive requests; limiter outages return 503; trusted platform IPs, bounded inputs/streams, output limits and timeouts reduce resource abuse. Two live Hobby WAF rules limit authentication requests per IP and deny common probe paths, excluding cron and webhooks by exact scope. Cron GET authentication and execution are unchanged.
- **Where:** Rate limiter, API middleware, costly request handlers, AI providers, transaction input validation and outbound readers.
- **Verdict:** ❓ Inconclusive
- **Reason:** Application ceilings and the two published edge rules are present, but global spending limits and resilience against distributed abuse are not established. Database-backed limits still consume database capacity; noncritical JSON handlers rely on platform/header bounds. No production load test was performed.

## Remaining
- Expensive operations without effective ceilings: edge rules are live, but global spending ceilings and resistance to distributed abuse are not established. Application quotas still consume database capacity; noncritical JSON handlers rely on platform/body-header limits. No volumetric resilience or production load test is claimed.
