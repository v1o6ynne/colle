import React, { useState, useEffect } from 'react';
import { Highlighter, Image as ImageIcon, X } from 'lucide-react';
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";


const USER_DATA_URL = 'http://localhost:3000/user-data';
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";


export default function HelperCards({ activeTab }) {
    const [flashcards, setFlashcards] = useState([]);
    const [previewImage, setPreviewImage] = useState(null);

    useEffect(() => {
        if (activeTab !== 'Discovery') return;
        fetch('${API_BASE}/user-data')
            .then((res) => res.json())
            .then((data) => setFlashcards(Array.isArray(data.flashcards) ? data.flashcards : []))
            .catch(() => setFlashcards([]));
    }, [activeTab]);

    if (activeTab === 'Assistant') {
        return (
            <div className="helper-cards">
                <div className="card">
                    <div className="card-header">
                        <div className="card-icon-wrapper">
                            <Highlighter size={24} className="card-icon" />
                        </div>
                        <div className="card-text">
                            <h3>Highlight and Ask</h3>
                            <p>Select text or screenshot figure to get instant insights</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (activeTab === 'Discovery') {
        const latestCard = flashcards.length > 0 ? flashcards[flashcards.length - 1] : null;
        const hasImage = latestCard?.imageDataUrl;

        return (
            <div className="helper-cards">
                <div className="card discovery-helper-card">
                    <div className="card-header">
                        <div className="card-icon-wrapper">
                            <ImageIcon size={24} className="card-icon" />
                        </div>
                        <div className="card-text">
                            <h3>Explore Links & Create Visual Cards</h3>
                            <p>Find the most related info of your interest</p>
                        </div>
                    </div>
                    <div className="discovery-helper-thumbnail-wrap">
                        {hasImage ? (
                            <button
                                type="button"
                                className="discovery-helper-thumbnail"
                                onClick={() => setPreviewImage(latestCard.imageDataUrl)}
                                title="View full visual card"
                            >
                                <img src={latestCard.imageDataUrl} alt="Latest visual card" />
                            </button>
                        ) : (
                            <p className="discovery-helper-no-card">No visual card generated yet</p>
                        )}
                    </div>
                </div>
                {previewImage && (
                    <div
                        className="visual-card-overlay"
                        role="dialog"
                        aria-modal="true"
                        onClick={() => setPreviewImage(null)}
                    >
                        <div className="visual-card-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="visual-card-modal-actions">
                                <button
                                    type="button"
                                    className="visual-card-close-btn"
                                    onClick={() => setPreviewImage(null)}
                                    title="Close"
                                >
                                    <X size={26} />
                                </button>
                            </div>
                            <img src={previewImage} alt="Visual card" className="visual-card-image" />
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="helper-cards">
            <div className="card">
                <div className="card-header">
                    <div className="card-icon-wrapper" style={{ background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' }}>
                        <svg size={24} className="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </div>
                    <div className="card-text">
                        <h3>Notes</h3>
                        <p>Save and organize your research notes</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
