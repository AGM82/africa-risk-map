# /update-deps

Update dependencies safely, one at a time.

1. List outdated packages with `npm outdated`.
2. For each package: update it, then run `npm run typecheck`, `npm run lint`, and `npm run test`.
3. If a package breaks the build or tests, revert that single update and note it for manual handling.
4. Group the successful updates into one `chore(deps):` commit and summarise what changed, flagging any major-version bumps for review.
