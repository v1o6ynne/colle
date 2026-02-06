import React from 'react';
import { Copy, Download, Camera } from 'lucide-react';

export default function Toolbar({ numPages, mode, onModeChange }) {
    const handleModeChange = (newMode) => {
        const finalMode = mode === newMode ? null : newMode;
        onModeChange?.(finalMode);
    };

    return (
        <header className="custom-toolbar">
            <div className="file-info">
                <span className="file-name">Paper Viewer</span>
                <span className="page-count"> {numPages || '--'} Pages</span>
            </div>
            <div className="toolbar-controls">
                <button 
                    onClick={() => handleModeChange('copy')} 
                    className={`icon-btn ${mode === 'copy' ? 'active' : ''}`}
                    title="Copy Mode"
                >
                    <Copy size={18} />
                </button>
                <button 
                    onClick={() => handleModeChange('screenshot')} 
                    className={`icon-btn ${mode === 'screenshot' ? 'active' : ''}`}
                    title="Screenshot Mode"
                >
                    <Camera size={18} />
                </button>
                <button className="icon-btn" title="Download PDF">
                    <Download size={18} />
                </button>
            </div>
        </header>
    );
}
