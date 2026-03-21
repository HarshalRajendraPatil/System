function Leaderboard({ items }) {
  return (
    <section className="panel">
      <div className="panel__head">
        <h2>Leaderboard</h2>
        <p>Single-player now, multiplayer-ready later</p>
      </div>

      <div className="leaderboard">
        {items.length ? (
          items.map((item, index) => (
            <article key={item.username} className="leaderboard-row">
              <span className="leaderboard-rank">#{index + 1}</span>
              <span className="leaderboard-name">{item.displayName}</span>
              <span className="leaderboard-meta">Lvl {item.level}</span>
              <strong className="leaderboard-xp">{item.totalXp} XP</strong>
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
