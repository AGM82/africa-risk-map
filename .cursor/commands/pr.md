# /pr

Open a pull request for the current changes.

1. Review staged and unstaged changes with `git diff`.
2. Check `package.json` to see which scripts exist.
3. Run `npm run typecheck` and `npm run lint`. These are always required. If either fails, stop and report before continuing.
4. Run `npm run test` only if a `test` script exists in `package.json`. If it fails, stop and report.
5. Write a Conventional Commits message describing what changed and why.
6. Commit and push to the current branch.
7. Open a PR:
   - **If `gh` is available:** `gh pr create` with a clear title and description covering what changed, why, how it was tested, and any follow-ups.
   - **If `gh` is not available:** output the GitHub compare URL in this format so the user can open it in a browser:
     ```
     https://github.com/<owner>/<repo>/compare/main...<branch-name>
     ```
     Then list the PR title and description text so the user can paste it into the GitHub UI.
8. Return the PR URL (or the compare URL if `gh` was unavailable).
