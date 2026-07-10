#!/usr/bin/env bash
set -euo pipefail

DATE=$(date -u +%Y-%m-%d)
REPO="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"

# Note: Node.js LTS, gitleaks, and Semgrep are auto-fixed via PRs in the workflow.
# This script only creates a human-decision issue for items that cannot be auto-fixed:
# - Cursor new release (requires changelog review; may warrant new rules/hooks)
# npm packages (ESLint, typescript-eslint, etc.) are handled exclusively by Dependabot.

FINDINGS="[]"

if [ "${CURSOR_NEW_RELEASE:-false}" = "true" ]; then
  FIND=$(jq -n \
    --arg id "cursor-release" \
    --arg label "Cursor IDE" \
    --arg current "${CURSOR_CURRENT}" \
    --arg latest "${CURSOR_LATEST}" \
    --arg severity "minor" \
    --arg action "Review the Cursor changelog for new capabilities. Check whether new rules, hooks, or slash commands should be added to cursor-guardrails. Update docs/cursor-version.txt once reviewed." \
    --arg cursorCommand "Review cursor.com/changelog for new features. Open cursor-guardrails in Cursor and ask: does this new Cursor capability warrant a new .cursor/rules entry, a new hook, or a slash command update?" \
    --arg moreInfoUrl "https://cursor.com/changelog" \
    '{id:$id,label:$label,current:$current,latest:$latest,severity:$severity,action:$action,cursorCommand:$cursorCommand,moreInfoUrl:$moreInfoUrl,autoPR:false}')
  FINDINGS=$(echo "$FINDINGS" | jq --argjson f "$FIND" '. + [$f]')
fi

# Auto-PR items are noted in the issue body for visibility but are not actionable cards.
AUTO_PR_NOTES=""
if [ "${NODE_OUTDATED:-false}" = "true" ]; then
  AUTO_PR_NOTES="${AUTO_PR_NOTES}- **Node.js LTS**: ${NODE_CURRENT} → ${NODE_LATEST} — auto-PR created\n"
fi
if [ "${GITLEAKS_OUTDATED:-false}" = "true" ]; then
  AUTO_PR_NOTES="${AUTO_PR_NOTES}- **gitleaks**: ${GITLEAKS_CURRENT} → ${GITLEAKS_LATEST} — auto-PR created\n"
fi
if [ "${SEMGREP_OUTDATED:-false}" = "true" ]; then
  AUTO_PR_NOTES="${AUTO_PR_NOTES}- **Semgrep**: ${SEMGREP_CURRENT} → ${SEMGREP_LATEST} — auto-PR created\n"
fi

FINDING_COUNT=$(echo "$FINDINGS" | jq 'length')
echo "findings_count=$FINDING_COUNT" >> "${GITHUB_ENV:?GITHUB_ENV is required}"

DATA_JSON=$(jq -n \
  --arg runDate "$DATE" \
  --argjson findings "$FINDINGS" \
  '{runDate:$runDate,findings:$findings}')

# Build auto-PR section for the issue body
AUTO_PR_SECTION=""
if [ -n "$AUTO_PR_NOTES" ]; then
  AUTO_PR_SECTION="## Auto-PRs created this run

The following items were auto-fixed via pull request — review and merge them:

$(echo -e "$AUTO_PR_NOTES")
"
fi

ISSUE_BODY=$(cat <<EOF
## Guardrail review — $DATE

<!-- guardrail-review-data
$DATA_JSON
-->

${AUTO_PR_SECTION}## Human-decision findings

$(if [ "$FINDING_COUNT" = "0" ]; then echo "No human-decision findings this week."; fi)
$(if [ "${CURSOR_NEW_RELEASE:-false}" = "true" ]; then echo "| Item | Current | Latest | Action |
|------|---------|--------|--------|
| Cursor IDE | \`${CURSOR_CURRENT}\` | \`${CURSOR_LATEST}\` | Review changelog |"; fi)

**npm packages** are managed by Dependabot — check open Dependabot PRs separately.

Open [playbook.html](https://github.com/$REPO/blob/main/playbook.html) → Updates section for the interactive view.

_Opened automatically by the weekly-guardrail-review workflow._
EOF
)

if [ "${DRY_RUN:-false}" = "true" ]; then
  echo "=== DRY RUN: $FINDING_COUNT human-decision finding(s) ==="
  echo "$ISSUE_BODY"
  exit 0
fi

# Only open/update an issue if there are human-decision findings OR auto-PR notes.
HAS_CONTENT=false
[ "$FINDING_COUNT" != "0" ] && HAS_CONTENT=true
[ -n "$AUTO_PR_NOTES" ] && HAS_CONTENT=true

if [ "$HAS_CONTENT" = "false" ]; then
  echo "Nothing to report this week."
  # Close any existing open issue since everything is current.
  EXISTING=$(gh issue list \
    --repo "$REPO" \
    --label "guardrail-review" \
    --state open \
    --limit 1 \
    --json number \
    --jq '.[0].number // empty')
  if [ -n "$EXISTING" ]; then
    gh issue comment "$EXISTING" --repo "$REPO" --body "Weekly review on $DATE: all tools current, no findings. Closing."
    gh issue close "$EXISTING" --repo "$REPO"
    echo "Closed existing issue #$EXISTING — all clear."
  fi
  exit 0
fi

TITLE_PREFIX="[guardrail-review]"

EXISTING=$(gh issue list \
  --repo "$REPO" \
  --label "guardrail-review" \
  --state open \
  --limit 1 \
  --json number,title \
  --jq '.[0].number // empty')

if [ -n "$EXISTING" ]; then
  COMMENT_BODY=$(cat <<EOF
Updated findings from $DATE run:

<!-- guardrail-review-data
$DATA_JSON
-->

${AUTO_PR_SECTION}
_Updated by weekly-guardrail-review workflow._
EOF
)
  # Edit the body (not just comment) so the machine-readable
  # <!-- guardrail-review-data --> block playbook.html's loadFindings()
  # reads is always current — a comment alone leaves issue.body stale.
  gh issue edit "$EXISTING" --repo "$REPO" --body "$ISSUE_BODY"
  gh issue comment "$EXISTING" --repo "$REPO" --body "$COMMENT_BODY"
  echo "Updated and appended to existing issue #$EXISTING."
else
  gh issue create \
    --repo "$REPO" \
    --title "$TITLE_PREFIX Weekly update — $DATE" \
    --body "$ISSUE_BODY" \
    --label "guardrail-review"
  echo "Created new issue."
fi
