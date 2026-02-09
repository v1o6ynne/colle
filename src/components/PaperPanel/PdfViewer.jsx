import React, { useRef, useEffect, useCallback } from "react";
import { Document, Page } from "react-pdf";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

export default function PdfViewer({
  file = "./2208.11144v1.pdf",
  numPages,
  onLoadSuccess,
  containerWidth,
  options,
}) {
  const pdfRef = useRef(null);
  const pageRefs = useRef([]);
  const cleanupTimerRef = useRef(null);

  function handleLoadSuccess(pdf) {
    pdfRef.current = pdf;
    onLoadSuccess?.(pdf);
  }


  const clearHighlights = useCallback(() => {
    document.querySelectorAll(".pdf-quote-highlight").forEach((el) => {
      el.classList.remove("pdf-quote-highlight");
    });
    if (cleanupTimerRef.current) {
      clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }
  }, []);

 
  const waitForTextLayer = useCallback((pageWrap, timeout = 1500) => {
    return new Promise((resolve) => {
      const start = performance.now();
      const tick = () => {
        const layer =
          pageWrap?.querySelector(".react-pdf__Page__textContent") ||
          pageWrap?.querySelector(".textLayer");
        if (layer) return resolve(layer);
        if (performance.now() - start > timeout) return resolve(null);
        requestAnimationFrame(tick);
      };
      tick();
    });
  }, []);

  const highlightByAnchor = useCallback(
  async (anchor) => {
    if (!anchor || anchor.type !== "text") return;

    const { pageNumber, startSpan, endSpan } = anchor;
    if (!pageNumber || startSpan == null || endSpan == null) return;

    clearHighlights();

    const wrap = pageRefs.current[pageNumber - 1];
    if (!wrap) return;

    // 先把页面滚到视野里（让 textLayer 有机会渲染）
    wrap.scrollIntoView({ behavior: "smooth", block: "start" });

    const layer = await waitForTextLayer(wrap);
    if (!layer) return;

    const spans = Array.from(layer.querySelectorAll("span"));
    if (!spans.length) return;

    const lo = Math.max(0, Math.min(startSpan, endSpan));
    const hi = Math.min(spans.length - 1, Math.max(startSpan, endSpan));

    for (let i = lo; i <= hi; i++) {
      spans[i].classList.add("pdf-quote-highlight");
    }

    // ✅ 关键：让“高亮的起点 span”居中
    const targetSpan = spans[lo];
    if (targetSpan) {
      targetSpan.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }

    cleanupTimerRef.current = setTimeout(clearHighlights, 4000);
  },
  [clearHighlights, waitForTextLayer]
);

 
  const jumpToQuote = useCallback(
    async (quote) => {
      if (!quote || !pdfRef.current) return;

      clearHighlights();

      const needle = quote
        .toLowerCase()
        .replace(/\s+/g, " ")
        .slice(0, 200);

      for (let i = 1; i <= pdfRef.current.numPages; i++) {
        const page = await pdfRef.current.getPage(i);
        const text = await page.getTextContent();
        const pageString = text.items
          .map((it) => it.str)
          .join(" ")
          .toLowerCase()
          .replace(/\s+/g, " ");

        if (pageString.includes(needle)) {
          const wrap = pageRefs.current[i - 1];
          wrap?.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
      }

      console.warn("jumpToQuote: not found");
    },
    [clearHighlights]
  );

  
  useEffect(() => {
    window.highlightByAnchor = highlightByAnchor;
    window.jumpToQuote = jumpToQuote;
    return () => {
      delete window.highlightByAnchor;
      delete window.jumpToQuote;
    };
  }, [highlightByAnchor, jumpToQuote]);


  // PdfViewer 内部
useEffect(() => {
  function handleMouseUp() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;

    const range = sel.getRangeAt(0);
    const startSpan = range.startContainer?.parentElement?.closest("span");
    const endSpan = range.endContainer?.parentElement?.closest("span");
    if (!startSpan || !endSpan) return;

    const pageWrap = startSpan.closest("[data-page-number]");
    if (!pageWrap) return;

    const pageNumber = Number(pageWrap.dataset.pageNumber);
    const textLayer =
      pageWrap.querySelector(".react-pdf__Page__textContent") ||
      pageWrap.querySelector(".textLayer");

    if (!textLayer) return;
    const spans = Array.from(textLayer.querySelectorAll("span"));
    const s = spans.indexOf(startSpan);
    const e = spans.indexOf(endSpan);
    if (s < 0 || e < 0) return;

    const anchor = {
      type: "text",
      pageNumber,
      startSpan: s,
      endSpan: e,
    };

    // ⭐ 抛给外面
    window.onPdfTextAnchor?.(anchor);
  }

  

  document.addEventListener("mouseup", handleMouseUp);
  return () => document.removeEventListener("mouseup", handleMouseUp);
}, []);

// PdfViewer.jsx 里（组件内部）
useEffect(() => {
  const wraps = pageRefs.current.filter(Boolean);
  if (!wraps.length) return;

  // 默认当前页
  window.__pdfCurrentPage = 1;

  const io = new IntersectionObserver(
    (entries) => {
      // 找到最“在视野里”的页
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (visible?.target?.dataset?.pageNumber) {
        window.__pdfCurrentPage = Number(visible.target.dataset.pageNumber);
      }
    },
    { root: document.querySelector("#viewerContainer"), threshold: [0.2, 0.4, 0.6, 0.8] }
  );

  wraps.forEach((w) => io.observe(w));
  return () => io.disconnect();
}, []);


const jumpToPage = useCallback((pageNumber) => {
  const wrap = pageRefs.current[pageNumber - 1];
  wrap?.scrollIntoView({ behavior: "smooth", block: "center" });
}, []);

useEffect(() => {
  window.jumpToPage = jumpToPage;
  return () => delete window.jumpToPage;
}, [jumpToPage]);


// ✅ 找真正的滚动父容器（#viewerContainer 通常不是 scroll container）
const getScrollParent = (el) => {
  let p = el?.parentElement;
  while (p) {
    const oy = getComputedStyle(p).overflowY;
    if (oy === "auto" || oy === "scroll") return p;
    p = p.parentElement;
  }
  return window;
};

// ✅ 计算“当前页”：找 top 最接近滚动视口上方一点的那一页
const getPdfCurrentPage = useCallback(() => {
  const wraps = pageRefs.current.filter(Boolean);
  if (!wraps.length) return 1;

  const container = document.querySelector("#viewerContainer");
  const scrollParent = getScrollParent(container);

  const parentTop =
    scrollParent === window ? 0 : scrollParent.getBoundingClientRect().top;

  // 你可以调这个偏移：越大越偏向“当前页的上半部分”
  const targetY = parentTop + 120;

  let bestPage = 1;
  let bestDist = Infinity;

  for (const w of wraps) {
    const r = w.getBoundingClientRect();
    const dist = Math.abs(r.top - targetY);
    if (dist < bestDist) {
      bestDist = dist;
      bestPage = Number(w.dataset.pageNumber) || 1;
    }
  }

  return bestPage;
}, []);

// ✅ 暴露给外部用：window.getPdfCurrentPage()
useEffect(() => {
  window.getPdfCurrentPage = getPdfCurrentPage;
  return () => delete window.getPdfCurrentPage;
}, [getPdfCurrentPage]);

// （可选）你还想实时维护一个全局变量也行：
useEffect(() => {
  const container = document.querySelector("#viewerContainer");
  const scrollParent = getScrollParent(container);

  const update = () => {
    window.__pdfCurrentPage = window.getPdfCurrentPage?.() || 1;
  };

  update();

  if (scrollParent === window) {
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  } else {
    scrollParent.addEventListener("scroll", update, { passive: true });
    return () => scrollParent.removeEventListener("scroll", update);
  }
}, [getPdfCurrentPage]);



  return (
    <div id="viewerContainer">
      <Document
        file={file}
        onLoadSuccess={handleLoadSuccess}
        options={options}
        className="pdf-document"
      >
        {Array.from(new Array(numPages), (_, index) => (
          <div
            key={`pagewrap_${index + 1}`}
            ref={(el) => (pageRefs.current[index] = el)}
            data-page-number={index + 1}
          >
            <Page
              pageNumber={index + 1}
              width={containerWidth}
              renderTextLayer
              renderAnnotationLayer
            />
          </div>
        ))}
      </Document>
    </div>
  );
}
