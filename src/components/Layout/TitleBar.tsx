import GitActionMenu from './GitActionMenu';
import ModeToggle from './ModeToggle';

export default function TitleBar() {
  return (
    <div className="title-bar">
      <div className="title-bar-content">
        <div className="title-bar-left" />
        <div className="title-bar-center">
          <ModeToggle />
        </div>
        <div className="title-bar-actions">
          <GitActionMenu />
        </div>
      </div>
    </div>
  );
}
