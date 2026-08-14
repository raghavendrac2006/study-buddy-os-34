/** Browser-side text extraction for uploaded study material. */

export type ExtractResult = { text: string; kind: string };

async function extractPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    );
  }
  await doc.destroy();
  return pages.join("\n\n");
}

async function extractDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth/mammoth.browser.js");
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return result.value;
}

export async function extractText(file: File): Promise<ExtractResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return { text: await extractPdf(file), kind: "pdf" };
  if (name.endsWith(".docx")) return { text: await extractDocx(file), kind: "docx" };
  if (name.endsWith(".doc")) {
    throw new Error("Legacy .doc files aren't supported. Save it as .docx or PDF and try again.");
  }
  if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".csv")) {
    return { text: await file.text(), kind: name.split(".").pop() ?? "txt" };
  }
  throw new Error("Unsupported file type. Upload a PDF, DOCX, TXT, MD or CSV file.");
}
