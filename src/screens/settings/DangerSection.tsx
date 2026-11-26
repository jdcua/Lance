import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Trash2 } from 'lucide-react';
import { SectionHead, type SettingsBag } from './shared';

/**
 * Danger zone: reset data. Pure relocation.
 */
export default function DangerSection({ bag }: { bag: SettingsBag }) {
  return (
    <>
      {/* Danger Zone section header */}
      <div className="text-xs text-[var(--text-danger)] font-semibold mb-4 text-[var(--danger)]">
        Danger Zone
      </div>

      {/* Reset all data */}
      <Card className="mb-6 border border-[var(--danger)]/30">
        <SectionHead title="Reset All Data" isSaved={false} />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--danger)]">Delete all records permanently</p>
            <p className="text-xs text-[var(--text-tertiary)]">
              All clients, projects, proposals, contracts, invoices, time entries, and expenses will
              be removed.
            </p>
          </div>
          <Button variant="danger" onClick={() => bag.setShowResetModal(true)} size="sm">
            <Trash2 size={14} />
            Reset
          </Button>
        </div>
      </Card>
    </>
  );
}
