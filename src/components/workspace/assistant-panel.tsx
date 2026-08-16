import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askAssistant } from "@/lib/ai.functions";
import { friendlyAiError } from "@/lib/ai/errors";

const ACTIONS = [
  "Explain this",
  "Explain more simply",
  "Give an example",
  "Compare concepts",
  "Why is this important?",
] as const;

type Turn = { role: "you" | "ai"; text: string; points?: string[] };

export function AssistantPanel({
  topicTitle,
  sourceTitle,
  selection,
  onClearSelection,
}: {
  topicTitle: string;
  sourceTitle: string;
  selection: string;
  onClearSelection: () => void;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async (action: string, q = "") => {
    setBusy(true);
    setTurns((t) => [...t, { role: "you", text: q || action }]);
    try {
      const reply = await askAssistant({
        data: {
          action,
          topicTitle,
          sourceTitle,
          selection: selection.slice(0, 20_000),
          question: q.slice(0, 2000),
        },
      });
      setTurns((t) => [...t, { role: "ai", text: reply.answer, points: reply.key_points ?? [] }]);
    } catch (err) {
      toast.error(friendlyAiError(err));
      setTurns((t) => t.slice(0, -1));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="surface space-y-2 p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="size-4 text-primary" /> Study assistant
        </div>
        <p className="text-xs text-muted-foreground">
          {selection
            ? `Using ${selection.length.toLocaleString()} characters of selected context from "${sourceTitle}".`
            : `No context selected — answers use the topic "${topicTitle}" only. Select text in the source and press "Use selection with AI".`}
        </p>
        {selection && (
          <Button size="sm" variant="ghost" onClick={onClearSelection}>
            Clear context
          </Button>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          {ACTIONS.map((a) => (
            <Button key={a} size="sm" variant="outline" disabled={busy} onClick={() => void send(a)}>
              {a}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {turns.map((t, i) => (
          <div
            key={i}
            className={
              t.role === "you"
                ? "rounded-lg bg-muted/60 p-3 text-sm"
                : "surface p-4 text-sm leading-relaxed"
            }
          >
            <p className="whitespace-pre-wrap">{t.text}</p>
            {!!t.points?.length && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                {t.points.map((p, pi) => (
                  <li key={pi}>{p}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Thinking…
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Textarea
          rows={2}
          placeholder="Ask about this material…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <Button
          disabled={busy || !question.trim()}
          onClick={() => {
            const q = question.trim();
            setQuestion("");
            void send("Answer the question", q);
          }}
        >
          Ask
        </Button>
      </div>
    </div>
  );
}
