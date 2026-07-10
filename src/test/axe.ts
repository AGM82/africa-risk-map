import { run, type RunOptions } from "axe-core";

/**
 * Runs axe-core against a rendered DOM node and throws with a readable
 * summary if any accessibility violations are found. Use this in component
 * tests instead of a Jest/Vitest-specific axe wrapper — axe-core is the
 * engine those wrappers all delegate to, so calling it directly avoids an
 * extra dependency with its own release cadence (see 40-tooling-supply-chain.mdc).
 *
 * `color-contrast` is disabled by default: jsdom has no real layout/paint
 * engine, so axe cannot reliably compute contrast there. Contrast is covered
 * instead by the manual ratios required in `31-design.mdc`.
 */
export async function expectNoA11yViolations(
  container: Element,
  options: RunOptions = {},
): Promise<void> {
  const results = await run(container, {
    rules: { "color-contrast": { enabled: false } },
    ...options,
  });

  if (results.violations.length > 0) {
    const summary = results.violations
      .map(
        (violation) =>
          `- ${violation.id} (${violation.impact}): ${violation.help} — ${violation.nodes.length} node(s)\n  ${violation.helpUrl}`,
      )
      .join("\n");
    throw new Error(`Accessibility violations found:\n${summary}`);
  }
}
