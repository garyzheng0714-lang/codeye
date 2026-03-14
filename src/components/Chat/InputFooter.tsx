import ModelConfigSelector from './ModelConfigSelector';
import SessionStats from './SessionStats';

export default function InputFooter() {
  return (
    <div className="input-footer">
      <div className="input-footer-left" />
      <div className="input-footer-right">
        <ModelConfigSelector />
        <SessionStats />
      </div>
    </div>
  );
}
