import { useState, useEffect } from 'react';
import { getQuestDetail, getQuestXpOverview } from '../api/rpgApi';
import { formatNumber } from '../utils/formatting';
import { QUEST_ITEMS } from '../constants/rpg';

function QuestDetailPanel({ dateKey, onClose, onEdit, isToday }) {
  const [quest, setQuest] = useState(null);
  const [xpOverview, setXpOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchQuestDetail = async () => {
      try {
        setLoading(true);
        setError('');
        const [questData, xpData] = await Promise.all([
          getQuestDetail(dateKey),
          getQuestXpOverview(dateKey),
        ]);
        setQuest(questData);
        setXpOverview(xpData);
      } catch (err) {
        setError(err.message || 'Failed to load quest details');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestDetail();
  }, [dateKey]);

  if (loading) {
    return (
      <section className="panel quest-detail-panel">
        <div className="panel__head">
          <h2>Quest Details</h2>
          <button type="button" className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>
        <p className="loading">Loading quest details...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="panel quest-detail-panel">
        <div className="panel__head">
          <h2>Quest Details</h2>
          <button type="button" className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>
        <p className="error-text">{error}</p>
      </section>
    );
  }

  if (!quest) {
    return (
      <section className="panel quest-detail-panel">
        <div className="panel__head">
          <h2>Quest Details</h2>
          <button type="button" className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>
        <p className="empty-text">No quest data found</p>
      </section>
    );
  }

  const xpBreakdownEntries = Object.entries(quest.xpBreakdown || {}).map(([key, value]) => {
    let label = key;
    if (key === 'dsaAndLldBonus') label = 'DSA + LLD Bonus';
    if (key === 'projectWork') label = 'Project Work';
    if (key === 'theoryRevision') label = 'Theory Revision';
    if (key === 'mockInterview') label = 'Mock Interview';
    if (key === 'behavioralStories') label = 'Behavioral Stories';
    if (key === 'dsaDifficulty') label = `DSA (${quest.dsaDifficulty})`;
    if (key === 'hours') label = `Hours Logged (${quest.hoursLogged}h)`;

    return { label, value };
  });

  const completedItems = QUEST_ITEMS.filter((item) => quest[item.key]).map((item) => item.label);

  return (
    <section className="panel quest-detail-panel">
      <div className="panel__head">
        <h2>Quest Details</h2>
        <button type="button" className="close-button" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="quest-detail-content">
        <div className="quest-detail-section">
          <h3>Completed Quests</h3>
          {completedItems.length > 0 ? (
            <ul className="completed-items-list">
              {completedItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="empty-text">No quests completed this day</p>
          )}
        </div>

        <div className="quest-detail-section">
          <h3>XP Breakdown</h3>
          {xpBreakdownEntries.length > 0 ? (
            <div className="xp-breakdown-list">
              {xpBreakdownEntries.map(({ label, value }) => (
                <div key={label} className="xp-breakdown-item">
                  <span className="breakdown-label">{label}</span>
                  <span className="breakdown-value">{value} XP</span>
                </div>
              ))}
              <div className="xp-breakdown-item breakdown-total">
                <span className="breakdown-label">Total</span>
                <span className="breakdown-value">{quest.xpEarned} XP</span>
              </div>
            </div>
          ) : (
            <p className="empty-text">No XP earned</p>
          )}
        </div>

        <div className="quest-detail-section">
          <h3>Session Info</h3>
          <div className="session-info">
            <div className="info-item">
              <span>Hours Logged:</span>
              <strong>{quest.hoursLogged}h</strong>
            </div>
            <div className="info-item">
              <span>DSA Difficulty:</span>
              <strong>{quest.dsaDifficulty}</strong>
            </div>
            <div className="info-item">
              <span>Completed:</span>
              <strong>{quest.completed ? 'Yes' : 'No'}</strong>
            </div>
          </div>
        </div>

        {xpOverview && (
          <div className="quest-detail-section">
            <h3>Complete Daily XP Breakdown</h3>
            <div className="xp-breakdown-list">
              {(xpOverview.questItems || []).map((item) => (
                <div key={item.key} className="xp-breakdown-item">
                  <span className="breakdown-label">
                    {item.label}
                    {item.completed ? '' : ' (not completed)'}
                  </span>
                  <span className="breakdown-value">{formatNumber(item.xp || 0)} XP</span>
                </div>
              ))}
              <div className="xp-breakdown-item breakdown-total">
                <span className="breakdown-label">Total</span>
                <span className="breakdown-value">{formatNumber(xpOverview.totalXp || 0)} XP</span>
              </div>
            </div>
          </div>
        )}

        {isToday && (
          <div className="quest-detail-actions">
            <button type="button" className="button button-secondary" onClick={onEdit}>
              Edit Today's Quest
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default QuestDetailPanel;
