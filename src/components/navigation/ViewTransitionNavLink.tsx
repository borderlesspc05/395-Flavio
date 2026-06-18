import {
  NavLink,
  resolvePath,
  useLocation,
  useNavigate,
  type NavLinkProps,
  type To,
} from 'react-router-dom';
import { isModifiedClick, navigateWithViewTransition } from '../../lib/navigation/viewTransition';

function isSameRoute(to: To, pathname: string, search: string, hash: string): boolean {
  const resolved = resolvePath(to, pathname);
  return (
    resolved.pathname === pathname &&
    (resolved.search ?? '') === search &&
    (resolved.hash ?? '') === hash
  );
}

export function ViewTransitionNavLink({ to, onClick, onNavigate, ...props }: NavLinkProps & {
  onNavigate?: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <NavLink
      to={to}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || isModifiedClick(event)) return;
        onNavigate?.();
        if (isSameRoute(to, location.pathname, location.search, location.hash)) return;
        event.preventDefault();
        navigateWithViewTransition(navigate, to);
      }}
    />
  );
}
