import { MODELS } from '../../data/models';
import { PRICE_TABLE_VERSION } from '../../services/costTracking';

export default function ModelTab() {
  return (
    <>
      <div className="settings-section">
        <label className="settings-label">Model Pricing Reference</label>
        <span className="settings-hint">Price table v{PRICE_TABLE_VERSION}</span>
        <table className="settings-table">
          <thead>
            <tr>
              <th>Model</th>
              <th>Input</th>
              <th>Output</th>
            </tr>
          </thead>
          <tbody>
            {MODELS.map((m) => (
              <tr key={m.id}>
                <td>{m.shortLabel}</td>
                <td>{m.id === 'claude-opus-4-6' ? '$15' : m.id === 'claude-sonnet-4-6' ? '$3' : '$0.80'}/MTok</td>
                <td>{m.id === 'claude-opus-4-6' ? '$75' : m.id === 'claude-sonnet-4-6' ? '$15' : '$4'}/MTok</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
