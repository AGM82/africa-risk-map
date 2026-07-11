import { displayLabel, toRiskCategoryLabel, type TerritoryRecord } from "@/lib/territory/types";
import { RISK_CATEGORY_HEX } from "@/lib/territory/colors";
import { cn } from "@/lib/utils";

type TerritoryTableProps = Readonly<{
  territories: readonly TerritoryRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}>;

/**
 * Accessible non-map fallback listing the same territories as the choropleth.
 */
export function TerritoryTable({
  territories,
  selectedId,
  onSelect,
  className,
}: TerritoryTableProps) {
  return (
    <div className={cn("overflow-auto", className)}>
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
        <caption className="sr-only">
          Territory risk register — table view of the same data shown on the map
        </caption>
        <thead className="bg-muted/60 sticky top-0">
          <tr>
            <th scope="col" className="px-3 py-2 font-semibold">
              Territory
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              Risk
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              Score
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              GRAA
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              Benefit options
            </th>
          </tr>
        </thead>
        <tbody>
          {territories.map((t) => {
            const selected = t.id === selectedId;
            return (
              <tr
                key={t.id}
                className={cn(
                  "border-border hover:bg-muted/40 border-t",
                  selected && "bg-muted/60",
                )}
              >
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className="focus-visible:ring-ring text-left font-medium underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:outline-none"
                    onClick={() => onSelect(t.id)}
                  >
                    {displayLabel(t.country, t.subRegion)}
                  </button>
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-2">
                    <span
                      aria-hidden
                      className="size-2.5 rounded-full"
                      style={{
                        backgroundColor: RISK_CATEGORY_HEX[t.riskCategory],
                      }}
                    />
                    {toRiskCategoryLabel(t.riskCategory)}
                  </span>
                </td>
                <td className="px-3 py-2 tabular-nums">{t.totalScore}</td>
                <td className="px-3 py-2">{t.graaPresence ? "Yes" : "No"}</td>
                <td className="px-3 py-2 font-mono text-xs">{t.benefitOptions}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
