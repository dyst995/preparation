export default function Flashcard({ card, flipped, onFlip, progress }) {
  if (!card) return null;

  const typeLabel = {
    qa: 'Q&A',
    rapid: 'Rapid fire',
    prompt: 'Practice prompt',
    topic: 'Topic',
  }[card.type] || 'Card';

  return (
    <div className="flashcard-wrap">
      <div className="card-meta">
        <span className="badge track">{card.trackLabel}</span>
        <span className="badge chapter">{card.chapterLabel}</span>
        <span className="badge type">{typeLabel}</span>
        {progress === 'known' && <span className="badge status-known">Known</span>}
        {progress === 'learning' && <span className="badge status-learning">Learning</span>}
      </div>

      <button
        type="button"
        className={`flashcard ${flipped ? 'flipped' : ''}`}
        onClick={onFlip}
        aria-label={flipped ? 'Show question' : 'Show answer'}
      >
        <div className="flashcard-inner">
          <div className="flashcard-face front">
            <span className="face-label">Question</span>
            <p className="card-text">{card.front}</p>
            <span className="tap-hint">Tap to reveal answer</span>
          </div>
          <div className="flashcard-face back">
            <span className="face-label">Answer</span>
            <p className="card-text">{card.back}</p>
            {card.topic && card.topic !== card.chapterLabel && (
              <span className="topic-tag">{card.topic}</span>
            )}
          </div>
        </div>
      </button>
    </div>
  );
}
