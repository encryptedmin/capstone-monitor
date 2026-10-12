import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { reportsApi } from "../../lib/api";
import { Button, Spinner } from "../../components/ui";

let pdfjsLibPromise = null;
function loadPdfjs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import("pdfjs-dist").then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;
      return lib;
    });
  }
  return pdfjsLibPromise;
}

export default function AdminPdfReport() {
  const [searchParams] = useSearchParams();
  const schoolYear = searchParams.get("school_year") || "all";
  const scope =
    searchParams.get("scope") || (schoolYear === "all" ? "All AY ranges" : "Selected AY range");
  const canvasRef = useRef(null);
  const [pdfBytes, setPdfBytes] = useState(null);
  const [pdf, setPdf] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [scale, setScale] = useState(1.1);
  const [status, setStatus] = useState("loading");
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setPdf(null);
    setPdfBytes(null);
    setPageNum(1);

    (async () => {
      try {
        const [pdfjsLib, res] = await Promise.all([
          loadPdfjs(),
          reportsApi.pdf(schoolYear),
        ]);
        if (cancelled) return;
        const bytes = new Uint8Array(res.data);
        const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
        if (cancelled) return;
        setPdfBytes(res.data);
        setPdf(doc);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [schoolYear, loadAttempt]);

  useEffect(() => {
    if (!pdf || !canvasRef.current) return;
    let cancelled = false;

    (async () => {
      const page = await pdf.getPage(pageNum);
      if (cancelled) return;
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const dpr = window.devicePixelRatio || 1;
      canvas.width = viewport.width * dpr;
      canvas.height = viewport.height * dpr;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      await page.render({ canvasContext: ctx, viewport }).promise;
    })();

    return () => {
      cancelled = true;
    };
  }, [pdf, pageNum, scale]);

  const downloadReport = () => {
    if (!pdfBytes) return;
    const url = URL.createObjectURL(new Blob([pdfBytes], { type: "application/pdf" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `capstone_progress_report_${scope
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="min-h-screen text-fg flex flex-col">
      <header className="glass sticky top-3 z-20 mx-3 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">PDF report</p>
          <h1 className="font-display font-semibold text-lg text-fg">Capstone progress report</h1>
          <p className="text-xs text-fg/62">{scope}</p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {status === "ready" && (
            <>
              <button
                type="button"
                onClick={() => setPageNum((page) => Math.max(1, page - 1))}
                disabled={pageNum <= 1}
                className="rounded-xl p-2 text-fg/70 hover:bg-fg/[0.08] disabled:opacity-30"
                aria-label="Previous page"
              >
                <ChevronLeft size={17} />
              </button>
              <span className="w-16 text-center text-xs tabular-nums text-fg/70">
                {pageNum} / {pdf.numPages}
              </span>
              <button
                type="button"
                onClick={() => setPageNum((page) => Math.min(pdf.numPages, page + 1))}
                disabled={pageNum >= pdf.numPages}
                className="rounded-xl p-2 text-fg/70 hover:bg-fg/[0.08] disabled:opacity-30"
                aria-label="Next page"
              >
                <ChevronRight size={17} />
              </button>
              <div className="mx-1 h-6 w-px bg-fg/10" />
              <button
                type="button"
                onClick={() => setScale((current) => Math.max(0.55, current - 0.15))}
                className="rounded-xl p-2 text-fg/70 hover:bg-fg/[0.08]"
                aria-label="Zoom out"
              >
                <ZoomOut size={17} />
              </button>
              <button
                type="button"
                onClick={() => setScale((current) => Math.min(2.4, current + 0.15))}
                className="rounded-xl p-2 text-fg/70 hover:bg-fg/[0.08]"
                aria-label="Zoom in"
              >
                <ZoomIn size={17} />
              </button>
              <div className="mx-1 h-6 w-px bg-fg/10" />
            </>
          )}
          <Button type="button" icon={Download} onClick={downloadReport} disabled={!pdfBytes}>
            Download
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-auto px-4 py-6">
        {status === "loading" && (
          <div className="flex min-h-[55vh] flex-col items-center justify-center gap-3 text-fg/58">
            <Spinner size={26} />
            <p className="text-sm">Loading report...</p>
          </div>
        )}

        {status === "error" && (
          <div className="mx-auto mt-16 flex max-w-sm flex-col items-center gap-3 text-center">
            <AlertTriangle size={24} className="text-danger" />
            <p className="font-semibold text-fg">Couldn't load this report</p>
            <p className="text-sm text-fg/66">Please try again while signed in as an administrator.</p>
            <Button type="button" variant="ghostLight" icon={RotateCcw} onClick={() => setLoadAttempt((n) => n + 1)}>
              Try again
            </Button>
          </div>
        )}

        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            className={`max-w-none rounded-md bg-white shadow-2xl ring-1 ring-black/10 ${
              status === "ready" ? "block" : "hidden"
            }`}
          />
        </div>
      </main>
    </div>
  );
}
