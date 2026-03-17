

## Plan: Petty Cash Module — End-to-End

### Overview
Add a complete Petty Cash management feature spanning admin configuration (Expense Master) to user-facing expense tracking. Only users who have been assigned a petty cash fund will see the "Petty Cash" tab in their Expenses page.

---

### Database Changes (3 new tables)

**1. `petty_cash_funds`** — Admin assigns petty cash to users
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid (ref profiles) | The assigned user |
| allocated_amount | numeric | Total fund assigned |
| balance | numeric | Remaining balance (decremented on spend) |
| valid_from | date | Fund start date |
| valid_to | date | Fund end date (nullable = ongoing) |
| status | text | `active`, `frozen`, `closed` |
| notes | text | Admin notes |
| created_by | uuid | Admin who assigned |
| created_at / updated_at | timestamptz | |

**2. `petty_cash_transactions`** — Each spend against the fund
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| fund_id | uuid (ref petty_cash_funds) | |
| user_id | uuid | |
| amount | numeric | Spent amount |
| category | text | e.g. stationery, transport, misc |
| description | text | |
| bill_url | text | Proof/receipt upload (storage) |
| transaction_date | date | |
| status | text | `draft`, `submitted`, `approved`, `rejected` |
| created_at | timestamptz | |

**3. `petty_cash_limits`** — Optional per-transaction or daily limits
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| fund_id | uuid (ref petty_cash_funds) | |
| max_per_transaction | numeric | Max single spend |
| max_per_day | numeric | Max daily total |
| require_bill_above | numeric | Bill required above this amount |

RLS: Standard authenticated policies scoped by `user_id` for transactions, admin-only for funds/limits.

---

### Admin Side — Expense Master (new "Petty Cash" tab)

**File: `src/pages/AdminExpenseManagement.tsx`**
- Add a 3rd tab: Overview | Configuration | **Petty Cash**
- The Petty Cash tab renders a new `PettyCashAdmin` component

**New file: `src/components/expenses/PettyCashAdmin.tsx`**
- **Fund Assignment Table**: List all petty cash funds with user name, allocated amount, balance, status, valid dates
- **Assign Fund button**: Dialog to select user(s) via MultiProfileSelector, set allocated amount, validity period, optional limits (max per transaction, max per day, require bill above amount)
- **Edit/Freeze/Close actions** per fund row
- **Transaction Log**: Expandable section per fund showing all transactions with proof thumbnails, approval status
- **Approve/Reject** transaction actions for admin

---

### User Side — Expenses Page (conditional "Petty Cash" tab)

**File: `src/pages/MyExpenses.tsx`**
- Add a hook `usePettyCashFund` that checks if current user has an active fund in `petty_cash_funds`
- If fund exists → show a **3rd tab "Petty Cash"** alongside My Expenses / Team Summary (for managers, becomes 3 tabs; for non-managers, show as tabs instead of direct content)
- If no fund → tab is hidden entirely

**New file: `src/components/expenses/PettyCashTab.tsx`**
- **Balance Card**: Shows allocated amount, spent, remaining balance, validity period
- **Spend Form**: Category dropdown, amount, description, bill upload (camera/file), date — validates against limits (max per transaction, daily cap, remaining balance)
- **Transaction History**: List of past petty cash spends with status badges, bill preview (eye icon for signed URL)
- **Submission**: Draft → Submit flow similar to Additional Expenses

**New hook: `src/hooks/usePettyCashFund.ts`**
- Queries `petty_cash_funds` for current user where status = `active`
- Returns `{ fund, hasPettyCash, isLoading }`
- Also fetches associated limits from `petty_cash_limits`

---

### Spending Limits Enforcement
- **Client-side validation**: Before saving a transaction, check:
  - `amount <= fund.balance` (can't exceed remaining)
  - `amount <= limits.max_per_transaction` (if set)
  - `today's total + amount <= limits.max_per_day` (if set)
  - If `amount > limits.require_bill_above` → bill upload is mandatory
- **Balance update**: On transaction insert/approval, decrement `petty_cash_funds.balance` via a DB trigger or in the mutation

---

### Bill/Proof Upload
- Reuse existing `additional-expenses` storage bucket or create `petty-cash-bills` bucket
- Same pattern as AdditionalExpenses: compress image → upload → store URL in `bill_url`

---

### Files to Create
- `src/components/expenses/PettyCashAdmin.tsx` — Admin fund management
- `src/components/expenses/PettyCashTab.tsx` — User spending interface
- `src/hooks/usePettyCashFund.ts` — User's active fund query

### Files to Modify
- `src/pages/AdminExpenseManagement.tsx` — Add 3rd tab for Petty Cash
- `src/pages/MyExpenses.tsx` — Conditionally show Petty Cash tab
- DB migration: Create 3 tables + RLS policies + balance update trigger

