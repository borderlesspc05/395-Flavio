import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import type { ReactNode } from 'react';

type Props = {
  query: string;
  onQueryChange: (value: string) => void;
  queryPlaceholder?: string;
  page: number;
  totalPages: number;
  rangeStart: number;
  rangeEnd: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  children?: ReactNode;
};

export function AdminTableToolbar({
  query,
  onQueryChange,
  queryPlaceholder = 'Buscar…',
  page,
  totalPages,
  rangeStart,
  rangeEnd,
  totalCount,
  onPageChange,
  children,
}: Props) {
  return (
    <div className="admin-table-toolbar">
      <label className="admin-table-search">
        <Search size={16} aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={queryPlaceholder}
          aria-label="Buscar na tabela"
        />
      </label>

      {children}

      <div className="admin-table-pager">
        <span className="admin-table-pager-meta">
          {totalCount === 0
            ? 'Nenhum resultado'
            : `${rangeStart}–${rangeEnd} de ${totalCount}`}
        </span>
        <button
          type="button"
          className="admin-pager-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="admin-table-pager-page">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          className="admin-pager-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Próxima página"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
