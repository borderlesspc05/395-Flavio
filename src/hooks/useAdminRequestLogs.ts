import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { adminApi, type AdminRequestLogRow, type AdminRequestLogsPage } from '../services/adminApi';
import { readAdminSessionCache, writeAdminSessionCache, clearAdminSessionCache } from '../services/adminSessionCache';

const PAGE_SIZE = 20;
const SESSION_KEY = 'request-logs';
const pageCache = new Map<string, AdminRequestLogsPage>();

type QueryParams = {
  page: number;
  limit: number;
  q?: string;
  type?: string;
  errorsOnly: boolean;
};

type PersistedRequestLogs = {
  cacheKey: string;
  page: number;
  queryInput: string;
  typeFilter: string;
  errorsOnly: boolean;
  payload: AdminRequestLogsPage;
};

function buildCacheKey(params: QueryParams): string {
  return JSON.stringify({
    page: params.page,
    q: params.q ?? '',
    type: params.type ?? 'all',
    errorsOnly: params.errorsOnly,
  });
}

function applyPayload(
  payload: AdminRequestLogsPage,
  setters: {
    setRows: (rows: AdminRequestLogRow[]) => void;
    setTotal: (n: number) => void;
    setTotalPages: (n: number) => void;
    setTypeOptions: (opts: AdminRequestLogsPage['typeOptions']) => void;
  }
) {
  setters.setRows(payload.items);
  setters.setTotal(payload.total);
  setters.setTotalPages(payload.totalPages);
  if (payload.typeOptions.length) setters.setTypeOptions(payload.typeOptions);
}

export function useAdminRequestLogs(refreshToken = 0) {
  const persisted = useRef(readAdminSessionCache<PersistedRequestLogs>(SESSION_KEY)).current;

  const [page, setPage] = useState(persisted?.page ?? 1);
  const [queryInput, setQueryInput] = useState(persisted?.queryInput ?? '');
  const [query, setQuery] = useState(persisted?.queryInput?.trim() ?? '');
  const [typeFilter, setTypeFilter] = useState(persisted?.typeFilter ?? 'all');
  const [errorsOnly, setErrorsOnly] = useState(persisted?.errorsOnly ?? false);

  const [rows, setRows] = useState<AdminRequestLogRow[]>(persisted?.payload?.items ?? []);
  const [typeOptions, setTypeOptions] = useState<AdminRequestLogsPage['typeOptions']>(
    persisted?.payload?.typeOptions ?? []
  );
  const [total, setTotal] = useState(persisted?.payload?.total ?? 0);
  const [totalPages, setTotalPages] = useState(persisted?.payload?.totalPages ?? 1);
  const [loading, setLoading] = useState(!persisted?.payload);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const lastRefreshToken = useRef(refreshToken);

  const params = useMemo<QueryParams>(
    () => ({
      page,
      limit: PAGE_SIZE,
      q: query.trim() || undefined,
      type: typeFilter === 'all' ? undefined : typeFilter,
      errorsOnly,
    }),
    [page, query, typeFilter, errorsOnly]
  );

  const cacheKey = useMemo(() => buildCacheKey(params), [params]);

  const persist = useCallback(
    (payload: AdminRequestLogsPage) => {
      pageCache.set(cacheKey, payload);
      writeAdminSessionCache<PersistedRequestLogs>(SESSION_KEY, {
        cacheKey,
        page,
        queryInput,
        typeFilter,
        errorsOnly,
        payload,
      });
    },
    [cacheKey, page, queryInput, typeFilter, errorsOnly]
  );

  const fetchLogs = useCallback(
    async (mode: 'initial' | 'refresh' | 'silent') => {
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      setError('');

      try {
        const data = await adminApi.getRequestLogs(params);
        applyPayload(data, { setRows, setTotal, setTotalPages, setTypeOptions });
        persist(data);
      } catch {
        if (!rows.length) {
          setError('Não foi possível carregar o log de requisições.');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [params, persist, rows.length]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = queryInput.trim();
      if (next !== query) {
        setQuery(next);
        setPage(1);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [queryInput, query]);

  useEffect(() => {
    if (refreshToken > lastRefreshToken.current) {
      lastRefreshToken.current = refreshToken;
      pageCache.clear();
      clearAdminSessionCache(SESSION_KEY);
      void fetchLogs('refresh');
      return;
    }

    const cached = pageCache.get(cacheKey);
    if (cached) {
      applyPayload(cached, { setRows, setTotal, setTotalPages, setTypeOptions });
      setLoading(false);
      return;
    }

    if (persisted?.cacheKey === cacheKey && persisted.payload) {
      pageCache.set(cacheKey, persisted.payload);
      applyPayload(persisted.payload, { setRows, setTotal, setTotalPages, setTypeOptions });
      setLoading(false);
      return;
    }

    void fetchLogs('initial');
  }, [cacheKey, refreshToken, fetchLogs, persisted]);

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  return {
    rows,
    typeOptions,
    page,
    setPage,
    total,
    totalPages,
    rangeStart,
    rangeEnd,
    queryInput,
    setQueryInput,
    typeFilter,
    setTypeFilter: (value: string) => {
      setTypeFilter(value);
      setPage(1);
    },
    errorsOnly,
    setErrorsOnly: (value: boolean) => {
      setErrorsOnly(value);
      setPage(1);
    },
    loading,
    refreshing,
    error,
  };
}
