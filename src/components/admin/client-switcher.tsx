"use client";

import { useId, useTransition } from "react";
import { useRouter } from "next/navigation";
import { switchActiveClientAction } from "@/app/clients/actions";

type ClientOption = Readonly<{ id: string; name: string }>;

type ClientSwitcherProps = Readonly<{
  options: readonly ClientOption[];
  activeClientId: string | null;
}>;

export function ClientSwitcher({ options, activeClientId }: ClientSwitcherProps) {
  const selectId = useId();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (options.length < 2) {
    return null;
  }

  return (
    <label className="flex items-center gap-2 text-xs" htmlFor={selectId}>
      <span className="text-muted-foreground">Active client</span>
      <select
        id={selectId}
        value={activeClientId ?? ""}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          startTransition(async () => {
            await switchActiveClientAction(next);
            router.refresh();
          });
        }}
        className="border-input bg-background h-8 rounded-lg border px-2 text-sm outline-none focus-visible:ring-2"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
}
