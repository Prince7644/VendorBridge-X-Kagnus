export default function StatCard({ label, value, hint, muted }) {
  return (
    <div className={`vb-stat${muted ? ' vb-stat-muted' : ''}`}>
      <div className="vb-stat-value">{value}</div>
      <div className="vb-stat-label">{label}</div>
      {hint && <div className="vb-stat-hint">{hint}</div>}
    </div>
  );
}
