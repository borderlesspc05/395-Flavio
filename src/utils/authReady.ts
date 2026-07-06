import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../config/firebase';

/** Aguarda o Firebase restaurar a sessão antes de rotas protegidas ou chamadas à API. */
export async function waitForAuthenticatedUser(): Promise<User> {
  await auth.authStateReady();

  const existing = auth.currentUser;
  if (existing) {
    await existing.getIdToken();
    return existing;
  }

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      unsub();
      reject(new Error('Sessão não disponível após criar a conta.'));
    }, 10000);

    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      window.clearTimeout(timeout);
      unsub();
      void user.getIdToken().then(() => resolve(user));
    });
  });
}
