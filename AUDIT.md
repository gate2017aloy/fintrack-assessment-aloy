# Code Audit — FinTrack Reconciliation System

This audit identifies critical security vulnerabilities, logic errors, and performance issues within the three starter files.

| # | File | Location | Severity | Category | Description | Correct Fix |
|---|------|----------|----------|----------|-------------|-------------|
| 1 | `route.ts` | Line 31 | Critical | Security | SQL Injection vulnerability in `POST` via direct string interpolation of `parsed.notes`. | Use parameterized queries or Drizzle ORM's type-safe `insert` method. |
| 2 | `route.ts` | Line 51 | Critical | Security | SQL Injection vulnerability in `GET` via direct string interpolation of the `id` search parameter. | Use parameterized queries or Drizzle's `eq` helper with the Query API. |
| 3 | `reconciler.ts` | Line 55 | High | Logic | Naive matching logic only checks `amount`. Matches wrong payments if amounts identical; ignores `reference`, `description`, and `currency`. | Implement multi-factor matching (Amount + Reference/External ID) and verify `currency` matches. |
| 4 | `reconciler.ts` | Line 124 | High | Performance | N+1 Query problem: `markReconciled` performs a SELECT and UPDATE inside a loop for every match. | Batch updates using a single query (e.g., `WHERE id IN (...)`) after the loop completes. |
| 5 | `route.ts` | Line 42 | High | Security | Information disclosure: returning the full `error.stack` in the API response to the client. | Log the stack trace server-side and return a generic error message with a correlation ID. |
| 6 | `reconciler.ts` | Line 128, 129 | High | Logic | Floating point precision risk: Summing dollar values as JS numbers can lead to rounding errors (e.g., 0.1 + 0.2). | Store and sum values in cents (integers) or use a specialized library like `decimal.js`. |
| 7 | `reconciler.ts` | Line 103-146 | High | Logic | Missing database transaction: If matching succeeds but saving the summary fails, the system state becomes inconsistent. | Wrap the entire reconciliation process in a `db.transaction()`. |
| 8 | `ReconciliationDashboard.tsx` | Line 33 | High | API/Logic | API response mismatch: Component expects `data.runs`, but `route.ts:54` returns a raw array/result object. | Wrap the API response in an object `{ runs: [...] }` or update the frontend to handle the array directly. |
| 9 | `route.ts` | Line 46-55 | High | Logic | The `GET` handler filters by `id = 'null'` when no ID is provided, preventing the dashboard from loading any data. | Modify the query to return all recent runs if no specific ID is provided in the search parameters. |
| 10 | `reconciler.ts` | Line 153 | Medium | Logic | Discrepancies array is initialized but never populated, even if amount delta logic exists. | Populate the `discrepancies` array when a match is found but the attributes (like amount or date) differ slightly. |
| 11 | `ReconciliationDashboard.tsx` | Line 29 | Medium | Performance | Polling with `setInterval` can lead to "request stacking" if the API is slow, causing race conditions. | Use `setTimeout` recursively or a library like `SWR`/`React Query` to ensure only one request is in flight. |
