import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAuthContext } from "@/lib/auth/session";
import { ACTIVE_CLIENT_COOKIE, resolveTenantScope } from "@/lib/auth/tenant-scope";
import { createFixtureAdminServices } from "@/lib/admin/fixture-services";
import { PolicyWorkspace } from "@/components/policy/policy-workspace";
import type {
  BenefitLineView,
  CategoryView,
  PolicySnapshotView,
} from "@/components/policy/policy-workspace";

export default async function PolicyPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/");

  const { clientBroker, policy } = createFixtureAdminServices();
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
      <PolicyWorkspace
        authRole={auth.role}
        clientName={null}
        activeClientId={null}
        switcherOptions={switcherOptions}
        canWrite={auth.role !== "CLIENT"}
        snapshot={null}
      />
    );
  }

  const clientRow = await clientBroker.getClient(auth, scope.activeClientId);
  const schedule = await policy.getActiveSchedule(auth, scope.activeClientId);
  const riskMix = await policy.getRiskMix(auth, scope.activeClientId);
  const eligibility =
    schedule === null ? [] : await policy.listTerritoryEligibility(auth, schedule.policy.id);

  let snapshot: PolicySnapshotView | null = null;
  if (schedule) {
    const categories: CategoryView[] = schedule.categories.map(({ category, benefits }) => {
      const lines: BenefitLineView[] = benefits.map((b) => ({
        benefitType: b.benefitType,
        amountBasis: b.amountBasis,
        fixedAmount: b.fixedAmount,
        earningsMultiple: b.earningsMultiple,
        percentOfEarnings: b.percentOfEarnings,
        maxAmountCap: b.maxAmountCap,
        waitingPeriodDays: b.waitingPeriodDays,
        maxBenefitWeeks: b.maxBenefitWeeks,
      }));
      return {
        id: category.id,
        categoryLabel: category.categoryLabel,
        planType: category.planType,
        declaredInsuredCount: category.declaredInsuredCount,
        declaredAnnualWageRoll: category.declaredAnnualWageRoll,
        premiumAmount: category.premiumAmount,
        premiumBasis: category.premiumBasis,
        premiumIncludesVat: category.premiumIncludesVat,
        aggregateAmount: category.aggregateAmount,
        aggregateBasis: category.aggregateBasis,
        aggregateExcludesVat: category.aggregateExcludesVat,
        benefits: lines,
      };
    });
    snapshot = {
      policyId: schedule.policy.id,
      policyYear: schedule.policy.policyYear,
      status: schedule.policy.status,
      benefitScale: schedule.policy.benefitScale,
      inceptionDate: schedule.policy.inceptionDate.toISOString(),
      expiryDate: schedule.policy.expiryDate.toISOString(),
      paymentFrequency: schedule.paymentTerms.frequency,
      aggregateIsClientFund: schedule.paymentTerms.aggregateIsClientFund,
      categories,
      eligibilityCount: eligibility.length,
      riskMix: riskMix
        ? {
            targetLowMedPct: riskMix.targetLowMedPct,
            targetHighPct: riskMix.targetHighPct,
            targetVeryHighPct: riskMix.targetVeryHighPct,
            tolerancePct: riskMix.tolerancePct,
          }
        : null,
    };
  }

  return (
    <PolicyWorkspace
      authRole={auth.role}
      clientName={clientRow.client.name}
      activeClientId={scope.activeClientId}
      switcherOptions={switcherOptions}
      canWrite={auth.role !== "CLIENT"}
      snapshot={snapshot}
    />
  );
}
