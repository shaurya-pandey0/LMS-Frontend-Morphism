export default function DailyLogHistory({ logs = [], loading, error, onEdit, onDelete }) {
  return (
    <div className="card" id="card-daily-log-history">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h2 className="daily-log-card__title" style={{ margin: 0 }}>Historical Daily Logs</h2>
        <span className="text-sm text-secondary">{logs.length} entries</span>
      </div>

      {loading ? (
        <div className="txn-empty">Loading log history…</div>
      ) : error ? (
        <div role="alert" className="form-helper form-helper--error">{error}</div>
      ) : logs.length === 0 ? (
        <div className="txn-empty">No daily logs recorded yet.</div>
      ) : (
        <div className="history-list">
          {logs.map((log) => (
            <div key={log.id} className="history-item">
              <div>
                <div className="history-item__date">{log.date}</div>
                <div className="history-item__details">
                  {log.sleepHours != null && <span className="history-item__chip">Sleep: {log.sleepHours} hrs</span>}
                  {log.stepTarget != null && <span className="history-item__chip">Step target: {log.stepTarget}</span>}
                  {log.waterIntake != null && <span className="history-item__chip">Water: {log.waterIntake} mL</span>}
                  {log.dayType && <span className="history-item__chip">Day: {log.dayType}</span>}
                  {log.sleepQuality != null && <span className="history-item__chip">Quality: {log.sleepQuality}/5</span>}
                  {log.stressLevel != null && <span className="history-item__chip">Stress: {log.stressLevel}/5</span>}
                  {log.energyLevel != null && <span className="history-item__chip">Energy: {log.energyLevel}/5</span>}
                  {log.productivityLevel != null && <span className="history-item__chip">Productivity: {log.productivityLevel}/5</span>}
                  {Array.isArray(log.meals) && log.meals.length > 0 && (
                    <span className="history-item__chip">Meals: {log.meals.length}</span>
                  )}
                </div>
              </div>
              <div className="history-item__actions">
                <button
                  type="button"
                  className="btn btn--secondary"
                  style={{ padding: '4px 12px', fontSize: 'var(--text-xs)' }}
                  onClick={() => onEdit(log)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn--secondary"
                  style={{ padding: '4px 12px', fontSize: 'var(--text-xs)', color: 'var(--clay-700)' }}
                  onClick={() => onDelete(log.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
