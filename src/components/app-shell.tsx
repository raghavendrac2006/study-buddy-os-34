import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FileStack,
  CalendarRange,
  Brain,
  Timer,
  CheckSquare,
  CalendarDays,
  History,
  Moon,
  Sun,
  Laptop,
} from "lucide-react";
import type { ReactNode } from "react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/dashboard", label: "Today", icon: LayoutDashboard, primary: true },
  { to: "/materials", label: "Learn", icon: FileStack, primary: true },
  { to: "/plans", label: "Plans", icon: CalendarRange, primary: false },
  { to: "/calendar", label: "Calendar", icon: CalendarDays, primary: true },
  { to: "/mastery", label: "Mastery", icon: Brain, primary: false },
  { to: "/study", label: "Study", icon: Timer, primary: true },
  { to: "/history", label: "History", icon: History, primary: true },
  { to: "/tasks", label: "Tasks", icon: CheckSquare, primary: false },
] as const;

const MOBILE_NAV = NAV.filter((n) => n.primary);


function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Laptop;
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Theme: ${theme}. Switch to ${next}`}
      onClick={() => setTheme(next)}
    >
      <Icon className="size-4" />
    </Button>
  );
}

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-sidebar px-3 py-5 md:flex">
        <div className="px-3 pb-6">
          <div className="text-sm font-semibold tracking-tight text-sidebar-foreground">
            My Study Compass
          </div>
          <div className="text-xs text-muted-foreground">Personal study mentor</div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center justify-between border-t border-sidebar-border pt-3">
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
            <Link to="/settings">Settings</Link>
          </Button>
        </div>
      </aside>

      <div className="md:pl-60">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/85 px-4 py-3 backdrop-blur md:px-8">
          <h1 className="text-base font-semibold tracking-tight">{title ?? "My Study Compass"}</h1>
          <div className="flex items-center gap-1 md:hidden">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild>
              <Link to="/settings">Settings</Link>
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl px-4 pt-5 pb-28 md:px-8 md:pb-12">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {MOBILE_NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
