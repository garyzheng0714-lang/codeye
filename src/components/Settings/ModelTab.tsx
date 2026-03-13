import { MODELS } from '../../data/models';
import { PRICE_TABLE_VERSION } from '../../services/costTracking';

const MODEL_PRICING: Record<string, { input: string; output: string }> = {
  opus: { input: '$15', output: '$75' },
  sonnet: { input: '$3', output: '$15' },
  haiku: { input: '$0.80', output: '$4' },
};

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
                <td>{MODEL_PRICING[m.cliAlias].input}/MTok</td>
                <td>{MODEL_PRICING[m.cliAlias].output}/MTok</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
