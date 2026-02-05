import React, { useState, useEffect, useRef, useMemo } from 'react';
import { pdfjs } from 'react-pdf';
import Toolbar from './Toolbar';
import PdfViewer from './PdfViewer';

//set workerSrc for pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export default function PaperPanel({ onCopySelection, onModeChange }) {
    const [file] = useState('./2208.11144v1.pdf'); 
    const [numPages, setNumPages] = useState(null);
    const [containerWidth, setContainerWidth] = useState(800);
    const [mode, setMode] = useState(null);
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

    // handle text selection in copy mode
    useEffect(() => {
        if (mode !== 'copy') return;

        const handleTextSelection = () => {
            const sel = window.getSelection();
            if (sel && sel.toString().length > 0) {
                const cleanedText = sel.toString().replace(/\s+/g, ' ').trim();
                onCopySelection(cleanedText);
            }
        };

        document.addEventListener('mouseup', handleTextSelection);
        return () => document.removeEventListener('mouseup', handleTextSelection);
    }, [mode, onCopySelection]);

    // handle copy selected text
    const handleCopySelection = () => {
        const sel = window.getSelection();
        if (sel && sel.toString()) {
            const cleanedText = sel.toString().replace(/\s+/g, ' ').trim();
            onCopySelection(cleanedText);
        }
    };

    return (
        <main className="pdf-panel" ref={containerRef} data-mode={mode}>
            <Toolbar 
                numPages={numPages} 
                mode={mode} 
                onModeChange={(newMode) => {
                    setMode(newMode);
                    onModeChange?.(newMode);
                }} 
            />
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
