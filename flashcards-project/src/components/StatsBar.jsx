export default function StatsBar({ total, known, learning, index }) {
  const pct = total ? Math.round((known / total) * 100) : 0;

  return (
    <div className="stats-bar">
      <div className="stat">
        <span className="stat-label">Card</span>
        <span className="stat-value">
          {total ? index + 1 : 0} / {total}
        </span>
      </div>
      <div className="stat">
        <span className="stat-label">Known</span>
        <span className="stat-value known">{known}</span>
      </div>
      <div className="stat">
        <span className="stat-label">Learning</span>
        <span className="stat-value learning">{learning}</span>
      </div>
      <div className="progress-wrap">
        <div className="progress-bar" style={{ width: `${pct}%` }} />
        <span className="progress-label">{pct}% mastered</span>
      </div>
    </div>
  );
}
