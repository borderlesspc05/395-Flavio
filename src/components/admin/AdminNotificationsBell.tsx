import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Bell, MessageCircle, Users } from 'lucide-react';
import type { AdminNotification, AdminNotificationType } from '../../types/adminNotifications';

const SEEN_AT_KEY = 'mm.admin.notificationsSeenAt';

function readSeenAt(): string {
  try {
    return localStorage.getItem(SEEN_AT_KEY) ?? '';
  } catch {
    return '';
  }
}

function writeSeenAt(iso: string) {
  try {
    localStorage.setItem(SEEN_AT_KEY, iso);
  } catch {
    /* private mode */
  }
}

function iconForType(type: AdminNotificationType) {
  if (type === 'user_joined') return Users;
  if (type === 'support_message') return MessageCircle;
  return Activity;
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type TabId = 'users' | 'requests' | 'settings' | 'support';

type Props = {
  notifications: AdminNotification[];
  onNavigate: (tab: TabId) => void;
};

export function AdminNotificationsBell({ notifications, onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const [seenAt, setSeenAt] = useState(readSeenAt);
  const wrapRef = useRef<HTMLDivElement>(null);

  const unreadCount = useMemo(() => {
    if (!seenAt) return notifications.length;
    return notifications.filter((n) => n.createdAt > seenAt).length;
  }, [notifications, seenAt]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const handleToggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        const now = new Date().toISOString();
        writeSeenAt(now);
        setSeenAt(now);
      }
      return next;
    });
  };

  const handleSelect = (notification: AdminNotification) => {
    const now = new Date().toISOString();
    writeSeenAt(now);
    setSeenAt(now);
    setOpen(false);
    if (notification.type === 'user_joined') onNavigate('users');
    else if (notification.type === 'support_message') onNavigate('support');
    else onNavigate('requests');
  };

  return (
    <div className="admin-notif-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`admin-btn admin-btn--ghost admin-notif-btn ${open ? 'is-open' : ''}`}
        onClick={handleToggle}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={unreadCount > 0 ? `Notificações, ${unreadCount} novas` : 'Notificações'}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="admin-notif-badge" aria-hidden>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="admin-notif-panel" role="menu">
          <header className="admin-notif-panel-head">
            <strong>Notificações</strong>
            <span>Usuários, mensagens e requisições</span>
          </header>
          {notifications.length === 0 ? (
            <p className="admin-notif-empty">Nenhuma atividade recente.</p>
          ) : (
            <ul className="admin-notif-list">
              {notifications.map((item) => {
                const Icon = iconForType(item.type);
                const isNew = !seenAt || item.createdAt > seenAt;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`admin-notif-item ${isNew ? 'is-new' : ''}`}
                      onClick={() => handleSelect(item)}
                      role="menuitem"
                    >
                      <span className={`admin-notif-icon admin-notif-icon--${item.type}`}>
                        <Icon size={16} aria-hidden />
                      </span>
                      <span className="admin-notif-copy">
                        <strong>{item.title}</strong>
                        <span>{item.body}</span>
                        <time dateTime={item.createdAt}>{formatWhen(item.createdAt)}</time>
                      </span>
                      {isNew && <span className="admin-notif-dot" aria-hidden />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
