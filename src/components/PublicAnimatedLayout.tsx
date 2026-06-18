import { AnimatedOutlet } from './navigation/AnimatedOutlet';

export function PublicAnimatedLayout() {
  return (
    <div className="public-page-shell">
      <AnimatedOutlet scope="full" variant="page" />
    </div>
  );
}
