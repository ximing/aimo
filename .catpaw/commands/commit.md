# git commit

Generate a commit message based on the current content of the Git staging area and commit the code.

Rules:

- Use Conventional Commits format: <type>(<scope>): <subject> (scope optional).
- Allowed types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.
- Subject should be in Chinese; if it contains Latin letters, keep them lowercase.
- Subject must not end with a period and must be <= 50 characters.
- Commit only staged changes and do not bypass hooks (no --no-verify).
