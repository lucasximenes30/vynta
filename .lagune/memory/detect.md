# Vynta Detect Map

- **Scope:** Full project static scan: application routes, services, authentication, payments, imports, exports, client cache and dependencies. No production attack or load test.
- **Mapped:** 2026-11-10

## Findings

### Expensive operations without effective ceilings
- **What it is:** Insights, checkout, calendar sync, exports and imports lack per-account quotas. Push detach is a public database write without a quota. The shared limiter returns success on database failure.
- **Why it matters:** Repeated requests consume database capacity and paid provider resources; a limiter outage removes protection from login too.
- **Evidence:** enforceRateLimits/hit fail open; the corresponding request handlers perform work before any quota.

## Applied specializations
- access-control: No remaining finding in this specialization.
- credential-endpoint: Expensive operations without effective ceilings.
- serverless: Expensive operations without effective ceilings.
- upload: Import item count is bounded at 500; request byte size and quotas require strengthening.
- sql: Prisma queries use parameters; reviewed object mutations check ownership. No confirmed raw SQL injection.
- federation: JWT scan reports no unpinned verification; session/reset purposes are separated.
- crypto: No weak primitive found; scanner leads are non-secret tag comparisons.
- secrets: No confirmed hardcoded production secret; development JWT fallback is rejected in production. Reviewed public webhook HMAC key is not authentication.
- transport: HTTPS providers and HSTS exist; deployed TLS configuration was not inspected.
- payment: Server-priced checkout, secret-validated callbacks and charge deduplication exist. Provider calls remain an abuse surface.

## Not determined
- Two Vercel Hobby WAF rules were inspected and published in the follow-up. Spending controls, production TLS configuration and infrastructure privileges were not audited.
- External account MFA and email identity verification need a separate product/authentication flow; this review does not claim full resistance to distributed credential stuffing.
- No interpreter, dynamic filesystem path, XML parser, GraphQL/gRPC/WebSocket API or container deployment surface was found in the application request paths (catalog entries interpreter, path, xml, api-endpoint and container skipped).
