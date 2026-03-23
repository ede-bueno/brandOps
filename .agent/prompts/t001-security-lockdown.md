# Task: T001 - Execute Phase 2.3 Lockdown

## Objective
Revoke direct table access for the 'authenticated' role on 15 core tables to enforce the View-based architecture (ADR-001).

## Required Action
1. Identify the 15 core tables listed in `docs/PLAN.md`.
2. Generate and execute `REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM authenticated;` (or specifically for the 15 tables).
3. Ensure RLS is enabled and policies are consistent with the "Backend is Source of Truth" principle.

## Context
- ADR: `docs/architecture/adr-001-system-boundaries-tenancy.md`
- Plan: `docs/PLAN.md`

## Output
- Update `progress-security-auditor.md` with execution logs.
- Provide a summary of revoked tables.
