import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

export function StoreLayout({ children, query }: { children: ReactNode; query?: string }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader key={query ?? ""} initialQuery={query ?? ""} />
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-4">{children}</main>
      <SiteFooter />
    </div>
  );
}
