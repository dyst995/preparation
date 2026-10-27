import { useEffect, useMemo } from "react";
import MarkdownView from "./MarkdownView.jsx";
import { parseQaDocument } from "./qa.js";

export default function QaViewer({
  text,
  questionId,
  onSelectQuestion,
  onBackToIndex,
}) {
  const { intro, questions } = useMemo(() => parseQaDocument(text), [text]);
  const index = questionId
    ? questions.findIndex((q) => q.id === questionId)
    : -1;
  const current = index >= 0 ? questions[index] : null;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [questionId]);

  useEffect(() => {
    if (!current) return;
    function onKey(e) {
      if (e.target.closest("input, textarea, select, button")) return;
      if (e.key === "ArrowRight" || e.key === "j") {
        e.preventDefault();
        if (index < questions.length - 1) onSelectQuestion(questions[index + 1].id);
      } else if (e.key === "ArrowLeft" || e.key === "k") {
        e.preventDefault();
        if (index > 0) onSelectQuestion(questions[index - 1].id);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onBackToIndex();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, index, questions, onSelectQuestion, onBackToIndex]);

  if (!questions.length) {
    return <MarkdownView text={text} />;
  }

  if (!current) {
    return (
      <div className="qa">
        {intro ? <MarkdownView text={intro} /> : null}
        <header className="qa-index-head">
          <h2>Questions</h2>
          <p>
            {questions.length} questions · open one at a time · ← → or j / k to
            move · Esc for index
          </p>
        </header>
        <ol className="qa-index">
          {questions.map((q) => (
            <li key={q.id}>
              <button type="button" onClick={() => onSelectQuestion(q.id)}>
                <span className="qa-id">{q.id}</span>
                <span className="qa-title">{q.title}</span>
                {(q.difficulty || q.category) && (
                  <span className="qa-meta">
                    {[q.difficulty, q.category].filter(Boolean).join(" · ")}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  const prev = index > 0 ? questions[index - 1] : null;
  const next = index < questions.length - 1 ? questions[index + 1] : null;

  return (
    <div className="qa">
      <header className="qa-pager">
        <button type="button" className="qa-link" onClick={onBackToIndex}>
          ← Index
        </button>
        <p className="qa-progress">
          {index + 1} / {questions.length}
        </p>
        <div className="qa-pager-nav">
          <button
            type="button"
            disabled={!prev}
            onClick={() => prev && onSelectQuestion(prev.id)}
          >
            Previous
          </button>
          <button
            type="button"
            className="primary"
            disabled={!next}
            onClick={() => next && onSelectQuestion(next.id)}
          >
            Next
          </button>
        </div>
      </header>
      <MarkdownView text={current.markdown} />
      <footer className="qa-pager qa-pager-bottom">
        <button
          type="button"
          disabled={!prev}
          onClick={() => prev && onSelectQuestion(prev.id)}
        >
          {prev ? `← ${prev.id}` : "Previous"}
        </button>
        <button type="button" className="qa-link" onClick={onBackToIndex}>
          Index
        </button>
        <button
          type="button"
          className="primary"
          disabled={!next}
          onClick={() => next && onSelectQuestion(next.id)}
        >
          {next ? `${next.id} →` : "Next"}
        </button>
      </footer>
    </div>
  );
}
