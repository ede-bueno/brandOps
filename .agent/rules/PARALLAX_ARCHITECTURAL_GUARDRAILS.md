# PARALLAX ARCHITECTURAL GUARDRAILS

**CRITICAL: THIS DOCUMENT MUST BE CONSULTED BEFORE ANY ARCHITECTURAL DECISION, MIGRATION, OR CODE CHANGE.**

## 1. MULTI-TENANCY & ISOLATION
- **STRICT TENANCY:** Every database object (table, view, RPC, function) MUST be explicitly classified as `TENANT-SCOPED`, `GLOBAL`, or `SYSTEM-INTERNAL`.
- **NO INHERITANCE:** Tenant context is NEVER inherited implicitly.
- **EXPLICIT ID COLUMNS:** `company_id` and (where applicable) `branch_id` MUST be present in ALL tenant-scoped tables.
- **CONTEXT HELPER FUNCTIONS:** Use `current_company_id()` and `current_branch_id()` exclusively.
    - **PROHIBITED:** Direct use of `auth.jwt()`, `current_setting('request.jwt.claims...')`, or subqueries on `user_active_company` as the primary isolation mechanism.
- **DOMAIN ISOLATION:** No direct cross-domain database access (e.g., Sales querying HR tables). Use defined interfaces/RPCs.

## 2. ROW LEVEL SECURITY (RLS)
- **ALWAYS ON:** RLS MUST be enabled on ALL tenant-scoped tables.
- **ONE POLICY PER COMMAND:** Create SEPARATE policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.
    - **PROHIBITED:** `FOR ALL` policies or combining commands in a single policy.
- **MIRRORING:** `UPDATE` policies MUST mirror `USING` and `WITH CHECK` clauses exactly to prevent "blind writes" or privilege escalation.
- **NO BYPASS:** `BYPASS RLS` privilege is strictly reserved for system administration and migration tools, NEVER for application users.
- **STRUCTURAL COVERAGE:** `company_id` and `branch_id` MUST be present in 100% of tenant-scoped policies.

## 3. FRONTEND ↔ BACKEND CONTRACT
- **BACKEND AS SOURCE OF TRUTH:** The backend enforces ALL business logic and data integrity.
- **FRONTEND AS DETERMINISTIC RENDERER:** The frontend strictly renders the state provided by the backend. It DOES NOT calculate business rules (e.g., prices, taxes, access rights).
- **VIEW-ONLY READS:** The frontend reads data EXCLUSIVELY via Views. Direct table access is PROHIBITED.
- **RPC-ONLY WRITES:** All data mutations (INSERT, UPDATE, DELETE) MUST be performed via Remote Procedure Calls (RPCs). Direct table manipulation is PROHIBITED.
- **NULL HANDLING:** The frontend MUST handle `NULL` values gracefully, displaying "N/A", "Indisponível", or equivalent. It MUST NOT crash or hide components silently.

## 4. OPERATIONAL SAFETY & MIGRATIONS
- **AUDIT FIRST:** ALWAYS run a structural audit (using MCP or script) to verify the current schema state BEFORE creating or modifying objects.
- **DROP BEFORE CREATE:** Use `DROP ... IF EXISTS` before creating any object to ensure idempotency.
- **NO "IF NOT EXISTS" CONSTRAINTS:** DO NOT use `ADD CONSTRAINT IF NOT EXISTS`. Drop the constraint if it exists, then add it.
- **NO IMPLICIT TRIGGERS:** Triggers must be explicitly authorized and documented. No "magic" logic hidden in triggers.
- **MIGRATION TRANSACTIONALITY:** Migrations must be atomic. If one part fails, the entire migration must roll back.
- **BRANCH COVERAGE AUDIT:** Before freezing RLS, run an audit to ensure `branch_id` coverage is complete.

## 5. GRANTS & ACCESS CONTROL
- **LEAST PRIVILEGE:** Grant ONLY necessary permissions.
- **PUBLIC REVOKE AUDIT:** NEVER `REVOKE` from `public` without a full audit of dependencies to prevent service outages.
- **SYSTEM ROLES:** Use specific roles (e.g., `authenticated`, `service_role`) appropriately.

## 6. SOFT DELETE
- **NO PHYSICAL DELETE:** Operational data MUST use `deleted_at` (timestamp) or `is_active` (boolean). Physical `DELETE` is prohibited for business data.
- **FILTERING:** Views and RPCs must automatically filter out soft-deleted records unless explicitly requested (e.g., for audit).

## 7. EXECUTION PROTOCOL
1.  **Read this document.**
2.  **Plan:** Create a detailed implementation plan referencing these rules.
3.  **Audit:** Verify current state.
4.  **Execute:**Apply changes using migration scripts that adhere to these rules.
5.  **Verify:** Validate changes against these guardrails.

**FAILURE TO ADHERE TO THESE RULES WILL RESULT IN REJECTED AMS/PRS AND POTENTIAL SYSTEM INSTABILITY.**
