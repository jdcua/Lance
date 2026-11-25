/**
 * DropZoneOverlay · Full-screen glassmorphism overlay shown when files
 * are dragged over the app window.
 */

import { Upload } from 'lucide-react';

interface DropZoneOverlayProps {
  visible: boolean;
}

export default function DropZoneOverlay({ visible }: DropZoneOverlayProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Glassmorphism backdrop */}
      <div className="absolute inset-0 bg-[var(--bg-primary)]/60 backdrop-blur-md drop-zone-overlay-animate" />

      {/* Centered content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center drop-zone-content-animate">
          {/* Pulsing icon ring */}
          <div className="relative mx-auto w-24 h-24 mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-[var(--accent)] drop-zone-ring-spin" />
            <div className="absolute inset-2 rounded-full bg-[var(--accent)]/10 flex items-center justify-center drop-zone-icon-pulse">
              <Upload size={32} className="text-[var(--accent-ink,var(--accent))]" />
            </div>
          </div>

          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
            Drop files to import
          </h2>
          <p className="text-sm text-[var(--text-secondary)] max-w-xs mx-auto leading-relaxed">
            Spreadsheets, documents, and images · Lance will scan and classify them automatically.
          </p>

          {/* Supported formats pills */}
          <div className="flex flex-wrap justify-center gap-1.5 mt-4">
            {['.xlsx', '.csv', '.pdf', '.docx', '.png', '.jpg'].map((ext) => (
              <span
                key={ext}
                className="px-2 py-0.5 text-[10px] font-mono font-medium rounded-full bg-[var(--accent)]/10 text-[var(--accent-ink,var(--accent))] border border-[var(--accent)]/20"
              >
                {ext}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
