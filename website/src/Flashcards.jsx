import { useCallback, useEffect, useMemo, useState } from "react";

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Flashcards({ deck }) {
  const [order, setOrder] = useState(() => deck.cards.map((_, i) => i));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  /** "code" = show exit code first; "meaning" = show meaning first */
  const [mode, setMode] = useState("code");

  const cards = useMemo(
    () => order.map((i) => deck.cards[i]),
    [deck.cards, order],
  );
  const card = cards[index];
  const total = cards.length;

  const go = useCallback(
    (delta) => {
      setFlipped(false);
      setIndex((i) => (i + delta + total) % total);
    },
    [total],
  );

  const reshuffle = useCallback(() => {
    setOrder(shuffle(deck.cards.map((_, i) => i)));
    setIndex(0);
    setFlipped(false);
  }, [deck.cards]);

  useEffect(() => {
    function onKey(e) {
      if (e.target.closest("input, textarea, select")) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === "ArrowRight" || e.key === "j") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft" || e.key === "k") {
        e.preventDefault();
        go(-1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  if (!card) return <p className="empty">No cards in this deck.</p>;

  const frontLabel = deck.frontLabel || "Prompt";
  const modeForward = deck.modeForward || "Front → back";
  const modeReverse = deck.modeReverse || "Back → front";

  const prompt =
    mode === "code" ? (
      <>
        <span className="fc-label">{frontLabel}</span>
        <strong className="fc-code">{card.front}</strong>
      </>
    ) : (
      <>
        <span className="fc-label">Meaning</span>
        <strong className="fc-meaning-prompt">{card.meaning}</strong>
      </>
    );

  const answer =
    mode === "code" ? (
      <>
        <strong className="fc-meaning">{card.meaning}</strong>
        {card.example && (
          <p className="fc-example">
            <span>Example</span> <code>{card.example}</code>
          </p>
        )}
        {card.notes && <p className="fc-notes">{card.notes}</p>}
      </>
    ) : (
      <>
        <span className="fc-label">{frontLabel}</span>
        <strong className="fc-code">{card.front}</strong>
        {card.example && (
          <p className="fc-example">
            <span>Example</span> <code>{card.example}</code>
          </p>
        )}
        {card.notes && <p className="fc-notes">{card.notes}</p>}
      </>
    );

  return (
    <div className="flashcards">
      <header className="fc-head">
        <div>
          <h1>{deck.title}</h1>
          {deck.subtitle && <p className="fc-sub">{deck.subtitle}</p>}
        </div>
        <p className="fc-progress">
          {index + 1} / {total}
        </p>
      </header>

      <div className="fc-toolbar">
        <div className="fc-modes" role="group" aria-label="Card direction">
          <button
            type="button"
            className={mode === "code" ? "active" : ""}
            onClick={() => {
              setMode("code");
              setFlipped(false);
            }}
          >
            {modeForward}
          </button>
          <button
            type="button"
            className={mode === "meaning" ? "active" : ""}
            onClick={() => {
              setMode("meaning");
              setFlipped(false);
            }}
          >
            {modeReverse}
          </button>
        </div>
        <button type="button" className="fc-shuffle" onClick={reshuffle}>
          Shuffle
        </button>
      </div>

      <button
        type="button"
        className={`fc-card${flipped ? " flipped" : ""}`}
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? "Hide answer" : "Reveal answer"}
      >
        <div className="fc-face fc-front">{prompt}</div>
        <div className="fc-face fc-back">{answer}</div>
      </button>

      <p className="fc-hint">Click the card or press Space to flip · ← → to move</p>

      <div className="fc-nav">
        <button type="button" onClick={() => go(-1)}>
          Previous
        </button>
        <button type="button" className="primary" onClick={() => setFlipped((f) => !f)}>
          {flipped ? "Hide" : "Reveal"}
        </button>
        <button type="button" onClick={() => go(1)}>
          Next
        </button>
      </div>
    </div>
  );
}
