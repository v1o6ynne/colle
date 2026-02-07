import React from 'react';
import { X } from 'lucide-react';

export default function SelectImagesBox({ screenshotImage, onClear }) {
    if (!screenshotImage) return null;
    return (
        <div className="screenshot-preview-box">
            <div className="selected-box-header">
                <span className="selected-box-title">Selected Image</span>
                <button className="clear-btn" onClick={onClear} title="Clear image">
                    <X size={16} />
                </button>
            </div>
            <img src={screenshotImage} alt="Screenshot" />
        </div>
    );
}
