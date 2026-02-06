import React from 'react';
import { Document, Page } from 'react-pdf';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

export default function PdfViewer({ file = './2208.11144v1.pdf', numPages, onLoadSuccess, containerWidth, options }) {
    return (
        <div id="viewerContainer">
            <Document
                file={file}
                onLoadSuccess={onLoadSuccess}
                options={options}
                className="pdf-document"
            >
                {Array.from(new Array(numPages), (_, index) => (
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
    );
}
