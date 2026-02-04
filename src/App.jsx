import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { FileText, MessageSquare, Settings, Search, Copy, Download, ArrowUp, Highlighter } from 'lucide-react';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import './App.css';

//set workerSrc for pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export default function AcademicAssistant() {
    
    const [file, setFile] = useState('./2208.11144v1.pdf'); 
    const [numPages, setNumPages] = useState(null);
    const [containerWidth, setContainerWidth] = useState(800);
    const [inputText, setInputText] = useState('');
    const containerRef = useRef(null);

    const options = useMemo(() => ({
        cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
        cMapPacked: true,
        standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
    }), []);


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

    // handle copy selected text
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
                        <span className="file-name">Paper Viewer</span>
                        <span className="page-count"> {numPages || '--'} Pages</span>
                    </div>
                    <div className="toolbar-controls">
                        <Search size={18} />
                        <div className="divider"></div>
                        <button onClick={handleCopySelection} className="btn-copy">Copy Selections</button>
                        <button className="btn-download">Download PDF</button>
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
                    <div className="tab active">Assistant</div>
                    <div className="tab">Note</div>
                </header>
                
                <div className="chat-content">
                    <div className="helper-cards">
                        <div className="card">
                            <Highlighter size={20} className="card-icon" />
                            <strong>Highlight and Ask</strong>
                            <p>Select text on the left and click "Copy Selections"</p>
                        </div>
                    </div>
                    <div className="messages-container">
                        <div className="message ai-message">
                            Hello! I'm ready to analyze this paper.
                        </div>
                    </div>
                </div>

                <div className="chat-input-area">
                    <div className="input-container">
                        <textarea 
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Ask questions about the paper..." 
                            rows="1" 
                        />
                        <button className="send-btn"><ArrowUp size={18} /></button>
                    </div>
                </div>
            </aside>
        </div>
    );
}