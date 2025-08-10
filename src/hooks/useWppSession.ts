import { useEffect, useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';

type Status = 'starting' | 'qr' | 'ready' | 'authenticated' | 'disconnected' | 'error' | 'exited';

export function useWppSession(sessionId: string, serverBase = '') {
  const [status, setStatus] = useState<Status>('starting');
  const [qr, setQr] = useState<string | null>(null);

  const socket: Socket = useMemo(() => {
    const url = serverBase ? `${serverBase}/wpp` : '/wpp';
    return io(url, { transports: ['websocket'], path: undefined });
  }, [serverBase]);

  useEffect(() => {
    if (!sessionId) return;
    const onStatus = (p: any) => { if (p.sessionId === sessionId) setStatus(p.status); };
    const onQr = (p: any) => { if (p.sessionId === sessionId) setQr(p.qr || null); };

    socket.emit('subscribe', { sessionId });
    socket.on('status', onStatus);
    socket.on('qr', onQr);

    // Snapshot inicial via REST (opcional, para garantir)
    fetch(`${serverBase}/wpp/session/${sessionId}/status`).then(r => r.json()).then(d => {
      if (d?.status) setStatus(d.status);
    });
    fetch(`${serverBase}/wpp/session/${sessionId}/qr`).then(r => r.json()).then(d => {
      if (d?.qr) setQr(d.qr);
    });

    return () => {
      socket.emit('unsubscribe', { sessionId });
      socket.off('status', onStatus);
      socket.off('qr', onQr);
    };
  }, [socket, sessionId, serverBase]);

  return { status, qr };
}
