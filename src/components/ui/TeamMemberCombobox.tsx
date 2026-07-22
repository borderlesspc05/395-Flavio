import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { UserPlus, UserRound } from 'lucide-react';
import { teamApi } from '../../services/api';

type TeamMemberLite = {
  id: string;
  nome?: string;
  name?: string;
  email?: string;
};

interface TeamMemberComboboxProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
  /** Link “Adicionar à equipe” — desligado por padrão (evita sair do fluxo). */
  showAddToTeam?: boolean;
}

function memberName(m: TeamMemberLite) {
  return (m.nome || m.name || m.email || 'Membro').trim();
}

export function TeamMemberCombobox({
  label,
  value,
  onChange,
  disabled,
  id,
  showAddToTeam = false,
}: TeamMemberComboboxProps) {
  const [members, setMembers] = useState<TeamMemberLite[]>([]);
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [listStyle, setListStyle] = useState<CSSProperties | null>(null);
  const fieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    let cancelled = false;
    teamApi
      .list()
      .then((list) => {
        if (!cancelled) {
          setMembers(Array.isArray(list) ? (list as TeamMemberLite[]) : []);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members.slice(0, 8);
    return members
      .filter((m) => {
        const name = memberName(m).toLowerCase();
        const email = (m.email || '').toLowerCase();
        return name.includes(q) || email.includes(q);
      })
      .slice(0, 8);
  }, [members, query]);

  const exactMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return members.some((m) => memberName(m).toLowerCase() === q);
  }, [members, query]);

  const showList = open && loaded && matches.length > 0;

  useLayoutEffect(() => {
    if (!showList || !fieldRef.current) {
      setListStyle(null);
      return;
    }

    const update = () => {
      const rect = fieldRef.current?.getBoundingClientRect();
      if (!rect) return;
      const spaceBelow = window.innerHeight - rect.bottom;
      const preferUp = spaceBelow < 180 && rect.top > spaceBelow;
      setListStyle({
        position: 'fixed',
        left: rect.left,
        width: rect.width,
        top: preferUp ? undefined : rect.bottom + 4,
        bottom: preferUp ? window.innerHeight - rect.top + 4 : undefined,
        zIndex: 1600,
      });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [showList, matches.length, query]);

  const pick = (name: string) => {
    onChange(name);
    setQuery(name);
    setOpen(false);
  };

  return (
    <label className={`team-member-combobox${label ? '' : ' is-compact'}`}>
      {label ? <span>{label}</span> : null}
      <div className="team-member-combobox__field" ref={fieldRef}>
        <UserRound size={14} aria-hidden />
        <input
          id={id}
          type="text"
          value={query}
          disabled={disabled}
          autoComplete="off"
          placeholder="Buscar na equipe…"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setOpen(true);
          }}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        />
      </div>
      {showList && listStyle
        ? createPortal(
            <ul className="team-member-combobox__list is-portal" role="listbox" style={listStyle}>
              {matches.map((m) => {
                const name = memberName(m);
                return (
                  <li key={m.id || name}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(name)}
                    >
                      <strong>{name}</strong>
                      {m.email ? <span>{m.email}</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>,
            document.body,
          )
        : null}
      {showAddToTeam && loaded && query.trim() && !exactMatch ? (
        <Link to="/dashboard/equipe" className="team-member-combobox__add">
          <UserPlus size={14} aria-hidden />
          Adicionar à equipe
        </Link>
      ) : null}
    </label>
  );
}
