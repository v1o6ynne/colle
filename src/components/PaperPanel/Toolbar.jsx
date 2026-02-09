import React, { useRef } from 'react';
import { Copy, Camera, Upload } from 'lucide-react';

export default function Toolbar({ numPages, mode, onModeChange, activeTab, onUploadPdf }) {
    const fileInputRef = useRef(null);
    const isAssistantTab = activeTab === 'Assistant';
    const disabledTitle = 'Select and ask function only supported in Assistant mode';
    const handleModeChange = (newMode) => {
        const finalMode = mode === newMode ? null : newMode;
        onModeChange?.(finalMode);
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        const chosen = e.target.files?.[0];
        if (chosen && chosen.type === 'application/pdf') {
            onUploadPdf?.(chosen);
        }
        e.target.value = '';
    };

    return (
        <header className="custom-toolbar">
            <div className="file-info">
                <span className="file-name">Colle: A Visual Memory of Every Paper you read</span>
                <span className="page-count"> {numPages || '--'} Pages</span>
            </div>
            <div className="toolbar-controls">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    className="toolbar-file-input"
                    onChange={handleFileChange}
                    aria-hidden="true"
                    tabIndex={-1}
                />
                <button
                    type="button"
                    className="toolbar-upload-btn"
                    onClick={handleUploadClick}
                    title="Upload a paper PDF"
                >
                    <Upload size={18} />
                    <span>Upload a paper PDF</span>
                </button>
                <span
                    className={`icon-btn-wrap ${!isAssistantTab ? 'tooltip-disabled' : ''}`}
                    data-tooltip={isAssistantTab ? 'Copy Mode' : disabledTitle}
                >
                    <button 
                        onClick={() => handleModeChange('copy')} 
                        className={`icon-btn ${mode === 'copy' ? 'active' : ''}`}
                        disabled={!isAssistantTab}
                    >
                        <Copy size={18} />
                    </button>
                </span>
                <span
                    className={`icon-btn-wrap ${!isAssistantTab ? 'tooltip-disabled' : ''}`}
                    data-tooltip={isAssistantTab ? 'Screenshot Mode' : disabledTitle}
                >
                    <button 
                        onClick={() => handleModeChange('screenshot')} 
                        className={`icon-btn ${mode === 'screenshot' ? 'active' : ''}`}
                        disabled={!isAssistantTab}
                    >
                        <Camera size={18} />
                    </button>
                </span>
            </div>
        </header>
    );
}
