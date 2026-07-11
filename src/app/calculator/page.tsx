import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAuthContext } from "@/lib/auth/session";
import { ACTIVE_CLIENT_COOKIE, resolveTenantScope } from "@/lib/auth/tenant-scope";
import { createFixtureAdminServices } from "@/lib/admin/fixture-services";
import { CalculatorWorkspace } from "@/components/calculator/calculator-workspace";
import type { BookView, RiskMixView } from "@/components/calculator/calculator-workspace";
import { createFixtureTerritoryRepository } from "@/lib/territory/fixture-repository";
import { TERRITORY_FIXTURES } from "@/lib/territory/fixtures";

function territoryLabel(country: string, subRegion: string): string {
  return subRegion.length > 0 ? `${country} — ${subRegion}` : country;
}

export default async function CalculatorPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/");

  const { clientBroker, premium, orgLocation, policy } = createFixtureAdminServices();
  const cookieStore = await cookies();
  const scope = await resolveTenantScope(
    auth,
    clientBroker,
    cookieStore.get(ACTIVE_CLIENT_COOKIE)?.value,
  );

  const withBrokers = await clientBroker.listClientsWithBrokers(auth);
  const switcherOptions = withBrokers
    .filter(({ client }) => scope.accessibleClientIds.includes(client.id))
    .map(({ client }) => ({ id: client.id, name: client.name }));

  if (scope.activeClientId === null) {
    return (
      <CalculatorWorkspace
        authRole={auth.role}
        clientName={null}
        activeClientId={null}
        switcherOptions={switcherOptions}
        canWrite={auth.role !== "CLIENT"}
        book={null}
        riskMix={null}
        recalibrationLocked={false}
        unsupportedReason={null}
        categories={[]}
        territories={[]}
        organisations={[]}
      />
    );
  }

  const clientRow = await clientBroker.getClient(auth, scope.activeClientId);
  const bookResult = await premium.getBook(auth, scope.activeClientId);
  const schedule =
    bookResult.schedule ?? (await policy.getActiveSchedule(auth, scope.activeClientId));

  let book: BookView | null = null;
  let riskMix: RiskMixView | null = null;
  let unsupportedReason: string | null = null;

  if (bookResult.unsupported) {
    unsupportedReason = bookResult.reason;
  } else if (bookResult.book) {
    book = {
      policyYear: bookResult.book.policyYear,
      benefitScale: bookResult.book.benefitScale,
      paymentFrequency: bookResult.book.paymentFrequency,
      aggregateIsClientFund: bookResult.book.aggregateIsClientFund,
      lines: bookResult.book.lines.map((line) => ({
        coverCategoryId: line.coverCategoryId,
        categoryLabel: line.categoryLabel,
        planType: line.planType,
        basisOfCover: line.basisOfCover,
        basisOfCoverOther: line.basisOfCoverOther,
        lives: line.lives,
        annualWageRoll: line.annualWageRoll,
        premiumAmount: line.premiumAmount,
        premiumBasis: line.premiumBasis,
        premiumIncludesVat: line.premiumIncludesVat,
        aggregateAmount: line.aggregateAmount,
        aggregateBasis: line.aggregateBasis,
        aggregateExcludesVat: line.aggregateExcludesVat,
        monthlyPremium: line.monthlyPremium,
        monthlyAggregate: line.monthlyAggregate,
        annualPremium: line.annualPremium,
        annualAggregateDeductible: line.annualAggregateDeductible,
      })),
      totalLives: bookResult.book.totalLives,
      totalMonthlyPremium: bookResult.book.totalMonthlyPremium,
      totalMonthlyAggregate: bookResult.book.totalMonthlyAggregate,
      totalAnnualPremium: bookResult.book.totalAnnualPremium,
      totalAnnualAggregateDeductible: bookResult.book.totalAnnualAggregateDeductible,
    };
    if (bookResult.riskMix) {
      riskMix = {
        actualLowMedPct: bookResult.riskMix.actualLowMedPct,
        actualHighPct: bookResult.riskMix.actualHighPct,
        actualVeryHighPct: bookResult.riskMix.actualVeryHighPct,
        targetLowMedPct: bookResult.riskMix.targets.targetLowMedPct,
        targetHighPct: bookResult.riskMix.targets.targetHighPct,
        targetVeryHighPct: bookResult.riskMix.targets.targetVeryHighPct,
        tolerancePct: bookResult.riskMix.targets.tolerancePct,
        outsideTolerance: bookResult.riskMix.outsideTolerance,
        breachedTiers: bookResult.riskMix.breachedTiers,
      };
    }
  }

  const territoryRepo = createFixtureTerritoryRepository(TERRITORY_FIXTURES);
  const territories = await territoryRepo.list();
  const orgs = await orgLocation.listMemberOrganisations(auth, scope.activeClientId);

  return (
    <CalculatorWorkspace
      authRole={auth.role}
      clientName={clientRow.client.name}
      activeClientId={scope.activeClientId}
      switcherOptions={switcherOptions}
      canWrite={auth.role !== "CLIENT"}
      book={book}
      riskMix={riskMix}
      recalibrationLocked={bookResult.recalibrationLocked}
      unsupportedReason={unsupportedReason}
      categories={(schedule?.categories ?? []).map(({ category }) => ({
        id: category.id,
        label: category.categoryLabel,
        planType: category.planType,
      }))}
      territories={territories.map((t) => ({
        id: t.id,
        label: territoryLabel(t.country, t.subRegion),
        riskCategory: t.riskCategory,
        benefitOptions: t.benefitOptions,
      }))}
      organisations={orgs.map((o) => ({ id: o.id, name: o.name }))}
    />
  );
}
