"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { UserButton } from "@clerk/nextjs";
import type { UserRole } from "@/lib/user-admin/types";

type AdminHeaderProps = Readonly<{
  title: string;
  role: UserRole;
  children?: ReactNode;
}>;

export function AdminHeader({ title, role, children }: AdminHeaderProps) {
  return (
    <header className="border-border flex flex-wrap items-center justify-between gap-4 border-b px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground text-sm underline-offset-2 hover:underline"
        >
          Home
        </Link>
        <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
        <span className="text-muted-foreground hidden text-xs sm:inline">{role}</span>
      </div>
      <div className="flex items-center gap-3">
        {children}
        <UserButton />
      </div>
    </header>
  );
}
