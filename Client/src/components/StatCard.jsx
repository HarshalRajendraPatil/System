function StatCard({ label, value, helper }) {
  return (
    <article className="stat-card">
      <p className="stat-card__label">{label}</p>
      <p className="stat-card__value">{value}</p>
      {helper ? <p className="stat-card__helper">{helper}</p> : null}
    </article>
  );
}

export default StatCard;
