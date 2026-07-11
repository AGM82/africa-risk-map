import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Building2, Calculator, MapPinned, ShieldCheck, Users, Warehouse } from "lucide-react";
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
              </Link>{" "}
              — reserve/park operators, territory locations, and headcounts for the active client.
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
              Premium/aggregate what-if simulation with underwriting gates. Built in the
              premium-calculator to-do.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="size-4" /> Policy structure
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              Per-client policy schedules and the AI-assisted Structure Chat. Built in the
              policy-structure to-dos.
            </CardContent>
          </Card>
        </div>

        <p className="text-muted-foreground text-xs">
          This is the Foundations scaffold. Role-specific dashboards land in the
          dashboards-reporting to-do.{" "}
          <Link href="/sign-in" className="underline">
            Switch account
          </Link>
        </p>
      </div>
    </main>
  );
}
