# Uganda-First POS Production Roadmap

Status: Planning only. This document does not authorize production payment processing or feature implementation.

## 1. Objective

Turn the current restaurant POS into a financially reliable, multi-tenant product that launches well in Uganda and can later add other countries without rebuilding its payment or accounting core.

Uganda is the first-market default:

- Currency: UGX
- Timezone: Africa/Kampala
- Primary tenders: cash, MTN MoMo, and Airtel Money
- Phone storage and display: normalized E.164 numbers (`+256...`)
- Receipt and reporting language: English initially, with localization-ready fields

Cash remains a first-class payment method. Mobile money must be a real, asynchronous provider integration—not a simulated “success” button. Card and additional country-specific providers follow through the same provider interface.

## 2. Product and architecture decisions

### 2.1 Payment ownership

Recommended first release: each restaurant connects its own approved merchant account with MTN MoMo and/or Airtel Money. The platform stores encrypted provider credentials or references to a secrets service and orchestrates requests, but does not hold restaurant funds.

Before offering one platform account that collects and settles money for multiple restaurants, obtain Ugandan legal and provider review. That model may create licensing, safeguarding, settlement, AML, and reconciliation obligations beyond those of a software provider.

### 2.2 Provider-independent payment core

Implement one internal payment orchestration layer and adapters such as:

- `cash`
- `mtn_momo_uganda`
- `airtel_money_uganda`
- future card/acquirer adapter
- future country/provider adapters

The application must not embed MTN- or Airtel-specific behavior in orders, checkout, or reports. Each adapter declares its supported countries, currencies, operations, refund capability, and webhook/status behavior.

### 2.3 Money representation

- Store amounts as integers in currency minor units and store the ISO currency on every order, tender, refund, fee, and settlement.
- For UGX, accept and send whole-shilling values; do not show artificial decimal places.
- Never use JavaScript floating-point arithmetic for financial totals.
- Snapshot prices, tax rules, discounts, and currency on the order so historical totals do not change when settings change.

### 2.4 Mobile money is asynchronous

An initial provider response only means the request was accepted for processing. It does not mean the customer paid.

Use a lifecycle similar to:

`created -> awaiting_customer -> processing -> succeeded | failed | expired | cancelled`

Refunds have their own lifecycle:

`requested -> processing -> succeeded | failed | manual_action_required`

Only a verified provider callback or an authenticated status lookup can move a tender to `succeeded`. The checkout must remain recoverable while a customer approves the prompt on their phone.

## 3. Planned workstreams

The numbered workstreams below describe scope and dependencies; they are not the implementation order. The authoritative build order is in section 7. Payment execution is deliberately last: cash, mobile money, and card checkout will remain disabled until the rest of the POS is hardened. Earlier work may establish payment-neutral monetary types and ledger boundaries, but it must not implement or activate a tender.

### Workstream 0 — Stabilize schema changes and diagnostics

Goal: make later financial changes safe to deploy and observable.

- Repair and baseline the Drizzle migration ledger against the live Neon schema.
- Establish forward-only, reviewed database migrations for development, staging, and production.
- Add structured server errors with stable error codes and correlation IDs.
- Preserve actionable errors in the UI until dismissed; do not use disappearing-only messages for failures.
- Add request logging and error tracking with secrets, PINs, and phone numbers redacted.
- Add a staging environment with separate Clerk, Neon, Cloudinary, and payment sandbox credentials.
- Document backup, point-in-time recovery, and migration rollback procedures.

Exit criteria:

- A clean database can be created entirely from migrations.
- Production schema drift is detected before deployment.
- An operator can trace a failed order or payment using a correlation ID without exposing sensitive data.

### Workstream 1 — Financial model, ledger, shifts, and cash controls

Goal: specify a trustworthy accounting foundation. Implement payment-neutral money and audit primitives early; defer tender posting, drawer reconciliation, refunds, and payment reports to the final payments stage.

