import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useRecordPerformance } from "@/lib/adaptive-db";
import { MASTERY_LABEL } from "@/lib/adaptive";

export type FeedbackTarget = {
  topicId: string;
  topicTitle: string;
  activityId?: string | null;
  planId?: string | null;
  activityType?: string;
  plannedMinutes?: number;
};

export function PerformanceDialog({
  target,
  onClose,
}: {
  target: FeedbackTarget | null;
  onClose: () => void;
}) {
  const record = useRecordPerformance();
  const [hasScore, setHasScore] = useState(false);
  const [score, setScore] = useState(70);
  const [confidence, setConfidence] = useState(3);
  const [difficulty, setDifficulty] = useState(3);
  const [completion, setCompletion] = useState(100);
  const [minutes, setMinutes] = useState(target?.plannedMinutes ?? 30);
  const [reflection, setReflection] = useState("");

  const submit = async () => {
    if (!target) return;
    try {
      const next = await record.mutateAsync({
        topicId: target.topicId,
        activityId: target.activityId ?? null,
        planId: target.planId ?? null,
        activityType: target.activityType ?? "learn",
        reflection: reflection.trim() || undefined,
        signal: {
          score: hasScore ? score : null,
          confidence,
          difficulty,
          completion: completion / 100,
          plannedMinutes: target.plannedMinutes ?? 0,
          actualMinutes: minutes,
          activityType: target.activityType ?? "learn",
        },
      });
      toast.success(
        `Mastery updated: ${Math.round(next.mastery)}% · ${MASTERY_LABEL[next.state]} · next revision ${next.next_review_date}`,
      );
      onClose();
      setReflection("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your feedback");
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>How did it go?</DialogTitle>
          <DialogDescription>{target?.topicTitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <Label htmlFor="hasScore" className="text-sm">
              I have a score for this
            </Label>
            <Switch id="hasScore" checked={hasScore} onCheckedChange={setHasScore} />
          </div>
          {hasScore && (
            <Field label={`Score — ${score}%`}>
              <Slider value={[score]} min={0} max={100} step={5} onValueChange={([v]) => setScore(v ?? 0)} />
            </Field>
          )}

          <Field label={`Confidence — ${confidence}/5`}>
            <Slider value={[confidence]} min={1} max={5} step={1} onValueChange={([v]) => setConfidence(v ?? 3)} />
          </Field>
          <Field label={`How hard it felt — ${difficulty}/5`}>
            <Slider value={[difficulty]} min={1} max={5} step={1} onValueChange={([v]) => setDifficulty(v ?? 3)} />
          </Field>
          <Field label={`Completed — ${completion}%`}>
            <Slider value={[completion]} min={0} max={100} step={10} onValueChange={([v]) => setCompletion(v ?? 100)} />
          </Field>

          <div className="space-y-1.5">
            <Label htmlFor="minutes">Minutes actually studied</Label>
            <Input
              id="minutes"
              type="number"
              min={0}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reflection">What did you struggle with? (optional)</Label>
            <Textarea
              id="reflection"
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="Recursion trace was confusing…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={record.isPending}>
            Save & adapt plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}
