import React, { useState, useEffect, useRef, useMemo } from 'react';
import { pdfjs } from 'react-pdf';
import html2canvas from 'html2canvas';
import Toolbar from './Toolbar';
import PdfViewer from './PdfViewer';

//set workerSrc for pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export default function PaperPanel({ onCopySelection, onModeChange, onTempScreenshot, mode }) {
    const [file] = useState('./2208.11144v1.pdf'); 
    const [numPages, setNumPages] = useState(null);
    const [containerWidth, setContainerWidth] = useState(800);
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    let isDrawing = false;
    let startX, startY;

    const options = useMemo(() => ({
        cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
        cMapPacked: true,
        standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
    }), []);

    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                const newWidth = containerRef.current.clientWidth - 40;
                // Only update if width changes more than 1px to avoid frequent re-renders
                setContainerWidth(prev => 
                    Math.abs(prev - newWidth) > 1 ? newWidth : prev
                );
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

    // handle screenshot mode
    useEffect(() => {
        if (mode !== 'screenshot') return;

        const toolbar = document.querySelector('.custom-toolbar');
        const toolbarHeight = toolbar?.offsetHeight || 0;
        const rect = containerRef.current?.getBoundingClientRect();
        
        if (!rect) return;

        const canvas = document.createElement('canvas');
        canvas.width = rect.width;
        canvas.height = rect.height - toolbarHeight;
        canvas.style.position = 'fixed';
        canvas.style.top = (rect.top + toolbarHeight) + 'px';
        canvas.style.left = rect.left + 'px';
        canvas.style.cursor = 'crosshair';
        canvas.style.zIndex = '999';
        document.body.appendChild(canvas);
        canvasRef.current = canvas;

        const ctx = canvas.getContext('2d');

        const handleMouseDown = (e) => {
            // Clear previous selection box before drawing new one
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            isDrawing = true;
            startX = e.clientX - rect.left;
            startY = e.clientY - rect.top - toolbarHeight;
        };

        const handleMouseMove = (e) => {
            if (!isDrawing) return;
            
            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top - toolbarHeight;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = '#dc2626';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            
            const width = currentX - startX;
            const height = currentY - startY;
            ctx.strokeRect(startX, startY, width, height);
        };

        const handleMouseUp = (e) => {
            if (!isDrawing) return;
            isDrawing = false;

            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top - toolbarHeight;

            const x = Math.min(startX, currentX);
            const y = Math.min(startY, currentY);
            const width = Math.abs(currentX - startX);
            const height = Math.abs(currentY - startY);

            if (width > 10 && height > 10) {
                const viewer = document.getElementById('viewerContainer');
                if (viewer) {
                    // Capture viewerContainer with scale=2 for higher clarity
                    const dpr = 2;
                    html2canvas(viewer, {
                        backgroundColor: 'white',
                        scale: dpr,
                        logging: false,
                        useCORS: true,
                        allowTaint: true
                    }).then((fullCanvas) => {
                        // Crop screenshot from selection region (coords need to be multiplied by dpr)
                        const cropped = document.createElement('canvas');
                        cropped.width = width * dpr;
                        cropped.height = height * dpr;
                        const croppedCtx = cropped.getContext('2d');

                        croppedCtx.drawImage(
                            fullCanvas,
                            x * dpr, y * dpr, width * dpr, height * dpr,
                            0, 0, width * dpr, height * dpr
                        );

                        const imageData = cropped.toDataURL('image/png');
                        onTempScreenshot?.(imageData);
                    }).catch(err => {
                        console.error('html2canvas error:', err);
                    });
                }
            }

            // Keep selection box visible until next interaction
            // Don't clear canvas here - it will be cleared on next draw or mode change
        };

        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);

        return () => {
            canvas.removeEventListener('mousedown', handleMouseDown);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseup', handleMouseUp);
            if (canvas.parentNode) canvas.remove();
        };
    }, [mode, onTempScreenshot]);

    return (
        <main className="pdf-panel" ref={containerRef} data-mode={mode}>
            <Toolbar 
                numPages={numPages} 
                mode={mode} 
                onModeChange={onModeChange}
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
