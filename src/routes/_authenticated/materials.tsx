import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { extractText } from "@/lib/extract";
import { useCreateMaterial, useDeleteMaterial, useMaterials } from "@/lib/adaptive-db";

export const Route = createFileRoute("/_authenticated/materials")({
  head: () => ({
    meta: [
      { title: "Study material — Learning OS" },
      {
        name: "description",
        content: "Upload your own PDFs, docs, notes or CSVs and let AI turn them into a study structure.",
      },
      { property: "og:title", content: "Study material — Learning OS" },
      { property: "og:description", content: "Upload material, get topics, get a plan." },
    ],
  }),
  component: MaterialsPage,
});

const STATUS_LABEL: Record<string, string> = {
  uploaded: "Not analysed",
  analyzing: "Analysing",
  analyzed: "Analysed",
  structured: "Topics saved",
  failed: "Failed",
};

function MaterialsPage() {
  const navigate = useNavigate();
  const materials = useMaterials();
  const createMaterial = useCreateMaterial();
  const removeMaterial = useDeleteMaterial();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (file: File) => {
    setBusy(true);
    try {
      const { text, kind } = await extractText(file);
      const clean = text.replace(/\u0000/g, "").trim();
      if (clean.length < 40) {
        throw new Error("Couldn't read enough text from that file. Is it a scanned image?");
      }

      const material = await createMaterial.mutateAsync({
        title: file.name.replace(/\.[^.]+$/, ""),
        file_name: file.name,
        mime_type: file.type || kind,
        size_bytes: file.size,
        char_count: clean.length,
        extracted_text: clean,
        status: "uploaded",
      });

      if (!material) throw new Error("Could not save the material");

      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await supabase.storage
          .from("materials")
          .upload(`${userData.user.id}/${material.id}-${file.name}`, file, { upsert: true })
          .then(({ error }) =>
            error
              ? supabase.from("materials").update({ error_message: error.message }).eq("id", material.id)
              : supabase
                  .from("materials")
                  .update({ storage_path: `${userData.user!.id}/${material.id}-${file.name}` })
                  .eq("id", material.id),
          );
      }

      toast.success("Material uploaded. Next: analyse it.");
      navigate({ to: "/materials/$id", params: { id: material.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <AppShell title="Material">
      <div className="space-y-8">
        <header>
          <h2 className="text-2xl font-semibold tracking-tight">Your study material</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload → confirm the structure → study. Nothing is pre-written for you.
          </p>
        </header>

        <section className="surface p-5">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Upload className="size-6 text-primary" />
            <div>
              <p className="text-sm font-medium">Upload study material</p>
              <p className="text-xs text-muted-foreground">PDF, DOCX, TXT, MD or CSV — read on your device.</p>
            </div>
            <Button onClick={() => inputRef.current?.click()} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {busy ? "Reading file…" : "Choose a file"}
            </Button>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold tracking-tight">Uploaded files</h3>
          {materials.isLoading ? (
            <Skeleton className="h-24 w-full rounded-xl" />
          ) : (materials.data?.length ?? 0) === 0 ? (
            <p className="surface p-6 text-center text-sm text-muted-foreground">
              Nothing uploaded yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {materials.data!.map((m) => (
                <li key={m.id} className="surface flex items-center gap-3 p-4">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <Link
                    to="/materials/$id"
                    params={{ id: m.id }}
                    className="min-w-0 flex-1"
                  >
                    <p className="truncate text-sm font-medium">{m.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(m.char_count / 1000)}k characters · {m.file_name}
                    </p>
                  </Link>
                  <Badge variant={m.status === "structured" ? "default" : "secondary"}>
                    {STATUS_LABEL[m.status] ?? m.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete material"
                    onClick={() => removeMaterial.mutate(m.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface p-5">
          <h3 className="text-sm font-semibold">Your plans</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Plans generated from your material live here.
          </p>
          <Button variant="outline" size="sm" className="mt-3" asChild>
            <Link to="/plans">Open plans</Link>
          </Button>
        </section>
      </div>
    </AppShell>
  );
}
