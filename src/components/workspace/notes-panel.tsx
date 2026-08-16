import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateNote, useDeleteNote, useNotes, useUpdateNote } from "@/lib/workspace-db";

export function NotesPanel({
  topicId,
  subjectId,
  materialId,
  page,
}: {
  topicId: string;
  subjectId?: string | null;
  materialId?: string | null;
  page?: number | null;
}) {
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const notes = useNotes({ topicId, search });
  const create = useCreateNote();
  const update = useUpdateNote();
  const remove = useDeleteNote();

  const save = async () => {
    if (!draft.trim()) return;
    await create.mutateAsync({
      content: draft.trim(),
      topic_id: topicId,
      subject_id: subjectId ?? null,
      material_id: materialId ?? null,
      page: page ?? null,
    });
    setDraft("");
    toast.success("Note saved");
  };

  return (
    <div className="space-y-4">
      <div className="surface space-y-2 p-4">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a note in your own words…"
          rows={4}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {page ? `Will be linked to page ${page}` : "Linked to this topic"}
          </span>
          <Button size="sm" onClick={() => void save()} disabled={!draft.trim() || create.isPending}>
            Save note
          </Button>
        </div>
      </div>

      <Input
        placeholder="Search my notes"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-9"
      />

      <div className="space-y-2">
        {(notes.data ?? []).map((n) => (
          <div key={n.id} className="surface p-4">
            {editingId === n.id ? (
              <div className="space-y-2">
                <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={4} />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={async () => {
                      await update.mutateAsync({ id: n.id, content: editText });
                      setEditingId(null);
                    }}
                  >
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="whitespace-pre-wrap text-sm">{n.content}</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{new Date(n.created_at).toLocaleString()}</span>
                  {n.page != null && <span>· page {n.page}</span>}
                  <div className="ml-auto flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Edit note"
                      onClick={() => {
                        setEditingId(n.id);
                        setEditText(n.content);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Delete note"
                      onClick={() => remove.mutate(n.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
        {notes.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">No notes yet for this topic.</p>
        )}
      </div>
    </div>
  );
}
