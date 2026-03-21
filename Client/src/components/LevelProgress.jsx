import { formatNumber } from '../utils/formatting';

function LevelProgress({ level, levelCap, progressPercent, xpToNextLevel, xpInCurrentLevel }) {
  return (
    <section className="panel level-panel">
      <div className="panel__head">
        <h2>Level Progress</h2>
        <p>
          Level {level} / {levelCap}
        </p>
      </div>
      <div className="level-bar" role="progressbar" aria-valuenow={progressPercent} aria-valuemin="0" aria-valuemax="100">
        <div className="level-bar__fill" style={{ width: `${progressPercent}%` }} />
      </div>
      <div className="level-meta">
        <span>{progressPercent}% in current level</span>
        <span>{formatNumber(xpInCurrentLevel)} XP earned in this level</span>
        <span>{formatNumber(xpToNextLevel)} XP to next level</span>
      </div>
    </section>
  );
}

export default LevelProgress;
