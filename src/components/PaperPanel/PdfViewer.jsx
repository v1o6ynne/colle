// // import React, { useRef } from 'react';
// // import { Document, Page } from 'react-pdf';

// // import 'react-pdf/dist/Page/AnnotationLayer.css';
// // import 'react-pdf/dist/Page/TextLayer.css';

// // export default function PdfViewer({
// //   file = './2208.11144v1.pdf',
// //   numPages,
// //   onLoadSuccess,
// //   containerWidth,
// //   options
// // }) {

// //   // ⭐ 保存 pdf proxy
// //   const pdfRef = useRef(null);

// //   // ⭐ 保存每页 DOM
// //   const pageRefs = useRef([]);

// //   // ⭐ 覆盖 onLoadSuccess
// //   function handleLoadSuccess(pdf) {
// //     pdfRef.current = pdf;
// //     onLoadSuccess?.(pdf);
// //   }

// //   // ⭐⭐⭐⭐⭐ 核心跳转函数
// // //   async function jumpToQuote(quote) {

// // //     const pdf = pdfRef.current;
// // //     if (!pdf) return;

// // //     const normalizedQuote = quote.toLowerCase();

// // //     for (let i = 1; i <= pdf.numPages; i++) {

// // //       const page = await pdf.getPage(i);
// // //       const text = await page.getTextContent();

// // //       const pageString = text.items
// // //         .map(item => item.str)
// // //         .join(" ")
// // //         .toLowerCase();

// // //       // ⭐ 用前40字符匹配
// // //       if (pageString.includes(normalizedQuote.slice(0, 40))) {

// // //         pageRefs.current[i - 1]?.scrollIntoView({
// // //           behavior: "smooth",
// // //           block: "start"
// // //         });

// // //         return;
// // //       }
// // //     }

// // //     console.log("Quote not found");
// // //   }
// //   // 放在组件里（jumpToQuote 上面）
// // function normalizeForMatch(s) {
// //   return (s || "")
// //     .toLowerCase()
// //     // 去掉两端各种引号（LLM/你数据里经常带）
// //     .replace(/^[\s"'“”‘’]+/, "")
// //     .replace(/[\s"'“”‘’]+$/, "")
// //     // 统一 smart quotes
// //     .replace(/[‘’]/g, "'")
// //     .replace(/[“”]/g, '"')
// //     // 统一 dash
// //     .replace(/[–—]/g, "-")
// //     // NBSP -> space
// //     .replace(/\u00a0/g, " ")
// //     // 多空格合一
// //     .replace(/\s+/g, " ")
// //     // 断词连字符：visualiza- tion -> visualization
// //     .replace(/-\s+/g, "")
// //     .trim();
// // }

// // async function jumpToQuote(quote) {
// //   const pdf = pdfRef.current;
// //   if (!pdf || !quote) return;

// //   const q = normalizeForMatch(quote);
// //   if (!q) return;

// //   // ✅ 不要只截 40，太短而且容易截到引号/特殊符号
// //   const needle = q.length > 200 ? q.slice(0, 200) : q;

// //   for (let i = 1; i <= pdf.numPages; i++) {
// //     const page = await pdf.getPage(i);
// //     const text = await page.getTextContent();

// //     const pageString = normalizeForMatch(
// //       text.items.map((item) => item.str).join(" ")
// //     );

// //     if (pageString.includes(needle)) {
// //       pageRefs.current[i - 1]?.scrollIntoView({
// //         behavior: "smooth",
// //         block: "start",
// //       });
// //       return;
// //     }
// //   }

// //   console.log("Quote not found");
// // }


// //   // ⭐ 暴露给外部用（关键）
// //   window.jumpToQuote = jumpToQuote;

// //   return (
// //     <div id="viewerContainer">
// //       <Document
// //         file={file}
// //         onLoadSuccess={handleLoadSuccess}
// //         options={options}
// //         className="pdf-document"
// //       >
// //         {Array.from(new Array(numPages), (_, index) => (
// //           <div
// //             key={`pagewrap_${index+1}`}
// //             ref={el => pageRefs.current[index] = el}
// //           >
// //             <Page
// //               pageNumber={index + 1}
// //               width={containerWidth}
// //               renderTextLayer
// //               renderAnnotationLayer
// //             />
// //           </div>
// //         ))}
// //       </Document>
// //     </div>
// //   );
// // }
// import React, { useRef, useEffect, useCallback } from "react";
// import { Document, Page } from "react-pdf";

// import "react-pdf/dist/Page/AnnotationLayer.css";
// import "react-pdf/dist/Page/TextLayer.css";

// export default function PdfViewer({
//   file = "./2208.11144v1.pdf",
//   numPages,
//   onLoadSuccess,
//   containerWidth,
//   options,
// }) {
//   const pdfRef = useRef(null);
//   const pageRefs = useRef([]);
//   const cleanupTimerRef = useRef(null);

//   function handleLoadSuccess(pdf) {
//     pdfRef.current = pdf;
//     onLoadSuccess?.(pdf);
//   }

//   // ======= normalize helpers =======
//   const normalizeForMatch = useCallback((s) => {
//     return (s || "")
//       .toLowerCase()
//       // 去掉两端各种引号（LLM/数据里经常带）
//       .replace(/^[\s"'“”‘’]+/, "")
//       .replace(/[\s"'“”‘’]+$/, "")
//       // 统一 smart quotes
//       .replace(/[‘’]/g, "'")
//       .replace(/[“”]/g, '"')
//       // 统一 dash
//       .replace(/[–—]/g, "-")
//       // NBSP -> space
//       .replace(/\u00a0/g, " ")
//       // 多空格合一
//       .replace(/\s+/g, " ")
//       // 断词连字符：visualiza- tion -> visualization
//       .replace(/-\s+/g, "")
//       .trim();
//   }, []);

