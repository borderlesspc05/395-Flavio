import { useState } from 'react';
import { GitBranch, Sparkles, Check, RotateCcw, ArrowDown } from 'lucide-react';
import type { BlueprintPath } from '../constants/blueprintFlow';
import {
  GATE_ZERO_RULE,
  PATH_A_SIGNALS,
  PATH_B_SIGNALS,
} from '../constants/blueprintFlow';
import { FirebaseError } from 'firebase/app';
import { auth } from '../config/firebase';
import { aiApi, type BlueprintGateParsed } from '../services/api';
import {
  clearBlueprintGate,
  saveBlueprintGateSelection,
  saveBlueprintGateSkipped,
  type BlueprintGateDoc,
} from '../services/blueprintGate';

interface GateZeroPanelProps {
  diagnosticContext: string;
  gateDoc: BlueprintGateDoc | null;
  gateLoading: boolean;
  onGateDocChange: (doc: BlueprintGateDoc | null) => void;
  /** Rola até o campo de mensagem (área de chat) */
  onScrollToChat?: () => void;
}

function formatRationaleSnippet(text: string, max = 220) {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export function GateZeroPanel({
  diagnosticContext,
  gateDoc,
  gateLoading,
  onGateDocChange,
  onScrollToChat,
}: GateZeroPanelProps) {
  const [draftPath, setDraftPath] = useState<BlueprintPath | null>(null);
  const [aiParsed, setAiParsed] = useState<BlueprintGateParsed | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localNotice, setLocalNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const user = auth.currentUser;
  const hasSelection = Boolean(gateDoc?.selectedPath);
  const skipped = Boolean(gateDoc?.skipped) && !gateDoc?.selectedPath;
  const showFullPanel = !hasSelection && !skipped;

  const applyAiSuggestion = () => {
    if (aiParsed) setDraftPath(aiParsed.recommendedPath);
  };

  const requestAiSuggestion = async () => {
    if (!diagnosticContext.trim()) {
      setLocalError('Complete o diagnóstico para a IA classificar o Gate Zero.');
      return;
    }
    setAiLoading(true);
    setLocalError(null);
    setLocalNotice(null);
    try {
      const result = await aiApi.blueprintGateSuggest(diagnosticContext);
      setAiParsed(result.parsed);
      setDraftPath(result.parsed.recommendedPath);
      if (result.localFallback) {
        setLocalNotice(
          'O servidor em produção ainda não expõe POST /api/ai/blueprint-gate (deploy antigo). Abaixo vale uma heurística local. No Render: Root Directory = server, deploy a partir do repo atual e teste de novo.'
        );
      }
    } catch (e: unknown) {
      const ax = e as {
        response?: { status?: number; data?: { error?: string; code?: string } };
        message?: string;
      };
      const status = ax.response?.status;
      const serverErr = ax.response?.data?.error;
      const hint =
        serverErr ||
        (typeof ax.message === 'string' && ax.message !== 'Network Error' ? ax.message : '');
      if (status === 404) {
        setLocalError(
          'Rota /api/ai/blueprint-gate não encontrada no servidor. Atualize o deploy da API no Render (pasta server) e tente de novo.'
        );
      } else {
        setLocalError(
          hint
            ? `Não foi possível obter a sugestão da IA: ${hint}. Tente de novo ou escolha o caminho manualmente.`
            : 'Não foi possível obter a sugestão da IA (rede ou servidor). Tente de novo ou escolha o caminho manualmente.'
        );
      }
    } finally {
      setAiLoading(false);
    }
  };

  const confirmPath = async () => {
    if (!user || !draftPath) {
      setLocalError('Escolha Caminho A ou B antes de confirmar.');
      return;
    }
    setSaving(true);
    setLocalError(null);
    try {
      await saveBlueprintGateSelection(user.uid, {
        selectedPath: draftPath,
        aiRecommendedPath: aiParsed?.recommendedPath,
        rationale: aiParsed?.rationale,
      });
      onGateDocChange({
        selectedPath: draftPath,
        aiRecommendedPath: aiParsed?.recommendedPath,
        rationale: aiParsed?.rationale,
        skipped: false,
        confirmedAt: new Date(),
      });
    } catch (e: unknown) {
      if (e instanceof FirebaseError && e.code === 'permission-denied') {
        setLocalError(
          'Permissão negada no Firestore para a coleção blueprintGate. No Firebase Console → Firestore → Regras, permita leitura/escrita no documento com o mesmo ID do seu usuário (veja docs/FIRESTORE-RULES.md).'
        );
      } else if (e instanceof FirebaseError) {
        setLocalError(`Erro ao salvar (${e.code}). Verifique conexão e tente novamente.`);
      } else {
        setLocalError('Erro ao salvar no Firestore. Verifique permissões e conexão.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    if (!user) return;
    setSaving(true);
    setLocalError(null);
    try {
      await saveBlueprintGateSkipped(user.uid);
      onGateDocChange({
        skipped: true,
        confirmedAt: new Date(),
      });
    } catch (e: unknown) {
      if (e instanceof FirebaseError && e.code === 'permission-denied') {
        setLocalError(
          'Permissão negada ao salvar. Ajuste as regras do Firestore para blueprintGate (docs/FIRESTORE-RULES.md).'
        );
      } else {
        setLocalError('Não foi possível salvar. Tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleResetGate = async () => {
    if (!user) return;
    setSaving(true);
    setLocalError(null);
    try {
      await clearBlueprintGate(user.uid);
      setAiParsed(null);
      setDraftPath(null);
      onGateDocChange(null);
    } catch {
      setLocalError('Não foi possível limpar o Gate Zero.');
    } finally {
      setSaving(false);
    }
  };

  if (gateLoading) {
    return (
      <div className="gate-zero-panel gate-zero-panel--loading" role="status">
        <GitBranch size={22} aria-hidden />
        <span>Carregando Gate Zero…</span>
      </div>
    );
  }

  if (hasSelection && gateDoc?.selectedPath) {
    const label =
      gateDoc.selectedPath === 'A'
        ? 'Caminho A — treinamento se aplica'
        : 'Caminho B — treinamento não se aplica (sistêmico)';
    return (
      <div className="gate-zero-panel gate-zero-panel--compact">
        <div className="gate-zero-surface">
          <div className="gate-zero-compact-main">
            <div className="gate-zero-hero-icon-wrap" aria-hidden>
              <GitBranch size={22} />
            </div>
            <div>
              <strong>Gate Zero confirmado</strong>
              <p className="gate-zero-kicker" style={{ marginTop: '0.35rem', marginBottom: 0 }}>
                {label}
              </p>
              {gateDoc.rationale ? (
                <p className="gate-zero-compact-rationale">{formatRationaleSnippet(gateDoc.rationale)}</p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            className="gate-zero-link-button"
            onClick={() => void handleResetGate()}
            disabled={saving}
          >
            <RotateCcw size={14} aria-hidden />
            Alterar decisão
          </button>
        </div>
      </div>
    );
  }

  if (skipped) {
    return (
      <div className="gate-zero-panel gate-zero-panel--skipped">
        <div className="gate-zero-surface">
          <p>
            <strong>Gate Zero adiado.</strong> Você pode conversar livremente; para ancorar o MM
            Blueprint, defina o caminho quando quiser.
          </p>
          <button
            type="button"
            className="gate-zero-secondary-button"
            onClick={() => void handleResetGate()}
            disabled={saving}
          >
            Retomar Gate Zero
          </button>
        </div>
      </div>
    );
  }

  if (!showFullPanel) return null;

  return (
    <section className="gate-zero-panel gate-zero-panel--full" aria-labelledby="gate-zero-title">
      <div className="gate-zero-surface">
        <header className="gate-zero-hero">
          <div className="gate-zero-hero-icon-wrap" aria-hidden>
            <GitBranch size={24} />
          </div>
          <div>
            <span className="gate-zero-eyebrow">Onda 2 · Decisão-mestre</span>
            <h2 id="gate-zero-title" className="gate-zero-title">
              2.0 Gate Zero
            </h2>
            <p className="gate-zero-kicker">MM Blueprint — bifurcação antes do Outcome Forge</p>
            <p className="gate-zero-rule">{GATE_ZERO_RULE}</p>
          </div>
          <div className="gate-zero-hero-meta" aria-hidden>
            <span className="gate-zero-step-pill">Etapa</span>
            <span className="gate-zero-step-num">2.0</span>
          </div>
        </header>

        <div className="gate-zero-columns">
          <div className="gate-zero-column gate-zero-column--a">
            <span className="gate-zero-watermark" aria-hidden>
              A
            </span>
            <h3 className="gate-zero-column-title">Caminho A — treinamento se aplica</h3>
            <ul className="gate-zero-list">
              {PATH_A_SIGNALS.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          <div className="gate-zero-column gate-zero-column--b">
            <span className="gate-zero-watermark" aria-hidden>
              B
            </span>
            <h3 className="gate-zero-column-title">Caminho B — treinamento não se aplica</h3>
            <ul className="gate-zero-list">
              {PATH_B_SIGNALS.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="gate-zero-rail">
          <button
            type="button"
            className="gate-zero-ai-button"
            onClick={() => void requestAiSuggestion()}
            disabled={aiLoading || saving}
          >
            <Sparkles size={17} aria-hidden />
            {aiLoading ? 'Consultando IA…' : 'Sugerir caminho com IA'}
          </button>
          <p className="gate-zero-rail-hint">
            A IA lê o canvas 1.1–1.5 e recomenda um caminho; você confirma ou corrige antes do
            Blueprint.
          </p>
        </div>

        {aiParsed && (
          <div className="gate-zero-ai-box">
            <div className="gate-zero-ai-label">Leitura da IA</div>
            <p className="gate-zero-ai-question">{aiParsed.questionForUser}</p>
            <p className="gate-zero-ai-verdict">
              <strong>Sugestão:</strong> Caminho {aiParsed.recommendedPath}
            </p>
            <p className="gate-zero-ai-rationale">{aiParsed.rationale}</p>
            <button type="button" className="gate-zero-link-button" onClick={applyAiSuggestion}>
              Aplicar sugestão na seleção abaixo
            </button>
          </div>
        )}

        <fieldset className="gate-zero-path-pick">
          <legend className="sr-only">Escolha do caminho</legend>
          <label className={`gate-zero-path-card ${draftPath === 'A' ? 'is-selected' : ''}`}>
            <input
              type="radio"
              name="blueprint-path"
              value="A"
              checked={draftPath === 'A'}
              onChange={() => setDraftPath('A')}
            />
            <span className="gate-zero-path-letter">A</span>
            <span className="gate-zero-path-label">Caminho A</span>
            <span className="gate-zero-path-hint">People Sprint · Outcome Forge clássico (ATD)</span>
          </label>
          <label className={`gate-zero-path-card ${draftPath === 'B' ? 'is-selected' : ''}`}>
            <input
              type="radio"
              name="blueprint-path"
              value="B"
              checked={draftPath === 'B'}
              onChange={() => setDraftPath('B')}
            />
            <span className="gate-zero-path-letter">B</span>
            <span className="gate-zero-path-label">Caminho B</span>
            <span className="gate-zero-path-hint">Redesign sistêmico · sem treino como eixo</span>
          </label>
        </fieldset>

        {onScrollToChat && (
          <div className="gate-zero-scroll-row">
            <button type="button" className="gate-zero-scroll-to-chat" onClick={onScrollToChat}>
              <ArrowDown size={15} aria-hidden />
              Ir para a conversa
            </button>
          </div>
        )}

        {localNotice && (
          <p className="gate-zero-notice" role="status">
            {localNotice}
          </p>
        )}

        {localError && (
          <p className="gate-zero-error" role="alert">
            {localError}
          </p>
        )}

        <div className="gate-zero-footer">
          <button
            type="button"
            className="gate-zero-primary-button"
            onClick={() => void confirmPath()}
            disabled={saving || !draftPath}
          >
            <Check size={17} aria-hidden />
            Confirmar e seguir para o Blueprint
          </button>
          <button
            type="button"
            className="gate-zero-secondary-button"
            onClick={() => void handleSkip()}
            disabled={saving}
          >
            Decidir depois
          </button>
        </div>
      </div>
    </section>
  );
}
