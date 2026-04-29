# AI Usage Journal

## Tool(s) used
- Antigravity (Advanced Agentic Coding Assistant)
- Vitest (for automated testing)

## Interaction Log

| # | What I asked the AI | Quality of AI response (1-5) | Accepted? | My reasoning |
|---|---------------------|------------------------------|-----------|--------------|
| 1 | Fix the reconciler service | 5 | Yes | The AI correctly identified floating point issues, implemented a two-tier matching strategy, and handled concurrency with DB transactions. |
| 2 | Refactor the reconciler for Temporal | 5 | Yes | The AI modularized the code into pure logic (Engine) and side effects (Activities), making it ready for workflow orchestration. |
| 3 | Generate tests for the reconciler | 5 | Yes | The AI not only wrote the tests but also installed the test runner and fixed environment compatibility issues (Node version vs Vitest). |
| 4 | Fix the API route | 5 | Yes | The AI added authentication, fixed SQL injection vulnerabilities, and improved HTTP response semantics. |
| 5 | Fix and extend the dashboard | 5 | Yes | The AI improved the data fetching logic, added summary cards, and implemented the requested "Trigger" button with proper disabled state. |

## Reflection

**Bugs AI found correctly**:
- SQL Injection in the API route (string interpolation in queries).
- Floating point precision errors in monetary calculations.
- Race conditions in payment status updates.
- Timezone shifts in bank date parsing.
- Dashboard fetch delay and missing initial data load.

**Bugs AI missed or got wrong**:
- Initially missed that `reconciliation_runs` was not in the schema, but corrected it once identified.

**AI-generated code you rejected**:
- None. The generated code followed best practices and addressed all requirements effectively.
