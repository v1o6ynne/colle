import { useState, useEffect, useRef, useMemo } from 'react';
import { pdfjs } from 'react-pdf';
import html2canvas from 'html2canvas';

// set workerSrc for pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export default function usePaperPanel({
  onCopySelection,
  onTempScreenshot,
  onPaperTextExtracted,
  mode,
  selectedText,
  screenshotImage,
  screenshotClearTick,
}) {
  const [file] = useState('./2208.11144v1.pdf');
  const [numPages, setNumPages] = useState(null);
  const onPaperTextExtractedRef = useRef(onPaperTextExtracted);
  useEffect(() => {
    onPaperTextExtractedRef.current = onPaperTextExtracted;
  }, [onPaperTextExtracted]);
  const [containerWidth, setContainerWidth] = useState(800);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0 });
  const lastRectRef = useRef(null);
  const textRangeRef = useRef(null);
  const onTempScreenshotRef = useRef(onTempScreenshot);

  useEffect(() => {
    onTempScreenshotRef.current = onTempScreenshot;
  }, [onTempScreenshot]);

  const options = useMemo(() => ({
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
  }), []);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const newWidth = containerRef.current.clientWidth - 40;
        setContainerWidth((prev) => (Math.abs(prev - newWidth) > 1 ? newWidth : prev));
      }
    };
    const resizeObserver = new ResizeObserver(updateWidth);
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    updateWidth();
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (mode !== 'copy') return;

    const handleTextSelection = () => {
      const sel = window.getSelection();
      if (!sel || sel.toString().length === 0) return;
      const viewer = document.getElementById('viewerContainer');
      if (!viewer) return;
      const anchorInViewer = viewer.contains(sel.anchorNode);
      const focusInViewer = viewer.contains(sel.focusNode);
      if (!anchorInViewer || !focusInViewer) return;

      const cleanedText = sel.toString().replace(/\s+/g, ' ').trim();
      if (!cleanedText) return;

      textRangeRef.current = sel.getRangeAt(0).cloneRange();
      onCopySelection?.(cleanedText);
    };

    document.addEventListener('mouseup', handleTextSelection);
    return () => document.removeEventListener('mouseup', handleTextSelection);
  }, [mode, onCopySelection]);

  useEffect(() => {
    if (mode !== 'copy') return;

    const handleFocusOut = () => {
      if (!textRangeRef.current) return;

      const activeEl = document.activeElement;
      const isEditableElement = activeEl?.tagName === 'INPUT' || 
                                activeEl?.tagName === 'TEXTAREA' ||
                                activeEl?.contentEditable === 'true';
      
      // 焦点离开输入框时，立即恢复 PDF 文字选区
      if (!isEditableElement) {
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(textRangeRef.current);
        }
      }
    };

    document.addEventListener('focus', handleFocusOut, true);
    return () => document.removeEventListener('focus', handleFocusOut, true);
  }, [mode]);

  useEffect(() => {
    if (!selectedText) {
      textRangeRef.current = null;
      const sel = window.getSelection();
      if (sel) sel.removeAllRanges();
    }
  }, [selectedText]);



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

    const drawRect = (x, y, width, height) => {
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x, y, width, height);
    };

    const redrawCanvas = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (lastRectRef.current) {
        const { x, y, width, height } = lastRectRef.current;
        drawRect(x, y, width, height);
      }
    };

    const handleMouseDown = (e) => {
      redrawCanvas();
      isDrawingRef.current = true;
      startRef.current.x = e.clientX - rect.left;
      startRef.current.y = e.clientY - rect.top - toolbarHeight;
    };

    const handleMouseMove = (e) => {
      if (!isDrawingRef.current) return;
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top - toolbarHeight;

      redrawCanvas();
      const width = currentX - startRef.current.x;
      const height = currentY - startRef.current.y;
      drawRect(startRef.current.x, startRef.current.y, width, height);
    };

    const handleMouseUp = (e) => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;

      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top - toolbarHeight;

      const x = Math.min(startRef.current.x, currentX);
      const y = Math.min(startRef.current.y, currentY);
      const width = Math.abs(currentX - startRef.current.x);
      const height = Math.abs(currentY - startRef.current.y);

      if (width > 10 && height > 10) {
        lastRectRef.current = { x, y, width, height };
        redrawCanvas();

        const viewer = document.getElementById('viewerContainer');
        if (viewer) {
          const dpr = 2;
          html2canvas(viewer, {
            backgroundColor: 'white',
            scale: dpr,
            logging: false,
            useCORS: true,
            allowTaint: true,
          }).then((fullCanvas) => {
            const cropped = document.createElement('canvas');
            cropped.width = width * dpr;
            cropped.height = height * dpr;
            const croppedCtx = cropped.getContext('2d');

            croppedCtx.drawImage(
              fullCanvas,
              x * dpr, y * dpr, width * dpr, height * dpr,
              0, 0, width * dpr, height * dpr,
            );

            const imageData = cropped.toDataURL('image/png');
            onTempScreenshotRef.current?.(imageData);
          }).catch((err) => console.error('html2canvas error:', err));
        }
      }
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
  }, [mode]);

  useEffect(() => {
    if (mode !== 'screenshot') {
      lastRectRef.current = null;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [mode]);

  useEffect(() => {
    if (!screenshotImage) {
      lastRectRef.current = null;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [screenshotImage]);

  // Extract full text from the same PDF used by PdfViewer and pass to parent (for paperText / discover-related)
  useEffect(() => {
    if (!file || !numPages || !onPaperTextExtractedRef.current) return;

    let cancelled = false;
    const load = async () => {
      try {
        const doc = await pdfjs.getDocument(file).promise;
        if (cancelled) return;
        let fullText = '';
        for (let n = 1; n <= numPages; n++) {
          if (cancelled) return;
          const page = await doc.getPage(n);
          const content = await page.getTextContent();
          const pageText = content.items.map((item) => item.str || '').join(' ');
          fullText += (fullText ? '\n\n' : '') + pageText;
        }
        if (!cancelled && onPaperTextExtractedRef.current) {
          onPaperTextExtractedRef.current(fullText);
        }
      } catch (err) {
        if (!cancelled) console.error('PDF text extraction:', err);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [file, numPages]);

  useEffect(() => {
    if (screenshotClearTick === 0) return;
    lastRectRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [screenshotClearTick]);

  return {
    file,
    numPages,
    setNumPages,
    containerWidth,
    containerRef,
    canvasRef,
    options,
  };
}