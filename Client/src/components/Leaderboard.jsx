import { formatNumber } from '../utils/formatting';

function Leaderboard({ items, totalPlayers = 0, currentUserRank = 0, currentUsername = '' }) {
  return (
    <section className="panel">
      <div className="panel__head">
        <h2>Global Multiplayer Leaderboard</h2>
        <p>
          {currentUserRank ? `Your global rank: #${currentUserRank}` : 'Live global rankings'}
          {totalPlayers ? ` • ${formatNumber(totalPlayers)} players` : ''}
        </p>
      </div>

      <div className="leaderboard">
        {items.length ? (
          items.map((item, index) => (
            <article
              key={item.username}
              className={`leaderboard-row ${currentUsername && item.username === currentUsername ? 'is-current-user' : ''}`}
            >
              <span className="leaderboard-rank">#{index + 1}</span>
              <span className="leaderboard-name">{item.displayName}</span>
              <span className="leaderboard-meta">Lvl {item.level}</span>
              <strong className="leaderboard-xp">{formatNumber(item.totalXp)} XP</strong>
            </article>
          ))
        ) : (
          <p className="empty-text">No leaderboard entries yet.</p>
        )}
      </div>
    </section>
  );
}

export default Leaderboard;
