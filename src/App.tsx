import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Greeting } from "./components/Greeting";
import { formatZar } from "./lib/currency";

export function App() {
  return (
    <main className="bg-background min-h-screen p-8">
      <div className="mx-auto max-w-md space-y-6">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">
          Cursor Project Guardrails
        </h1>
        <Greeting name="developer" />
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Example premium
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground text-2xl font-bold">{formatZar(12500)}</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
