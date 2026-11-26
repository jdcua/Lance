import { useEffect, useState } from 'react';
import { useStore } from '../store';
import type { Project, Milestone } from '../types';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import LoadError from '../components/ui/LoadError';
import Card from '../components/ui/Card';
import ArchetypeFeatureTabs from '../components/features/ArchetypeFeatureTabs';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import ProgressBar from '../components/ui/ProgressBar';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ClientSelect from '../components/ui/ClientSelect';
import { useToasts } from '../store/toastStore';
import { generateInvoiceNumber } from '../utils/invoiceNumber';
import { commands } from '../lib/commands';
import { sanitizeInput, MAX_LENGTHS } from '../utils/sanitize';
import { formatCurrency, relativeDate, DAY_MS } from '../utils/format';
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Circle,
  Calendar,
  DollarSign,
  ChevronRight,
  FolderKanban,
  Search,
  Copy,
} from 'lucide-react';

const statusBadge: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  active: 'success',
  completed: 'info',
  paused: 'warning',
  cancelled: 'danger',
};

type SortKey = 'title' | 'client' | 'status' | 'budget' | 'date';

// Validation is a pure decision: the caller only stops (silently or with the
// one message) and never duplicates the branch logic.
function validateProjectForm(
  sanitizedTitle: string,
  form: { title: string; client_id: string; budget: string; notes: string },
): { stop: boolean; message?: string } {
  if (!sanitizedTitle || !form.client_id) {
    if (!sanitizedTitle && form.title.trim()) {
      return { stop: true, message: 'Project title is not allowed · remove markup and try again' };
    }
    return { stop: true };
  }
  const budget = form.budget ? parseFloat(form.budget) : undefined;
  if (budget !== undefined && (!isFinite(budget) || budget < 0)) {
    return { stop: true, message: 'Budget must be a valid non-negative number' };
  }
  return { stop: false };
}

