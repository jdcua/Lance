import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../../store';
import { useToasts } from '../../store/toastStore';
import { isTauri as isTauriApp } from '../../utils/tauri';
import {
  TEMPLATE_LABELS,
  DEFAULT_SUBJECT_TEMPLATES,
  resolveDunningTone,
} from '../../utils/followUpTemplates';
import {
  loadTrash,
  removeTrashEntry,
  clearTrash,
  TRASH_RETENTION_DAYS,
  type TrashEntry,
} from '../../utils/trash';
import { eventCounts, getTelemetryEvents, clearTelemetry } from '../../utils/telemetry';
import { downloadTextFile } from '../../utils/yearSummary';
import { todayLocalISO, relativeDate } from '../../utils/format';
import { sanitizeInput, sanitizeText } from '../../utils/sanitize';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Download, Upload, Trash2, FolderOpen, X, FileText } from 'lucide-react';
import type { ExportTemplate } from '../../types';
import { SectionHead, type SettingsBag } from './shared';

const EXPORT_TYPES = [
  { value: 'invoice_pdf', label: 'Invoice PDF' },
  { value: 'proposal_pdf', label: 'Proposal PDF' },
  { value: 'proposal_docx', label: 'Proposal DOCX' },
  { value: 'contract_docx', label: 'Contract DOCX' },
];

const SECTION_OPTIONS: Record<string, string[]> = {
  invoice_pdf: [
    'Header',
    'Footer',
    'From address',
    'Client address',
    'Line items table',
    'Total summary',
    'Notes',
    'Payment instructions',
  ],
  proposal_pdf: [
    'Header',
    'Footer',
    'Cover page',
    'Scope of work',
    'Timeline',
    'Pricing table',
    'Terms',
    'Signature block',
  ],
  proposal_docx: [
    'Header',
    'Footer',
    'Cover page',
    'Scope of work',
    'Timeline',
    'Pricing table',
    'Terms',
    'Signature block',
  ],
  contract_docx: [
    'Header',
    'Footer',
    'Parties',
    'Scope',
    'Payment terms',
    'Timeline',
    'Signatures',
  ],
};

