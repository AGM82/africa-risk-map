import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import {
  Building2,
  Calculator,
  ClipboardList,
  LayoutDashboard,
  MapPinned,
  MessagesSquare,
  Scale,
  ScrollText,
  ShieldCheck,
  Users,
  Warehouse,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthContext } from "@/lib/auth/session";

export default async function HomePage() {
  const authContext = await getAuthContext();

  if (!authContext) {
    return (
      <main className="bg-background flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <ShieldCheck className="text-muted-foreground size-10" />
        <h1 className="text-foreground text-2xl font-bold tracking-tight">Access pending</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          Your account is signed in but has not yet been assigned a role. An Insurer administrator
          needs to grant access via User Administration before you can continue.
        </p>
        <UserButton />
      </main>
    );
  }

  return (
    <main className="bg-background min-h-screen p-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-foreground text-2xl font-bold tracking-tight">Africa Risk Map</h1>
            <p className="text-muted-foreground text-sm">
              Signed in as <span className="font-medium">{authContext.role}</span>
              {authContext.clientId ? ` - client ${authContext.clientId}` : ""}
            </p>
          </div>
          <UserButton />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                <LayoutDashboard className="size-4" /> Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              <Link href="/dashboard" className="text-foreground font-medium underline">
                Client dashboard
              </Link>{" "}
              — covered lives, live book totals, and premium/aggregate trends.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                <ScrollText className="size-4" /> Ledger &amp; audit
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              <Link href="/ledger" className="text-foreground font-medium underline">
                Endorsement ledger
              </Link>
              {" · "}
              <Link href="/audit" className="text-foreground font-medium underline">
                Audit log
              </Link>
              {authContext.role === "INSURER_ADMIN" ? (
                <>
                  {" · "}
                  <Link href="/rollup" className="text-foreground font-medium underline">
                    Cross-client rollup
                  </Link>
                </>
              ) : null}{" "}
              — history, CSV export, and Insurer rollup.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                <MapPinned className="size-4" /> Risk register &amp; map
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              <Link href="/map" className="text-foreground font-medium underline">
                Open the map
              </Link>{" "}
              — territory risk choropleth, detail drawer, and table fallback.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                <Building2 className="size-4" /> Clients &amp; brokers
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              <Link href="/clients" className="text-foreground font-medium underline">
                Manage clients
              </Link>{" "}
              — accessible clients, broker assignments, and active-client context.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                <Warehouse className="size-4" /> Organisations &amp; locations
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              <Link href="/organisations" className="text-foreground font-medium underline">
                Member organisations
              </Link>
              {" · "}
              <Link href="/census-review" className="text-foreground font-medium underline">
                Census review
              </Link>{" "}
              — reserve/park operators, magic-link census intake, and headcounts for the active
              client.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                <ClipboardList className="size-4" /> Census intake
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              <Link href="/census-review" className="text-foreground font-medium underline">
                Review declarations
              </Link>{" "}
              — copy a census link from Organisations; parks submit without a login.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                <Scale className="size-4" /> Recalibration wizard
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              <Link href="/recalibration" className="text-foreground font-medium underline">
                Reconcile headcounts
              </Link>{" "}
              — match organisation locations to ledger PlanType baselines, then lock.
            </CardContent>
          </Card>
          {authContext.role !== "CLIENT" ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                  <Users className="size-4" /> User administration
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                <Link href="/admin/users" className="text-foreground font-medium underline">
                  Invite &amp; manage users
                </Link>{" "}
                — role and scope assignment with access-change audit.
              </CardContent>
            </Card>
          ) : null}
          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                <Calculator className="size-4" /> Premium calculator
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              <Link href="/calculator" className="text-foreground font-medium underline">
                Open calculator
              </Link>{" "}
              — live book totals, what-if adds, underwriting gates, and risk-mix drift.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="size-4" /> Policy structure
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              <Link href="/policy" className="text-foreground font-medium underline">
                Policy schedules
              </Link>{" "}
              — Fixed Sum (GPA) and Earnings-Based (Stated Benefits) categories, rates, and risk
              mix.
            </CardContent>
          </Card>
          {authContext.role !== "CLIENT" ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                  <MessagesSquare className="size-4" /> Structure Chat
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                <Link href="/structure-chat" className="text-foreground font-medium underline">
                  Draft a schedule
                </Link>{" "}
                — paste term-sheet text, review the draft, Insurer confirms to Policy and/or
                template.
              </CardContent>
            </Card>
          ) : null}
        </div>

        <p className="text-muted-foreground text-xs">
          Role-scoped dashboards, ledger, audit, and Insurer rollup are available from the cards
          above.{" "}
          <Link href="/sign-in" className="underline">
            Switch account
          </Link>
        </p>
      </div>
    </main>
  );
}
