import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { createEmptyDiagnosticData } from '../constants/diagnosticFlow';
import { SolutionPickPanel } from '../components/SolutionPickPanel';
import { getInitialForm, saveInitialFormDraft } from '../services/initialForm';
import { scheduleMagnusMemorySyncFromForm } from '../services/magnusMemorySync';
import type { InitialFormData } from '../types';
import '../styles/solution-pick.css';

export function SolutionPickPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<InitialFormData>(createEmptyDiagnosticData());

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setUserId(user?.uid ?? null));
    return unsub;
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    getInitialForm(userId)
      .then(({ data: form }) => {
        if (!cancelled) setData(form);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return <p className="form-loading">Carregando Solution Pick…</p>;
  }

  return (
    <div className="solution-pick-page">
      <SolutionPickPanel
        data={data}
        userId={userId}
        onDataChange={setData}
        onSaveDraft={async (payload) => {
          if (!userId) return;
          await saveInitialFormDraft(userId, payload);
          scheduleMagnusMemorySyncFromForm(payload);
        }}
      />
    </div>
  );
}
