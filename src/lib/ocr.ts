import { createWorker } from "tesseract.js";

export type OcrProgress = (msg: string, ratio: number) => void;

type PdfJsModule = typeof import("pdfjs-dist");
type PdfTextItem = { str: string };

async function rasterizePdf(file: File, onProgress?: OcrProgress): Promise<HTMLCanvasElement[]> {
  // dynamic import — pdfjs is large and browser-only
  const pdfjs: PdfJsModule = await import("pdfjs-dist");
  // Use the bundled worker URL via Vite ?url import
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const canvases: HTMLCanvasElement[] = [];
  const maxPages = Math.min(pdf.numPages, 8); // cap for perf
  for (let i = 1; i <= maxPages; i++) {
    onProgress?.(`Rendering page ${i}/${maxPages}`, ((i - 1) / maxPages) * 0.3);
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    canvases.push(canvas);
  }
  return canvases;
}

export async function extractTextFromFile(file: File, onProgress?: OcrProgress): Promise<string> {
  const worker = await createWorker("eng", 1, {
    logger: (m) => {
      if (m.status === "recognizing text") {
        onProgress?.("Recognizing text", 0.3 + m.progress * 0.7);
      }
    },
  });

  let combined = "";
  try {
    if (file.type === "application/pdf") {
      const canvases = await rasterizePdf(file, onProgress);
      // Try direct text extraction first via pdfjs textContent
      const pdfjs: PdfJsModule = await import("pdfjs-dist");
      const buf = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: buf }).promise;
      let directText = "";
      for (let i = 1; i <= Math.min(pdf.numPages, 8); i++) {
        const page = await pdf.getPage(i);
        const tc = await page.getTextContent();
        directText += (tc.items as PdfTextItem[]).map((it) => it.str).join(" ") + "\n\n";
      }
      if (directText.trim().length > 200) {
        combined = directText;
      } else {
        for (let i = 0; i < canvases.length; i++) {
          onProgress?.(`OCR page ${i + 1}/${canvases.length}`, 0.3 + (i / canvases.length) * 0.7);
          const { data } = await worker.recognize(canvases[i]);
          combined += data.text + "\n\n";
        }
      }
    } else {
      onProgress?.("OCR running", 0.4);
      const { data } = await worker.recognize(file);
      combined = data.text;
    }
  } finally {
    await worker.terminate();
  }
  return combined
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const ACCEPTED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/tiff",
];
export const MAX_BYTES = 20 * 1024 * 1024;
