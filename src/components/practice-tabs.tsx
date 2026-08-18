import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/practice", label: "Daily Practice", exact: true },
  { to: "/practice/questions", label: "Question Bank", exact: false },
  { to: "/practice/coding", label: "Coding & DSA", exact: false },
] as const;

export function PracticeTabs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="surface flex gap-1 overflow-x-auto p-1">
      {TABS.map((t) => {
        const active = t.exact ? pathname === t.to || pathname === "/practice/" : pathname.startsWith(t.to);
        return (
          <Link
            key={t.to}
            to={t.to}
            className={cn(
              "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
