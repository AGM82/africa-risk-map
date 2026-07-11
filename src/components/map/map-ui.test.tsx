import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RiskLegend } from "@/components/map/risk-legend";
import { TerritoryFiltersPanel } from "@/components/map/territory-filters-panel";
import { TerritoryList } from "@/components/map/territory-list";
import { TerritoryTable } from "@/components/map/territory-table";
import { TERRITORY_FIXTURES } from "@/lib/territory/fixtures";
import { DEFAULT_TERRITORY_FILTERS } from "@/lib/territory/filters";
import { expectNoA11yViolations } from "@/test/axe";

describe("map UI components", () => {
  it("renders a labelled risk legend without a11y violations", async () => {
    const { container } = render(<RiskLegend />);
    expect(screen.getByLabelText(/risk category legend/i)).toBeInTheDocument();
    expect(screen.getByText("Very High")).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("filters the territory list by query", async () => {
    const { container } = render(
      <TerritoryList
        territories={TERRITORY_FIXTURES}
        selectedId={null}
        query="nigeria"
        onQueryChange={() => undefined}
        onSelect={() => undefined}
      />,
    );
    expect(screen.getByText(/Nigeria/i)).toBeInTheDocument();
    expect(screen.queryByText(/South Africa/i)).not.toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("shows a filter-specific empty state", () => {
    render(
      <TerritoryList
        territories={[]}
        selectedId={null}
        query=""
        filtersActive
        onQueryChange={() => undefined}
        onSelect={() => undefined}
      />,
    );
    expect(screen.getByText(/No territories match the current filters/i)).toBeInTheDocument();
  });

  it("renders filter controls and narrows GRAA presence", async () => {
    const { container } = render(
      <TerritoryFiltersPanel
        filters={{ ...DEFAULT_TERRITORY_FILTERS, graaPresence: "yes" }}
        totalCount={TERRITORY_FIXTURES.length}
        visibleCount={3}
        onChange={() => undefined}
        onClear={() => undefined}
      />,
    );
    expect(screen.getByText(/Showing 3 of 4 territories/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/GRAA members only/i)).toBeChecked();
    expect(screen.getByRole("button", { name: /Clear filters/i })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("renders the accessible table fallback", async () => {
    const { container } = render(
      <TerritoryTable
        territories={TERRITORY_FIXTURES}
        selectedId="terr-zaf"
        onSelect={() => undefined}
      />,
    );
    expect(screen.getByText(/Territory risk register/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /South Africa/i })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });
});
