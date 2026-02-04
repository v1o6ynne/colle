import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { FileText, MessageSquare, Settings, Search, Copy, Download, ArrowUp, Highlighter } from 'lucide-react';

// 必须引入官方样式：这是解决对齐问题的核心基础
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import './App.css';

// 设置 PDF.js Worker 路径
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function AcademicAssistant() {
    // 默认加载 public 文件夹下的 pdf
    const [file, setFile] = useState('./2208.11144v1.pdf'); 
    const [numPages, setNumPages] = useState(null);
    const [containerWidth, setContainerWidth] = useState(800);
    const [inputText, setInputText] = useState('');
    const containerRef = useRef(null);

    // 解决“文字层变短”：补全字体测量数据
    const options = useMemo(() => ({
        cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
        cMapPacked: true,
        standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
    }), []);

    // 动态监听宽度，不使用 CSS 的 width: 100%
    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.clientWidth - 40);
            }
        };
        const resizeObserver = new ResizeObserver(updateWidth);
        if (containerRef.current) resizeObserver.observe(containerRef.current);
        updateWidth();
        return () => resizeObserver.disconnect();
    }, []);

    // 复制选区到聊天框
    const handleCopySelection = () => {
        const sel = window.getSelection();
        if (sel && sel.toString()) {
            const cleanedText = sel.toString().replace(/\s+/g, ' ').trim();
            setInputText((prev) => prev + `"${cleanedText}" `);
        }
    };

    return (
        <div className="app-container">
            <nav className="side-nav">
                <div className="logo">α</div>
                <div className="nav-icons">
                    <FileText className="active" />
                    <MessageSquare />
                    <Settings />
                </div>
            </nav>

            <main className="pdf-panel" ref={containerRef}>
                <header className="custom-toolbar">
                    <div className="file-info">
                        <span className="file-name">Academic Viewer</span>
                        <span className="page-count">共 {numPages || '--'} 页</span>
                    </div>
                    <div className="toolbar-controls">
                        <Search size={18} />
                        <div className="divider"></div>
                        <button onClick={handleCopySelection} className="btn-copy">复制选区</button>
                        <button className="btn-download">下载 PDF</button>
                    </div>
                </header>
                
                <div id="viewerContainer">
                    <Document
                        file={file}
                        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                        options={options}
                        className="pdf-document"
                    >
                        {Array.from(new Array(numPages), (el, index) => (
                            <Page 
                                key={`page_${index + 1}`}
                                pageNumber={index + 1}
                                width={containerWidth}
                                renderTextLayer={true}
                                renderAnnotationLayer={true}
                            />
                        ))}
                    </Document>
                </div>
            </main>

            <aside className="chat-panel">
                <header className="chat-header">
                    <div className="tab active">助手</div>
                    <div className="tab">笔记</div>
                </header>
                
                <div className="chat-content">
                    <div className="helper-cards">
                        <div className="card">
                            <Highlighter size={20} className="card-icon" />
                            <strong>划选并提问</strong>
                            <p>选中左侧文字后点击“复制选区”</p>
                        </div>
                    </div>
                    <div className="messages-container">
                        <div className="message ai-message">
                            你好！我已经准备好分析这篇论文了。
                        </div>
                    </div>
                </div>

                <div className="chat-input-area">
                    <div className="input-container">
                        <textarea 
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="询问关于论文的问题..." 
                            rows="1" 
                        />
                        <button className="send-btn"><ArrowUp size={18} /></button>
                    </div>
                </div>
            </aside>
        </div>
    );
}