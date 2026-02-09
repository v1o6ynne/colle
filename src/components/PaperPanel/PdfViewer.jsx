// import React, { useRef } from 'react';
// import { Document, Page } from 'react-pdf';

// import 'react-pdf/dist/Page/AnnotationLayer.css';
// import 'react-pdf/dist/Page/TextLayer.css';

// export default function PdfViewer({
//   file = './2208.11144v1.pdf',
//   numPages,
//   onLoadSuccess,
//   containerWidth,
//   options
// }) {

//   // ⭐ 保存 pdf proxy
//   const pdfRef = useRef(null);

//   // ⭐ 保存每页 DOM
//   const pageRefs = useRef([]);

//   // ⭐ 覆盖 onLoadSuccess
//   function handleLoadSuccess(pdf) {
//     pdfRef.current = pdf;
//     onLoadSuccess?.(pdf);
//   }

//   // ⭐⭐⭐⭐⭐ 核心跳转函数
// //   async function jumpToQuote(quote) {

// //     const pdf = pdfRef.current;
// //     if (!pdf) return;

// //     const normalizedQuote = quote.toLowerCase();

// //     for (let i = 1; i <= pdf.numPages; i++) {

// //       const page = await pdf.getPage(i);
// //       const text = await page.getTextContent();

// //       const pageString = text.items
// //         .map(item => item.str)
// //         .join(" ")
// //         .toLowerCase();

// //       // ⭐ 用前40字符匹配
// //       if (pageString.includes(normalizedQuote.slice(0, 40))) {

// //         pageRefs.current[i - 1]?.scrollIntoView({
// //           behavior: "smooth",
// //           block: "start"
// //         });

// //         return;
// //       }
// //     }

// //     console.log("Quote not found");
// //   }
//   // 放在组件里（jumpToQuote 上面）
// function normalizeForMatch(s) {
//   return (s || "")
//     .toLowerCase()
//     // 去掉两端各种引号（LLM/你数据里经常带）
//     .replace(/^[\s"'“”‘’]+/, "")
//     .replace(/[\s"'“”‘’]+$/, "")
//     // 统一 smart quotes
//     .replace(/[‘’]/g, "'")
//     .replace(/[“”]/g, '"')
//     // 统一 dash
//     .replace(/[–—]/g, "-")
//     // NBSP -> space
//     .replace(/\u00a0/g, " ")
//     // 多空格合一
//     .replace(/\s+/g, " ")
//     // 断词连字符：visualiza- tion -> visualization
//     .replace(/-\s+/g, "")
//     .trim();
// }

// async function jumpToQuote(quote) {
//   const pdf = pdfRef.current;
//   if (!pdf || !quote) return;

//   const q = normalizeForMatch(quote);
//   if (!q) return;

//   // ✅ 不要只截 40，太短而且容易截到引号/特殊符号
//   const needle = q.length > 200 ? q.slice(0, 200) : q;

//   for (let i = 1; i <= pdf.numPages; i++) {
//     const page = await pdf.getPage(i);
//     const text = await page.getTextContent();

//     const pageString = normalizeForMatch(
//       text.items.map((item) => item.str).join(" ")
//     );

//     if (pageString.includes(needle)) {
//       pageRefs.current[i - 1]?.scrollIntoView({
//         behavior: "smooth",
//         block: "start",
//       });
//       return;
//     }
//   }

//   console.log("Quote not found");
// }


//   // ⭐ 暴露给外部用（关键）
//   window.jumpToQuote = jumpToQuote;

