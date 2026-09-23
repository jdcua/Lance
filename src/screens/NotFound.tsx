import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return (
    <div className="flex items-center justify-center h-full">
      <Card className="text-center py-16 flex flex-col items-center max-w-sm">
        <FileQuestion size={48} className="text-[var(--text-tertiary)] mb-4" />
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Page not found</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-1">This page doesn't exist or may have moved.</p>
        <p className="font-mono text-xs text-[var(--text-tertiary)] mb-5 break-all px-4">{pathname}</p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate(-1)} size="sm">Go back</Button>
          <Button onClick={() => navigate('/')} size="sm">Dashboard</Button>
        </div>
      </Card>
    </div>
  );
}
