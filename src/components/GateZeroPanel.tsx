import { useEffect, useState } from 'react';
import axios from 'axios';
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
import { syncMagnusMemoryAfterGate } from '../services/magnusMemorySync';

interface GateZeroPanelProps {
  diagnosticContext: string;
  gateDoc: BlueprintGateDoc | null;
  gateLoading: boolean;
  onGateDocChange: (doc: BlueprintGateDoc | null) => void;
  /** Rola até o campo de mensagem (área de chat) */
  onScrollToChat?: () => void;
  /** Mostra o painel completo de escolhas mesmo já existindo decisão (refazer Gate Zero). */
  revisionMode?: boolean;
  /** Chamado após confirmar caminho ou “decidir depois”, para o pai abrir só o chat. */
  onCommitted?: () => void;
  /** Voltar ao chat sem alterar a decisão guardada. */
  onCancelRevision?: () => void;
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
  revisionMode = false,
  onCommitted,
  onCancelRevision,
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
  const showFullPanel = revisionMode || (!hasSelection && !skipped);

  useEffect(() => {
    if (!revisionMode) return;
    if (gateDoc?.selectedPath) {
      setDraftPath(gateDoc.selectedPath);
    } else if (skipped) {
      setDraftPath(null);
    }
  }, [revisionMode, gateDoc?.selectedPath, skipped]);

  const applyAiSuggestion = () => {
    if (aiParsed) setDraftPath(aiParsed.recommendedPath);
  };

  const requestAiSuggestion = async () => {
    if (!diagnosticContext.trim()) {
      setLocalError('Complete o diagnóstico para a IA sugerir o caminho.');
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
      if (axios.isAxiosError(e)) {
        const status = e.response?.status;
        const data = e.response?.data as Record<string, unknown> | undefined;
        const serverErr = typeof data?.error === 'string' ? data.error : '';
        const serverMsg = typeof data?.message === 'string' ? data.message : '';
        const serverCode = typeof data?.code === 'string' ? data.code : '';

        let detail = serverErr || serverMsg;
        if (!detail && e.code === 'ECONNABORTED') {
          detail =
            'Tempo esgotado — a API ou a OpenRouter demoraram. Tente de novo em instantes (cold start no Render pode levar ~1 min).';
        }
        if (!detail && e.message === 'Network Error') {
          detail =
            'Sem resposta do servidor (URL da API, CORS ou rede). Confira VITE_API_BASE_URL no Netlify e se CORS_ORIGIN no Render inclui o domínio do site.';
        }
        if (!detail && status) {
          detail = `HTTP ${status}`;
        }
        if (!detail) {
          detail = e.message || 'Erro desconhecido na chamada à API';
        }
        const suffix = serverCode ? ` [${serverCode}]` : '';

        if (status === 404) {
          setLocalError(
            'Rota /api/ai/blueprint-gate não encontrada no servidor. Atualize o deploy da API no Render (Root Directory = server) e tente de novo.'
          );
        } else {
          setLocalError(
            `Não foi possível obter a sugestão da IA: ${detail}${suffix}. Tente de novo ou escolha o caminho manualmente.`
          );
        }
      } else {
        const msg = e instanceof Error ? e.message : String(e);
        setLocalError(
          `Não foi possível obter a sugestão da IA: ${msg}. Tente de novo ou escolha o caminho manualmente.`
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
      await syncMagnusMemoryAfterGate(draftPath, {
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
      onCommitted?.();
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
      onCommitted?.();
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
      setLocalError('Não foi possível limpar a escolha de caminho.');
    } finally {
      setSaving(false);
    }
  };

  if (gateLoading) {
    return (
      <div className="gate-zero-panel gate-zero-panel--loading" role="status">
        <GitBranch size={22} aria-hidden />
        <span>Carregando escolha de caminho…</span>
      </div>
    );
  }

  if (hasSelection && gateDoc?.selectedPath && !revisionMode) {
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
              <strong>Caminho confirmado</strong>
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

  if (skipped && !revisionMode) {
    return (
      <div className="gate-zero-panel gate-zero-panel--skipped">
        <div className="gate-zero-surface">
          <p>
            <strong>Escolha adiada.</strong> Você pode conversar livremente; para ancorar o plano de Design, defina o
            caminho quando quiser.
          </p>
          <button
            type="button"
            className="gate-zero-secondary-button"
            onClick={() => void handleResetGate()}
            disabled={saving}
          >
            Retomar escolha de caminho
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
              2.0 Escolha de caminho
            </h2>
            <p className="gate-zero-kicker">Bifurcação antes do plano de ação — treinamento ou sistêmico</p>
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
            A IA lê o canvas 1.1–1.5 e recomenda um caminho; você confirma ou corrige antes de seguir no Design.
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
          {revisionMode && onCancelRevision ? (
            <button
              type="button"
              className="gate-zero-secondary-button gate-zero-footer-cancel"
              onClick={() => onCancelRevision()}
              disabled={saving}
            >
              Voltar ao chat sem alterar
            </button>
          ) : null}
          <button
            type="button"
            className="gate-zero-primary-button"
            onClick={() => void confirmPath()}
            disabled={saving || !draftPath}
          >
            <Check size={17} aria-hidden />
            {revisionMode ? 'Salvar decisão e voltar ao chat' : 'Confirmar e seguir para o Design'}
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
