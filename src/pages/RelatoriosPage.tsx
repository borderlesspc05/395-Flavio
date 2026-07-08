import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DomainWaveWorkspace } from '../components/domain/DomainWaveWorkspace';

export function RelatoriosPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const noticeHandled = useRef(false);
  const [midNotice, setMidNotice] = useState<string | null>(null);

  useEffect(() => {
    const state = location.state as { midConcludeNotice?: string } | null;
    if (!state?.midConcludeNotice || noticeHandled.current) return;
    noticeHandled.current = true;
    setMidNotice(state.midConcludeNotice);
    navigate(location.pathname, { replace: true, state: {} });
  }, [location, navigate]);

  return (
    <div className="relatorios-page relatorios-page--domain">
      {midNotice ? (
        <p
          className="domain-wave-notice domain-reveal"
          role="status"
          aria-live="polite"
          style={{ position: 'relative', zIndex: 1 }}
        >
          {midNotice}
        </p>
      ) : null}

      <DomainWaveWorkspace />
    </div>
  );
}
