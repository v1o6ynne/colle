import React from 'react';
import { X } from 'lucide-react';

export default function SelectImagesBox({ screenshotImage, onClear }) {
    if (!screenshotImage) return null;
    return (
        <div className="screenshot-preview-box">
            <button className="clear-btn" onClick={onClear} title="Clear image">
                <X size={16} />
            </button>
            <img src={screenshotImage} alt="Screenshot" />
        </div>
    );
}