//   const clearHighlights = useCallback(() => {
//     document.querySelectorAll(".pdf-quote-highlight").forEach((el) => {
//       el.classList.remove("pdf-quote-highlight");
//     });
//     if (cleanupTimerRef.current) {
//       clearTimeout(cleanupTimerRef.current);
//       cleanupTimerRef.current = null;
//     }
//   }, []);

//   // 等某一页的 textLayer 真正渲染出来（比 requestAnimationFrame 稳）
//   const waitForTextLayer = useCallback((pageWrap, timeout = 1500) => {
//     return new Promise((resolve) => {
//       const start = performance.now();
//       const tick = () => {
//         const layer =
//           pageWrap?.querySelector(".react-pdf__Page__textContent") ||
//           pageWrap?.querySelector(".textLayer");
//         if (layer) return resolve(layer);
//         if (performance.now() - start > timeout) return resolve(null);
//         requestAnimationFrame(tick);
//       };
//       tick();
//     });
//   }, []);

//   // ======= 핵心：跨 span 高亮 =======
//   const highlightOnPage = useCallback(
//     (pageIndex0, quote) => {
//       const pageWrap = pageRefs.current[pageIndex0];
//       if (!pageWrap || !quote) return;

//       const textLayer =
//         pageWrap.querySelector(".react-pdf__Page__textContent") ||
//         pageWrap.querySelector(".textLayer");
//       if (!textLayer) return;

//       const spans = Array.from(textLayer.querySelectorAll("span"));
//       if (!spans.length) return;

//       const target = normalizeForMatch(quote);
//       if (!target) return;

//       // 1) 拼整页字符串 + 记录每个 span 在整页里的范围
//       let full = "";
//       const ranges = spans.map((sp) => {
//         const t = normalizeForMatch(sp.textContent);
//         const start = full.length;
//         full += t + " "; // 加空格防止粘连
//         const end = full.length;
//         return { sp, start, end };
//       });

//       // 2) 用 needle（quote 太长会更难命中，截断更稳）
//       const needle = target.length > 300 ? target.slice(0, 300) : target;
//       const idx = full.indexOf(needle);

//       if (idx < 0) {
//         // 兜底：用前几个关键词染一染（至少能看到大概位置）
//         const words = needle
//           .split(" ")
//           .filter((w) => w.length >= 5)
//           .slice(0, 8);
//         if (!words.length) return;

//         spans.forEach((sp) => {
//           const t = normalizeForMatch(sp.textContent);
//           if (words.some((w) => t.includes(w))) sp.classList.add("pdf-quote-highlight");
//         });
//       } else {
//         const hitStart = idx;
//         const hitEnd = idx + needle.length;

//         ranges.forEach(({ sp, start, end }) => {
//           if (end > hitStart && start < hitEnd) {
//             sp.classList.add("pdf-quote-highlight");
//           }
//         });
//       }

//       // 自动清除（你也可以删掉这一段，让高亮一直留着）
//       cleanupTimerRef.current = setTimeout(() => {
//         clearHighlights();
//       }, 3000);
//     },
//     [normalizeForMatch, clearHighlights]
//   );

//   // ======= 跳转 + 高亮 =======
//   const jumpToQuote = useCallback(
//     async (quote) => {
//       const pdf = pdfRef.current;
//       if (!pdf || !quote) return;

//       clearHighlights();

//       const q = normalizeForMatch(quote);
//       if (!q) return;

//       const needle = q.length > 200 ? q.slice(0, 200) : q;

//       for (let i = 1; i <= pdf.numPages; i++) {
//         const page = await pdf.getPage(i);
//         const text = await page.getTextContent();

//         const pageString = normalizeForMatch(text.items.map((it) => it.str).join(" "));

//         if (pageString.includes(needle)) {
//           // 先滚动
//           const wrap = pageRefs.current[i - 1];
//           wrap?.scrollIntoView({ behavior: "smooth", block: "start" });

//           // 等 textLayer 出来再高亮
//           const layer = await waitForTextLayer(wrap, 1500);
//           if (layer) {
//             highlightOnPage(i - 1, quote);
//           }
//           return;
//         }
//       }

//       console.log("Quote not found");
//     },
//     [normalizeForMatch, clearHighlights, waitForTextLayer, highlightOnPage]
//   );

//   // 更稳地注册到 window（避免每次 render 反复覆盖）
//   useEffect(() => {
//     window.jumpToQuote = jumpToQuote;
//     return () => {
//       delete window.jumpToQuote;
//     };
//   }, [jumpToQuote]);

//   return (
//     <div id="viewerContainer">
//       <Document
//         file={file}
//         onLoadSuccess={handleLoadSuccess}
//         options={options}
//         className="pdf-document"
//       >
//         {Array.from(new Array(numPages), (_, index) => (
//           <div key={`pagewrap_${index + 1}`} ref={(el) => (pageRefs.current[index] = el)}>
//             <Page
//               pageNumber={index + 1}
//               width={containerWidth}
//               renderTextLayer
//               renderAnnotationLayer
//             />
//           </div>
//         ))}
//       </Document>
//     </div>
//   );
// }
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

  /* ================= 清除高亮 ================= */
  const clearHighlights = useCallback(() => {
    document.querySelectorAll(".pdf-quote-highlight").forEach((el) => {
      el.classList.remove("pdf-quote-highlight");
    });
    if (cleanupTimerRef.current) {
      clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }
  }, []);

  /* ================= 等待 textLayer ================= */
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

  /* ================== ⭐ 核心：按 anchor 精准高亮 ================== */
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

  /* ================== 兜底：老的字符串 jump ================== */
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

  /* ================= 注册全局方法 ================= */
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