function TrashBinSection() {
  const restoreTrashEntry = useStore((s) => s.restoreTrashEntry);
  const addToast = useToasts((s) => s.add);
  const [entries, setEntries] = useState<TrashEntry[]>([]);
  const [restoring, setRestoring] = useState<string | null>(null);

  const refresh = useCallback(() => setEntries(loadTrash()), []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleRestore = async (entry: TrashEntry) => {
    setRestoring(entry.trashId);
    try {
      await restoreTrashEntry(entry);
      removeTrashEntry(entry.trashId);
      refresh();
      addToast(`Restored ${entry.label}`, 'success');
    } catch {
      addToast('Could not restore this item', 'error');
    } finally {
      setRestoring(null);
    }
  };

  const handleDeleteForever = (entry: TrashEntry) => {
    removeTrashEntry(entry.trashId);
    refresh();
  };

  if (entries.length === 0) return null;

  return (
    <div className="border-t border-[var(--border-color)] pt-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm text-[var(--text-primary)]">Recently deleted</p>
          <p className="text-xs text-[var(--text-tertiary)]">
            Restores the record itself · linked items deleted with it are not brought back · emptied
            automatically after {TRASH_RETENTION_DAYS} days
          </p>
        </div>
        <button
          onClick={() => {
            clearTrash();
            refresh();
          }}
          className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--danger)]"
        >
          Empty trash
        </button>
      </div>
      <div className="space-y-1">
        {entries.map((e) => (
          <div
            key={e.trashId}
            className="flex items-center gap-3 px-2 py-1.5 rounded-xs hover:bg-[var(--bg-secondary)] text-xs"
          >
            <div className="flex-1 min-w-0">
              <span className="font-medium text-[var(--text-primary)] truncate">{e.label}</span>
              <span className="text-[var(--text-tertiary)]">
                {' '}
                · {e.table} · {relativeDate(e.deletedAt)}
              </span>
            </div>
            <button
              onClick={() => handleRestore(e)}
              disabled={restoring === e.trashId}
              className="flex-shrink-0 text-[11px] font-medium text-[var(--accent-ink,var(--accent))] hover:underline disabled:opacity-40"
            >
              {restoring === e.trashId ? 'Restoring…' : 'Restore'}
            </button>
            <button
              onClick={() => handleDeleteForever(e)}
              aria-label={`Delete ${e.label} forever`}
              className="flex-shrink-0 text-[var(--text-tertiary)] hover:text-[var(--danger)]"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExportTemplatesSection() {
  const {
    exportTemplates,
    loadExportTemplates,
    addExportTemplate,
    updateExportTemplate,
    removeExportTemplate,
  } = useStore();
  const addToast = useToasts((s) => s.add);
  const [loaded, setLoaded] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ExportTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'invoice_pdf' as ExportTemplate['type'],
    header: '',
    footer: '',
    sections: [] as string[],
    color_scheme: '',
  });

  useEffect(() => {
    loadExportTemplates().finally(() => setLoaded(true));
  }, [loadExportTemplates]);

  const openNew = () => {
    setEditing(null);
    setForm({
      name: '',
      type: 'invoice_pdf',
      header: '',
      footer: '',
      sections: [],
      color_scheme: '',
    });
    setShowForm(true);
  };

  const openEdit = (t: ExportTemplate) => {
    setEditing(t);
    setForm({
      name: t.name,
      type: t.type,
      header: t.header || '',
      footer: t.footer || '',
      sections: t.sections || [],
      color_scheme: t.color_scheme || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const color = (form.color_scheme || '').trim();
    if (color && !/^#?[0-9a-fA-F]{6}$/.test(color)) {
      addToast('Color scheme must be a 6-digit hex value (e.g. #1e40af)', 'error');
      return;
    }
    setSaving(true);
    try {
      const normalized = {
        ...form,
        name: sanitizeInput(form.name),
        header: sanitizeInput(form.header),
        footer: sanitizeInput(form.footer),
        color_scheme: color,
      };
      if (editing) {
        await updateExportTemplate({ ...editing, ...normalized, sections: form.sections });
      } else {
        await addExportTemplate({ ...normalized, sections: form.sections });
      }
      setShowForm(false);
      addToast('Template saved', 'success');
    } catch {
      addToast('Failed to save template', 'error');
    } /* template save is best-effort */ finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      return;
    }
    setDeleteConfirm(null);
    try {
      await removeExportTemplate(id);
      addToast('Template deleted', 'info');
    } catch {
      addToast('Failed to delete', 'error');
    } /* template delete is best-effort */
  };

  const toggleSection = (section: string) => {
    setForm((prev) => {
      const sections = prev.sections.includes(section)
        ? prev.sections.filter((s) => s !== section)
        : [...prev.sections, section];
      return { ...prev, sections };
    });
  };

  const availableSections = SECTION_OPTIONS[form.type] || [];

  const inputClass =
    'w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-sm placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 bg-[var(--bg-card)]';

  return (
    <div>
      {!loaded ? (
        <div className="h-8 bg-[var(--bg-secondary)] rounded skeleton-pulse" />
      ) : exportTemplates.length === 0 ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--text-tertiary)]">
            No export templates yet. Create reusable export configurations.
          </p>
          <Button variant="secondary" size="sm" onClick={openNew}>
            <FileText size={14} />
            New Template
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {exportTemplates.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-sm"
            >
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{t.name}</p>
                <p className="text-[10px] text-[var(--text-tertiary)]">
                  {EXPORT_TYPES.find((et) => et.value === t.type)?.label || t.type}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEdit(t)}
                  className="px-2 py-1 text-[10px] text-[var(--accent-ink,var(--accent))] hover:bg-[var(--accent-bg)] rounded-xs"
                >
                  Edit
                </button>
                {deleteConfirm === t.id ? (
                  <>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="px-2 py-1 text-[10px] text-white bg-[var(--danger)] rounded-xs"
                    >
                      Sure?
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-2 py-1 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] rounded-xs"
                    >
                      No
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="px-2 py-1 text-[10px] text-[var(--danger)] hover:bg-[var(--danger-bg)] rounded-xs"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
          <div className="pt-2">
            <Button variant="secondary" size="sm" onClick={openNew}>
              <FileText size={14} />
              New Template
            </Button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="mt-4 p-4 bg-[var(--bg-secondary)] rounded-sm space-y-4">
          <h4 className="text-sm font-semibold text-[var(--text-primary)]">
            {editing ? 'Edit Template' : 'New Template'}
          </h4>
          <div>
            <label className="form-label">
              Template name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. My Brand Export"
              className={inputClass}
            />
          </div>
          <div>
            <label className="form-label">
              Document type
            </label>
            <select
              value={form.type}
              aria-label="Document type"
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as ExportTemplate['type'], sections: [] })
              }
              className={inputClass}
            >
              {EXPORT_TYPES.map((et) => (
                <option key={et.value} value={et.value}>
                  {et.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">
              Header
            </label>
            <input
              type="text"
              value={form.header}
              onChange={(e) => setForm({ ...form, header: e.target.value })}
              placeholder="Custom company name or logo text"
              className={inputClass}
            />
          </div>
          <div>
            <label className="form-label">
              Footer
            </label>
            <input
              type="text"
              value={form.footer}
              onChange={(e) => setForm({ ...form, footer: e.target.value })}
              placeholder="Custom footer text"
              className={inputClass}
            />
          </div>
          <div>
            <label className="form-label">
              Color scheme
            </label>
            <input
              type="text"
              value={form.color_scheme}
              onChange={(e) => setForm({ ...form, color_scheme: e.target.value })}
              placeholder="Hex color for PDF primary color"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
              Include sections
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {availableSections.map((section) => (
                <label key={section} className="flex items-center gap-2 py-0.5">
                  <input
                    type="checkbox"
                    checked={form.sections.includes(section)}
                    onChange={() => toggleSection(section)}
                    className="w-3.5 h-3.5 rounded border-[var(--neutral-border)] text-[var(--accent-ink,var(--accent))]"
                  />
                  <span className="text-xs text-[var(--text-primary)]">{section}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowForm(false)} size="sm">
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.name.trim()} size="sm">
              {editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectTemplatesSection() {
  const {
    projectTemplates,
    loadProjectTemplates,
    loadTemplateMilestones,
    projectTemplateMilestones,
    updateProjectTemplate,
    removeProjectTemplate,
  } = useStore();
  const addToast = useToasts((s) => s.add);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadProjectTemplates().finally(() => setLoaded(true));
  }, [loadProjectTemplates]);

  const handleExpand = async (id: string) => {
    if (expanded === id) {
      setExpanded(null);
    } else {
      setExpanded(id);
      await loadTemplateMilestones(id);
    }
  };

  const handleEdit = (id: string, name: string, description?: string) => {
    setEditing(id);
    setEditName(name);
    setEditDescription(description || '');
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await updateProjectTemplate(id, {
        name: editName,
        description: editDescription || undefined,
      });
      setEditing(null);
      addToast('Template updated', 'success');
    } catch {
      addToast('Failed to update template', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await removeProjectTemplate(id);
      setDeleteConfirm(null);
      addToast('Template deleted', 'info');
    } catch {
      addToast('Failed to delete template', 'error');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-[var(--text-primary)]">Project Templates</p>
      </div>
      {!loaded ? (
        <div className="h-8 bg-[var(--bg-secondary)] rounded skeleton-pulse" />
      ) : projectTemplates.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)]">
          No project templates yet. Save one from a project.
        </p>
      ) : (
        <div className="space-y-2">
          {projectTemplates.map((tpl) => {
            const ms = projectTemplateMilestones[tpl.id] || [];
            const isEditing = editing === tpl.id;
            return (
              <div key={tpl.id} className="bg-[var(--bg-secondary)] rounded-sm overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2">
                  {isEditing ? (
                    <div className="flex-1 space-y-2 mr-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(tpl.id);
                          if (e.key === 'Escape') setEditing(null);
                        }}
                      />
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Description (optional)"
                        className="w-full px-2 py-1 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]"
                      />
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleSaveEdit(tpl.id)}
                          className="text-[10px] text-[var(--accent-ink,var(--accent))] hover:underline"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="text-[10px] text-[var(--text-tertiary)] hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--text-primary)]">{tpl.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-[var(--text-tertiary)]">
                          {ms.length} milestones
                        </p>
                        {tpl.default_budget && (
                          <p className="text-[10px] text-[var(--text-tertiary)]">
                            ${tpl.default_budget}
                          </p>
                        )}
                        {tpl.is_default && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--accent-bg)] text-[var(--accent-ink,var(--accent))]">
                            Built-in
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {!isEditing && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleExpand(tpl.id)}
                        className="text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] px-1.5 py-0.5 rounded-[4px]"
                      >
                        {expanded === tpl.id ? 'Hide' : 'View'}
                      </button>
                      <button
                        onClick={() => handleEdit(tpl.id, tpl.name, tpl.description)}
                        className="text-[10px] text-[var(--accent-ink,var(--accent))] hover:underline px-1"
                      >
                        Edit
                      </button>
                      {deleteConfirm === tpl.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-[var(--danger)]">Delete?</span>
                          <button
                            onClick={() => handleDelete(tpl.id)}
                            className="text-[10px] px-1 py-0.5 bg-[var(--danger)] text-white rounded-[4px]"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-[10px] px-1 py-0.5 bg-[var(--bg-card)] text-[var(--text-secondary)] rounded-[4px]"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(tpl.id)}
                          className="text-[10px] text-[var(--danger)] hover:underline px-1"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {expanded === tpl.id && (
                  <div className="border-t border-[var(--border-color)] px-3 py-2">
                    {ms.length === 0 ? (
                      <p className="text-[10px] text-[var(--text-tertiary)]">
                        No milestones defined.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {ms.map((m) => (
                          <div key={m.id} className="flex items-center gap-2 text-xs">
                            <span className="text-[var(--text-tertiary)] w-5 text-right">
                              {m.days_from_start}d
                            </span>
                            <span className="text-[var(--text-primary)]">{m.title}</span>
                            {m.invoice_on_completion && (
                              <span className="text-[9px] px-1 py-0.5 bg-[var(--accent-bg)] text-[var(--accent-ink,var(--accent))] rounded-[3px]">
                                invoice
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Data settings: export/import, trash, folders, templates, telemetry,
 * auto-backup, export templates, follow-up message templates. Pure relocation.
 */
export default function DataSection({ bag }: { bag: SettingsBag }) {
  const { saved } = bag;
  const profile = useStore((s) => s.profile);
  const getAssetsDir = useStore((s) => s.getAssetsDir);
  const getImportsDir = useStore((s) => s.getImportsDir);
  const followUpSettings = useStore((s) => s.followUpSettings);
  const saveFollowUpSettings = useStore((s) => s.saveFollowUpSettings);
  const addToast = useToasts((s) => s.add);

  return (
    <>
      {/* Data & Backup section header */}
      <div className="text-xs text-[var(--text-secondary)] font-semibold mb-4">
        Data &amp; Backup
      </div>

      {/* Data (export, import, assets, project templates) */}
      <Card className="mb-6">
        <SectionHead title="Data" isSaved={saved.has('Data')} />
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-primary)] ">Export all data</p>
              <p className="text-xs text-[var(--text-tertiary)]">
                Backup your entire database as JSON
              </p>
            </div>
            <Button variant="secondary" onClick={bag.handleExportData} size="sm">
              <Download size={14} />
              Export
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-primary)] ">Import data</p>
              <p className="text-xs text-[var(--text-tertiary)]">
                Restore from a Lance backup file
              </p>
            </div>
            <Button variant="secondary" onClick={bag.handleImportData} size="sm">
              <Upload size={14} />
              Import
            </Button>
            <input
              ref={bag.importFileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              aria-hidden="true"
              tabIndex={-1}
              onChange={bag.handleImportFilePicked}
            />
          </div>
          {bag.isSeeded && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-primary)]">Clear sample data</p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Remove all records tagged as sample data
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => bag.setShowClearSampleConfirm(true)}
                size="sm"
              >
                <Trash2 size={14} />
                Clear
              </Button>
            </div>
          )}
          <TrashBinSection />
          <div className="border-t border-[var(--border-color)] pt-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-primary)]">Assets folder</p>
              <p className="text-xs text-[var(--text-tertiary)]">
                Open attached files in your file manager
                {isTauriApp() ? '' : ' · desktop app only'}
              </p>
            </div>
            {isTauriApp() && (
              <Button
                variant="secondary"
                onClick={async () => {
                  try {
                    const assetsDir = await getAssetsDir();
                    const { openPath } = await import('../../utils/tauri');
                    await openPath(assetsDir);
                  } catch {
                    addToast('Failed to open assets folder', 'error');
                  }
                }}
                size="sm"
              >
                <FolderOpen size={14} />
                Open
              </Button>
            )}
          </div>
          <div className="border-t border-[var(--border-color)] pt-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-primary)]">Imports folder</p>
              <p className="text-xs text-[var(--text-tertiary)]">
                Where imported source files are kept
                {isTauriApp() ? '' : ' · desktop app only'}
              </p>
            </div>
            {isTauriApp() && (
              <Button
                variant="secondary"
                onClick={async () => {
                  try {
                    const importsDir = await getImportsDir();
                    const { openPath } = await import('../../utils/tauri');
                    await openPath(importsDir);
                  } catch {
                    addToast('Failed to open imports folder', 'error');
                  }
                }}
                size="sm"
              >
                <FolderOpen size={14} />
                Open
              </Button>
            )}
          </div>

          <div className="border-t border-[var(--border-color)] pt-3">
            <ProjectTemplatesSection />
          </div>

          {/* On-device activity: local-first telemetry, fully inspectable */}
          <div className="border-t border-[var(--border-color)] pt-3">
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-sm text-[var(--text-primary)]">On-device activity</p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Anonymous usage counts that power personal stats and helpful nudges.
                  Stored only on this machine. Never uploaded, never sold. Names, emails,
                  and amounts are never recorded.
                </p>
              </div>
            </div>
            {(() => {
              const counts = eventCounts();
              const total = Object.values(counts).reduce((a, b) => a + b, 0);
              if (total === 0) {
                return (
                  <p className="text-xs text-[var(--text-tertiary)]">
                    No activity recorded yet.
                  </p>
                );
              }
              return (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(counts).map(([name, n]) => (
                      <span
                        key={name}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
                      >
                        {name}: {n}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        downloadTextFile(
                          `lance-activity-${todayLocalISO()}.json`,
                          JSON.stringify(getTelemetryEvents(), null, 2),
                          'application/json;charset=utf-8',
                        );
                      }}
                    >
                      <Download size={14} />
                      Export
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        clearTelemetry();
                        addToast('On-device activity cleared', 'success');
                      }}
                    >
                      <Trash2 size={14} />
                      Clear
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </Card>

      {/* Auto-backup */}
      {bag.autoBackupLoaded && (
        <Card className="mb-6">
          <SectionHead title="Auto-backup" isSaved={saved.has('Auto-backup')} />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-primary)]">Enable auto-backup</p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Silently export your data on a schedule
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={bag.autoBackupEnabled}
                  onChange={(e) => {
                    bag.setAutoBackupEnabled(e.target.checked);
                    bag.saveAutoBackupState(e.target.checked, bag.autoBackupFreq);
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[var(--border-color)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-colors peer-checked:bg-[var(--accent)]" />
              </label>
            </div>

            {bag.autoBackupEnabled && (
              <>
                <div>
                  <label className="form-label">
                    Frequency
                  </label>
                  <select
                    value={bag.autoBackupFreq}
                    aria-label="Auto-backup frequency"
                    onChange={(e) => {
                      const freq = e.target.value as 'daily' | 'weekly' | 'monthly';
                      bag.setAutoBackupFreq(freq);
                      bag.saveAutoBackupState(true, freq);
                    }}
                    className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-sm bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">
                    Backup location
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={bag.autoBackupPath}
                      readOnly
                      placeholder="Choose a folder..."
                      className="flex-1 px-3 py-2 text-sm border border-[var(--border-color)] rounded-sm bg-[var(--bg-secondary)] text-[var(--text-secondary)] truncate"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={async () => {
                        try {
                          const { openFileDialog } =
                            await import('../../utils/tauri');
                          const selected = await openFileDialog({
                            directory: true,
                            title: 'Choose backup folder',
                          });
                          if (selected && typeof selected === 'string') {
                            bag.setAutoBackupPath(selected);
                            bag.saveAutoBackupState(true, bag.autoBackupFreq, selected);
                          }
                        } catch {
                          /* dialog cancelled */
                        }
                      }}
                    >
                      Browse
                    </Button>
                  </div>
                  <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                    Keeps last 10 backups; older files are deleted automatically.
                  </p>
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Export Templates */}
      {bag.unlockedAchievements.has('first_export') && (
        <Card className="mb-6">
          <SectionHead title="Export Templates" isSaved={saved.has('Export Templates')} />
          <ExportTemplatesSection />
        </Card>
      )}

      {/* Follow-up message templates */}
      <Card className="mb-6">
        <SectionHead title="Follow-up templates" isSaved={saved.has('Follow-ups')} />
        <div className="space-y-4">
          {/* Dunning voice: escalation drafts in your voice */}
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
              Dunning voice
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mb-3">
              Overdue reminders rewritten to sound like you. Auto follows your archetype
              unless you pick one.
            </p>
            <div className="flex gap-2" role="radiogroup" aria-label="Dunning voice">
              {(['auto', 'warm', 'direct', 'formal'] as const).map((tone) => {
                const selected = (followUpSettings.tone || 'auto') === tone;
                return (
                  <button
                    key={tone}
                    role="radio"
                    aria-checked={selected}
                    onClick={() => saveFollowUpSettings({ tone })}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-sm border transition-colors capitalize ${
                      selected
                        ? 'bg-[var(--accent-bg)] border-[var(--accent)] text-[var(--text-primary)]'
                        : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent)]/40'
                    }`}
                  >
                    {tone === 'auto'
                      ? `Auto (${resolveDunningTone(profile?.profession)})`
                      : tone}
                  </button>
                );
              })}
            </div>
          </div>
          {/* Templates */}
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)] mb-3">
              Message Templates
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mb-4">
              Use{' '}
              <code className="px-1 py-0.5 bg-[var(--bg-secondary)] rounded text-[10px]">
                {'{client_name}'}
              </code>
              ,{' '}
              <code className="px-1 py-0.5 bg-[var(--bg-secondary)] rounded text-[10px]">
                {'{proposal_title}'}
              </code>
              ,{' '}
              <code className="px-1 py-0.5 bg-[var(--bg-secondary)] rounded text-[10px]">
                {'{invoice_number}'}
              </code>
              ,{' '}
              <code className="px-1 py-0.5 bg-[var(--bg-secondary)] rounded text-[10px]">
                {'{amount}'}
              </code>
              ,{' '}
              <code className="px-1 py-0.5 bg-[var(--bg-secondary)] rounded text-[10px]">
                {'{due_date}'}
              </code>
              ,{' '}
              <code className="px-1 py-0.5 bg-[var(--bg-secondary)] rounded text-[10px]">
                {'{days_elapsed}'}
              </code>
              ,{' '}
              <code className="px-1 py-0.5 bg-[var(--bg-secondary)] rounded text-[10px]">
                {'{freelancer_name}'}
              </code>{' '}
              · they fill in automatically.
            </p>
            <div className="space-y-3">
              {Object.entries(TEMPLATE_LABELS).map(([key, label]) => (
                <div key={key}>
                  <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">
                    {label}
                  </label>
                  <textarea
                    value={bag.fuTemplates[key] || ''}
                    onChange={(e) => {
                      const updated = {
                        ...bag.fuTemplates,
                        [key]: sanitizeText(e.target.value),
                      };
                      bag.setFuTemplates(updated);
                      saveFollowUpSettings({ templates: updated });
                    }}
                    rows={5}
                    className="w-full px-3 py-2 text-xs border border-[var(--border-color)] rounded-sm bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] resize-none leading-relaxed font-mono"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Subject Templates */}
          <div className="pt-2 border-t border-[var(--border-color)]">
            <p className="text-sm font-medium text-[var(--text-primary)] mb-3">
              Email Subject Templates
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mb-4">
              Same variables as message templates. These appear in the email subject line
              when you click "Open in Email".
            </p>
            <div className="space-y-3">
              {Object.entries(TEMPLATE_LABELS).map(([key, label]) => (
                <div key={`subj-${key}`}>
                  <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">
                    {label}
                  </label>
                  <input
                    type="text"
                    value={
                      bag.fuSubjectTemplates[key] || DEFAULT_SUBJECT_TEMPLATES[key] || ''
                    }
                    onChange={(e) => {
                      const updated = {
                        ...bag.fuSubjectTemplates,
                        [key]: sanitizeText(e.target.value),
                      };
                      bag.setFuSubjectTemplates(updated);
                      saveFollowUpSettings({ subject_templates: updated });
                    }}
                    className="w-full px-3 py-2 text-xs border border-[var(--border-color)] rounded-sm bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}
