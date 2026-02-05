import React, { useState, useEffect, useRef, useMemo } from 'react';
import { pdfjs } from 'react-pdf';
import Toolbar from './Toolbar';
import PdfViewer from './PdfViewer';

//set workerSrc for pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export default function PaperPanel({ onCopySelection }) {
    const [file] = useState('./2208.11144v1.pdf'); 
    const [numPages, setNumPages] = useState(null);
    const [containerWidth, setContainerWidth] = useState(800);
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
            onCopySelection(cleanedText);
        }
    };

    return (
        <main className="pdf-panel" ref={containerRef}>
            <Toolbar numPages={numPages} onCopySelection={handleCopySelection} />
            <PdfViewer 
                file={file}
                numPages={numPages}
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                containerWidth={containerWidth}
                options={options}
            />
        </main>
    );
}
