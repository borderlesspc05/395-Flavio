import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { ArrowUpRight, CalendarDays } from 'lucide-react';
import { auth } from '../config/firebase';
import { createEmptyDiagnosticData } from '../constants/diagnosticFlow';
import { DailyProgressChecklist } from '../components/DailyProgressChecklist';
import { ViewTransitionLink } from '../components/navigation/ViewTransitionLink';
import { useLocale } from '../context/LocaleContext';
import { getInitialForm, saveInitialFormDraft } from '../services/initialForm';
import { actionCanvasesApi, objectivesApi } from '../services/api';
import {
  parseDailyProgressChecklist,
  DAILY_PROGRESS_CHECKLIST_KEY,
} from '../services/dailyProgressChecklist';
import { computeDailyProgressStats } from '../services/dailyProgressStats';
import type { ActionCanvas, InitialFormData, Objective } from '../types';
import '../styles/daily-progress-checklist.css';

const LOCALE_TAG: Record<string, string> = {
  pt: 'pt-BR',
  en: 'en-US',
  es: 'es-ES',
};

export function DailyChecklistPage() {
  const { locale } = useLocale();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<InitialFormData>(createEmptyDiagnosticData());
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [canvases, setCanvases] = useState<ActionCanvas[]>([]);
  const [loadSessionKey, setLoadSessionKey] = useState(0);

  const checklist = useMemo(
    () => parseDailyProgressChecklist(data[DAILY_PROGRESS_CHECKLIST_KEY]),
    [data]
  );
  const stats = useMemo(() => computeDailyProgressStats(checklist), [checklist]);

  const todayLabel = useMemo(() => {
    const tag = LOCALE_TAG[locale] ?? 'pt-BR';
    return new Intl.DateTimeFormat(tag, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date());
  }, [locale]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setUserId(user?.uid ?? null));
    return unsub;
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      getInitialForm(userId),
      objectivesApi.list().catch(() => []),
      actionCanvasesApi.list().catch(() => []),
    ])
      .then(([form, objs, canvasRes]) => {
        if (cancelled) return;
        setData(form.data);
        const objList = Array.isArray(objs) ? objs : objs?.items ?? [];
        setObjectives(objList);
        const canvasList = Array.isArray(canvasRes)
          ? canvasRes
          : (canvasRes as { items?: ActionCanvas[] } | null)?.items ?? [];
        setCanvases(canvasList);
        setLoadSessionKey((key) => key + 1);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (loading) return;
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, [loading]);

  if (loading) {
    return (
      <div className="daily-checklist-page" aria-busy="true">
        <div className="daily-checklist-skeleton daily-checklist-skeleton--hero" />
        <div className="daily-checklist-skeleton-row">
          <div className="daily-checklist-skeleton" />
          <div className="daily-checklist-skeleton" />
          <div className="daily-checklist-skeleton" />
        </div>
        <div className="daily-checklist-skeleton daily-checklist-skeleton--wide" />
      </div>
    );
  }

  return (
    <div className={`daily-checklist-page${ready ? ' is-ready' : ''}`}>
      <div className="daily-checklist-page-bg" aria-hidden>
        <div className="daily-checklist-glow daily-checklist-glow--1" />
        <div className="daily-checklist-glow daily-checklist-glow--2" />
        <div className="daily-checklist-grain" />
      </div>

      <header className="daily-checklist-hero">
        <div className="daily-checklist-hero__top">
          <span className="daily-checklist-hero__eyebrow">Acompanhamento</span>
          <time className="daily-checklist-hero__date" dateTime={new Date().toISOString().slice(0, 10)}>
            <CalendarDays size={14} aria-hidden />
            <span>{todayLabel}</span>
          </time>
        </div>

        <div className="daily-checklist-hero__body">
          <div className="daily-checklist-hero__copy">
            <h1 className="daily-checklist-hero__title">Checklist diário</h1>
            <p className="daily-checklist-hero__lede">
              Ritual de atualização ligado ao projeto. Cada item aponta para Design, Difusão ou
              Domínio e alimenta as estatísticas do MID.
            </p>
          </div>

          <aside className="daily-checklist-hero__aside" aria-label="Progresso de hoje">
            <div
              className="daily-checklist-hero__progress"
              style={{ '--hero-progress': `${stats.todayPercent}%` } as React.CSSProperties}
            >
              <span className="daily-checklist-hero__progress-value">{stats.todayPercent}%</span>
              <span className="daily-checklist-hero__progress-label">hoje</span>
              <span className="daily-checklist-hero__progress-track" aria-hidden />
            </div>
            <p className="daily-checklist-hero__count">
              {stats.todayDone} de {stats.todayTotal} itens
            </p>
            <ViewTransitionLink to="/dashboard/inicio" className="daily-checklist-hero__mid-link">
              Ver no MID
              <ArrowUpRight size={14} aria-hidden />
            </ViewTransitionLink>
          </aside>
        </div>
      </header>

      <DailyProgressChecklist
        data={data}
        onDataChange={setData}
        canvases={canvases}
        objectives={objectives}
        showStats
        hideSectionHeader
        persistSessionKey={loadSessionKey}
        onSaveDraft={async (payload) => {
          if (!userId) return;
          await saveInitialFormDraft(userId, payload);
        }}
      />
    </div>
  );
}
