import React from 'react';

export default function SelectTextBox({ selectedText }) {
    if (!selectedText) return null;
    return (
        <div className="selected-text-box">
            <strong>Selected:</strong>
            <p>{selectedText}</p>
        </div>
    );
}
