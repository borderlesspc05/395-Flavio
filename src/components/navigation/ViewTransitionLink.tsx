import { Link, resolvePath, useLocation, useNavigate, type LinkProps } from 'react-router-dom';
import { isModifiedClick, navigateWithViewTransition } from '../../lib/navigation/viewTransition';

function isSameRoute(
  to: LinkProps['to'],
  pathname: string,
  search: string,
  hash: string
): boolean {
  const resolved = resolvePath(to, pathname);
  return (
    resolved.pathname === pathname &&
    (resolved.search ?? '') === search &&
    (resolved.hash ?? '') === hash
  );
}

export function ViewTransitionLink({ to, onClick, ...props }: LinkProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Link
      to={to}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || isModifiedClick(event)) return;
        if (isSameRoute(to, location.pathname, location.search, location.hash)) return;
        event.preventDefault();
        navigateWithViewTransition(navigate, to);
      }}
    />
  );
}
