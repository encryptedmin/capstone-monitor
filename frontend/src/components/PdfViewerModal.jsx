import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { Spinner } from "./ui";
import { pdfApi } from "../lib/api";

// pdf.js is ~900KB -- load it on demand (first time someone actually
// previews a file) rather than in the app's main bundle, and cache the
// loaded module so later previews are instant.
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

/**
 * Renders a PDF entirely inside the app using pdf.js, drawing pages to a
 * <canvas>. This deliberately does NOT rely on the browser's native PDF
 * viewer (an <iframe> or a direct link to the file) because:
 *   1. Browsers block their built-in PDF renderer inside cross-origin
 *      iframes, silently falling back to a download.
 *   2. Many people have "always download PDFs" set as a personal browser
 *      preference, which forces a download even on a direct/new-tab
 *      navigation -- something no server header can override.
 * Rendering with pdf.js sidesteps both: the file is fetched through the
 * authenticated API client as raw bytes and painted onto a canvas.
 */
export function PdfViewerModal({ file, onClose }) {
  const canvasRef = useRef(null);
  const [pdf, setPdf] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [scale, setScale] = useState(1.15);
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error
  const [loadAttempt, setLoadAttempt] = useState(0);

  // Load the document whenever a new file is opened.
  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    setStatus("loading");
    setPdf(null);
    setPageNum(1);

    (async () => {
      try {
        const [pdfjsLib, res] = await Promise.all([loadPdfjs(), pdfApi.fetch(file.url)]);
        if (cancelled) return;
        const doc = await pdfjsLib.getDocument({ data: new Uint8Array(res.data) }).promise;
        if (cancelled) return;
        setPdf(doc);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [file, loadAttempt]);

  // Render the current page whenever the doc, page number, or zoom changes.
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

  return (
    <AnimatePresence>
      {file && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md p-4"
          style={{ background: "var(--scrim)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-strong w-full max-w-4xl h-[88vh] rounded-3xl flex flex-col overflow-hidden"
          >
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-fg/[0.08] shrink-0">
              <p className="font-medium text-fg text-sm truncate">{file.title}</p>

              <div className="flex items-center gap-1.5 shrink-0">
                {status === "ready" && (
                  <>
                    <button
                      onClick={() => setPageNum((p) => Math.max(1, p - 1))}
                      disabled={pageNum <= 1}
                      className="p-1.5 rounded-lg text-fg/70 hover:bg-fg/5 disabled:opacity-30"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs text-fg/70 w-16 text-center tabular-nums">
                      {pageNum} / {pdf.numPages}
                    </span>
                    <button
                      onClick={() => setPageNum((p) => Math.min(pdf.numPages, p + 1))}
                      disabled={pageNum >= pdf.numPages}
                      className="p-1.5 rounded-lg text-fg/70 hover:bg-fg/5 disabled:opacity-30"
                    >
                      <ChevronRight size={16} />
                    </button>
                    <div className="w-px h-5 bg-fg/10 mx-1" />
                    <button
                      onClick={() => setScale((s) => Math.max(0.5, s - 0.15))}
                      className="p-1.5 rounded-lg text-fg/70 hover:bg-fg/5"
                    >
                      <ZoomOut size={16} />
                    </button>
                    <button
                      onClick={() => setScale((s) => Math.min(2.5, s + 0.15))}
                      className="p-1.5 rounded-lg text-fg/70 hover:bg-fg/5"
                    >
                      <ZoomIn size={16} />
                    </button>
                    <div className="w-px h-5 bg-fg/10 mx-1" />
                  </>
                )}
                <button
                  onClick={onClose}
                  title="Close document"
                  aria-label="Close document"
                  className="p-1.5 rounded-lg text-fg/70 hover:bg-fg/5"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto bg-fg/[0.04] flex items-start justify-center p-6 scrollbar-thin">
              {status === "loading" && (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-fg/55">
                  <Spinner size={24} />
                  <p className="text-sm">Loading document…</p>
                </div>
              )}
              {status === "error" && (
                <div className="h-full flex flex-col items-center justify-center text-center gap-3 px-6">
                  <AlertTriangle size={22} className="text-danger" />
                  <p className="font-medium text-fg">Couldn't load this document</p>
                  <p className="text-sm text-fg/62 max-w-sm">
                    The file may be unavailable. Please try again.
                  </p>
                  <button
                    onClick={() => setLoadAttempt((attempt) => attempt + 1)}
                    className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium bg-fg/[0.04] text-fg hover:bg-fg/[0.08] border border-fg/10 transition-colors"
                  >
                    <RotateCcw size={16} /> Try again
                  </button>
                </div>
              )}
              <canvas
                ref={canvasRef}
                className={`shadow-lg rounded-sm ${status === "ready" ? "block" : "hidden"}`}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
