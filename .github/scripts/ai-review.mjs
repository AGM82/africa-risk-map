#!/usr/bin/env node
/* global fetch, setTimeout */
/**
 * ai-review.mjs
 *
 * Calls the Anthropic API with a compact summary of key repo files and asks
 * six focused questions across the holistic development domains. Validates
 * npm/GitHub suggestions deterministically before surfacing them. Outputs a
 * structured JSON payload to stdout for the workflow to consume.
 *
 * Environment variables required:
 *   ANTHROPIC_API_KEY  — Anthropic API key
 *   REVIEW_TYPE        — "biweekly" | "cursor" | "security" (default: biweekly)
 *   DRY_RUN            — "true" to skip API call and output mock data
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

const API_KEY = process.env.ANTHROPIC_API_KEY;
const REVIEW_TYPE = process.env.REVIEW_TYPE || 'biweekly';
const FOCUS_TOPIC = (process.env.FOCUS_TOPIC || '').trim();
const DRY_RUN = process.env.DRY_RUN === 'true';
// Sonnet 4.6 is a drop-in replacement for 4.5 at the same price, ~70% more
// token-efficient and ~38% more accurate per Anthropic's benchmarks.
const MODEL = 'claude-sonnet-4-6';
// Each call returns at most 5 bounded suggestions; 2000 is a generous ceiling.
const MAX_TOKENS = 2000;
// Low temperature: this is analytical extraction, not creative writing. Keeps
// suggestions consistent and confidence calibration stable across runs.
const TEMPERATURE = 0.2;

// Enforced output schema (structured outputs, GA on Sonnet 4.5/4.6). The API
// uses constrained decoding to guarantee valid JSON matching this shape, so we
// never have to regex-scrape a code fence again. Reasoning fields are listed
// first so the model justifies a suggestion before committing to a confidence
// level (required properties are emitted in order). The JSON Schema subset
// Claude accepts cannot express string-length limits, so those caps stay in
// parseSuggestions() as application-layer validation.
const SUGGESTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    suggestions: {
      type: 'array',
      description: 'Up to 5 actionable improvement suggestions for the template.',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          reason: { type: 'string', description: 'Why this matters now, with a verifiable basis (named standard, official docs, or evidence). State the reasoning before deciding confidence.' },
          current: { type: 'string', description: 'What the template does today for this area, or "Not implemented".' },
          proposed: { type: 'string', description: 'The specific change to make, naming the exact file(s) where possible.' },
          title: { type: 'string', description: 'Short imperative summary of the suggestion.' },
          area: { type: 'string', description: 'Domain area, e.g. Engineering, Security, Design, UX, Data Science, AI Tooling.' },
          source: { type: 'string', description: 'Named standard, official documentation, npm package, or independent evidence backing this suggestion.' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Strength of the evidence behind the suggestion.' },
          stability: { type: 'string', enum: ['stable', 'emerging', 'experimental'], description: 'Maturity of the underlying practice or tool.' },
          effort: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Implementation effort: low <1h, medium ~half day, high full day or more.' },
          npmPackage: { type: ['string', 'null'], description: 'Exact npm package name if this suggestion recommends one, otherwise null.' },
        },
        required: ['reason', 'current', 'proposed', 'title', 'area', 'source', 'confidence', 'stability', 'effort'],
      },
    },
  },
  required: ['suggestions'],
};

// ── Read key repo files (compact summaries, not full contents) ──────────────

function safeRead(path, maxLines = 60) {
  if (!existsSync(path)) return `[file not found: ${path}]`;
  const lines = readFileSync(path, 'utf8').split('\n');
  return lines.slice(0, maxLines).join('\n');
}

function buildContext() {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const guardVersion = safeRead('.cursor/guardrail-version', 1).trim();
  const nvmrc = safeRead('.nvmrc', 1).trim();

  const deps = Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })
    .map(([k, v]) => `${k}@${v}`)
    .join(', ');

  // Rule files are sent in full so the model sees every convention, not just the
  // first 20 lines. This prevents it from re-proposing things that are already
  // encoded past the old truncation point (e.g. prefers-reduced-motion in
  // 31-design.mdc, or the Tailwind/Zod conventions in 30-react-stack.mdc).
  //
  // Safety valve: if the total rule-file content ever exceeds RULE_CHAR_BUDGET,
  // lower-priority files are dropped whole rather than silently amputated.
  // Today's total is ~47k chars across 12 rule files — well under the 100k budget.
  const RULE_CHAR_BUDGET = 100_000;
  const RULE_FILES_PRIORITY = [
    '.cursor/rules/00-core.mdc',
    '.cursor/rules/10-security-popia.mdc',
    '.cursor/rules/30-react-stack.mdc',
    '.cursor/rules/31-design.mdc',
    '.cursor/rules/50-ai-tooling.mdc',
    '.cursor/rules/40-tooling-supply-chain.mdc',
    '.cursor/rules/60-backend-api.mdc',
    '.cursor/rules/61-database.mdc',
    '.cursor/rules/62-deployment-observability.mdc',
    '.cursor/rules/32-ux-behavioural.mdc',
    '.cursor/rules/33-data-science.mdc',
    '.cursor/rules/20-commits.mdc',
  ];
  let ruleCharCount = 0;
  const ruleFiles = RULE_FILES_PRIORITY
    .filter(existsSync)
    .reduce((acc, f) => {
      const name = f.split('/').pop();
      const content = readFileSync(f, 'utf8');
      if (ruleCharCount + content.length > RULE_CHAR_BUDGET) {
        process.stderr.write(`[ai-review] Rule budget reached — omitting ${name} (${content.length} chars)\n`);
        return acc;
      }
      ruleCharCount += content.length;
      acc.push(`--- ${name} ---\n${content}`);
      return acc;
    }, [])
    .join('\n\n');

  const hooksJson = safeRead('.cursor/hooks.json', 30);
  const agentsMd = safeRead('AGENTS.md', 40);
  const ciYml = safeRead('.github/workflows/ci.yml', 60);
  const commands = [
    '.cursor/commands/review.md',
    '.cursor/commands/update-deps.md',
    '.cursor/commands/guardrail-upgrade.md',
    '.cursor/commands/pr.md',
  ]
    .filter(existsSync)
    .map(f => `[${f.split('/').pop()}] ${safeRead(f, 10)}`)
    .join('\n');

  return `CURSOR-GUARDRAILS TEMPLATE — CURRENT STATE
Node.js: ${nvmrc} | Guardrail version: ${guardVersion}
Dependencies: ${deps}

AGENTS.MD (first 40 lines):
${agentsMd}

RULE FILES (full content, budget-limited — see RULE_CHAR_BUDGET):
${ruleFiles}

HOOKS (.cursor/hooks.json):
${hooksJson}

CI PIPELINE (.github/workflows/ci.yml):
${ciYml}

SLASH COMMANDS:
${commands}`;
}

// ── Topic definitions per review type ──────────────────────────────────────

// buildFocusedTopics generates a two-call deep-dive for a specific tool/topic.
function buildFocusedTopics(topic) {
  return [
    {
      id: 'focused-verdict',
      label: `Focused: ${topic}`,
      question: `You are evaluating whether "${topic}" should be adopted, watched, or ignored in the cursor-guardrails development stack.

Apply the evaluation framework from rule 50-ai-tooling.mdc (described in the repo context).

Answer these questions in your JSON response:
1. What is "${topic}"? What problem does it solve and who makes it?
2. Is this an **Addition** (fills a gap not covered by current stack) or a **Replacement** candidate (competes with an existing tool)?
3. For Additions: does it pass the five Addition criteria (genuine gap, low friction, sustainable project, independent evidence, no redundant category)?
4. For Replacements: does it meet the 10× improvement in ≥2 dimensions standard? What is the switching cost over 12 months?
5. What is the independent evidence (engineering blogs, benchmarks, peer usage) — not vendor claims?
6. Are there any rejection criteria (data privacy risks, no data policy, untrusted third party)?
7. **Verdict**: Add / Watch / Reject — and the one-sentence reason.

Be direct and specific. If the evidence is thin, say so.`,
    },
    {
      id: 'focused-impact',
      label: `Impact: ${topic}`,
      question: `Assuming "${topic}" passes the evaluation (see previous call), what specifically should change in the cursor-guardrails template?

For each change:
- Which file changes? (.cursor/rules/*.mdc, AGENTS.md, .github/workflows/*, playbook.html, etc.)
- What is the exact change? (new rule, updated tool table entry, new workflow, etc.)
- What is the effort level? (low = <1 hour, medium = half day, high = full day+)

If the verdict is Watch or Reject, list what signals would change the verdict (what evidence would need to emerge to revisit this).

Be concrete. Reference specific files and rule IDs where possible.`,
    },
  ];
}

const TOPICS = {
  biweekly: [
    {
      id: 'ai-tooling',
      label: 'AI Tooling',
      question: `You are reviewing the AI tooling strategy for this developer guardrails template.
Identify improvements in these areas:
1. New Cursor IDE capabilities (rules, hooks, agent patterns, MCP) not yet reflected in the config
2. Other AI coding tools that should be added to the stack (not replace Cursor unless 10x better in 2+ dimensions)
3. New AI agent patterns or prompt engineering techniques the slash commands could adopt
4. Gaps in the hooks or rules that leave AI agent behaviour unguarded

For each suggestion: is it an Addition (fills a gap) or Replacement (replaces something)?
Apply a high bar for replacements.`,
    },
    {
      id: 'engineering',
      label: 'Engineering',
      question: `Review the engineering quality guardrails in this template.
The stack is React + TypeScript (strict) + Tailwind CSS v4 + shadcn/ui + Lucide React + Vitest.
Functional tier (standardised but installed on first use): Zod, React Hook Form, TanStack Query.
Identify improvements in:
1. ESLint rules or plugins not yet present that would catch real bugs (security, complexity, accessibility)
2. TypeScript strict options not yet enabled (check tsconfig.json against the full strict checklist)
3. New CI/CD security practices (supply chain, provenance, SLSA) not yet in ci.yml
4. Testing patterns missing — particularly for AI-generated code and component accessibility
5. Coverage thresholds or performance budget enforcement missing from CI
6. Gaps in how the Zod/RHF/TanStack Query conventions are enforced once a project adds them`,
    },
    {
      id: 'design',
      label: 'Design',
      question: `Review the design guardrails in this template.
The full 31-design.mdc is included in context — read it carefully before proposing anything.
The stack uses Tailwind CSS v4 (utility classes, @theme tokens, no tailwind.config.ts needed) and shadcn/ui primitives.
Identify improvements in:
1. Design token conventions missing from 31-design.mdc given Tailwind v4's @theme approach
2. Accessibility rules not yet in 31-design.mdc — check against WCAG 2.2 AA and ARIA APG patterns
3. CSS architecture patterns the community has adopted that are NOT already in 31-design.mdc
4. Tailwind-specific design conventions (class ordering, arbitrary value policy, dark mode) not yet encoded
5. Gaps in component-level accessibility testing requirements (e.g. axe assertions in Vitest tests)
Do NOT re-propose anything already covered in 31-design.mdc.`,
    },
    {
      id: 'ux-behavioural',
      label: 'UX & Behavioural Science',
      question: `Review the UX and behavioural science guardrails in this template (32-ux-behavioural.mdc if present).
Identify improvements in:
1. Usability heuristics not yet encoded in the rules
2. Accessibility compliance gaps (WCAG 2.2, ARIA patterns)
3. Dark patterns to explicitly prohibit that are not yet listed
4. New UX research findings (2024–2026) that should inform the rules
5. Cognitive load and progressive disclosure patterns missing`,
    },
    {
      id: 'data-science',
      label: 'Data Science & Measurement',
      question: `Review the data science and measurement guardrails in this template (33-data-science.mdc if present).
Identify improvements in:
1. Core Web Vitals or performance measurement missing
2. Analytics and event tracking best practices not covered
3. Privacy-first data collection patterns (POPIA, GDPR alignment)
4. Data visualisation rules missing
5. Statistical validity and A/B testing guidance gaps`,
    },
    {
      id: 'security',
      label: 'Security',
      question: `Review the security posture of this AI-assisted developer template.
Identify improvements in:
1. OWASP LLM Top 10 risks not yet mitigated in the hooks or rules
2. Supply chain security gaps (pinning, provenance, attestation)
3. Secret management patterns missing
4. New security scanning tools that complement gitleaks and Semgrep
5. AI-specific attack vectors (prompt injection, data exfiltration via agent) not yet guarded`,
    },
    {
      id: 'backend-data-deploy',
      label: 'Backend, Database & Deployment',
      question: `Review the backend, database, and deployment/observability guardrails in this template
(60-backend-api.mdc, 61-database.mdc, 62-deployment-observability.mdc — full content is in context).
The demo app in src/ has no backend yet; these three files are deliberately framework-agnostic and
only activate by glob once a project actually adds a server, database, or deploy pipeline.
Identify improvements in:
1. Gaps in API design conventions (60-backend-api.mdc) against current REST/contract-first best practices
2. Gaps in database/schema/query conventions (61-database.mdc) — migrations, indexing, transactions, N+1
3. Gaps in deployment/observability conventions (62-deployment-observability.mdc) — containers, health checks, structured logging, rollback
4. Whether content should move between these three files or be split further as the template matures
5. A CI/CD check the template could add that exercises these guardrails once a project has a backend
Do NOT re-propose anything already covered in these three files.`,
    },
  ],
  cursor: [
    {
      id: 'cursor-capabilities',
      label: 'Cursor New Capabilities',
      question: `A new version of Cursor IDE has been released. Review this template's Cursor configuration.
Identify:
1. New Cursor rule capabilities or syntax not yet used
2. New hook events available that should be added to hooks.json
3. New Cursor agent patterns or slash command capabilities
4. New MCP integrations that would benefit this template
5. Any existing config that is now deprecated or superseded

Be specific about which files need changing and what the change should be.`,
    },
  ],
  security: [
    {
      id: 'owasp-llm',
      label: 'OWASP LLM Top 10',
      question: `Conduct a security review against the OWASP LLM Top 10 (2025 edition).
For each of the top 10 risks, assess whether this template adequately mitigates it:
1. LLM01 Prompt Injection
2. LLM02 Sensitive Information Disclosure
3. LLM03 Supply Chain
4. LLM04 Data and Model Poisoning
5. LLM05 Improper Output Handling
6. LLM06 Excessive Agency
7. LLM07 System Prompt Leakage
8. LLM08 Vector and Embedding Weaknesses
9. LLM09 Misinformation
10. LLM10 Unbounded Consumption

For each gap found, suggest a specific rule, hook, or CI change.`,
    },
    {
      id: 'supply-chain',
      label: 'Supply Chain Security',
      question: `Review the supply chain security posture of this template.
Identify gaps in:
1. Dependency pinning (exact versions vs ranges)
2. Software bill of materials (SBOM) generation
3. SLSA provenance for build artefacts
4. Action version pinning in CI (SHA vs tag)
5. npm package integrity (lockfile, audit, provenance)
6. Container image provenance (gitleaks, Semgrep)`,
    },
  ],
};

// ── Anthropic API call ───────────────────────────────────────────────────────

async function callAnthropic(systemPrompt, userMessage) {
  // Prompt caching and structured outputs are both GA — no beta headers needed.
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          // Mark the system prompt (repo context) as cacheable — the six topic
          // calls run sequentially, so call 1 writes the cache and calls 2-6
          // read it at ~10% cost.
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userMessage }],
      // Constrained decoding guarantees the response is valid JSON in our shape.
      output_config: {
        format: {
          type: 'json_schema',
          schema: SUGGESTION_SCHEMA,
        },
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${err}`);
  }
  return response.json();
}

// ── npm validation — strip hallucinated packages ─────────────────────────────

function validateNpmPackage(packageName) {
  try {
    const result = execSync(
      `npm info "${packageName}" --json 2>/dev/null`,
      { encoding: 'utf8', timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const info = JSON.parse(result);
    // Accept if the package exists and has been published (dist-tags.latest is set).
    return !!info?.['dist-tags']?.latest;
  } catch {
    return false;
  }
}

// ── Parse structured suggestions from Claude's response ─────────────────────

function parseSuggestions(text, topicId) {
  // Structured outputs guarantee `text` is valid JSON in the SUGGESTION_SCHEMA
  // shape, so this JSON.parse cannot realistically throw. We still guard it and
  // re-validate every field — the schema cannot enforce string lengths, and npm
  // package existence must be checked deterministically, never trusted to the model.
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    process.stderr.write(`[ai-review] Unexpected non-JSON response for ${topicId}: ${e.message}\n`);
    return [];
  }

  const suggestions = Array.isArray(parsed) ? parsed : (parsed.suggestions || []);
  if (!Array.isArray(suggestions)) return [];

  return suggestions
    .filter(s => s.title && s.proposed && s.confidence)
    .map(s => ({
      id: `${topicId}-${Math.random().toString(36).slice(2, 7)}`,
      topic: topicId,
      title: String(s.title).slice(0, 120),
      area: String(s.area || topicId).slice(0, 80),
      current: String(s.current || 'Not implemented').slice(0, 300),
      proposed: String(s.proposed).slice(0, 500),
      confidence: ['high', 'medium', 'low'].includes(s.confidence) ? s.confidence : 'low',
      stability: ['stable', 'emerging', 'experimental'].includes(s.stability) ? s.stability : 'stable',
      effort: ['low', 'medium', 'high'].includes(s.effort) ? s.effort : 'medium',
      source: String(s.source || '').slice(0, 200),
      reason: String(s.reason || '').slice(0, 300),
      npmPackage: s.npmPackage || null,
      validated: true,
    }))
    .filter(s => {
      // Validate npm packages before including — strips hallucinated dependencies.
      if (s.npmPackage) {
        const valid = validateNpmPackage(s.npmPackage);
        if (!valid) {
          process.stderr.write(`[ai-review] Dropped suggestion "${s.title}" — npm package "${s.npmPackage}" not found\n`);
          return false;
        }
      }
      return true;
    });
}

// ── Watchlist: load previous suggestions to detect recurring signals ─────────

function loadWatchlist() {
  if (!existsSync('.github/ai-review-watchlist.json')) return [];
  try {
    return JSON.parse(readFileSync('.github/ai-review-watchlist.json', 'utf8'));
  } catch {
    return [];
  }
}

// Surfaces signals that have recurred across runs without being accepted or
// declined, so the model can escalate them explicitly rather than the
// cross-run tracker silently having no effect on what gets proposed next.
function formatWatchlistForPrompt(watchlist) {
  const recurring = watchlist.filter(w => (w.seenCount || 1) >= 2);
  if (!recurring.length) return '';
  const render = recurring
    .slice(-30)
    .map(w => `- ${String(w.title || '').slice(0, 120)} (${String(w.area || w.topic || 'n/a').slice(0, 40)}) — seen ${w.seenCount}x, last ${w.lastSeen}, confidence now ${w.confidence}`)
    .join('\n');
  return `\n\nWATCHLIST — low-confidence signals seen in multiple prior runs (a human has neither accepted nor declined these). If the evidence is now stronger, consider proposing it as a real suggestion at a higher confidence; do not just resubmit it unchanged:\n${render}`;
}

// ── Decision ledger: human accept/decline history feeds back into the prompt ──
// Accepted items are already implemented (never re-suggest them); declined items
// were deliberately rejected (don't propose again without materially new evidence).

function loadDecisions() {
  if (!existsSync('.github/ai-review-decisions.json')) return [];
  try {
    const arr = JSON.parse(readFileSync('.github/ai-review-decisions.json', 'utf8'));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function formatDecisionsForPrompt(decisions) {
  if (!decisions.length) return '';
  const accepted = decisions.filter(d => d.decision === 'accepted');
  const declined = decisions.filter(d => d.decision === 'declined');
  // Bound the token cost: most recent 40 of each, newest last in the ledger.
  const render = arr => arr.slice(-40)
    .map(d => `- ${String(d.title || '').slice(0, 120)} (${String(d.area || 'n/a').slice(0, 40)})`)
    .join('\n');
  let out = '\n\nPRIOR DECISIONS — do not re-propose settled items:';
  if (accepted.length) {
    out += `\nALREADY IMPLEMENTED (accepted previously — these are done, never suggest them again):\n${render(accepted)}`;
  }
  if (declined.length) {
    out += `\nDECLINED (do not propose again unless materially new evidence has emerged):\n${render(declined)}`;
  }
  return out;
}

function updateWatchlist(watchlist, newSuggestions) {
  const now = new Date().toISOString().slice(0, 10);
  const updated = [...watchlist];

  for (const s of newSuggestions) {
    const existing = updated.find(w => w.title === s.title && w.topic === s.topic);
    if (existing) {
      existing.seenCount = (existing.seenCount || 1) + 1;
      existing.lastSeen = now;
      // Upgrade confidence after appearing twice
      if (existing.seenCount >= 2 && existing.confidence === 'low') {
        existing.confidence = 'medium';
      }
      if (existing.seenCount >= 3 && existing.confidence === 'medium') {
        existing.confidence = 'high';
      }
    } else {
      updated.push({ ...s, firstSeen: now, lastSeen: now, seenCount: 1 });
    }
  }

  // Keep watchlist clean: drop entries not seen in 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  return updated.filter(w => new Date(w.lastSeen) > sixMonthsAgo);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!API_KEY && !DRY_RUN) {
    process.stderr.write('[ai-review] ANTHROPIC_API_KEY is not set\n');
    process.exit(1);
  }

  let topics;
  if (REVIEW_TYPE === 'focused') {
    if (!FOCUS_TOPIC) {
      process.stderr.write('[ai-review] REVIEW_TYPE=focused requires FOCUS_TOPIC to be set\n');
      process.exit(1);
    }
    topics = buildFocusedTopics(FOCUS_TOPIC);
    process.stderr.write(`[ai-review] Focused investigation: "${FOCUS_TOPIC}"\n`);
  } else {
    topics = TOPICS[REVIEW_TYPE] || TOPICS.biweekly;
  }

  const context = buildContext();
  const watchlist = loadWatchlist();
  const decisionsBlock = formatDecisionsForPrompt(loadDecisions());
  const watchlistBlock = formatWatchlistForPrompt(watchlist);

  const SYSTEM_PROMPT = `You are an expert AI software development consultant reviewing the cursor-guardrails template.
This is a reusable project template for a single developer who wants to work at the level of an expert team.
The goal spans six domains: Product Thinking, Design, UX/Behavioural Science, Engineering, Data Science, AI Tooling.

Your job is to identify specific, actionable, verifiable improvements. The
response format is enforced automatically — do not describe or wrap JSON, just
return substance.

What makes a suggestion worth returning:
- A real, named source: a standard, official documentation, or an npm package — never vendor hype or guesswork.
- A credible, verifiable basis. If the evidence is thin, lower the confidence or omit the suggestion.
- The exact file(s) to change where possible (.cursor/rules/*.mdc, AGENTS.md, .github/workflows/*, playbook.html, etc.).
- "experimental" stability only ever paired with "low" or "medium" confidence.
- Reason first, then commit to a confidence level. Quality over quantity: return at most 5, fewer if only a few are strong.

Example of one strong suggestion:
{"reason":"OpenSSF Scorecard is an industry-standard automated supply-chain risk check used by major OSS projects; this template pins actions by SHA but has no automated posture score.","current":"No automated supply-chain posture scoring in CI.","proposed":"Add the ossf/scorecard-action to a scheduled workflow and surface the score badge in README.","title":"Add OpenSSF Scorecard to CI","area":"Security","source":"OpenSSF Scorecard (github.com/ossf/scorecard)","confidence":"high","stability":"stable","effort":"medium","npmPackage":null}
${decisionsBlock}${watchlistBlock}
Current repo context (cached):
${context}`;

  const allSuggestions = [];
  const runDate = new Date().toISOString().slice(0, 10);

  if (DRY_RUN) {
    process.stderr.write('[ai-review] DRY RUN — skipping API calls\n');
    const mockOutput = {
      runDate,
      reviewType: REVIEW_TYPE,
      suggestions: [
        {
          id: 'dry-run-1',
          topic: 'engineering',
          title: 'Dry run suggestion',
          area: 'Engineering',
          current: 'Not implemented',
          proposed: 'This is a dry run — no real API call was made',
          confidence: 'high',
          stability: 'stable',
          effort: 'low',
          source: 'dry-run',
          reason: 'Testing the workflow',
          npmPackage: null,
          validated: true,
        },
      ],
      watchlist: [],
    };
    process.stdout.write(JSON.stringify(mockOutput));
    return;
  }

  for (const topic of topics) {
    process.stderr.write(`[ai-review] Calling API for topic: ${topic.label}\n`);
    try {
      const response = await callAnthropic(SYSTEM_PROMPT, topic.question);
      const text = response.content?.[0]?.text || '';
      const suggestions = parseSuggestions(text, topic.id);
      process.stderr.write(`[ai-review] ${topic.label}: ${suggestions.length} valid suggestion(s)\n`);
      allSuggestions.push(...suggestions);
    } catch (e) {
      process.stderr.write(`[ai-review] Error on topic ${topic.label}: ${e.message}\n`);
    }

    // Small delay between calls to avoid rate limits.
    await new Promise(r => setTimeout(r, 1500));
  }

  const updatedWatchlist = updateWatchlist(watchlist, allSuggestions);

  // Actionable: high or medium confidence, stable or emerging.
  const actionable = allSuggestions.filter(
    s => s.confidence !== 'low' || s.stability === 'stable'
  );
  // Watchlist: low confidence or experimental.
  const watchlistItems = allSuggestions.filter(
    s => s.confidence === 'low' && s.stability === 'experimental'
  );

  const output = {
    runDate,
    reviewType: REVIEW_TYPE,
    ...(FOCUS_TOPIC ? { focusTopic: FOCUS_TOPIC } : {}),
    suggestions: actionable,
    watchlist: watchlistItems,
    updatedWatchlist,
  };

  process.stdout.write(JSON.stringify(output));
}

main().catch(e => {
  process.stderr.write(`[ai-review] Fatal: ${e.message}\n`);
  process.exit(1);
});
