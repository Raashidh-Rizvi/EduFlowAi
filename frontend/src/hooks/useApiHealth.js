import { useEffect, useState } from 'react';
import { probeApiHealth, getLastProbe, onHealthProbe } from '../services/healthService';

const REFRESH_MS = 30000;

/**
 * Live API health for the navbar status chip.
 *
 * Probes `GET /health` on mount, every 30 seconds, and whenever the window
 * regains focus or visibility, so the chip reflects the API's real state and
 * latency instead of a hard-coded "API 8.0: 18ms" that stayed green forever.
 */
export default function useApiHealth() {
  const [probe, setProbe] = useState(getLastProbe);

  useEffect(() => {
    let alive = true;

    const run = () => {
      probeApiHealth().then((result) => {
        if (alive) setProbe(result);
      });
    };

    const unsubscribe = onHealthProbe((result) => {
      if (alive) setProbe(result);
    });

    run();
    const timer = setInterval(run, REFRESH_MS);
    const onFocus = () => run();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      alive = false;
      unsubscribe();
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, []);

  return probe;
}
