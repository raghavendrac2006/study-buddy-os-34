import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogOut, Monitor, Moon, Sun } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useUpdateProfile } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Learning OS" },
      { name: "description", content: "Set your daily study target, session defaults, pomodoro lengths and theme." },
      { property: "og:title", content: "Settings — Learning OS" },
      { property: "og:description", content: "Tune your study defaults and appearance." },
    ],
  }),
  component: SettingsPage,
});

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

const STUDY_TIMES = ["morning", "afternoon", "evening", "night"];
const LEVELS = ["beginner", "intermediate", "advanced"];

function SettingsPage() {
  const profile = useProfile();
  const updateProfile = useUpdateProfile();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  const [form, setForm] = useState({
    display_name: "",
    daily_target_minutes: 120,
    default_session_minutes: 60,
    pomodoro_focus_minutes: 25,
    pomodoro_break_minutes: 5,
    preferred_study_time: "evening",
    coding_level: "beginner",
  });

  useEffect(() => {
    const p = profile.data;
    if (!p) return;
    setForm({
      display_name: p.display_name ?? "",
      daily_target_minutes: p.daily_target_minutes,
      default_session_minutes: p.default_session_minutes,
      pomodoro_focus_minutes: p.pomodoro_focus_minutes,
      pomodoro_break_minutes: p.pomodoro_break_minutes,
      preferred_study_time: p.preferred_study_time ?? "evening",
      coding_level: p.coding_level ?? "beginner",
    });
  }, [profile.data]);

  const save = async () => {
    try {
      await updateProfile.mutateAsync({
        display_name: form.display_name.trim() || null,
        daily_target_minutes: form.daily_target_minutes,
        default_session_minutes: form.default_session_minutes,
        pomodoro_focus_minutes: form.pomodoro_focus_minutes,
        pomodoro_break_minutes: form.pomodoro_break_minutes,
        preferred_study_time: form.preferred_study_time,
        coding_level: form.coding_level,
      });
      toast.success("Settings saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save settings");
    }
  };

  if (profile.isLoading) {
    return (
      <AppShell title="Settings">
        <Skeleton className="h-80 w-full rounded-xl" />
      </AppShell>
    );
  }

  const num = (key: keyof typeof form) => ({
    type: "number" as const,
    value: String(form[key]),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm({ ...form, [key]: Math.max(1, parseInt(e.target.value || "1", 10)) }),
  });

  return (
    <AppShell title="Settings">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Settings</h2>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>

        <section className="surface space-y-5 p-5">
          <h3 className="text-sm font-semibold">Profile</h3>
          <div className="space-y-1.5">
            <Label htmlFor="dn">Display name</Label>
            <Input
              id="dn"
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              placeholder="Your name"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Preferred study time</Label>
              <Select
                value={form.preferred_study_time}
                onValueChange={(v) => setForm({ ...form, preferred_study_time: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STUDY_TIMES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Coding level</Label>
              <Select value={form.coding_level} onValueChange={(v) => setForm({ ...form, coding_level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEVELS.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <section className="surface space-y-5 p-5">
          <h3 className="text-sm font-semibold">Study defaults</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="dt">Daily target (minutes)</Label>
              <Input id="dt" min="15" step="15" {...num("daily_target_minutes")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ds">Default session (minutes)</Label>
              <Input id="ds" min="5" step="5" {...num("default_session_minutes")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf">Pomodoro focus (minutes)</Label>
              <Input id="pf" min="5" step="5" {...num("pomodoro_focus_minutes")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pb">Pomodoro break (minutes)</Label>
              <Input id="pb" min="1" step="1" {...num("pomodoro_break_minutes")} />
            </div>
          </div>
          <Button onClick={save} disabled={updateProfile.isPending}>
            Save changes
          </Button>
        </section>

        <section className="surface space-y-3 p-5">
          <h3 className="text-sm font-semibold">Appearance</h3>
          <div className="flex flex-wrap gap-2">
            {THEMES.map((t) => (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors",
                  theme === t.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                <t.icon className="size-4" /> {t.label}
              </button>
            ))}
          </div>
        </section>

        <section className="surface space-y-2 p-5">
          <h3 className="text-sm font-semibold">Workspace</h3>
          <p className="text-sm text-muted-foreground">
            This is your personal workspace — it opens straight to your dashboard, no sign-in needed.
            All data is stored privately in your own cloud backend.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
