import axios from 'axios';

export function readApiErrorMessage(err: unknown, fallback = 'Erro inesperado. Tente novamente.'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string; message?: string } | undefined;
    return data?.error ?? data?.message ?? fallback;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function isLlmNotConfiguredApiError(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false;
  const data = err.response?.data as { code?: string } | undefined;
  return data?.code === 'LLM_NOT_CONFIGURED' || err.response?.status === 503;
}
