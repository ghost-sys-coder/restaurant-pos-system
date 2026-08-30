# Database Migration and Recovery Operations

This runbook applies to the application's Drizzle migrations and Neon PostgreSQL databases.

## Safety rules

- Treat committed files in `drizzle/` as an append-only production history.
- Never edit or renumber a migration that has reached a shared environment.
- Generate a new forward migration for every schema change.
- Do not run migrations automatically inside a Vercel serverless function or application startup.
- Back up before destructive or data-rewriting migrations.
- Keep development, staging, and production on separate databases or Neon branches.
- Review the generated SQL before applying it. A successful generation is not proof that the migration preserves production data.

## Required environment

`DATABASE_URL` must point to the intended Neon database. Check the current shell/environment and Vercel target before running any command. Never print the connection string in logs or commit it.

## Creating a migration

1. Update `src/db/schema.ts`.
2. Run `npm run db:generate`.
3. Review the new SQL file and its Drizzle metadata.
4. Run `npm run db:check` to validate migration-history consistency.
5. Apply the migration to an isolated development database with `npm run db:migrate`.
6. Run `npm test`, `npm run lint`, and `npm run build`.
7. Apply the same committed migration to staging and exercise affected workflows.
8. Schedule and apply it to production before deploying code that requires the new schema, unless the change follows an explicitly reviewed expand-and-contract rollout.

The production build runs `npm run db:check` automatically through `prebuild`. This verifies the committed migration history but intentionally does not connect to or mutate production.

## Expand-and-contract changes

Use multiple deployments for changes that rename, remove, reinterpret, or make a populated column mandatory:

1. Expand: add the new nullable column/table/index without removing the old representation.
2. Deploy code that can read the old and new representation and writes the new representation.
3. Backfill in bounded, restartable batches and record progress.
4. Verify row counts, null counts, tenant/location coverage, and application behavior.
5. Switch reads to the new representation.
6. Contract in a later migration only after rollback no longer depends on the old representation.

Do not combine a large backfill and a destructive drop in one migration.

## Production deployment checklist

- The Git worktree is clean and the target commit is known.
- `npm run db:check`, tests, type checking, and the production build pass.
- The migration SQL has been reviewed for locks, table rewrites, uniqueness failures, and data loss.
- A current Neon restore point/branch is available and its retention window is known.
- The database target has been independently confirmed as production.
- The application change remains compatible if deployment and migration overlap.
- A post-migration verification query or workflow has been prepared.
- One operator applies the migration once; retries first inspect migration state.
- Vercel deployment status and the live health endpoint are verified afterward.

## Failure handling

### Migration fails before completion

1. Stop retrying automatically.
2. Capture the migration name, database target, timestamp, and exact database error without copying credentials.
3. Inspect the Drizzle migration ledger and affected schema/data to determine what committed.
4. Prefer a corrective forward migration. Do not delete ledger rows or manually mark a migration successful without reconciling the actual schema.
5. If data integrity is uncertain, disable affected writes and restore into an isolated Neon branch for investigation.

### Application deployment fails after a successful migration

1. Inspect the Vercel build/runtime logs and confirm the failing commit.
2. If the schema change was backward-compatible, redeploy the previous known-good application commit.
3. If it was not backward-compatible, deploy a forward compatibility fix or restore using the reviewed recovery procedure.
4. Do not reverse production schema by editing an already-applied migration.

### Restore procedure

1. Identify the last known-good timestamp and the affected restaurant/location scope.
2. Create a Neon branch or point-in-time restore; do not overwrite production first.
3. Validate schema, migration ledger, row counts, recent orders, staff access, and audit/financial references on the restored branch.
4. Choose between a targeted forward repair and a full restore based on verified data loss/corruption.
5. Record the incident, decision, operator, timestamps, and validation evidence.

Neon retention and restore capabilities depend on the active plan and project configuration. Confirm them in Neon before relying on a particular recovery window.

## Drift response

If the database schema differs from the committed migration history:

- Stop feature migrations against that environment.
- Export/inspect schema metadata without exposing data or credentials.
- Identify whether the drift came from an unrecorded manual change, a partially applied migration, or the wrong database target.
- Reconcile with an explicit baseline or corrective forward migration reviewed for that environment.
- Test the reconciliation on a restored branch before production.

Never use a blind schema push to “make production match” when historical or tenant data exists.