- Design an append-only financial ledger for sales, tenders, refunds, voids, fees, tips, and cash adjustments. Early implementation is limited to payment-neutral order/audit events; tender entries are implemented with payments last.
- Never overwrite or delete completed financial events; reverse them with linked compensating entries.
- Implement register shifts with the final payment stage: opening float, cash sale, paid-in, paid-out, expected cash, counted cash, variance, and manager close.
- Add X-report and true Z-report with the final payment stage, including location, terminal, operator, and tender breakdowns.
- Implement full and partial refunds with the final payment stage, including reason, operator, manager approval, and references to original tenders.
- Enforce server-side totals, tax, discount, tip, balance-due, and state transitions.
- Introduce server-generated, location-scoped order numbers.

Exit criteria:

- Sales, refunds, and cash movements reconcile exactly by shift and tender.
- Financial history cannot be silently edited or deleted.
- Partial and split tenders survive refresh and reproduce the same balance.

### Workstream 2 — Payment adapter and orchestration core (implemented last)

Goal: support cash, mobile money, and cards without coupling checkout to one provider or country. Define this contract during architecture work, but implement and activate it only in the final feature stage.

All tenders must use one `PaymentAdapter` contract, including cash. Cash has no remote provider callback, but treating it as an adapter gives checkout, split tendering, refunds, ledger posting, permissions, receipts, and reporting one consistent boundary.

The adapter capability contract should cover:

- supported country/currency/method combinations;
- synchronous versus asynchronous confirmation;
- payment initiation, status lookup, cancellation, refund, and reconciliation capabilities;
- required customer input and validation;
- provider-specific reference and webhook verification behavior;
- settlement and fee reporting support.

Add or normalize these concepts:

- `payment_intents`: internal ID, restaurant, location, order, amount, currency, provider, method, status, idempotency key, external reference, customer phone hash/masked value, timestamps, expiry, and last error.
- `payment_attempts`: each outbound attempt and sanitized response metadata.
- `payment_events`: immutable callback/status events, including provider event ID and verification result.
- `refunds`: original tender, amount, reason, provider reference, status, actor, and approval.
- `merchant_accounts`: tenant/location provider configuration, environment, capabilities, and connection status. Credentials must not be returned to browsers.
- `settlement_records`: provider settlement, gross, fees, net, currency, period, and reconciliation status.

Required behavior:

- Generate an idempotency key per logical payment request and enforce uniqueness server-side.
- Make external provider references unique within a provider/merchant account.
- Verify webhook authenticity, retain the raw event securely where permitted, and process duplicate/out-of-order callbacks safely.
- Run status reconciliation for pending payments when callbacks are missing.
- Lock payment currency to the order currency.
- Prevent cumulative successful tenders from exceeding the amount due, except an explicitly modeled cash-change flow.
- Never allow a client to submit authoritative price, total, balance, or payment-success state.
- Use transaction-capable database execution for state changes and ledger posting.

Suggested server interface:

- `createPaymentIntent(orderId, provider, amount, customerContext)`
- `getPaymentIntentStatus(intentId)`
- `handleProviderEvent(provider, signedPayload)`
- `requestRefund(tenderId, amount, reason)`
- `reconcileProviderAccount(accountId, period)`

Exit criteria:

- Replaying the same request or callback cannot create a second charge or ledger entry.
- A successful provider payment and its ledger entry commit consistently.
- Pending and failed payments remain visible and recoverable after reload or terminal restart.

### Workstream 3 — Uganda mobile money launch (final payment stage)

Goal: launch production-grade MTN MoMo and Airtel Money collections in UGX.

#### Merchant onboarding

- Add a restaurant-owner/admin payment settings screen.
- Connect and validate separate sandbox/production merchant credentials per provider.
- Display provider connection state, supported operations, last successful callback, and last reconciliation.
- Allow configuration per location if a restaurant uses different merchant accounts.
- Keep live payments feature-flagged until provider approval, callback verification, reconciliation, and operational checks pass.

#### Checkout experience

