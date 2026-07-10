import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export type GreetingProps = {
  /** Name to greet. Kept non-personal in this template (e.g. a role, not a real person). */
  name: string;
};

/**
 * Reference component: demonstrates the foundational tier in practice —
 * Tailwind utility classes, a Lucide icon, and a shadcn/ui Button primitive.
 * New components should follow this shape and compose from shadcn/ui primitives.
 */
export function Greeting({ name }: GreetingProps) {
  return (
    <div className="border-border bg-card flex flex-col items-start gap-3 rounded-lg border p-6 shadow-sm">
      <p className="text-muted-foreground text-sm">
        Hello, {name}. Welcome to the guardrails template.
      </p>
      <Button size="sm">
        <Sparkles />
        Get started
      </Button>
    </div>
  );
}
