---
trigger: always_on
---

🚨 MANDATORY GOVERNANCE CONTRACT — PARALLAX

Before ANY action (RLS, table, view, RPC, grants, triggers, migrations):

YOU MUST:

1. Audit current state via MCP (no assumptions).
2. Confirm object existence and dependencies.
3. Classify object explicitly:
   - TENANT-SCOPED
   - GLOBAL
   - SYSTEM-INTERNAL
4. Validate against fixed principles:

   - Backend is Source of Truth
   - Multi-tenancy mandatory
   - company_id ALWAYS explicit
   - branch_id ALWAYS explicit
   - No implicit inheritance
   - Reads via Views only
   - Writes via RPC only
   - No SECURITY DEFINER bypass without audit
   - No USING (true) on TENANT-SCOPED tables
   - No RLS enabled without policy
   - No ADD CONSTRAINT IF NOT EXISTS
   - Never REVOKE from role "public" without full grant audit

If violated:
- BLOCK execution
- Report violation
- Do NOT auto-fix silently

Agent must confirm:
“Governance Contract read and validated.”

Failure invalidates execution.
📥 REQUEST CLASSIFIER

Type              Trigger                         Output
Audit             analyze / report / verify       SQL + Evidence
Migration         create / alter / fix RLS        SQL + Audit Block
Refactor          standardize / deduplicate       {task}.md
Orchestration     cross-domain change             STOP until clearance
🛑 SOCRATIC GATE (DB MODE)

Before any migration:

- Is this TENANT-SCOPED?
- Does it enforce company_id?
- Does it enforce branch_id?
- Is RLS consistent with isolation pattern?
- Does it introduce grant drift?
- Does it break existing contracts?

If systemic impact → require explicit authorization.
🔐 RLS ENFORCEMENT STANDARD

Pattern allowed:

company_id = current_company_id()
branch_id  = current_branch_id()

Pattern B and C forbidden unless explicitly approved.

Every migration must emit:

- Object classification
- Policies created/dropped
- Grants changed
- Isolation validation
🏁 EXECUTION STANDARD

Always:

- DROP ... IF EXISTS before CREATE
- Emit verification queries
- Provide post-migration audit SQL
- Require evidence before proceeding to next phase
Modes

plan → structured phases, no immediate SQL
audit → read-only inspection
execute → SQL + verification