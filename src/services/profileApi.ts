import { api } from './api';

export interface MeProfile {
  userId: string;
  email: string;
  displayName: string;
  photoURL: string | null;
}

export const profileApi = {
  get: () => api.get<MeProfile>('/api/me').then((r) => r.data),

  uploadPhoto: (dataUrl: string, email?: string) =>
    api.post<{ ok: boolean; photoURL: string }>('/api/me/photo', { dataUrl, email }).then((r) => r.data),
};
