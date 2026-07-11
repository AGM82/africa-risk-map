import { RISK_CATEGORY_LABELS } from "@/lib/territory/types";
import { RISK_CATEGORY_HEX, toRiskCategoryLabel } from "@/lib/territory/colors";
import type { RiskCategoryCode } from "@/lib/territory/types";
import { cn } from "@/lib/utils";

const CODES: RiskCategoryCode[] = ["Low", "Medium", "High", "VeryHigh", "Extreme"];

type RiskLegendProps = Readonly<{
  className?: string;
}>;

export function RiskLegend({ className }: RiskLegendProps) {
  return (
    <aside
      aria-label="Risk category legend"
      className={cn(
        "border-border bg-card/95 text-card-foreground rounded-lg border p-3 shadow-sm backdrop-blur-sm",
        className,
      )}
    >
      <p className="mb-2 text-xs font-semibold tracking-wide uppercase">Risk category</p>
      <ul className="flex flex-col gap-2">
        {CODES.map((code) => {
          const color =
            code === "Low"
              ? RISK_CATEGORY_HEX.Low
              : code === "Medium"
                ? RISK_CATEGORY_HEX.Medium
                : code === "High"
                  ? RISK_CATEGORY_HEX.High
                  : code === "VeryHigh"
                    ? RISK_CATEGORY_HEX.VeryHigh
                    : RISK_CATEGORY_HEX.Extreme;
          return (
            <li key={code} className="flex items-center gap-2 text-sm">
              <span
                aria-hidden
                className="size-3 shrink-0 rounded-sm"
                style={{ backgroundColor: color }}
              />
              <span>{toRiskCategoryLabel(code)}</span>
            </li>
          );
        })}
      </ul>
      <p className="text-muted-foreground mt-2 text-xs">
        Colour is paired with labels ({RISK_CATEGORY_LABELS.length} tiers).
      </p>
    </aside>
  );
}
