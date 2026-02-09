import React from 'react';
import { Copy, Download, Camera } from 'lucide-react';

export default function Toolbar({ numPages, mode, onModeChange, activeTab }) {
    const isAssistantTab = activeTab === 'Assistant';
    const disabledTitle = 'Select and ask function only supported in Assistant mode';
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
                <button className="icon-btn" title="Download PDF">
                    <Download size={18} />
                </button>
            </div>
        </header>
    );
}