//   return (
//     <div id="viewerContainer">
//       <Document
//         file={file}
//         onLoadSuccess={handleLoadSuccess}
//         options={options}
//         className="pdf-document"
//       >
//         {Array.from(new Array(numPages), (_, index) => (
//           <div
//             key={`pagewrap_${index+1}`}
//             ref={el => pageRefs.current[index] = el}
//           >
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

  // ======= normalize helpers =======
  const normalizeForMatch = useCallback((s) => {
    return (s || "")
      .toLowerCase()
      // 去掉两端各种引号（LLM/数据里经常带）
      .replace(/^[\s"'“”‘’]+/, "")
      .replace(/[\s"'“”‘’]+$/, "")
      // 统一 smart quotes
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      // 统一 dash
      .replace(/[–—]/g, "-")
      // NBSP -> space
      .replace(/\u00a0/g, " ")
      // 多空格合一
      .replace(/\s+/g, " ")
      // 断词连字符：visualiza- tion -> visualization
      .replace(/-\s+/g, "")
      .trim();
  }, []);

  const clearHighlights = useCallback(() => {
    document.querySelectorAll(".pdf-quote-highlight").forEach((el) => {
      el.classList.remove("pdf-quote-highlight");
    });
    if (cleanupTimerRef.current) {
      clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }
  }, []);

  // 等某一页的 textLayer 真正渲染出来（比 requestAnimationFrame 稳）
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

  // ======= 핵心：跨 span 高亮 =======
  const highlightOnPage = useCallback(
    (pageIndex0, quote) => {
      const pageWrap = pageRefs.current[pageIndex0];
      if (!pageWrap || !quote) return;

      const textLayer =
        pageWrap.querySelector(".react-pdf__Page__textContent") ||
        pageWrap.querySelector(".textLayer");
      if (!textLayer) return;

      const spans = Array.from(textLayer.querySelectorAll("span"));
      if (!spans.length) return;

      const target = normalizeForMatch(quote);
      if (!target) return;

      // 1) 拼整页字符串 + 记录每个 span 在整页里的范围
      let full = "";
      const ranges = spans.map((sp) => {
        const t = normalizeForMatch(sp.textContent);
        const start = full.length;
        full += t + " "; // 加空格防止粘连
        const end = full.length;
        return { sp, start, end };
      });

      // 2) 用 needle（quote 太长会更难命中，截断更稳）
      const needle = target.length > 300 ? target.slice(0, 300) : target;
      const idx = full.indexOf(needle);

      if (idx < 0) {
        // 兜底：用前几个关键词染一染（至少能看到大概位置）
        const words = needle
          .split(" ")
          .filter((w) => w.length >= 5)
          .slice(0, 8);
        if (!words.length) return;

        spans.forEach((sp) => {
          const t = normalizeForMatch(sp.textContent);
          if (words.some((w) => t.includes(w))) sp.classList.add("pdf-quote-highlight");
        });
      } else {
        const hitStart = idx;
        const hitEnd = idx + needle.length;

        ranges.forEach(({ sp, start, end }) => {
          if (end > hitStart && start < hitEnd) {
            sp.classList.add("pdf-quote-highlight");
          }
        });
      }

      // 自动清除（你也可以删掉这一段，让高亮一直留着）
      cleanupTimerRef.current = setTimeout(() => {
        clearHighlights();
      }, 3000);
    },
    [normalizeForMatch, clearHighlights]
  );

  // ======= 跳转 + 高亮 =======
  const jumpToQuote = useCallback(
    async (quote) => {
      const pdf = pdfRef.current;
      if (!pdf || !quote) return;

      clearHighlights();

      const q = normalizeForMatch(quote);
      if (!q) return;

      const needle = q.length > 200 ? q.slice(0, 200) : q;

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const text = await page.getTextContent();

        const pageString = normalizeForMatch(text.items.map((it) => it.str).join(" "));

        if (pageString.includes(needle)) {
          // 先滚动
          const wrap = pageRefs.current[i - 1];
          wrap?.scrollIntoView({ behavior: "smooth", block: "start" });

          // 等 textLayer 出来再高亮
          const layer = await waitForTextLayer(wrap, 1500);
          if (layer) {
            highlightOnPage(i - 1, quote);
          }
          return;
        }
      }

      console.log("Quote not found");
    },
    [normalizeForMatch, clearHighlights, waitForTextLayer, highlightOnPage]
  );

  // 更稳地注册到 window（避免每次 render 反复覆盖）
  useEffect(() => {
    window.jumpToQuote = jumpToQuote;
    return () => {
      delete window.jumpToQuote;
    };
  }, [jumpToQuote]);

  return (
    <div id="viewerContainer">
      <Document
        file={file}
        onLoadSuccess={handleLoadSuccess}
        options={options}
        className="pdf-document"
      >
        {Array.from(new Array(numPages), (_, index) => (
          <div key={`pagewrap_${index + 1}`} ref={(el) => (pageRefs.current[index] = el)}>
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
