export default function Sidebar({
  open,
  onToggle,
  tracks,
  selectedTrack,
  selectedChapter,
  onTrackChange,
  onChapterChange,
  progress,
  cards,
}) {
  const activeTrack = tracks.find((t) => t.id === selectedTrack);

  const getChapterProgress = (trackId, chapterId) => {
    const chapterCards = cards.filter((c) => c.track === trackId && c.chapter === chapterId);
    const known = chapterCards.filter((c) => progress[c.id] === 'known').length;
    return { known, total: chapterCards.length };
  };

  return (
    <>
      <button
        type="button"
        className="sidebar-toggle"
        onClick={onToggle}
        aria-label={open ? 'Close sidebar' : 'Open sidebar'}
      >
        {open ? 'Hide topics' : 'Topics'}
      </button>

      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Topics</h2>
        </div>

        <nav className="topic-nav">
          <button
            type="button"
            className={`topic-item track-item ${selectedTrack === 'all' ? 'active' : ''}`}
            onClick={() => {
              onTrackChange('all');
              onChapterChange('all');
            }}
          >
            <span>All topics</span>
            <span className="count">{cards.length}</span>
          </button>

          {tracks.map((track) => {
            const trackKnown = cards
              .filter((c) => c.track === track.id)
              .filter((c) => progress[c.id] === 'known').length;
            const expanded = selectedTrack === track.id;

            return (
              <div key={track.id} className="track-group">
                <button
                  type="button"
                  className={`topic-item track-item ${expanded ? 'active' : ''}`}
                  onClick={() => {
                    onTrackChange(track.id);
                    onChapterChange('all');
                  }}
                >
                  <span>{track.label}</span>
                  <span className="count">
                    {trackKnown}/{track.count}
                  </span>
                </button>

                {expanded && (
                  <div className="chapter-list">
                    <button
                      type="button"
                      className={`topic-item chapter-item ${selectedChapter === 'all' ? 'active' : ''}`}
                      onClick={() => onChapterChange('all')}
                    >
                      <span>All chapters</span>
                      <span className="count">{track.count}</span>
                    </button>
                    {track.chapters.map((ch) => {
                      const { known, total } = getChapterProgress(track.id, ch.id);
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          className={`topic-item chapter-item ${selectedChapter === ch.id ? 'active' : ''}`}
                          onClick={() => onChapterChange(ch.id)}
                        >
                          <span>{ch.label}</span>
                          <span className="count">
                            {known}/{total}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
