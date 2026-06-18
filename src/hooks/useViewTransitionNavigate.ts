import { useCallback } from 'react';
import { useNavigate, type NavigateOptions, type To } from 'react-router-dom';
import { navigateWithViewTransition } from '../lib/navigation/viewTransition';

export function useViewTransitionNavigate() {
  const navigate = useNavigate();

  return useCallback(
    (to: To, options?: NavigateOptions) => {
      navigateWithViewTransition(navigate, to, options);
    },
    [navigate]
  );
}
