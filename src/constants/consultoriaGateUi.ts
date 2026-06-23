/** Persiste se o utilizador vê o Gate Zero ou o chat (legado — sempre chat). */
const PREFIX = 'mm_consultoria_gate_ui:v1:';

export function consultoriaGateUiKey(uid: string): string {
  return `${PREFIX}${uid}`;
}

export function readConsultoriaGateUiPhase(_uid: string): 'gate' | 'chat' {
  return 'chat';
}

export function writeConsultoriaGateUiPhase(uid: string, _phase: 'gate' | 'chat'): void {
  try {
    localStorage.setItem(consultoriaGateUiKey(uid), 'chat');
  } catch {
    /* ignore quota / private mode */
  }
}

export function resolveConsultoriaUiPhase(
  _uid: string | undefined,
  _gateDoc: { selectedPath?: 'A' | 'B'; skipped?: boolean } | null
): 'gate' | 'chat' {
  return 'chat';
}