- Offer `Cash`, `MTN MoMo`, and `Airtel Money` prominently for Uganda.
- Ask for the payer's phone number, normalize it to E.164, mask it on screen/logs, and let the user select the network. Do not rely only on number-prefix detection because numbers may be ported.
- Show the exact provider and amount before sending the prompt.
- After initiation, show a durable pending panel: “Approve the payment on the customer's phone,” elapsed time, masked number, status, cancel/close behavior, and retry guidance.
- Continue status checks with bounded backoff and restore the pending state after refresh.
- If a request expires or fails, preserve the attempt and allow a new intent; never mutate the failed attempt into a success.
- Print/send a final receipt only after confirmed success. A pending slip, if offered, must be clearly labeled as not proof of payment.
- Support split payments across cash and either mobile-money provider.

#### Provider implementation order

1. MTN MoMo Collections sandbox, status lookup, callback, refunds where contracted, and reconciliation.
2. Airtel Money Collections sandbox, status lookup/callback behavior, refunds where contracted, and reconciliation.
3. Production certification and a limited pilot with test restaurants and low operational limits.

MTN documents `Request Payment` as an asynchronous request that can return HTTP 202 while the customer still needs to approve the wallet debit. Airtel's official portal supports merchant collections and multi-country application products. Exact production endpoints, signatures, limits, fees, refund support, and onboarding requirements must be confirmed from each restaurant's active provider contract during implementation.

#### Reconciliation and support

- Reconcile internal successful tenders against provider transactions and settlements daily.
- Flag missing callbacks, amount/currency mismatches, duplicates, reversals, and unmatched provider transactions.
- Record gross amount, provider fees, taxes/withholding if supplied, and net settlement separately.
- Provide a restricted support view for payment timeline, sanitized provider references, retry/status lookup, and reconciliation notes.
- Never provide a button that manually changes a provider payment to successful. Corrections must be auditable ledger adjustments.

Exit criteria:

- MTN and Airtel payments can be initiated, confirmed, failed, expired, reconciled, and safely retried.
- Loss of browser connection during customer approval does not lose or duplicate the payment.
- A callback for one restaurant/location cannot affect another tenant.
- Refund behavior shown in the UI matches the provider/account's actual capability.

### Workstream 4 — Order workflow and concurrency

Goal: make order entry move forward cleanly without losing concurrent changes.

- Track the exact active and checkout order IDs; remove heuristic order selection.
- Replace duplicate-producing “reopen” behavior with explicit editing of the original order.
- Use optimistic concurrency with order versions and line-level conflict information.
- On a version conflict, fetch the latest order and offer a clear merge/review flow instead of only “reload before saving.”
- Persist terminal drafts locally and server-side where appropriate.
- Define strict order/item/table states and authorized transitions.
- Make send-to-kitchen and proceed-to-payment sequential stages without forcing navigation back and forth.
- Block edits to paid/voided/refunded lines except through explicit audited flows.

Exit criteria:

- Two terminals cannot silently overwrite each other.
- A recoverable conflict identifies what changed and preserves the current user's draft.
- Editing an existing order cannot create a duplicate order.

### Workstream 5 — Connectivity resilience and background work

Goal: operate predictably on imperfect restaurant networks.

- Cache menu, categories, tables, and authorized terminal configuration for read resilience.
- Queue eligible order drafts with idempotent synchronization and visible offline status.
- Never treat a mobile-money or card payment as approved offline.
- Resume pending provider status checks when connectivity returns.
- Move callbacks, reconciliation, receipt delivery, image cleanup, and retryable work to durable jobs with dead-letter handling.
- Replace broad polling with location-scoped incremental updates, visibility awareness, and exponential backoff.

Exit criteria:

- The UI clearly distinguishes offline drafts, server-accepted orders, and provider-confirmed payments.
- Reconnection cannot duplicate an order or payment.

### Workstream 6 — Restaurant operations

Goal: cover the major daily workflows expected of a serious POS.

- Ingredient and stock-item catalog, recipes, unit conversions, stock movements, wastage, counts, reorder levels, and depletion from completed items.
- Menu modifiers and modifier groups with minimum/maximum selections, price changes, availability, kitchen labels, and category/item assignment.
- Receipt and kitchen-print infrastructure: printer profiles, routing by station/category, retries, reprints, duplicate labels, and test prints.
- Manager approvals for voids, discounts, refunds, shift exceptions, drawer opening, and sensitive configuration changes.
- Restaurant/location settings for currency, tax, timezone, receipt identity, service charge/tip policy, and terminal policy.

