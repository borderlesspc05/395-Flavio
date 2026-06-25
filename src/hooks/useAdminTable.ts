import { useEffect, useMemo, useState } from 'react';

export function useAdminTable<T>(
  rows: T[],
  options: {
    pageSize?: number;
    filterFn?: (row: T, query: string) => boolean;
  } = {}
) {
  const pageSize = options.pageSize ?? 15;
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const setQuerySafe = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !options.filterFn) return rows;
    return rows.filter((row) => options.filterFn!(row, q));
  }, [rows, query, options.filterFn]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  return {
    query,
    setQuery: setQuerySafe,
    page,
    setPage,
    pageSize,
    filteredCount: filtered.length,
    totalPages,
    pageRows,
    rangeStart: filtered.length === 0 ? 0 : (page - 1) * pageSize + 1,
    rangeEnd: Math.min(page * pageSize, filtered.length),
  };
}
