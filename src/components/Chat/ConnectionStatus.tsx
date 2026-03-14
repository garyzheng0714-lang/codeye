import { useState, useEffect } from 'react';
import { getOrCreateWs } from '../../services/websocket';

type Status = 'connected' | 'connecting' | 'disconnected';

export default function ConnectionStatus() {
  const [status, setStatus] = useState<Status>(
    window.electronAPI ? 'connected' : 'connecting'
  );

  useEffect(() => {
    if (window.electronAPI) {
      return;
    }

    function check() {
      const ws = getOrCreateWs();
      if (!ws) {
        setStatus('disconnected');
        return;
      }
      if (ws.readyState === WebSocket.OPEN) setStatus('connected');
      else if (ws.readyState === WebSocket.CONNECTING) setStatus('connecting');
      else setStatus('disconnected');
    }

    check();
    const id = setInterval(check, 3000);
    return () => clearInterval(id);
  }, []);

  if (status === 'connected') return null;

  return (
    <div className={`connection-status connection-status--${status}`}>
      <span className="connection-dot" />
      <span>{status === 'connecting' ? 'Connecting...' : 'Disconnected'}</span>
    </div>
  );
}
