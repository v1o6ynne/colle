import React from 'react';
import Toolbar from './PaperPanel/Toolbar';
import PdfViewer from './PaperPanel/PdfViewer';
import usePaperPanel from './PaperPanel/usePaperPanel';

export default function PaperPanel({ onCopySelection, onModeChange, onTempScreenshot, mode }) {
    const { file, numPages, setNumPages, containerWidth, containerRef, options } = usePaperPanel({ onCopySelection, onTempScreenshot, mode });

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
