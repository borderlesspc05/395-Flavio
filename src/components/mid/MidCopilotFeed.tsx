import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { MidDashboardData } from '../../types/mid';
import { buildMidCopilotMessages } from '../../utils/midCopilot';

interface Props {
  data: MidDashboardData;
}

const TONE_LABEL: Record<string, string> = {
  intro: 'leitura do ciclo',
  positive: 'destaque',
  attention: 'atenção',
  action: 'próximo passo',
  tip: 'dica',
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function MidCopilotFeed({ data }: Props) {
  const messages = useMemo(() => buildMidCopilotMessages(data), [data]);
  const messagesKey = messages.map((m) => m.id).join('|');

  const [shown, setShown] = useState(0);
  const [partial, setPartial] = useState('');
  const [typing, setTyping] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setShown(0);
    setPartial('');
    setTyping(true);

    (async () => {
      for (let i = 0; i < messages.length; i += 1) {
        setTyping(true);
        await wait(i === 0 ? 450 : 620);
        if (cancelled) return;
        setTyping(false);

        const words = messages[i].text.split(' ');
        for (let w = 1; w <= words.length; w += 1) {
          if (cancelled) return;
          setPartial(words.slice(0, w).join(' '));
          await wait(42);
        }
        if (cancelled) return;
        setShown(i + 1);
        setPartial('');
        await wait(560);
      }
      if (!cancelled) setTyping(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messagesKey]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shown, partial, typing]);

  const revealing = shown < messages.length;
  const current = revealing ? messages[shown] : null;

  return (
    <div className="mid-copilot" aria-label="Leitura da IA sobre o projeto">
      <div className="mid-copilot__head">
        <span className="mid-copilot__orb" aria-hidden>
          <span className="mid-copilot__orb-core" />
          <Sparkles size={13} />
        </span>
        <div className="mid-copilot__id">
          <strong>Sprint IA</strong>
          <span>copiloto do projeto</span>
        </div>
        <span className="mid-copilot__live" aria-hidden>
          <i />
          ao vivo
        </span>
      </div>

      <div className="mid-copilot__feed" ref={scrollRef} role="log" aria-live="polite">
        {messages.slice(0, shown).map((m) => (
          <div key={m.id} className={`mid-copilot__msg mid-copilot__msg--${m.tone}`}>
            <span className="mid-copilot__tag">{TONE_LABEL[m.tone] ?? 'nota'}</span>
            <p>{m.text}</p>
          </div>
        ))}

        {revealing && !typing && current && (
          <div className={`mid-copilot__msg mid-copilot__msg--${current.tone} is-typing-out`}>
            <span className="mid-copilot__tag">{TONE_LABEL[current.tone] ?? 'nota'}</span>
            <p>
              {partial}
              <span className="mid-copilot__caret" aria-hidden />
            </p>
          </div>
        )}

        {typing && (
          <div className="mid-copilot__dots" aria-label="IA escrevendo">
            <span />
            <span />
            <span />
          </div>
        )}
      </div>

      <p className="mid-copilot__foot">Leitura automática · atualiza com o seu progresso</p>
    </div>
  );
}
