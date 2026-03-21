import { DSA_DIFFICULTIES, QUEST_ITEMS } from '../constants/rpg';

function DailyQuestPanel({ dateLabel, quest, xpPreview, onToggle, onHoursChange, onDifficultyChange, onSubmit, isSaving }) {
  return (
    <section className="panel">
      <div className="panel__head">
        <h2>Daily Quest Log</h2>
        <p>{dateLabel}</p>
      </div>

      <div className="quest-grid">
        {QUEST_ITEMS.map((item) => (
          <label key={item.key} className="quest-item">
            <input
              type="checkbox"
              checked={Boolean(quest[item.key])}
              onChange={(event) => onToggle(item.key, event.target.checked)}
            />
            <span>
              <strong>{item.label}</strong>
              <small>{item.helper}</small>
            </span>
          </label>
        ))}
      </div>

      <div className="quest-controls">
        <label className="field">
          <span>Hours logged</span>
          <input
            type="number"
            min="0"
            max="24"
            step="0.5"
            value={quest.hoursLogged}
            onChange={(event) => onHoursChange(event.target.value)}
          />
        </label>

        <label className="field">
          <span>DSA difficulty</span>
          <select
            value={quest.dsaDifficulty}
            onChange={(event) => onDifficultyChange(event.target.value)}
            disabled={!quest.dsa}
          >
            {DSA_DIFFICULTIES.map((difficulty) => (
              <option key={difficulty} value={difficulty}>
                {difficulty}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="quest-footer">
        <p>
          XP preview: <strong>{xpPreview}</strong>
        </p>
        <button type="button" className="button" onClick={onSubmit} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Today'}
        </button>
      </div>
    </section>
  );
}

export default DailyQuestPanel;
