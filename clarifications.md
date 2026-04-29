# Project Clarifications: FinTrack Pro Reconciliation System

This document outlines the ambiguities, assumptions, and engineering decisions made during the initial audit of the reconciliation system requirements.

## 1. Ambiguities & Interpretations

### 1.1 JSON Schema for Bank Records
*   **Quote**: *"Accept a batch of bank records (uploaded as JSON, representing a CSV import)"*
*   **Interpretation**: I assume the system expects a single, flattened JSON array of objects that strictly maps to the `BankRecord` interface provided in the starter code.
*   **Rationale**: Without a specific bank partner mentioned, the `BankRecord` interface is the only "contract" we have. Standardizing the input early is safer than attempting to build a multi-format parser in a "rescue" scenario.

### 1.2 Matching Strategy ("Properly Matched")
*   **Quote**: *"Payments need to be properly matched against the bank records"*
*   **Interpretation**: I assume "properly matched" requires a primary match on a unique identifier (like a Reference ID or External Ref) AND a secondary validation of the amount.
*   **Rationale**: Matching solely on amount (as seen in the starter code) is a high-risk strategy that will lead to false positives when multiple customers pay the same amount (e.g., standard subscription fees).

### 1.3 Definition of a Discrepancy
*   **Quote**: *"Any discrepancies should be flagged so the team can review them"*
*   **Interpretation**: I assume a discrepancy occurs when a record matches on a unique Reference ID but the `amount` or `currency` does not align.
*   **Rationale**: The starter code only "matches" if amounts are identical, which logically makes it impossible to ever find a discrepancy. This interpretation makes the "Discrepancy Report" functional.

### 1.4 Date Clearing Windows
*   **Quote**: *"Match them... for a given period"*
*   **Interpretation**: I assume a "Look-back/Look-ahead" buffer of ±3 days for the `valueDate` relative to the internal `createdAt` date.
*   **Rationale**: Bank transactions often clear several days after the internal payment intent is created. A strict date match would result in a high volume of unmatched records.

## 2. Compliance Question
**Question**: *"Does the reconciliation report need to mask or encrypt specific PII/PCI-sensitive fields (like the full bank description or reference numbers) when persisted to the database to comply with our SOC 2/PCI DSS Level 1 requirements?"*

## 3. Engineering Decision (Not for the Client)
**Question**: *"Should we use a durable execution framework like Temporal to manage the reconciliation workflow?"*
*   **Why this is an engineering decision**: The client's requirement is "real-time" and "reliable." Whether we achieve this via a synchronous Next.js route, a BullMQ background worker, or a Temporal workflow is a technical implementation detail regarding scalability and fault tolerance. The client should not be burdened with choosing the orchestration technology; they only need to know that the system can recover from failures without losing data.
