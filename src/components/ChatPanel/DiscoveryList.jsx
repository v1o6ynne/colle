import React, { useState, useCallback, useEffect } from 'react';
import { RefreshCw, ChevronDown, ChevronRight, ThumbsUp, ThumbsDown, Download, X, ImageIcon } from 'lucide-react';

const USER_DATA_URL = 'http://localhost:3000/user-data';
const FLASHCARD_URL = 'http://localhost:3000/flashcard';

function VisualCardModal({ imageDataUrl, onClose, onDownload }) {
  if (!imageDataUrl) return null;
  return (
    <div
      className="visual-card-overlay"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="visual-card-modal" onClick={(e) => e.stopPropagation()}>
        <div className="visual-card-modal-actions">
          <button type="button" className="visual-card-download-btn" onClick={onDownload} title="Download image">
            <Download size={28} />
          </button>
          <button type="button" className="visual-card-close-btn" onClick={onClose} title="Close">
            <X size={28} />
          </button>
        </div>
        <img src={imageDataUrl} alt="Generated visual card" className="visual-card-image" />
      </div>
    </div>
  );
}

function DiscoveryItem({ discovery, discoveryIndex, onLikeChange }) {
  const [expanded, setExpanded] = useState(false);
  const isText = discovery.selectionType === 'text';
  const content = discovery.selectionContent || '';
  const related = discovery.related || { text: '', refs: [] };
  const refs = Array.isArray(related.refs) ? related.refs : [];

  const preview = isText
    ? (content.length > 120 ? content.slice(0, 120) + '…' : content)
    : null;

  return (
    <div className="discovery-item">
      <button
        type="button"
        className="discovery-item-header"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        <span className="discovery-item-label">
          {isText ? 'Selected text' : 'Screenshot'}
        </span>
        {isText && <span className="discovery-item-preview">{preview}</span>}
        {!isText && content && content.startsWith('data:') && (
          <img src={content} alt="Screenshot" className="discovery-item-thumb" />
        )}
      </button>
      {expanded && (
        <div className="discovery-item-body">
          {related.text && (
            <div className="discovery-related-text">{related.text}</div>
          )}
          <ul className="discovery-refs-list">
            {refs.map((ref, refIndex) => (
              <li key={refIndex} className="discovery-ref-item">
                <div className="discovery-ref-content">
                  {ref.sectionRef && (
                    <strong className="discovery-ref-section">{ref.sectionRef}</strong>
                  )}
                  {ref.quote && (
                    <span className="discovery-ref-quote">“{ref.quote}”</span>
                  )}
                </div>
                <div className="discovery-ref-actions">
                  <button
                    type="button"
                    className={`discovery-like-btn ${ref.liked === true ? 'active' : ''}`}
                    onClick={() => onLikeChange(discoveryIndex, refIndex, true)}
                    title="Helpful"
                  >
                    <ThumbsUp size={16} />
                  </button>
                  <button
                    type="button"
                    className={`discovery-like-btn dislike ${ref.liked === false ? 'active' : ''}`}
                    onClick={() => onLikeChange(discoveryIndex, refIndex, false)}
                    title="Not helpful"
                  >
                    <ThumbsDown size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function DiscoveryList({ refreshKey = 0 }) {
  const [discoveries, setDiscoveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [visualCardImage, setVisualCardImage] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(USER_DATA_URL);
      const data = await res.json();
      setDiscoveries(Array.isArray(data.discoveries) ? data.discoveries : []);
    } catch (err) {
      console.error('Discovery refresh:', err);
      setDiscoveries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refreshKey, refresh]);


  const persistDiscoveries = useCallback((updated) => {
    fetch(USER_DATA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'patch', data: { discoveries: updated } })
    }).catch((err) => console.error('Save discoveries:', err));
  }, []);

  const handleLikeChange = useCallback(
    (discoveryIndex, refIndex, liked) => {
      setDiscoveries((prev) => {
        const next = JSON.parse(JSON.stringify(prev));
        const item = next[discoveryIndex];
        if (!item?.related?.refs?.[refIndex]) return prev;
        item.related.refs[refIndex].liked = liked;
        persistDiscoveries(next);
        return next;
      });
    },
    [persistDiscoveries]
  );

  const generateVisualCard = useCallback(async () => {
    setGenerating(true);
    try {
      const noteCards = discoveries.map((d) => {
        const related = d.related || { text: '', refs: [] };
        const refs = Array.isArray(related.refs) ? related.refs : [];
        return {
          highlights: refs.map((r) => ({ text: [r.sectionRef, r.quote].filter(Boolean).join(': ') })),
          userNote: (related.text || '').slice(0, 300),
          screenshotDataUrl: d.selectionType === 'image' ? d.selectionContent : undefined
        };
      });
      const res = await fetch(FLASHCARD_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteCards })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to generate');
      const imageUrl = data.images?.[0];
      if (imageUrl) setVisualCardImage(imageUrl);
    } catch (err) {
      console.error('Generate visual card:', err);
    } finally {
      setGenerating(false);
    }
  }, [discoveries]);

  const closeVisualCard = useCallback(() => setVisualCardImage(null), []);

  const downloadVisualCard = useCallback(() => {
    if (!visualCardImage) return;
    const a = document.createElement('a');
    a.href = visualCardImage;
    a.download = `visual-card-${Date.now()}.png`;
    a.click();
  }, [visualCardImage]);

  return (
    <div className="discovery-list">
      <VisualCardModal
        imageDataUrl={visualCardImage}
        onClose={closeVisualCard}
        onDownload={downloadVisualCard}
      />
      <div className="discovery-list-content">
        {discoveries.length === 0 && !loading && (
          <div className="discovery-empty">
            No discoveries yet. Select text or capture a screenshot, then ask the
            Assistant to populate related content. Click Refresh to load.
          </div>
        )}
        {discoveries.map((d, i) => (
          <DiscoveryItem
            key={i}
            discovery={d}
            discoveryIndex={i}
            onLikeChange={handleLikeChange}
          />
        ))}
      </div>
      <div className="discovery-footer">
        <button
          type="button"
          className="discovery-refresh-btn"
          onClick={refresh}
          disabled={loading}
        >
          <RefreshCw size={18} className={loading ? 'spin' : ''} />
          {loading ? 'Loading…' : 'Refresh'}
        </button>
        <button
          type="button"
          className="discovery-visual-card-btn"
          onClick={generateVisualCard}
          disabled={generating || discoveries.length === 0}
        >
          <ImageIcon size={18} className={generating ? 'spin' : ''} />
          {generating ? 'Generating…' : 'Generate Visual Card'}
        </button>
      </div>
    </div>
  );
}
