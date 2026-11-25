import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Compass } from 'lucide-react';
import { getShortcutModifierLabel } from '../utils/shortcuts';

export default function NotFound() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const mod = getShortcutModifierLabel();
  return (
    <div className="flex items-center justify-center h-full">
      <Card className="text-center py-16 flex flex-col items-center max-w-sm">
        <Compass size={48} className="text-[var(--text-tertiary)] mb-4" />
        <h1 className="font-display text-lg font-semibold text-[var(--text-primary)] mb-1">
          Off the map
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mb-1">
          This corner of Lance doesn't exist — but the work is still where you left it.
        </p>
        <p className="font-mono text-xs text-[var(--text-tertiary)] mb-5 break-all px-4">
          {pathname}
        </p>
        <div className="flex gap-2 mb-4">
          <Button variant="secondary" onClick={() => navigate(-1)} size="sm">
            Go back
          </Button>
          <Button onClick={() => navigate('/')} size="sm">
            Today
          </Button>
        </div>
        <p className="text-xs text-[var(--text-tertiary)]">Tip: press {mod}+K to jump anywhere.</p>
      </Card>
    </div>
  );
}
