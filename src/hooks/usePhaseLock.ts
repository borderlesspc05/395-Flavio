import { useCallback, useEffect, useState } from 'react';
import { useCycle } from '../context/CycleContext';
import {
  getPhaseLocksFromCycle,
  lockSprintPhase,
  type PhaseLocks,
  type SprintPhase,
} from '../services/phaseLock';
import { isPhaseLocked } from '../types/phaseLock';

export function usePhaseLock(phase: SprintPhase) {
  const { activeCycle, refreshCycles } = useCycle();
  const [locks, setLocks] = useState<PhaseLocks>(() => getPhaseLocksFromCycle(activeCycle));

  useEffect(() => {
    setLocks(getPhaseLocksFromCycle(activeCycle));
  }, [activeCycle?.id, activeCycle?.phaseLocks]);

  const locked = isPhaseLocked(locks, phase);

  const lockCurrent = useCallback(async () => {
    const next = await lockSprintPhase(activeCycle, phase);
    setLocks(next);
    await refreshCycles?.();
    return next;
  }, [activeCycle, phase, refreshCycles]);

  return {
    locks,
    setLocks,
    locked,
    lockCurrent,
    cycle: activeCycle,
  };
}
