import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Loader2, RotateCcw, Send, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askMentor } from "@/lib/mentor.functions";
import { friendlyAiError } from "@/lib/ai/errors";

export const Route = createFileRoute("/_authenticated/mentor")({
  head: () => ({
    meta: [
      { title: "AI Mentor — My Study Compass" },
      {
        name: "description",
        content:
          "Ask your personal study mentor what to study today, where you are weak and what revision is due.",
      },
      { property: "og:title", content: "AI Mentor — My Study Compass" },
      {
        property: "og:description",
        content: "A read-only mentor that answers using your own study data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MentorPage,
});

const STARTERS = [
  "What should I study today?",
  "What are my weakest areas?",
  "Am I falling behind?",
  "I have only 1 hour today, what should I prioritize?",
  "What revision is due?",
];

type Msg = {
  role: "user" | "mentor";
  text: string;
  fromData?: string[];
  suggestions?: string[];
  gaps?: string[];
};

function MentorPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastQuestion = useRef<string>("");

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setError(null);
    lastQuestion.current = q;
    const history = messages.slice(-6).map((m) => ({ role: m.role, text: m.text.slice(0, 2000) }));
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setBusy(true);
    try {
      const reply = await askMentor({ data: { question: q, history } });
      setMessages((m) => [
        ...m,
        {
          role: "mentor",
          text: reply.answer,
          fromData: reply.from_data ?? [],
          suggestions: reply.suggestions ?? [],
          gaps: reply.data_gaps ?? [],
        },
      ]);
    } catch (err) {
      setError(friendlyAiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell
      title="AI Mentor"
      subtitle="Answers using your own study data. It gives advice only — it never changes your plans."
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 pb-4">
        {messages.length === 0 && (
          <div className="surface space-y-3 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="size-4 text-primary" /> Ask about your studies
            </div>
            <p className="text-sm text-muted-foreground">
              The mentor looks at your plan, revisions, mastery, study sessions, practice results,
              coding log, goals and materials — only the parts your question needs. It can suggest,
              but it cannot edit anything.
            </p>
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <Button key={s} size="sm" variant="outline" onClick={() => void ask(s)}>
                  {s}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="ml-auto max-w-[90%] rounded-lg bg-muted/60 p-3 text-sm">
                {m.text}
              </div>
            ) : (
              <div key={i} className="surface space-y-3 p-4 text-sm leading-relaxed">
                <p className="whitespace-pre-wrap">{m.text}</p>
                {!!m.fromData?.length && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">From your data</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                      {m.fromData.map((x, xi) => (
                        <li key={xi}>{x}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {!!m.suggestions?.length && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Suggestions</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                      {m.suggestions.map((x, xi) => (
                        <li key={xi}>{x}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {!!m.gaps?.length && (
                  <p className="text-xs text-muted-foreground">
                    No data yet for: {m.gaps.join(", ")}
                  </p>
                )}
              </div>
            ),
          )}

          {busy && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Reading your study data…
            </div>
          )}

          {error && (
            <div className="surface space-y-2 p-4 text-sm">
              <p className="text-destructive">{error}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void ask(lastQuestion.current)}
                disabled={busy || !lastQuestion.current}
              >
                <RotateCcw className="mr-2 size-4" /> Try again
              </Button>
            </div>
          )}
        </div>

        <div className="sticky bottom-16 flex gap-2 bg-background pt-2 md:bottom-0">
          <Textarea
            rows={2}
            placeholder="Ask your mentor…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void ask(input);
              }
            }}
          />
          <Button disabled={busy || !input.trim()} onClick={() => void ask(input)}>
            <Send className="size-4" />
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
