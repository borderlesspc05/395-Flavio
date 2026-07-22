import axios from 'axios';

const API_BASE_URL =
  import.meta.env.DEV && import.meta.env.VITE_USE_LOCAL_API !== 'false'
    ? ''
    : (import.meta.env.VITE_API_BASE_URL || 'https://three95-flavio-fcha.onrender.com');

export type MemberPortalProgress = 0 | 25 | 50 | 75 | 100;

export interface MemberPortalTask {
  canvasId: string;
  deliveryId: string;
  itemId: string;
  initiative: string;
  deliveryTitle: string;
  deliveryPrazo?: string;
  texto: string;
  progresso: MemberPortalProgress;
  prazo?: string;
  done: boolean;
}

export interface MemberPortalPayload {
  member: {
    id: string;
    name: string;
    email?: string;
    role: string;
    department?: string;
    status?: string;
  };
  tasks: MemberPortalTask[];
}

const portalHttp = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

export const memberPortalApi = {
  load: (memberId: string, token: string) =>
    portalHttp
      .get(`/api/member-portal/${memberId}`, { params: { token } })
      .then((r) => r.data as MemberPortalPayload),

  updateProgress: (
    memberId: string,
    token: string,
    body: {
      canvasId: string;
      deliveryId: string;
      itemId: string;
      progresso: MemberPortalProgress;
    }
  ) =>
    portalHttp
      .patch(`/api/member-portal/${memberId}/tasks`, { ...body, token })
      .then((r) => r.data as { task: MemberPortalTask }),
};
