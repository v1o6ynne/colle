import React, { useState, useCallback } from 'react';
import { RefreshCw, ChevronDown, ChevronRight, ThumbsUp, ThumbsDown } from 'lucide-react';

const USER_DATA_URL = 'http://localhost:3000/user-data';

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

export default function DiscoveryList() {
  const [discoveries, setDiscoveries] = useState([]);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="discovery-list">
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
      </div>
    </div>
  );
}
