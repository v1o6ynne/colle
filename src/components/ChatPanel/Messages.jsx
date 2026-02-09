// // import React from 'react';
// // import ReactMarkdown from 'react-markdown';

// // export default function Messages({ activeTab, messages = [] }) {
// //   if (activeTab === 'Assistant') {
// //     return (
// //       <div className="messages-container">
// //         {messages.map((m, idx) => (
// //           <div
// //             key={idx}
// //             className={`message ${m.role === 'assistant' ? 'ai-message' : 'user-message'}`}
// //           >
// //             {m.role === 'assistant' ? (
// //               <ReactMarkdown
// //                 components={{
// //                   p: ({ children }) => <p style={{ margin: '8px 0' }}>{children}</p>,
// //                   ul: ({ children }) => <ul style={{ margin: '8px 0 8px 18px' }}>{children}</ul>,
// //                   li: ({ children }) => <li style={{ margin: '4px 0' }}>{children}</li>,
// //                 }}
// //               >
// //                 {m.text}
// //               </ReactMarkdown>
// //             ) : (
// //               m.text
// //             )}
// //           </div>
// //         ))}
// //       </div>
// //     );
// //   }

// //   if (activeTab === 'Discovery') {
// //     return (
// //       <div className="messages-container">
// //         <div style={{ color: '#6b7280', fontSize: '13px', padding: '20px', textAlign: 'center' }}>
// //           No figures selected
// //         </div>
// //       </div>
// //     );
// //   }

// //   return (
// //     <div className="messages-container">
// //       <div style={{ color: '#6b7280', fontSize: '13px', padding: '20px', textAlign: 'center' }}>
// //         No notes yet
// //       </div>
// //     </div>
// //   );
// // }
// import React, { useCallback } from "react";
// import ReactMarkdown from "react-markdown";

// const USER_DATA_URL = "http://localhost:3000/user-data";

// export default function Messages({ activeTab, messages = [] }) {
//   const jumpToContextFromMessage = useCallback(async (m) => {
//     const refs = Array.isArray(m?.refs) ? m.refs : [];
//     if (!refs.length) return;

//     // 优先 text，其次 screenshot（你也可以改成优先 screenshot）
//     const textRef = refs.find((r) => r?.anchor?.type === "text");
//     const imgRef = refs.find((r) => r?.anchor?.type === "screenshot");
//     const ref = textRef || imgRef;
//     if (!ref?.id) return;

//     try {
//       const res = await fetch(USER_DATA_URL);
//       const data = await res.json();

//       if (ref.anchor?.type === "text") {
//         const hit = (data.highlights || []).find((h) => h.id === ref.id);
//         if (hit?.text) {
//           window.jumpToQuote?.(hit.text); // ✅ 回到 PDF 选中文本
//         }
//         return;
//       }

//       if (ref.anchor?.type === "screenshot") {
//         const shot = (data.screenshots || []).find((s) => s.id === ref.id);
//         if (shot?.imageDataUrl) {
//           window.openContextImage?.(shot.imageDataUrl); // ✅ 弹出当时截图
//         }
//       }
//     } catch (e) {
//       console.error("jumpToContextFromMessage failed:", e);
//     }
//   }, []);

//   if (activeTab === "Assistant") {
//     return (
//       <div className="messages-container">
//         {messages.map((m, idx) => {
//           const hasRefs = Array.isArray(m?.refs) && m.refs.length > 0;

//           return (
//             <div
//               key={idx}
//               className={`message ${m.role === "assistant" ? "ai-message" : "user-message"} ${
//                 hasRefs ? "clickable-context" : ""
//               }`}
//               title={hasRefs ? "Click to jump back to the context" : ""}
//               onClick={hasRefs ? () => jumpToContextFromMessage(m) : undefined}
//               role={hasRefs ? "button" : undefined}
//               tabIndex={hasRefs ? 0 : undefined}
//               onKeyDown={
//                 hasRefs
//                   ? (e) => {
//                       if (e.key === "Enter") jumpToContextFromMessage(m);
//                     }
//                   : undefined
//               }
//             >
//               {m.role === "assistant" ? (
//                 <ReactMarkdown
//                   components={{
//                     p: ({ children }) => <p style={{ margin: "8px 0" }}>{children}</p>,
//                     ul: ({ children }) => <ul style={{ margin: "8px 0 8px 18px" }}>{children}</ul>,
//                     li: ({ children }) => <li style={{ margin: "4px 0" }}>{children}</li>,
//                   }}
//                 >
//                   {m.text}
//                 </ReactMarkdown>
//               ) : (
//                 m.text
//               )}
//             </div>
//           );
//         })}
//       </div>
//     );
//   }

