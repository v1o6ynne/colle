import React from 'react';
import { X } from 'lucide-react';

export default function SelectTextBox({ selectedText, onClear }) {
    if (!selectedText) return null;
    return (
        <div className="selected-text-box">
            <div className="select-box-header">
                <strong>Selected:</strong>
                <button className="clear-btn" onClick={onClear} title="Clear selection">
                    <X size={16} />
                </button>
            </div>
            <p>{selectedText}</p>
        </div>
    );
}
