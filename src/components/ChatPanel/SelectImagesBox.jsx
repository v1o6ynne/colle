import React from 'react';

export default function SelectImagesBox({ screenshotImage }) {
    if (!screenshotImage) return null;
    return (
        <div className="screenshot-preview-box">
            <img src={screenshotImage} alt="Screenshot" />
        </div>
    );
}
