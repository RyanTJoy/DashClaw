import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

export function useRealtime(onEvent) {
  const { data: session } = useSession();
  const eventSourceRef = useRef(null);

  useEffect(() => {
    if (!session) return;

    // Use NextAuth session cookie implicitly, or pass x-api-key if we were using a custom fetcher.
    // Standard EventSource only supports GET and cookies, not custom headers.
    // Fortunately, our middleware accepts session cookies for same-origin requests.
    
    const es = new EventSource('/api/stream');
    eventSourceRef.current = es;

    es.onopen = () => {
      // console.log('SSE Connected');
    };

    es.onerror = (err) => {
      // console.error('SSE Error:', err);
      es.close();
    };

    es.addEventListener('action.created', (e) => {
      try {
        const data = JSON.parse(e.data);
        onEvent('action.created', data);
      } catch (err) {
        console.error('SSE Parse Error:', err);
      }
    });

    es.addEventListener('action.updated', (e) => {
      try {
        const data = JSON.parse(e.data);
        onEvent('action.updated', data);
      } catch (err) {
        console.error('SSE Parse Error:', err);
      }
    });

    return () => {
      es.close();
    };
  }, [session, onEvent]);
}
