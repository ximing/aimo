# Data Integrity Validation Script

## Overview

The `validate-data-integrity.ts` script validates referential integrity in the AIMO database before and after removing foreign key constraints. It checks for orphaned records and reports issues with detailed information.

## Purpose

With the removal of database-level foreign keys (US-011), this script ensures that application-layer referential integrity is working correctly by detecting:

- Orphaned child records (e.g., memos without users)
- References to soft-deleted records (e.g., relations pointing to deleted memos)
- Invalid references in JSON arrays (e.g., tagIds pointing to non-existent tags)

## Usage

### Pre-Deployment Validation

Run before applying migration 0003 (foreign key removal):

```bash
cd apps/server
pnpm validate:data --mode=pre
```

### Post-Deployment Validation

Run after applying migration 0003 to verify data integrity:

```bash
cd apps/server
pnpm validate:data --mode=post
```

### Alternative: Direct execution

```bash
cd apps/server
tsx scripts/validate-data-integrity.ts --mode=pre
tsx scripts/validate-data-integrity.ts --mode=post
```

## Environment Variables

The script reads database configuration from environment variables:

```bash
MYSQL_HOST=localhost       # Default: localhost
MYSQL_PORT=3306           # Default: 3306
MYSQL_USER=root           # Default: root
MYSQL_PASSWORD=           # Default: empty
MYSQL_DATABASE=aimo       # Default: aimo
```

Ensure your `.env` file is configured correctly before running the script.

## Validation Checks

The script performs the following checks:

### Critical Issues (Exit code 1)

1. **Memos with non-existent users** - Memos referencing deleted or non-existent users
2. **Memo relations with invalid source memos** - Relations pointing to deleted/missing source memos
3. **Memo relations with invalid target memos** - Relations pointing to deleted/missing target memos
4. **Attachments with non-existent users** - Attachments referencing deleted or non-existent users
5. **AI messages with invalid conversations** - Messages in deleted or non-existent conversations
6. **Categories with non-existent users** - Categories owned by deleted or non-existent users
7. **Tags with non-existent users** - Tags owned by deleted or non-existent users
8. **Daily recommendations with non-existent users** - Recommendations for deleted or non-existent users
9. **Push rules with non-existent users** - Push rules owned by deleted or non-existent users
10. **AI conversations with non-existent users** - Conversations owned by deleted or non-existent users

### Warning Issues (Exit code 0)

11. **Memos with invalid category references** - Memos pointing to deleted or non-existent categories (categoryId should be NULL)
12. **Memos with invalid tag references** - Memos with tagIds arrays containing deleted or non-existent tags

## Output

### Console Output

The script prints:

- Progress for each validation check
- Issue details (table, type, count, sample IDs)
- Summary of critical vs warning issues
- Exit status

### JSON Log File

Results are saved to timestamped JSON files:

```
logs/validation/validation-pre-2026-03-05T12-30-45-123Z.json
logs/validation/validation-post-2026-03-05T13-45-30-456Z.json
```

Each file contains:

- Timestamp
- Validation mode (pre-deployment or post-deployment)
- Detailed issue list with counts and sample IDs
- Summary statistics

## Exit Codes

- **0**: Validation passed (no critical issues)
- **1**: Validation failed (critical issues detected) or script error

## Integration with Deployment

### Recommended Workflow

1. **Pre-deployment validation**:

   ```bash
   pnpm validate:data --mode=pre
   ```

   - If critical issues found: Fix data before proceeding
   - If warnings found: Review and decide if acceptable

2. **Apply migration**:

   ```bash
   pnpm migrate
   ```

3. **Post-deployment validation**:
   ```bash
   pnpm validate:data --mode=post
   ```

   - Verify no new issues introduced
   - Confirm data integrity maintained

### CI/CD Integration

Add to your deployment pipeline:

```yaml
steps:
  - name: Pre-deployment validation
    run: |
      cd apps/server
      pnpm validate:data --mode=pre

  - name: Run migrations
    run: |
      cd apps/server
      pnpm migrate

  - name: Post-deployment validation
    run: |
      cd apps/server
      pnpm validate:data --mode=post
```

## Troubleshooting

### Connection Errors

If you see `ECONNREFUSED`:

- Ensure MySQL is running
- Check environment variables
- Verify database credentials

### Performance

For large databases:

- Script may take several minutes
- Connection pool size: 5 connections
- Indexes on `deletedAt` columns improve performance

### False Positives

If validation reports issues that seem incorrect:

1. Check the sample IDs in the output
2. Manually verify in the database
3. Review recent data changes or migrations

## Example Output

```
🔍 Starting data integrity validation (pre-deployment mode)...

📊 Connecting to database: localhost:3306/aimo
✓ Checking memos with non-existent users...
  ✅ No issues found
✓ Checking memo_relations with invalid source memos...
  ⚠️  Found 3 relations with invalid source memos
✓ Checking memo_relations with invalid target memos...
  ✅ No issues found
...

============================================================
📋 VALIDATION SUMMARY
============================================================
Mode: pre-deployment
Total Issues: 2
  Critical: 1
  Warnings: 1

🔍 ISSUE DETAILS:

  [CRITICAL] memo_relations
    Type: Non-existent or deleted source memo
    Count: 3
    Sample IDs: rel-001, rel-002, rel-003

  [WARNING] memos
    Type: Non-existent or deleted category reference
    Count: 5
    Sample IDs: memo-123, memo-456, memo-789, memo-012, memo-345

💾 Results saved to: logs/validation/validation-pre-2026-03-05T12-30-45-123Z.json

❌ VALIDATION FAILED: Critical issues detected
Please fix these issues before proceeding with deployment.
```

## Related Files

- Migration: `apps/server/drizzle/0003_eminent_peter_quill.sql`
- Rollback: `apps/server/drizzle/0003_eminent_peter_quill.rollback.sql`
- Test Plan: `apps/server/drizzle/0003_MIGRATION_TEST_PLAN.md`