Exit criteria:

- Inventory movements can be traced to sales, receipts, waste, counts, or adjustments.
- Modifier prices and selections are included in server totals and kitchen output.
- Failed print jobs are visible and safely retryable.

### Workstream 7 — Identity, clients, and multiple locations

Goal: complete the platform and restaurant administrative lifecycle.

- Keep Clerk authoritative for platform and back-office identities; keep PIN sessions for daily terminal operation.
- Add verified Clerk webhook reconciliation for user and organization membership changes.
- Complete invitation tracking, resend, revoke, owner transfer/addition, suspension, and reconciliation.
- Separate identity records from restaurant organization and location memberships.
- Add a platform/restaurant workspace switcher and location selector with explicit current context.
- Scope orders, KDS, tables, menu availability, staff, shifts, payments, reports, and terminals to restaurant plus location.
- Make staff archival the default; allow hard deletion only after a server-side reference check.

Exit criteria:

- Revocation is immediately effective and remains consistent with Clerk.
- Every operational query and mutation proves tenant and location membership server-side.
- A user with access to two restaurants or locations cannot accidentally operate in an implicit workspace.

### Workstream 8 — Card payments and new markets (final payment stage)

Goal: expand without weakening Uganda behavior.

- Add country configuration for currency exponent, timezone, tax rules, phone normalization, receipts, and supported tenders.
- Add provider adapters behind the existing payment interface; do not fork checkout per country.
- Add cards through a PCI-conscious provider flow that prevents the POS server from storing raw card data or PINs.
- Add country launch checklists covering merchant onboarding, regulation, refunds, settlements, fees, support, and certification.
- Permit a restaurant/location only the providers, currencies, and capabilities enabled for its market and contract.

Exit criteria:

- Adding a country/provider does not require changes to the order ledger or core checkout state machine.
- Cross-currency payment against a single-currency order is rejected unless a future foreign-exchange feature explicitly supports it.

## 4. Cross-cutting quality requirements

### Authorization and tenant isolation

Every critical API must test role, organization, restaurant, location, terminal, and active membership as applicable. IDs supplied by a browser are selectors, not proof of access.

### Auditability

Audit login, PIN access, order transitions, price overrides, discounts, voids, refunds, payment events, shift actions, role/membership changes, provider configuration changes, and support interventions. Audit records must include actor, tenant/location, timestamp, reason, correlation ID, and before/after references without recording secrets or raw PINs.

### Security

- Hash staff PINs with an appropriate password-hashing algorithm and throttle attempts per profile and terminal.
- Encrypt provider secrets and rotate them without downtime.
- Verify callbacks before processing and protect public callback endpoints from replay.
- Apply least privilege to provider credentials and database roles.
- Define retention and access rules for payer phone data.

### Automated tests

At minimum, add integration and browser coverage for:

- server-calculated totals, rounding, tax, discounts, tips, and modifiers;
- order state transitions, concurrent editing, and draft recovery;
- tenant and location isolation on every operational resource;
- PIN sessions, inactivity, revocation, and role permissions;
- cash, partial, split, duplicate, pending, failed, expired, and successful payments;
- duplicated/out-of-order callbacks and reconciliation recovery;
- full/partial refunds, voids, shifts, and Z-reports;
- MTN and Airtel provider-contract tests using sandbox/mocked signed events;
- invitation, owner, suspension, and Clerk webhook lifecycles;
- network loss, job retry, print failure, and migration failure paths.

## 5. Rollout gates

No live mobile-money rollout until all gates pass:

1. Commercial and compliance: merchant agreements, permitted platform model, fees, limits, settlement ownership, refund/reversal rules, privacy, support escalation, and Uganda regulatory review are documented.
2. Technical: production credentials, HTTPS callback URLs, signature verification, idempotency, timeout policy, status reconciliation, monitoring, and secret rotation are verified.
3. Financial: ledger posting, shift reports, provider transaction reconciliation, settlement reconciliation, and accounting export are signed off with sample cases.
4. Operational: restaurant staff training, payer instructions, pending-payment support procedure, refund procedure, incident ownership, and provider escalation contacts exist.
5. Pilot: feature-flagged launch at one location, controlled volumes, daily reconciliation, and measured failure/latency/duplicate rates.
6. Expansion: only after pilot discrepancies are closed and recovery drills succeed.

