import { useStore } from '../../store';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Trash2, Lock } from 'lucide-react';
import TestModePanel from '../../demo/TestModePanel';
import { SectionHead, type SettingsBag } from './shared';

/**
 * Danger zone: remove license (moved byte-for-byte — same copy, same
 * confirm flow, same tier re-lock logic in the shell handler), reset data,
 * test mode. Pure relocation.
 */
export default function DangerSection({ bag }: { bag: SettingsBag }) {
  const isLicensed = useStore((s) => s.isLicensed);

  return (
    <>
      {/* Danger Zone section header */}
      <div className="text-xs uppercase tracking-widest text-[var(--text-danger)] font-semibold mb-4 text-[var(--danger)]">
        Danger Zone
      </div>

      {/* Remove license */}
      {isLicensed && (
        <Card className="mb-6 border border-[var(--danger)]/30">
          <SectionHead title="Remove License" isSaved={false} />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--danger)]">Remove license key</p>
              <p className="text-xs text-[var(--text-tertiary)]">
                The splash screen will return and theme locks will be re-applied.
              </p>
            </div>
            <Button
              variant="danger"
              onClick={() => bag.setShowRemoveLicenseConfirm(true)}
              size="sm"
            >
              <Lock size={14} />
              Remove license
            </Button>
          </div>
        </Card>
      )}

      {/* Reset all data */}
      <Card className="mb-6 border border-[var(--danger)]/30">
        <SectionHead title="Reset All Data" isSaved={false} />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--danger)]">Delete all records permanently</p>
            <p className="text-xs text-[var(--text-tertiary)]">
              All clients, projects, proposals, contracts, invoices, time entries, and
              expenses will be removed.
            </p>
          </div>
          <Button variant="danger" onClick={() => bag.setShowResetModal(true)} size="sm">
            <Trash2 size={14} />
            Reset
          </Button>
        </div>
      </Card>

      {/* Test mode · dev + trial builds only. `__TEST_MODE__` is a
          build-time literal, not a runtime check: the old
          `import.meta.env.DEV || isTrialBuild()` folded to
          `false || isTrial()`, which shipped the whole panel. */}
      {__TEST_MODE__ && (
        <Card className="mb-6 border border-dashed border-[var(--warning-text)]/50">
          <SectionHead title="Test Mode" isSaved={false} />
          <TestModePanel />
        </Card>
      )}
    </>
  );
}
