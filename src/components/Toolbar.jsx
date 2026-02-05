import React from 'react';
import { Search } from 'lucide-react';

export default function Toolbar({ numPages, onCopySelection }) {
    return (
        <header className="custom-toolbar">
            <div className="file-info">
                <span className="file-name">Paper Viewer</span>
                <span className="page-count"> {numPages || '--'} Pages</span>
            </div>
            <div className="toolbar-controls">
                <Search size={18} />
                <div className="divider"></div>
                <button onClick={onCopySelection} className="btn-copy">Copy Selections</button>
                <button className="btn-download">Download PDF</button>
            </div>
        </header>
    );
}
