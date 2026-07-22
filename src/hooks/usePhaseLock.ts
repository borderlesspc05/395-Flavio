import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCycle } from '../context/CycleContext';
import {
  concludeSprintPhase,
  getPhaseAccess,
  getSprintProgressFromCycle,
  isPhaseEditable,
  reopenSprintPhase,
  type NavSprintPhase,
  type PhaseAccess,
  type PhaseLocks,
  type SprintPhase,
  type SprintProgressState,
} from '../services/phaseLock';

export function usePhaseLock(phase: SprintPhase) {
  const { activeCycle, refreshCycles } = useCycle();
  const [progress, setProgress] = useState<SprintProgressState>(() =>
    getSprintProgressFromCycle(activeCycle),
  );

  useEffect(() => {
    setProgress(getSprintProgressFromCycle(activeCycle));
  }, [
    activeCycle?.id,
    activeCycle?.sprintProgress,
    activeCycle?.phaseLocks,
    activeCycle?.reopenedPhase,
    activeCycle?.phaseEvents?.length,
  ]);

  useEffect(() => {
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<{ cycleId?: string; progress?: SprintProgressState }>).detail;
      if (detail?.cycleId && activeCycle?.id && detail.cycleId !== activeCycle.id) return;
      if (detail?.progress) {
        setProgress(detail.progress);
      } else {
        setProgress(getSprintProgressFromCycle(activeCycle));
      }
    };
    window.addEventListener('mm:phase-locks-changed', onChange);
    return () => window.removeEventListener('mm:phase-locks-changed', onChange);
  }, [activeCycle]);

  const access: PhaseAccess = useMemo(
    () => getPhaseAccess(progress, phase),
    [progress, phase],
  );
  const locked = access === 'completed' || access === 'locked';
  const editable = isPhaseEditable(progress.sprintProgress, phase, progress.reopenedPhase);

  const lockCurrent = useCallback(async () => {
    const result = await concludeSprintPhase(activeCycle, phase);
    setProgress(result.state);
    await refreshCycles?.();
    return result.state.phaseLocks;
  }, [activeCycle, phase, refreshCycles]);

  const concludeCurrent = useCallback(async () => {
    const result = await concludeSprintPhase(activeCycle, phase);
    setProgress(result.state);
    await refreshCycles?.();
    return result;
  }, [activeCycle, phase, refreshCycles]);

  const reopenCurrent = useCallback(
    async (reason?: string) => {
      const result = await reopenSprintPhase(activeCycle, phase, reason);
      setProgress(result.state);
      await refreshCycles?.();
      return result;
    },
    [activeCycle, phase, refreshCycles],
  );

  const setLocks = useCallback((locks: PhaseLocks) => {
    setProgress((prev) => ({ ...prev, phaseLocks: locks }));
  }, []);

  return {
    locks: progress.phaseLocks,
    setLocks,
    locked: locked && access === 'completed',
    /** true quando fase está concluída (somente leitura) */
    completed: access === 'completed',
    /** true quando fase futura inacessível */
    futureLocked: access === 'locked',
    access,
    editable,
    progress,
    setProgress,
    lockCurrent,
    concludeCurrent,
    reopenCurrent,
    cycle: activeCycle,
    currentPhase: progress.sprintProgress as NavSprintPhase,
  };
}
