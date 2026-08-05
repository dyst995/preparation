import { useState, useMemo, useCallback, useEffect } from 'react';
import flashcardData from './data/flashcards.json';
import Sidebar from './components/Sidebar';
import Flashcard from './components/Flashcard';
import StatsBar from './components/StatsBar';

const STORAGE_KEY = 'flashcards-progress-v1';

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveProgress(progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function App() {
  const [selectedTrack, setSelectedTrack] = useState('all');
  const [selectedChapter, setSelectedChapter] = useState('all');
  const [cardTypeFilter, setCardTypeFilter] = useState('answered');
  const [shuffled, setShuffled] = useState(false);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [progress, setProgress] = useState(loadProgress);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const filteredCards = useMemo(() => {
    let cards = flashcardData.cards;
    if (selectedTrack !== 'all') {
      cards = cards.filter((c) => c.track === selectedTrack);
    }
    if (selectedChapter !== 'all') {
      cards = cards.filter((c) => c.chapter === selectedChapter);
    }
    if (cardTypeFilter === 'answered') {
      cards = cards.filter((c) => c.type === 'qa' || c.type === 'rapid');
    } else if (cardTypeFilter !== 'all') {
      cards = cards.filter((c) => c.type === cardTypeFilter);
    }
    return shuffled ? shuffleArray(cards) : cards;
  }, [selectedTrack, selectedChapter, cardTypeFilter, shuffled]);

  useEffect(() => {
    setIndex(0);
    setFlipped(false);
  }, [selectedTrack, selectedChapter, cardTypeFilter, shuffled]);

  const current = filteredCards[index];

  const markCard = useCallback(
    (status) => {
      if (!current) return;
      setProgress((prev) => {
        const next = { ...prev, [current.id]: status };
        saveProgress(next);
        return next;
      });
      setFlipped(false);
      setIndex((i) => Math.min(i + 1, filteredCards.length - 1));
    },
    [current, filteredCards.length]
  );

  const goNext = () => {
    setFlipped(false);
    setIndex((i) => (i + 1) % filteredCards.length);
  };

  const goPrev = () => {
    setFlipped(false);
    setIndex((i) => (i - 1 + filteredCards.length) % filteredCards.length);
  };

  const knownCount = filteredCards.filter((c) => progress[c.id] === 'known').length;
  const learningCount = filteredCards.filter((c) => progress[c.id] === 'learning').length;

  const handleTrackChange = (track) => {
    setSelectedTrack(track);
    setSelectedChapter('all');
  };

  return (
    <div className="app">
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((o) => !o)}
        tracks={flashcardData.tracks}
        selectedTrack={selectedTrack}
        selectedChapter={selectedChapter}
        onTrackChange={handleTrackChange}
        onChapterChange={setSelectedChapter}
        progress={progress}
        cards={flashcardData.cards}
      />

      <main className={`main ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <header className="header">
          <div>
            <h1>Interview Prep Flashcards</h1>
            <p className="subtitle">
              {flashcardData.totalCards} cards from your learning materials
            </p>
          </div>
          <div className="header-actions">
            <select
              className="type-filter"
              value={cardTypeFilter}
              onChange={(e) => setCardTypeFilter(e.target.value)}
              aria-label="Filter card type"
            >
              <option value="answered">Q&A with answers (default)</option>
              <option value="all">All card types</option>
              <option value="qa">Q&A only</option>
              <option value="rapid">Rapid fire only</option>
            </select>
            <button
              type="button"
              className={`btn btn-ghost ${shuffled ? 'active' : ''}`}
              onClick={() => setShuffled((s) => !s)}
            >
              {shuffled ? 'Shuffled' : 'Shuffle'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                if (confirm('Reset progress for all cards?')) {
                  setProgress({});
                  saveProgress({});
                }
              }}
            >
              Reset progress
            </button>
          </div>
        </header>

        <StatsBar
          total={filteredCards.length}
          known={knownCount}
          learning={learningCount}
          index={index}
        />

        {filteredCards.length === 0 ? (
          <div className="empty">
            <p>No cards in this topic. Pick another chapter.</p>
          </div>
        ) : (
          <>
            <Flashcard
              key={current.id}
              card={current}
              flipped={flipped}
              onFlip={() => setFlipped((f) => !f)}
              progress={progress[current?.id]}
            />

            <div className="controls">
              <button type="button" className="btn btn-nav" onClick={goPrev} aria-label="Previous">
                Previous
              </button>
              <div className="grade-buttons">
                <button
                  type="button"
                  className="btn btn-learning"
                  onClick={() => markCard('learning')}
                  disabled={!flipped}
                >
                  Still learning
                </button>
                <button
                  type="button"
                  className="btn btn-known"
                  onClick={() => markCard('known')}
                  disabled={!flipped}
                >
                  Got it
                </button>
              </div>
              <button type="button" className="btn btn-nav" onClick={goNext} aria-label="Next">
                Next
              </button>
            </div>

            <p className="hint">
              Click the card to flip. Mark after you see the answer.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
