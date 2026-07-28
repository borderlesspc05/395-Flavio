import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
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
  /** Quando ativo, somente uma pessoa cadastrada pode ser confirmada. */
  restrictToMembers?: boolean;
  /** Troca o campo de busca por uma identificação compacta após a seleção. */
  compactWhenSelected?: boolean;
}

function memberName(m: TeamMemberLite) {
  return (m.nome || m.name || m.email || 'Membro').trim();
}

function normalizeMemberKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizeMembersResponse(response: unknown): TeamMemberLite[] {
  if (Array.isArray(response)) return response as TeamMemberLite[];
  if (!response || typeof response !== 'object') return [];
  const record = response as { items?: unknown; data?: unknown };
  if (Array.isArray(record.items)) return record.items as TeamMemberLite[];
  if (Array.isArray(record.data)) return record.data as TeamMemberLite[];
  return [];
}

export function TeamMemberCombobox({
  label,
  value,
  onChange,
  disabled,
  id,
  showAddToTeam = false,
  restrictToMembers = false,
  compactWhenSelected = false,
}: TeamMemberComboboxProps) {
  const [members, setMembers] = useState<TeamMemberLite[]>([]);
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [listStyle, setListStyle] = useState<CSSProperties | null>(null);
  const fieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const loadMembers = useCallback(async () => {
    setLoadError(false);
    try {
      const response = await teamApi.list();
      setMembers(normalizeMembersResponse(response));
    } catch {
      setLoadError(true);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const matches = useMemo(() => {
    const q = normalizeMemberKey(query);
    if (!q) return members.slice(0, 8);
    return members
      .filter((m) => {
        const name = normalizeMemberKey(memberName(m));
        const email = normalizeMemberKey(m.email || '');
        return name.includes(q) || email.includes(q);
      })
      .slice(0, 8);
  }, [members, query]);

  const exactMatch = useMemo(() => {
    const q = normalizeMemberKey(query);
    if (!q) return true;
    return members.some(
      (m) =>
        normalizeMemberKey(memberName(m)) === q ||
        normalizeMemberKey(m.email || '') === q,
    );
  }, [members, query]);
  const selectedMember = useMemo(() => {
    const selected = normalizeMemberKey(value);
    if (!selected) return undefined;
    return members.find(
      (m) =>
        normalizeMemberKey(memberName(m)) === selected ||
        normalizeMemberKey(m.email || '') === selected,
    );
  }, [members, value]);

  const showList = open && loaded && matches.length > 0;

  useEffect(() => {
    if (!restrictToMembers || !selectedMember) return;
    const canonicalName = memberName(selectedMember);
    if (canonicalName !== value) onChange(canonicalName);
  }, [onChange, restrictToMembers, selectedMember, value]);

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
      {restrictToMembers ? (
        <div className="team-member-combobox__select-wrap">
          <UserRound size={14} aria-hidden />
          <select
            id={id}
            value={selectedMember ? memberName(selectedMember) : ''}
            disabled={disabled || !loaded || loadError}
            aria-label={label || 'Responsável'}
            onFocus={() => void loadMembers()}
            onChange={(event) => {
              const next = event.target.value;
              onChange(next);
              setQuery(next);
            }}
          >
            <option value="">
              {!loaded
                ? 'Carregando equipe…'
                : loadError
                  ? 'Erro ao carregar equipe'
                  : members.length === 0
                    ? 'Nenhum membro cadastrado'
                    : 'Selecione o responsável'}
            </option>
            {members.map((member) => {
              const name = memberName(member);
              return (
                <option key={member.id || name} value={name}>
                  {member.email ? `${name} — ${member.email}` : name}
                </option>
              );
            })}
          </select>
        </div>
      ) : compactWhenSelected && selectedMember && !open ? (
        <div className="team-member-combobox__selected">
          <span>
            <UserRound size={14} aria-hidden />
            <strong>{memberName(selectedMember)}</strong>
          </span>
          <button type="button" disabled={disabled} onClick={() => setOpen(true)}>
            Alterar responsável
          </button>
        </div>
      ) : (
      <div className="team-member-combobox__field" ref={fieldRef}>
        <UserRound size={14} aria-hidden />
        <input
          id={id}
          type="text"
          value={query}
          disabled={disabled}
          autoComplete="off"
          placeholder="Buscar na equipe…"
          onFocus={() => {
            setOpen(true);
            void loadMembers();
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!restrictToMembers) onChange(e.target.value);
            setOpen(true);
          }}
          onBlur={() =>
            window.setTimeout(() => {
              setOpen(false);
              if (restrictToMembers && !exactMatch) setQuery(value);
            }, 150)
          }
        />
      </div>
      )}
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
      {showAddToTeam && !restrictToMembers && loaded && query.trim() && !exactMatch ? (
        <Link to="/dashboard/minha-equipe" className="team-member-combobox__add">
          <UserPlus size={14} aria-hidden />
          Adicionar à equipe
        </Link>
      ) : null}
      {showAddToTeam && restrictToMembers ? (
        <Link to="/dashboard/minha-equipe" className="team-member-combobox__add">
          <UserPlus size={14} aria-hidden />
          Gerenciar equipe
        </Link>
      ) : null}
      {!restrictToMembers && open && loaded && !loadError && members.length === 0 ? (
        <span className="team-member-combobox__status">Nenhum membro cadastrado ainda.</span>
      ) : null}
      {loadError ? (
        <button
          type="button"
          className="team-member-combobox__retry"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => void loadMembers()}
        >
          Não foi possível carregar a equipe. Tentar novamente
        </button>
      ) : null}
    </label>
  );
}
