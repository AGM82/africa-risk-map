# Throughline integration prompt

Paste the text below into Cursor in the Throughline project. It instructs the agent to implement the shared manifest integration — vendoring `guardrail-layers.json` from cursor-guardrails, refactoring `guardrail-profile.ts` to read from it, surfacing the version in the Build Package, and adding an automated refresh workflow.

---

## PROMPT (copy everything below this line)

```
I need you to integrate the cursor-guardrails shared manifest into this project.
Work through the steps below in order. Run npm run typecheck, npm run lint, and
npm run test after each step and fix any failures before continuing.

---

BACKGROUND

cursor-guardrails is a separate repo that defines the engineering guardrail standard
this project prescribes. It publishes a machine-readable manifest at:

  https://raw.githubusercontent.com/AGM82/cursor-guardrails/main/guardrail-layers.json

This manifest is the single source of truth for the adoption-layer model and
risk-tier mapping. Right now Throughline hardcodes this model in
src/lib/guardrail-profile.ts. That is the duplication we are eliminating.

The approach: vendor a frozen copy of the manifest into this repo so it is
reproducible, auditable, and offline-safe (no runtime network call in the
governed path). An automated workflow keeps the copy current by opening a PR
whenever the upstream version bumps.

---

STEP 1 — Fetch and vendor the manifest

1a. Create the directory src/data/ if it does not exist.

1b. Download the current manifest and save it as src/data/guardrail-layers.json:

    curl -o src/data/guardrail-layers.json \
      https://raw.githubusercontent.com/AGM82/cursor-guardrails/main/guardrail-layers.json

1c. Add a comment block at the very top of the file (as a JSON-compatible field)
    that makes the provenance clear. Add this field inside the top-level object,
    immediately after "schemaVersion":

    "_vendor": {
      "source": "https://github.com/AGM82/cursor-guardrails",
      "rawUrl": "https://raw.githubusercontent.com/AGM82/cursor-guardrails/main/guardrail-layers.json",
      "vendoredAt": "<today's date YYYY-MM-DD>",
      "note": "Do not edit by hand. Update by running the sync-guardrail-manifest workflow or by re-running this fetch and committing the result."
    },

1d. Add src/data/guardrail-layers.json to git tracking. Do NOT add it to .gitignore.

---

STEP 2 — Extend TypeScript types

In src/lib/types.ts, update the GuardrailProfile type (or the type that
getGuardrailProfile returns) to include:

  guardrailVersion: string;   // e.g. "1.1.0"
  prescribedAt: string;       // ISO date the manifest was vendored, from _vendor.vendoredAt

If GuardrailProfile does not yet exist as a named type, create it.
Also create or update a GuardrailLayer type:

  interface GuardrailLayer {
    number: number;
    name: string;
    description: string;
    safe: boolean;
  }

---

STEP 3 — Refactor getGuardrailProfile to read from the manifest

In src/lib/guardrail-profile.ts:

3a. Import the vendored manifest:

    import manifest from '@/data/guardrail-layers.json';

    (Adjust the path alias to match this project's tsconfig. The alias @/ maps
    to the project root. If the project uses a different alias or relative import,
    use that instead.)

3b. Rewrite getGuardrailProfile(tier: RiskTier): GuardrailProfile so that:

    - It reads requiredLayers from manifest.riskTiers[tier].requiredLayers
    - It reads layer name and description from manifest.adoptionLayers[String(n)]
    - It returns guardrailVersion: manifest.guardrailVersion
    - It returns prescribedAt: manifest._vendor.vendoredAt (or the lastUpdated
      field if _vendor is not present)
    - The return value is fully typed — no `any`

3c. The deterministic principle must be preserved:
    - No AI call, no async, no network call inside this function
    - The manifest is imported as static data at build time
    - The function remains a pure function

3d. Remove any hardcoded layer names, descriptions, or tier-to-layer mappings
    that are now read from the manifest. Dead code from the old implementation
    should be deleted.

3e. If the existing implementation has guard logic (e.g. defaulting unknown tiers
    to Low), keep it — just source the layer data from the manifest.

---

STEP 4 — Surface the guardrail version in the Build Package and Developer view

4a. In the function or component that generates Build Package section 7
    (Engineering Guardrails Profile), add a line:

      Prescribes Cursor Guardrails v{guardrailVersion}
      Standard source: https://github.com/AGM82/cursor-guardrails

    This must come from getGuardrailProfile()'s return value — not hardcoded.

4b. In the Developer view (/developer page), wherever the guardrails profile is
    displayed, add the same version line in a visible but low-prominence position
    (e.g. below the layer table, styled as secondary text).

4c. The text "Prescribes Cursor Guardrails vX.Y.Z" should link to the GitHub
    Release at:
      https://github.com/AGM82/cursor-guardrails/releases/tag/guardrail-vX.Y.Z

---

STEP 5 — Add a drift check test

In the existing test suite (or create src/lib/guardrail-manifest.test.ts if no
suitable test file exists):

5a. Write a test that reads src/data/guardrail-layers.json and asserts:
    - schemaVersion is a positive integer
    - guardrailVersion matches the semver pattern /^\d+\.\d+\.\d+$/
    - riskTiers contains exactly the keys "Low", "Medium", "High"
    - Each tier's requiredLayers is a non-empty array of integers
    - adoptionLayers contains all layer numbers referenced in requiredLayers

5b. Write a second test (or CI step — see Step 6) that fetches the upstream
    manifest and compares guardrailVersion:

    const upstream = await fetch(
      'https://raw.githubusercontent.com/AGM82/cursor-guardrails/main/guardrail-layers.json'
    ).then(r => r.json());
    const vendored = require('./guardrail-layers.json');
    if (upstream.guardrailVersion !== vendored.guardrailVersion) {
      console.warn(
        `Guardrail manifest is behind: vendored ${vendored.guardrailVersion}, upstream ${upstream.guardrailVersion}. Run the sync-guardrail-manifest workflow.`
      );
    }

    This test should WARN (console.warn + test.skip or a soft assertion), not FAIL,
    so it never blocks a local build when the developer is offline. The failing
    gate lives in CI (Step 6).

---

STEP 6 — Create the automated sync workflow

Create .github/workflows/sync-guardrail-manifest.yml with the following structure:

    name: Sync guardrail manifest

    on:
      repository_dispatch:
        types: [guardrail-version-bump]   # immediate: fired by cursor-guardrails
      schedule:
        - cron: '0 8 * * 1'               # weekly safety net: Monday 08:00 UTC
      workflow_dispatch:                   # manual trigger

    permissions:
      contents: write
      pull-requests: write

    jobs:
      sync:
        name: Check and refresh guardrail-layers.json
        runs-on: ubuntu-latest
        steps:
          - name: Checkout
            uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683

          - name: Read vendored version
            id: vendored
            run: |
              VER=$(node -e "console.log(require('./src/data/guardrail-layers.json').guardrailVersion)")
              echo "version=${VER}" >> $GITHUB_OUTPUT

          - name: Read upstream version via GitHub Release
            id: upstream
            env:
              GH_TOKEN: ${{ github.token }}
            run: |
              # Use the repository_dispatch payload if available, else fetch latest release.
              if [ -n "${{ github.event.client_payload.version }}" ]; then
                VER="${{ github.event.client_payload.version }}"
              else
                VER=$(gh api repos/AGM82/cursor-guardrails/releases/latest \
                  --jq '.tag_name | ltrimstr("guardrail-v")' 2>/dev/null || echo "unknown")
              fi
              echo "version=${VER}" >> $GITHUB_OUTPUT
              echo "Upstream version: ${VER}"

          - name: Compare and refresh
            id: refresh
            env:
              VENDORED: ${{ steps.vendored.outputs.version }}
              UPSTREAM: ${{ steps.upstream.outputs.version }}
              GH_TOKEN: ${{ github.token }}
            run: |
              if [ "$VENDORED" = "$UPSTREAM" ] || [ "$UPSTREAM" = "unknown" ]; then
                echo "Manifest is current (${VENDORED}). Nothing to do."
                echo "updated=false" >> $GITHUB_OUTPUT
                exit 0
              fi

              echo "Updating manifest from ${VENDORED} to ${UPSTREAM}"

              curl -sf https://raw.githubusercontent.com/AGM82/cursor-guardrails/main/guardrail-layers.json \
                -o src/data/guardrail-layers.json

              # Inject _vendor metadata
              TODAY=$(date -u +%Y-%m-%d)
              node -e "
                const fs = require('fs');
                const m = JSON.parse(fs.readFileSync('src/data/guardrail-layers.json', 'utf8'));
                m._vendor = {
                  source: 'https://github.com/AGM82/cursor-guardrails',
                  rawUrl: 'https://raw.githubusercontent.com/AGM82/cursor-guardrails/main/guardrail-layers.json',
                  vendoredAt: '${TODAY}',
                  note: 'Do not edit by hand. Updated automatically by sync-guardrail-manifest workflow.'
                };
                fs.writeFileSync('src/data/guardrail-layers.json', JSON.stringify(m, null, 2) + '\n');
              "

              echo "updated=true" >> $GITHUB_OUTPUT
              echo "new_version=${UPSTREAM}" >> $GITHUB_OUTPUT

          - name: Open refresh PR
            if: steps.refresh.outputs.updated == 'true'
            env:
              GH_TOKEN: ${{ github.token }}
              NEW_VERSION: ${{ steps.refresh.outputs.new_version }}
              VENDORED: ${{ steps.vendored.outputs.version }}
            run: |
              BRANCH="chore/guardrail-manifest-${NEW_VERSION}"

              git config user.name  "github-actions[bot]"
              git config user.email "github-actions[bot]@users.noreply.github.com"
              git checkout -b "${BRANCH}"
              git add src/data/guardrail-layers.json
              git commit -m "chore(guardrails): refresh manifest to v${NEW_VERSION}

              Updates src/data/guardrail-layers.json from cursor-guardrails
              v${VENDORED} to v${NEW_VERSION}.

              Review src/lib/guardrail-profile.ts to confirm no logic changes
              are required. If new layers or tier-mapping changes are present,
              update the profiler and types accordingly before merging."

              git push origin "${BRANCH}"

              gh pr create \
                --title "chore(guardrails): refresh manifest to v${NEW_VERSION}" \
                --body "## Auto-generated by sync-guardrail-manifest

              Updates \`src/data/guardrail-layers.json\` from cursor-guardrails **v${VENDORED}** → **v${NEW_VERSION}**.

              ### Before merging, verify
              - [ ] Review the diff in \`src/data/guardrail-layers.json\` — are there new layers or tier changes?
              - [ ] If \`adoptionLayers\` or \`riskTiers\` changed, update \`src/lib/guardrail-profile.ts\` and \`src/lib/types.ts\`
              - [ ] Run \`npm run typecheck && npm run lint && npm run test\` locally
              - [ ] CI passes on this PR

              See cursor-guardrails release notes: https://github.com/AGM82/cursor-guardrails/releases/tag/guardrail-v${NEW_VERSION}

              _Auto-created by sync-guardrail-manifest workflow._" \
                --head "${BRANCH}" \
                --base main \
                --label "chore"

              echo "Opened PR for manifest v${NEW_VERSION}"

Paste this workflow YAML exactly. Do not add extra indentation.

---

STEP 7 — Verify and commit

7a. Run: npm run typecheck
    Fix all errors before continuing.

7b. Run: npm run lint
    Fix all errors before continuing.

7c. Run: npm run test
    Fix all failures before continuing.

7d. Stage all changes and create a commit:

    git add -A
    git commit -m "feat(guardrails): integrate shared guardrail-layers manifest

    - Vendor src/data/guardrail-layers.json from cursor-guardrails v1.1.0
    - Refactor guardrail-profile.ts to read layer model from manifest
    - Extend GuardrailProfile type with guardrailVersion and prescribedAt
    - Surface prescribed version in Build Package section 7 and Developer view
    - Add manifest integrity test (schemaVersion, tiers, layers)
    - Add sync-guardrail-manifest workflow (repository_dispatch + weekly schedule)

    The layer model is no longer hardcoded. Future cursor-guardrails bumps
    will open an automated refresh PR for human review and merge."

7e. Open a PR and confirm all CI jobs pass before merging.

---

HARD STOPS

- Do not make any runtime network call inside getGuardrailProfile() or any
  function in the governed data path. The manifest is static build-time data.
- Do not modify classifyRisk() — that function is deterministic and must remain
  completely independent of the manifest and of any AI output.
- Do not add any AI call to this flow.
- Do not disable TypeScript strict mode or any ESLint rule to make the code compile.
  Fix the cause of every error.
- Do not skip the test step. If tests fail after your changes, fix them.
```
