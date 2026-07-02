import axios from 'axios';
import { api } from './api';

export interface PasswordResetResult {
  ok: boolean;
  message: string;
}

export async function requestPasswordReset(email: string): Promise<PasswordResetResult> {
  try {
    const { data } = await api.post<PasswordResetResult>('/api/auth/password-reset', { email });
    return data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 429) {
      const body = err.response.data as { error?: string; retryAfterSeconds?: number };
      const retry = body.retryAfterSeconds;
      const minutes = retry ? Math.max(1, Math.ceil(retry / 60)) : undefined;
      throw new Error(
        body.error ??
          (minutes
            ? `Muitas tentativas. Aguarde cerca de ${minutes} minuto(s) e tente novamente.`
            : 'Muitas tentativas. Aguarde alguns minutos e tente novamente.')
      );
    }
    if (axios.isAxiosError(err) && err.response?.status === 400) {
      const body = err.response.data as { error?: string };
      throw new Error(body.error ?? 'Informe um email válido.');
    }
    throw new Error('Não foi possível enviar o email de recuperação. Tente novamente em instantes.');
  }
}