## 6. Decisions required before implementation

- Confirm that restaurants will initially use their own MTN/Airtel merchant accounts rather than the platform holding or settling client funds.
- Confirm whether one merchant account can span a restaurant's locations or must be configured per location.
- Select the first pilot restaurant and obtain sandbox/production onboarding requirements from both networks.
- Define who may initiate and approve refunds, discounts, voids, cash adjustments, and shift closure.
- Confirm receipt delivery priorities: printed, SMS, email, or a combination.
- Decide the first expansion market only after Uganda payment and reconciliation behavior is stable.

## 7. Recommended implementation order

1. Migration baseline, structured errors, staging, observability, and recovery documentation.
2. Server-authoritative order totals, integer/currency-safe money types, and payment-neutral audit foundations.
3. Order conflict resolution, exact active-order tracking, and streamlined forward order flow.
4. Clerk reconciliation, client lifecycle, tenant isolation, and full multi-location administration.
5. Menu modifiers, inventory, manager approvals, table operations, and kitchen workflow.
6. Connectivity resilience, durable background jobs, receipt/kitchen-print infrastructure, and localized failure recovery.
7. Browser coverage, authorization tests, tenant-isolation tests, load checks, and operational hardening for all non-payment workflows.
8. Freeze and verify the order, tax, discount, tip, currency, and checkout boundaries that payments will consume.
9. Implement the shared `PaymentAdapter` orchestration layer, immutable tender ledger, idempotency, shifts, cash drawer controls, refunds, reconciliation, and payment reporting.
10. Implement and verify adapters in this order: cash, MTN MoMo Uganda, Airtel Money Uganda, then card payments. Support split tenders across enabled adapters.
11. Complete provider sandboxes, production certification, compliance review, recovery drills, and a feature-flagged Uganda pilot.
12. Add other countries and providers only after the Uganda pilot reconciles reliably.

Steps 1–8 must not expose a working payment button or mark an order paid. Payment-related types created earlier are contracts only, so payment implementation can be added last without restructuring orders, tenants, or reporting.

## 8. Definition of production-ready

- A client cannot change prices/totals, cross tenants or locations, replay a payment, or force an invalid state transition.
- A mobile-money order becomes paid only after authenticated provider confirmation.
- Duplicate requests, callbacks, retries, and browser refreshes cannot double-charge or double-post.
- Partial and split tenders reconcile exactly to the order balance and survive refresh.
- Refunds, voids, fees, cash movements, and settlements are traceable in an immutable ledger.
- Editing an order updates that order without duplicating it, and concurrent changes have a recoverable workflow.
- Revocation is effective immediately and remains synchronized with Clerk.
- Failed multi-step work leaves no invisible partial order, payment, terminal, or client state.
- Every critical workflow has authorization, tenant-isolation, failure-path, and browser-flow tests.

## 9. Primary references

- [MTN MoMo API portal](https://momodeveloper.mtn.com/apis)
- [MTN MoMo Request Payment flow](https://momodeveloper.mtn.com/content/html_widgets/0wwlz.html)
- [MTN MoMo Uganda Collections](https://momodeveloper.mtn.com/Uganda_Widget_productDetails)
- [Airtel Africa Developer Portal](https://developers.airtel.africa/)
- [Airtel Africa announcement: collections and disbursements APIs](https://www.airtel.africa/assets/pdf/press-release/Airtel-Africa-Developer-Portal_ENGLISH.pdf)
- [Bank of Uganda Revised National Payment Systems Oversight Framework 2025](https://bou.or.ug/uploads/Revised_BOU_National_Payment_Systems_Oversight_Framework_2025_698b3e9745.pdf)

These references establish available integration surfaces and the regulatory framework, but provider contracts and qualified Ugandan legal/compliance advice must determine the production operating model.