//   if (activeTab === "Discovery") {
//     return (
//       <div className="messages-container">
//         <div style={{ color: "#6b7280", fontSize: "13px", padding: "20px", textAlign: "center" }}>
//           No figures selected
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="messages-container">
//       <div style={{ color: "#6b7280", fontSize: "13px", padding: "20px", textAlign: "center" }}>
//         No notes yet
//       </div>
//     </div>
//   );
// }
import React, { useCallback } from "react";
import ReactMarkdown from "react-markdown";

const USER_DATA_URL = "http://localhost:3000/user-data";

export default function Messages({ activeTab, messages = [] }) {
  const jumpToContextFromMessage = useCallback(async (m) => {
    const refs = Array.isArray(m?.refs) ? m.refs : [];
    if (!refs.length) return;

    // ✅ 更鲁棒：别强依赖 ref.anchor.type
    const ref = refs.find((r) => r?.anchor?.type === "text")
      || refs.find((r) => r?.anchor?.type === "screenshot")
      || refs[0];

    if (!ref?.id) return;

    try {
      const res = await fetch(USER_DATA_URL);
      const data = await res.json();

      // ✅ 先按 highlight 查（有就当 text）
      const hit = (data.highlights || []).find((h) => h.id === ref.id);
      if (hit) {
        if (hit?.anchor?.pageNumber) {
          // ✅ 最稳：按 anchor 精准回跳 + 高亮
          window.highlightByAnchor?.(hit.anchor);
          return;
        }
        // 兜底：老数据才用字符串
        if (hit?.text) window.jumpToQuote?.(hit.text);
        return;
      }

      // ✅ 再查 screenshot
      const shot = (data.screenshots || []).find((s) => s.id === ref.id);
      if (shot?.imageDataUrl) {
        window.openContextImage?.(shot.imageDataUrl);
      }
    } catch (e) {
      console.error("jumpToContextFromMessage failed:", e);
    }
  }, []);

  if (activeTab === "Assistant") {
    return (
      <div className="messages-container">
        {messages.map((m, idx) => {
          const hasRefs = Array.isArray(m?.refs) && m.refs.length > 0;

          return (
            <div
              key={idx}
              className={`message ${m.role === "assistant" ? "ai-message" : "user-message"} ${
                hasRefs ? "clickable-context" : ""
              }`}
              title={hasRefs ? "Click to jump back to the context" : ""}
              onClick={hasRefs ? () => jumpToContextFromMessage(m) : undefined}
              role={hasRefs ? "button" : undefined}
              tabIndex={hasRefs ? 0 : undefined}
              onKeyDown={
                hasRefs
                  ? (e) => {
                      if (e.key === "Enter") jumpToContextFromMessage(m);
                    }
                  : undefined
              }
            >
              {m.role === "assistant" ? (
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p style={{ margin: "8px 0" }}>{children}</p>,
                    ul: ({ children }) => <ul style={{ margin: "8px 0 8px 18px" }}>{children}</ul>,
                    li: ({ children }) => <li style={{ margin: "4px 0" }}>{children}</li>,
                  }}
                >
                  {m.text}
                </ReactMarkdown>
              ) : (
                m.text
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (activeTab === "Discovery") {
    return (
      <div className="messages-container">
        <div style={{ color: "#6b7280", fontSize: "13px", padding: "20px", textAlign: "center" }}>
          No figures selected
        </div>
      </div>
    );
  }

  return (
    <div className="messages-container">
      <div style={{ color: "#6b7280", fontSize: "13px", padding: "20px", textAlign: "center" }}>
        No notes yet
      </div>
    </div>
  );
}