export default function Projects() {
  const {
    projects,
    loadProjects,
    addProject,
    updateProject,
    removeProject,
    clients,
    loadClients,
    milestones,
    loadMilestones,
    addMilestone,
    updateMilestone,
    removeMilestone,
    loadInvoices,
    addInvoice,
    profile,
    loadProfile,
    projectTemplates,
    loadProjectTemplates,
    loadTemplateMilestones,
    projectTemplateMilestones,
    addProjectTemplate,
    loadTimeEntries,
  } = useStore();
  const addToast = useToasts((s) => s.add);
  const projectsError = useStore((s) => s.errors.projects);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);
  const [pform, setPForm] = useState({
    client_id: '',
    title: '',
    status: 'active',
    start_date: '',
    end_date: '',
    budget: '',
    notes: '',
  });
  const [mform, setMForm] = useState({ title: '', due_date: '', invoice_on_completion: false });
  const [invoicePrompt, setInvoicePrompt] = useState<{
    milestone: Milestone;
    project: Project;
  } | null>(null);
  const [milestoneDeleteConfirm, setMilestoneDeleteConfirm] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showTemplateSaveModal, setShowTemplateSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  useEffect(() => {
    Promise.all([loadProjects(), loadClients(), loadProfile(), loadProjectTemplates()])
      .catch((err) => addToast(err?.toString?.() || 'Failed to load data', 'error'))
      .finally(() => setLoading(false));
  }, [loadProjects, loadClients, loadProfile, loadProjectTemplates, addToast]);

  const openNewProject = () => {
    setEditingProject(null);
    setPForm({
      client_id: '',
      title: '',
      status: 'active',
      start_date: '',
      end_date: '',
      budget: '',
      notes: '',
    });
    setSelectedTemplateId('');
    setShowProjectModal(true);
  };

  // External triggers: first-run checklist + Cmd/Ctrl+N shortcut (App.tsx).
  // (The shortcut was previously dispatched here but nothing listened.)
  useEffect(() => {
    const onAddProject = () => openNewProject();
    commands.on('lance:add-project', onAddProject);
    return () => commands.off('lance:add-project', onAddProject);
  });

  const openEditProject = (project: Project) => {
    setEditingProject(project);
    setPForm({
      client_id: project.client_id,
      title: project.title,
      status: project.status,
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      budget: project.budget?.toString() || '',
      notes: project.notes || '',
    });
    setShowProjectModal(true);
  };

  // Completion audit: best-effort, and deliberately separate from the save
  // itself so a slow/failed time-entry load can never block the status change.
  const auditCompletionLooseEnds = async (project: Project) => {
    await loadTimeEntries();
    const st = useStore.getState();
    const openMs = st.milestones.filter((m) => m.project_id === project.id && !m.completed).length;
    const unbilledMin = st.timeEntries
      .filter((t) => t.project_id === project.id && !t.invoiced)
      .reduce((s, t) => s + (t.duration_minutes || 0), 0);
    const running = st.timeEntries.some((t) => t.project_id === project.id && !t.end_time);
    const loose: string[] = [];
    if (openMs > 0) loose.push(`${openMs} open milestone${openMs === 1 ? '' : 's'}`);
    if (unbilledMin > 0) loose.push(`${Math.round((unbilledMin / 60) * 10) / 10}h unbilled`);
    if (running) loose.push('timer still running');
    if (loose.length > 0) {
      addToast(`Completed with loose ends: ${loose.join(', ')}`, 'warning', 6000);
    }
  };

  // Template milestones are applied only on creation, and only when a
  // template was picked — the selection is cleared on every successful path.
  const applySelectedTemplate = async (createdProjectId: string) => {
    if (!selectedTemplateId) return;
    const template = projectTemplates.find((t) => t.id === selectedTemplateId);
    if (!template) return;
    let tplMilestones = projectTemplateMilestones[template.id];
    if (!tplMilestones) {
      await loadTemplateMilestones(template.id);
      tplMilestones = useStore.getState().projectTemplateMilestones[template.id] || [];
    }
    for (const tplMs of tplMilestones) {
      const dueDate = pform.start_date
        ? new Date(new Date(pform.start_date).getTime() + tplMs.days_from_start * DAY_MS)
            .toISOString()
            .split('T')[0]
        : undefined;
      await addMilestone({
        project_id: createdProjectId,
        title: tplMs.title,
        due_date: dueDate,
        completed: false,
        invoice_on_completion: tplMs.invoice_on_completion,
      });
    }
    setSelectedTemplateId('');
  };

  const handleSaveProject = async () => {
    const sanitizedTitle = sanitizeInput(pform.title).trim();
    const validation = validateProjectForm(sanitizedTitle, pform);
    if (validation.stop) {
      if (validation.message) addToast(validation.message, 'error');
      return;
    }
    setSaving(true);
    try {
      const data = {
        client_id: pform.client_id,
        title: sanitizedTitle.slice(0, MAX_LENGTHS.title),
        status: pform.status as Project['status'],
        start_date: pform.start_date || undefined,
        end_date: pform.end_date || undefined,
        budget: pform.budget ? parseFloat(pform.budget) : undefined,
        notes: pform.notes ? sanitizeInput(pform.notes).slice(0, MAX_LENGTHS.notes) : undefined,
      };
      if (editingProject) {
        await updateProject({ ...editingProject, ...data, status: data.status });
        // Completing with loose ends strands them silently (open milestones,
        // unbilled hours, a running timer). Proceed — abandonment is legit —
        // but say so out loud.
        if (editingProject.status !== 'completed' && data.status === 'completed') {
          try {
            await auditCompletionLooseEnds(editingProject);
          } catch {
            /* completion stands; the audit is best-effort */
          }
        }
      } else {
        const created = await addProject(data);
        await applySelectedTemplate(created.id);
      }
      setShowProjectModal(false);
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to save project', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await removeProject(confirmDelete.id);
      setConfirmDelete(null);
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to delete project', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!editingProject || !templateName.trim()) return;
    setSaving(true);
    try {
      const ms = milestones.filter((m) => m.project_id === editingProject.id);
      if (ms.length === 0) {
        addToast('Project has no milestones to save as template', 'info');
        setSaving(false);
        return;
      }
      const startDate = editingProject.start_date ? new Date(editingProject.start_date) : null;
      const templateMilestones = ms.map((m, i) => ({
        title: m.title,
        days_from_start:
          startDate && m.due_date
            ? Math.round((new Date(m.due_date).getTime() - startDate.getTime()) / DAY_MS)
            : i * 14,
        invoice_on_completion: m.invoice_on_completion,
      }));
      await addProjectTemplate(
        {
          name: templateName,
          description: templateDescription || undefined,
          default_budget: editingProject.budget,
          default_status: editingProject.status,
        },
        templateMilestones,
      );
      setShowTemplateSaveModal(false);
      setTemplateName('');
      setTemplateDescription('');
      addToast('Template saved · use it when creating future projects.', 'success');
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to save template', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateSelect = async (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const template = projectTemplates.find((t) => t.id === templateId);
    if (!template) return;
    setPForm((prev) => ({
      ...prev,
      budget: template.default_budget?.toString() || prev.budget,
      status: template.default_status || prev.status,
    }));
    let tplMilestones = projectTemplateMilestones[template.id];
    if (!tplMilestones) {
      await loadTemplateMilestones(template.id);
      tplMilestones = useStore.getState().projectTemplateMilestones[template.id] || [];
    }
  };

  const openMilestones = (projectId: string) => {
    setSelectedProject(selectedProject === projectId ? null : projectId);
    loadMilestones();
  };

  const handleAddMilestone = async () => {
    const sanitizedTitle = sanitizeInput(mform.title).trim();
    if (!selectedProject || !sanitizedTitle) return;
    setSaving(true);
    try {
      await addMilestone({
        project_id: selectedProject,
        title: sanitizedTitle.slice(0, MAX_LENGTHS.title),
        due_date: mform.due_date || undefined,
        completed: false,
        invoice_on_completion: mform.invoice_on_completion,
      });
      setMForm({ title: '', due_date: '', invoice_on_completion: false });
      setShowMilestoneModal(false);
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to add milestone', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMilestone = async (m: Milestone, project: Project) => {
    try {
      if (!m.completed && m.invoice_on_completion) {
        setInvoicePrompt({ milestone: m, project });
        return;
      }
      await updateMilestone({ ...m, completed: !m.completed });
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to update milestone', 'error');
    }
  };

  const handleInvoicePromptYes = async () => {
    if (!invoicePrompt) return;
    const { milestone, project } = invoicePrompt;
    setInvoicePrompt(null);
    try {
      const projectMilestones = milestones.filter((m) => m.project_id === project.id);
      const totalMs = projectMilestones.length || 1;
      const unitPrice = (project.budget || 0) / totalMs;
      if (!(unitPrice > 0)) {
        await updateMilestone({ ...milestone, completed: true });
        addToast('Milestone completed · project has no budget, so no invoice was created', 'info');
        return;
      }
      await loadInvoices();
      const currentInvoices = useStore.getState().invoices;
      // Guard against duplicate invoices for the same milestone (e.g. when a
      // milestone is un-completed and re-completed, or on double-trigger).
      const alreadyInvoiced = currentInvoices.some(
        (inv) =>
          (inv.milestone_id && inv.milestone_id === milestone.id) ||
          (inv.project_id === project.id &&
            inv.notes === `Generated from milestone: ${milestone.title}`),
      );
      if (alreadyInvoiced) {
        await updateMilestone({ ...milestone, completed: true });
        addToast('Invoice already exists for this milestone · no duplicate created', 'info');
        return;
      }
      const invNumber = generateInvoiceNumber(currentInvoices);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);
      const lineItem = {
        id: crypto.randomUUID(),
        description: milestone.title,
        quantity: 1,
        unit_price: Math.round(unitPrice * 100) / 100,
        total: Math.round(unitPrice * 100) / 100,
      };
      await addInvoice({
        client_id: project.client_id,
        project_id: project.id,
        invoice_number: invNumber,
        status: 'draft',
        line_items: [lineItem],
        subtotal: lineItem.total,
        tax_rate: undefined,
        total: lineItem.total,
        due_date: dueDate.toISOString().split('T')[0],
        notes: `Generated from milestone: ${milestone.title}`,
        milestone_id: milestone.id,
      });
      await updateMilestone({ ...milestone, completed: true });
      addToast(`Invoice ${invNumber} created · review in Invoices`, 'success');
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to generate invoice from milestone', 'error');
    }
  };

  const handleInvoicePromptNo = async () => {
    if (!invoicePrompt) return;
    const { milestone } = invoicePrompt;
    setInvoicePrompt(null);
    try {
      await updateMilestone({ ...milestone, completed: true });
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to update milestone', 'error');
    }
  };

  const handleDeleteMilestone = async (id: string) => {
    if (milestoneDeleteConfirm !== id) {
      setMilestoneDeleteConfirm(id);
      return;
    }
    setMilestoneDeleteConfirm(null);
    try {
      await removeMilestone(id);
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to delete milestone', 'error');
    }
  };

  const getClientName = (clientId: string) =>
    clients.find((c) => c.id === clientId)?.name || 'Unknown';

  const filtered = projects.filter((p) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (p.title || '').toLowerCase().includes(s) ||
      (getClientName(p.client_id) || '').toLowerCase().includes(s)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    switch (sortKey) {
      case 'title':
        return dir * a.title.localeCompare(b.title);
      case 'client':
        return dir * getClientName(a.client_id).localeCompare(getClientName(b.client_id));
      case 'status':
        return dir * a.status.localeCompare(b.status);
      case 'budget':
        return dir * ((a.budget || 0) - (b.budget || 0));
      case 'date':
        return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      default:
        return 0;
    }
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  if (loading)
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-1">
            <div className="h-6 w-24 bg-[var(--bg-secondary)] rounded skeleton-pulse" />
            <div className="h-4 w-32 bg-[var(--bg-secondary)] rounded skeleton-pulse" />
          </div>
        </div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-[var(--bg-secondary)] rounded-[12px] skeleton-pulse" />
          ))}
        </div>
      </div>
    );

  return (
    <div className="p-6">
      <LoadError error={projectsError} onRetry={() => loadProjects()} />
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display text-lg font-semibold text-[var(--text-primary)]">
            Projects
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {projects.filter((p) => p.status === 'active').length} active, {projects.length} total
          </p>
        </div>
        <Button
          onClick={openNewProject}
          size="sm"
          disabled={clients.length === 0}
          aria-label="New project"
        >
          <Plus size={14} />
          New Project
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-[var(--border-color)] rounded-xs placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] bg-[var(--bg-secondary)]"
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[var(--text-tertiary)]">Sort:</span>
          {(['date', 'title', 'client', 'status', 'budget'] as SortKey[]).map((k) => (
            <button
              key={k}
              onClick={() => toggleSort(k)}
              className={`text-[10px] px-2 py-0.5 rounded-[4px] transition-colors capitalize ${
                sortKey === k
                  ? 'bg-[var(--accent-bg)] text-[var(--accent-ink,var(--accent))] font-medium'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {k}
              {sortKey === k && <span className="ml-0.5">{sortDir === 'asc' ? '↑' : '↓'}</span>}
            </button>
          ))}
        </div>
      </div>

      {(() =>
        clients.length === 0 && (
          <Card className="mb-4 border-[var(--warning-bg)] bg-[var(--warning-bg)]/50">
            <p className="text-sm text-[var(--warning-text)]">
              Add at least one client before creating a project.
            </p>
          </Card>
        ))()}

      {projects.length === 0 ? (
        <EmptyState
          screen="projects"
          icon={<FolderKanban size={40} className="text-[var(--text-tertiary)] mb-4" />}
          hint={
            clients.length === 0 ? (
              <p className="text-xs text-[var(--warning-text)] mb-3">
                Add at least one client before creating a project.
              </p>
            ) : undefined
          }
          action={
            clients.length === 0 ? (
              <Button size="sm" disabled={true} aria-label="Create your first project">
                New Project
              </Button>
            ) : (
              <Button
                onClick={openNewProject}
                size="sm"
                variant="secondary"
                aria-label="New project"
              >
                New Project
              </Button>
            )
          }
        />
      ) : filtered.length === 0 && search ? (
        <Card className="text-center py-12">
          <p className="text-sm text-[var(--text-tertiary)]">No projects match "{search}"</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted.map((project) => {
            const projectMilestones = milestones.filter((m) => m.project_id === project.id);
            const completedMs = projectMilestones.filter((m) => m.completed).length;
            const totalMs = projectMilestones.length;
            return (
              <div key={project.id}>
                <Card className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                        {project.title}
                      </h3>
                      <Badge variant={statusBadge[project.status] || 'default'}>
                        {project.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mb-2">
                      {getClientName(project.client_id)}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-[var(--text-tertiary)] mb-2">
                      {project.start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {relativeDate(project.start_date)}
                        </span>
                      )}
                      {project.budget && (
                        <span className="flex items-center gap-1">
                          <DollarSign size={12} />
                          {formatCurrency(project.budget, profile?.currency)}
                        </span>
                      )}
                    </div>
                    {totalMs > 0 && (
                      <div className="w-48">
                        <ProgressBar
                          value={completedMs}
                          max={totalMs}
                          label={`${completedMs}/${totalMs} milestones`}
                          size="sm"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                    <button
                      onClick={() => openMilestones(project.id)}
                      aria-label="Expand milestones"
                      className={`p-1.5 rounded-sm transition-colors ${selectedProject === project.id ? 'text-[var(--accent-ink,var(--accent))] bg-[var(--accent-bg)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'}`}
                    >
                      <ChevronRight
                        size={14}
                        className={`transition-transform ${selectedProject === project.id ? 'rotate-90' : ''}`}
                      />
                    </button>
                    <button
                      onClick={() => openEditProject(project)}
                      aria-label="Edit project"
                      className="p-1.5 rounded-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete({ id: project.id, title: project.title })}
                      aria-label="Delete project"
                      className="p-1.5 rounded-sm text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Card>

                {selectedProject === project.id && (
                  <div className="ml-4 mt-2 space-y-2 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[var(--text-secondary)]">
                        Milestones
                      </span>
                      <button
                        onClick={() => {
                          setShowMilestoneModal(true);
                          setMForm({ title: '', due_date: '', invoice_on_completion: false });
                        }}
                        className="text-xs text-[var(--accent-ink,var(--accent))] hover:underline"
                      >
                        + Add
                      </button>
                    </div>
                    {projectMilestones.length === 0 ? (
                      <p className="text-xs text-[var(--text-tertiary)] pl-2">
                        No milestones yet. Add one to track progress.
                      </p>
                    ) : (
                      projectMilestones.map((m) => (
                        <div key={m.id} className="flex items-center gap-2 pl-2">
                          <button
                            onClick={() => handleToggleMilestone(m, project)}
                            aria-label="Toggle milestone"
                            className="flex-shrink-0"
                          >
                            {m.completed ? (
                              <CheckCircle2
                                size={16}
                                className="text-[var(--accent-ink,var(--accent))]"
                              />
                            ) : (
                              <Circle size={16} className="text-[var(--neutral-border)]" />
                            )}
                          </button>
                          <span
                            className={`text-xs flex-1 ${m.completed ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'}`}
                          >
                            {m.title}
                          </span>
                          {m.invoice_on_completion && <Badge variant="info">invoice</Badge>}
                          {m.due_date && (
                            <span className="text-[10px] text-[var(--text-tertiary)]">
                              {relativeDate(m.due_date)}
                            </span>
                          )}
                          {invoicePrompt?.milestone.id === m.id && (
                            <div className="flex items-center gap-1 ml-1">
                              <button
                                onClick={handleInvoicePromptYes}
                                className="text-[10px] px-1.5 py-0.5 rounded-xs bg-[var(--accent)] text-[var(--accent-on)] font-medium"
                              >
                                Yes
                              </button>
                              <button
                                onClick={handleInvoicePromptNo}
                                className="text-[10px] px-1.5 py-0.5 rounded-xs bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-medium"
                              >
                                Skip
                              </button>
                            </div>
                          )}
                          <button
                            onClick={() => handleDeleteMilestone(m.id)}
                            aria-label={
                              milestoneDeleteConfirm === m.id
                                ? 'Confirm delete milestone'
                                : 'Delete milestone'
                            }
                            title={
                              milestoneDeleteConfirm === m.id
                                ? 'Click again to confirm'
                                : 'Delete milestone'
                            }
                            className={
                              milestoneDeleteConfirm === m.id
                                ? 'text-[var(--danger)] font-semibold text-[10px] px-1.5 py-0.5 rounded-xs bg-[var(--danger-bg)]'
                                : 'text-[var(--text-tertiary)] hover:text-[var(--danger)]'
                            }
                          >
                            {milestoneDeleteConfirm === m.id ? 'Sure?' : <Trash2 size={12} />}
                          </button>
                        </div>
                      ))
                    )}
                    {invoicePrompt && (
                      <div className="pl-2">
                        <p className="text-xs text-[var(--warning-text)]">
                          Generate invoice for this milestone?
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        title={editingProject ? 'Edit Project' : 'New Project'}
        size="md"
      >
        <div className="space-y-4">
          {!editingProject && projectTemplates.length > 0 && (
            <div>
              <label className="form-label">Start from template</label>
              <select
                aria-label="Start from template"
                value={selectedTemplateId}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-sm bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
              >
                <option value="">No template · start fresh</option>
                {projectTemplates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="form-label">Client *</label>
            <ClientSelect
              clients={clients}
              value={pform.client_id}
              onChange={(clientId) => setPForm({ ...pform, client_id: clientId })}
              placeholder="Select a client..."
            />
          </div>
          <div>
            <label className="form-label">Title *</label>
            <input
              type="text"
              value={pform.title}
              onChange={(e) => setPForm({ ...pform, title: e.target.value })}
              placeholder="Project title"
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-sm placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Status</label>
              <select
                aria-label="Status"
                value={pform.status}
                onChange={(e) => setPForm({ ...pform, status: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-sm bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="form-label">Budget</label>
              <input
                type="number"
                value={pform.budget}
                onChange={(e) => setPForm({ ...pform, budget: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-sm placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Start Date</label>
              <input
                type="date"
                value={pform.start_date}
                onChange={(e) => setPForm({ ...pform, start_date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-sm focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
              />
            </div>
            <div>
              <label className="form-label">End Date</label>
              <input
                type="date"
                value={pform.end_date}
                onChange={(e) => setPForm({ ...pform, end_date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-sm focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
              />
            </div>
          </div>
          <div>
            <label className="form-label">Notes</label>
            <textarea
              value={pform.notes}
              onChange={(e) => setPForm({ ...pform, notes: e.target.value })}
              placeholder="Project notes..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-sm placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            {editingProject && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowTemplateSaveModal(true);
                  setTemplateName('');
                  setTemplateDescription('');
                }}
              >
                <Copy size={14} />
                Save as template
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="secondary" onClick={() => setShowProjectModal(false)} size="sm">
              Cancel
            </Button>
            <Button
              onClick={handleSaveProject}
              loading={saving}
              disabled={!pform.title.trim() || !pform.client_id}
              size="sm"
            >
              {editingProject ? 'Save Changes' : 'Create Project'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showMilestoneModal}
        onClose={() => setShowMilestoneModal(false)}
        title="Add Milestone"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="form-label">Title *</label>
            <input
              type="text"
              value={mform.title}
              onChange={(e) => setMForm({ ...mform, title: e.target.value })}
              placeholder="Milestone name"
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-sm placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
              autoFocus
            />
          </div>
          <div>
            <label className="form-label">Due Date</label>
            <input
              type="date"
              value={mform.due_date}
              onChange={(e) => setMForm({ ...mform, due_date: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-sm focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={mform.invoice_on_completion}
              onChange={(e) => setMForm({ ...mform, invoice_on_completion: e.target.checked })}
              className="w-4 h-4 rounded border-[var(--neutral-border)] text-[var(--accent-ink,var(--accent))] focus:ring-[var(--accent)]"
            />
            <span className="text-xs text-[var(--text-secondary)]">
              Trigger invoice on completion
            </span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowMilestoneModal(false)} size="sm">
              Cancel
            </Button>
            <Button
              onClick={handleAddMilestone}
              loading={saving}
              disabled={!mform.title.trim()}
              size="sm"
            >
              Add Milestone
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showTemplateSaveModal}
        onClose={() => setShowTemplateSaveModal(false)}
        title="Save as Template"
        size="sm"
      >
        <div className="space-y-3">
          <p className="text-xs text-[var(--text-secondary)]">
            Save this project's milestones as a reusable template for future projects.
          </p>
          <div>
            <label className="form-label">Template name *</label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. Web Design Project"
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-sm placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveAsTemplate();
              }}
            />
          </div>
          <div>
            <label className="form-label">Description (optional)</label>
            <textarea
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              placeholder="Brief description of this template..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-sm placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowTemplateSaveModal(false)} size="sm">
              Cancel
            </Button>
            <Button
              onClick={handleSaveAsTemplate}
              loading={saving}
              disabled={!templateName.trim()}
              size="sm"
            >
              Save Template
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Project"
        message={`Are you sure you want to delete "${confirmDelete?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
      {selectedProject && (
        <ArchetypeFeatureTabs screen="projects" context={{ projectId: selectedProject }} />
      )}
    </div>
  );
}
