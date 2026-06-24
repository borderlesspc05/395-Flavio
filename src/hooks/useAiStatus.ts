import { useEffect, useState } from 'react';
import { aiApi } from '../services/api';

export type AiStatusState = {
  /** null enquanto carrega ou se a API não respondeu */
  configured: boolean | null;
  /** Falha de rede, CORS ou servidor offline (não é “IA desligada”) */
  unreachable: boolean;
  loading: boolean;
};

export function useAiStatus(): AiStatusState {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [unreachable, setUnreachable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    aiApi
      .status()
      .then((s) => {
        if (cancelled) return;
        setConfigured(s.configured);
        setUnreachable(false);
      })
      .catch(() => {
        if (cancelled) return;
        setConfigured(null);
        setUnreachable(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    configured,
    unreachable,
    loading: configured === null && !unreachable,
  };
}
