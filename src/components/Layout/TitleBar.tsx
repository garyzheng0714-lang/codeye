import GitActionMenu from './GitActionMenu';

export default function TitleBar() {
  return (
    <div className="title-bar">
      <div className="title-bar-content">
        <div className="title-bar-left">
        </div>
        <div className="title-bar-center">
        </div>
        <div className="title-bar-actions">
          <GitActionMenu />
        </div>
      </div>
    </div>
  );
}
