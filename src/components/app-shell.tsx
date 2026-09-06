import { Link, useRouterState, useRouter } from "@tanstack/react-router";
import {
  Home,
  Sparkles,
  BookOpen,
  Dumbbell,
  CalendarDays,
  Menu,
  ChevronLeft,
  Moon,
  Sun,
  Laptop,
  Code2,
  History,
  Brain,
  CheckSquare,
  Settings as SettingsIcon,
  CalendarRange,
  FileStack,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type NavItem = { to: string; label: string; icon: React.ElementType };

const NAV_GROUPS: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Today",
    items: [
      { to: "/dashboard", label: "Home", icon: Home },
      { to: "/mentor", label: "AI Mentor", icon: Sparkles },
      { to: "/calendar", label: "Calendar", icon: CalendarDays },
    ],
  },
  {
    heading: "Learn",
    items: [
      { to: "/materials", label: "Study material", icon: BookOpen },
      { to: "/plans", label: "Learning plans", icon: CalendarRange },
      { to: "/subjects", label: "Subjects", icon: FileStack },
    ],
  },
  {
    heading: "Practice",
    items: [
      { to: "/practice", label: "Daily practice", icon: Dumbbell },
      { to: "/practice/coding", label: "Coding & DSA", icon: Code2 },
    ],
  },
  {
    heading: "Progress",
    items: [
      { to: "/history", label: "History & summary", icon: History },
      { to: "/mastery", label: "Mastery", icon: Brain },
      { to: "/tasks", label: "Tasks", icon: CheckSquare },
    ],
  },
];

const MOBILE_NAV: NavItem[] = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/materials", label: "Learn", icon: BookOpen },
  { to: "/practice", label: "Practice", icon: Dumbbell },
  { to: "/mentor", label: "Mentor", icon: Sparkles },
];

function isActive(pathname: string, to: string) {
  if (to === "/practice") return pathname === "/practice" || pathname === "/practice/questions";
  return pathname === to || pathname.startsWith(to + "/");
}

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

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto">
      {NAV_GROUPS.map((group) => (
        <div key={group.heading} className="space-y-1">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {group.heading}
          </p>
          {group.items.map(({ to, label, icon: Icon }) => {
            const active = isActive(pathname, to);
            return (
              <Link
                key={to}
                to={to}
                onClick={onNavigate}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function AppShell({
  children,
  title,
  subtitle,
  back,
  actions,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  /** Show a back control. Pass a path to control the destination. */
  back?: string | boolean;
  actions?: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

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
        <NavList />
        <div className="mt-4 flex items-center justify-between border-t border-sidebar-border pt-3">
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
            <Link to="/settings">
              <SettingsIcon className="size-4" /> Settings
            </Link>
          </Button>
        </div>
      </aside>

      <div className="md:pl-60">
        <header className="sticky top-0 z-20 border-b border-border bg-background/85 px-4 py-3 backdrop-blur md:px-8">
          <div className="flex items-center gap-2">
            {back ? (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Go back"
                className="-ml-2 shrink-0"
                onClick={() => {
                  if (typeof back === "string") router.navigate({ to: back });
                  else router.history.back();
                }}
              >
                <ChevronLeft className="size-5" />
              </Button>
            ) : null}
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold tracking-tight">
                {title ?? "My Study Compass"}
              </h1>
              {subtitle ? (
                <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {actions}
              <div className="flex items-center gap-1 md:hidden">
                <ThemeToggle />
                <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Open menu">
                      <Menu className="size-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="flex w-72 flex-col gap-4 p-4">
                    <SheetHeader className="p-0 text-left">
                      <SheetTitle className="text-sm">Menu</SheetTitle>
                    </SheetHeader>
                    <NavList onNavigate={() => setMenuOpen(false)} />
                    <Button variant="outline" asChild onClick={() => setMenuOpen(false)}>
                      <Link to="/settings">
                        <SettingsIcon className="size-4" /> Settings
                      </Link>
                    </Button>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl px-4 pt-5 pb-28 md:px-8 md:pb-12">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {MOBILE_NAV.map(({ to, label, icon: Icon }) => {
            const active = isActive(pathname, to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
                {label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground"
          >
            <Menu className="size-5" />
            More
          </button>
        </div>
      </nav>
    </div>
  );
}
