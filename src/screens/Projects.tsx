import { useEffect, useState } from 'react';
import { useStore } from '../store';
import type { Project, Milestone } from '../types';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import ProgressBar from '../components/ui/ProgressBar';
import { Plus, Pencil, Trash2, CheckCircle2, Circle, Calendar, DollarSign, ChevronRight } from 'lucide-react';

const statusBadge: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  active: 'success',
  completed: 'info',
  paused: 'warning',
  cancelled: 'danger',
};

export default function Projects() {
  const { projects, loadProjects, addProject, updateProject, removeProject, clients, loadClients, milestones, loadMilestones, addMilestone, updateMilestone, removeMilestone } = useStore();
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);
  const [pform, setPForm] = useState({ client_id: '', title: '', status: 'active', start_date: '', end_date: '', budget: '', notes: '' });
  const [mform, setMForm] = useState({ title: '', due_date: '', invoice_on_completion: false });

  useEffect(() => {
    loadProjects();
    loadClients();
  }, [loadProjects, loadClients]);

  const openNewProject = () => {
    setEditingProject(null);
    setPForm({ client_id: '', title: '', status: 'active', start_date: '', end_date: '', budget: '', notes: '' });
    setShowProjectModal(true);
  };

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

  const handleSaveProject = async () => {
    if (!pform.title.trim() || !pform.client_id) return;
    setSaving(true);
    try {
      const data = {
        client_id: pform.client_id,
        title: pform.title,
        status: pform.status as Project['status'],
        start_date: pform.start_date || undefined,
        end_date: pform.end_date || undefined,
        budget: pform.budget ? parseFloat(pform.budget) : undefined,
        notes: pform.notes || undefined,
      };
      if (editingProject) {
        await updateProject({ ...editingProject, ...data, status: data.status });
      } else {
        await addProject(data);
      }
      setShowProjectModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (window.confirm('Delete this project? This cannot be undone.')) {
      await removeProject(id);
    }
  };

  const openMilestones = (projectId: string) => {
    setSelectedProject(selectedProject === projectId ? null : projectId);
    if (!milestones[projectId]) {
      loadMilestones(projectId);
    }
  };

  const handleAddMilestone = async () => {
    if (!selectedProject || !mform.title.trim()) return;
    setSaving(true);
    try {
      await addMilestone({
        project_id: selectedProject,
        title: mform.title,
        due_date: mform.due_date || undefined,
        completed: false,
        invoice_on_completion: mform.invoice_on_completion,
      });
      setMForm({ title: '', due_date: '', invoice_on_completion: false });
      setShowMilestoneModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMilestone = async (m: Milestone) => {
    await updateMilestone({ ...m, completed: !m.completed });
  };

  const handleDeleteMilestone = async (id: string) => {
    await removeMilestone(id);
  };

  const getClientName = (clientId: string) => clients.find((c) => c.id === clientId)?.name || 'Unknown';

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-[#1C1C1A]">Projects</h2>
          <p className="text-sm text-[#6B6B67] mt-0.5">
            {projects.filter((p) => p.status === 'active').length} active, {projects.length} total
          </p>
        </div>
        <Button onClick={openNewProject} size="sm" disabled={clients.length === 0}>
          <Plus size={14} />
          New Project
        </Button>
      </div>

      {clients.length === 0 && (
        <Card className="mb-4 border-[#FAEEDA] bg-[#FAEEDA]/50">
          <p className="text-sm text-[#854F0B]">
            Add at least one client before creating a project.
          </p>
        </Card>
      )}

      {projects.length === 0 ? (
        <Card className="text-center py-12">
          <h3 className="text-sm font-medium text-[#6B6B67] mb-1">No projects yet</h3>
          <p className="text-xs text-[#A3A39E] mb-4">Create your first project to start tracking work.</p>
          <Button onClick={openNewProject} size="sm" variant="secondary" disabled={clients.length === 0}>
            <Plus size={14} />
            New Project
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => {
            const projectMilestones = milestones[project.id] || [];
            const completedMs = projectMilestones.filter((m) => m.completed).length;
            const totalMs = projectMilestones.length;
            return (
              <div key={project.id}>
                <Card className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-[#1C1C1A]">{project.title}</h3>
                      <Badge variant={statusBadge[project.status] || 'default'}>{project.status}</Badge>
                    </div>
                    <p className="text-xs text-[#6B6B67] mb-2">{getClientName(project.client_id)}</p>
                    <div className="flex items-center gap-4 text-xs text-[#A3A39E] mb-2">
                      {project.start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(project.start_date).toLocaleDateString()}
                        </span>
                      )}
                      {project.budget && (
                        <span className="flex items-center gap-1">
                          <DollarSign size={12} />
                          ${project.budget.toLocaleString()}
                        </span>
                      )}
                    </div>
                    {totalMs > 0 && (
                      <div className="w-48">
                        <ProgressBar value={completedMs} max={totalMs} label={`${completedMs}/${totalMs} milestones`} size="sm" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                    <button
                      onClick={() => openMilestones(project.id)}
                      className={`p-1.5 rounded-[8px] transition-colors ${selectedProject === project.id ? 'text-[#1D9E75] bg-[#E6F5EE]' : 'text-[#A3A39E] hover:text-[#1C1C1A] hover:bg-[#F2F2F0]'}`}
                    >
                      <ChevronRight size={14} className={`transition-transform ${selectedProject === project.id ? 'rotate-90' : ''}`} />
                    </button>
                    <button
                      onClick={() => openEditProject(project)}
                      className="p-1.5 rounded-[8px] text-[#A3A39E] hover:text-[#1C1C1A] hover:bg-[#F2F2F0] transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteProject(project.id)}
                      className="p-1.5 rounded-[8px] text-[#A3A39E] hover:text-[#A32D2D] hover:bg-[#FCEBEB] transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Card>

                {/* Milestones panel */}
                {selectedProject === project.id && (
                  <div className="ml-4 mt-2 space-y-2 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#6B6B67]">Milestones</span>
                      <button
                        onClick={() => { setShowMilestoneModal(true); setMForm({ title: '', due_date: '', invoice_on_completion: false }); }}
                        className="text-xs text-[#1D9E75] hover:underline"
                      >
                        + Add
                      </button>
                    </div>
                    {projectMilestones.length === 0 ? (
                      <p className="text-xs text-[#A3A39E] pl-2">No milestones yet. Add one to track progress.</p>
                    ) : (
                      projectMilestones.map((m) => (
                        <div key={m.id} className="flex items-center gap-2 pl-2">
                          <button onClick={() => handleToggleMilestone(m)} className="flex-shrink-0">
                            {m.completed ? (
                              <CheckCircle2 size={16} className="text-[#1D9E75]" />
                            ) : (
                              <Circle size={16} className="text-[#D4D4D2]" />
                            )}
                          </button>
                          <span className={`text-xs flex-1 ${m.completed ? 'line-through text-[#A3A39E]' : 'text-[#1C1C1A]'}`}>
                            {m.title}
                          </span>
                          {m.invoice_on_completion && (
                            <Badge variant="info">invoice</Badge>
                          )}
                          {m.due_date && (
                            <span className="text-[10px] text-[#A3A39E]">{new Date(m.due_date).toLocaleDateString()}</span>
                          )}
                          <button
                            onClick={() => handleDeleteMilestone(m.id)}
                            className="text-[#A3A39E] hover:text-[#A32D2D]"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Project Modal */}
      <Modal open={showProjectModal} onClose={() => setShowProjectModal(false)} title={editingProject ? 'Edit Project' : 'New Project'} size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#6B6B67] mb-1">Client *</label>
            <select
              value={pform.client_id}
              onChange={(e) => setPForm({ ...pform, client_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E5E3] rounded-[8px] focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]/20"
            >
              <option value="">Select a client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6B6B67] mb-1">Title *</label>
            <input
              type="text"
              value={pform.title}
              onChange={(e) => setPForm({ ...pform, title: e.target.value })}
              placeholder="Project title"
              className="w-full px-3 py-2 text-sm border border-[#E5E5E3] rounded-[8px] placeholder:text-[#A3A39E] focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]/20"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#6B6B67] mb-1">Status</label>
              <select
                value={pform.status}
                onChange={(e) => setPForm({ ...pform, status: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E5E3] rounded-[8px] focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]/20"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B6B67] mb-1">Budget</label>
              <input
                type="number"
                value={pform.budget}
                onChange={(e) => setPForm({ ...pform, budget: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm border border-[#E5E5E3] rounded-[8px] placeholder:text-[#A3A39E] focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]/20"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#6B6B67] mb-1">Start Date</label>
              <input
                type="date"
                value={pform.start_date}
                onChange={(e) => setPForm({ ...pform, start_date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E5E3] rounded-[8px] focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B6B67] mb-1">End Date</label>
              <input
                type="date"
                value={pform.end_date}
                onChange={(e) => setPForm({ ...pform, end_date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E5E3] rounded-[8px] focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]/20"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6B6B67] mb-1">Notes</label>
            <textarea
              value={pform.notes}
              onChange={(e) => setPForm({ ...pform, notes: e.target.value })}
              placeholder="Project notes..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-[#E5E5E3] rounded-[8px] placeholder:text-[#A3A39E] focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]/20 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowProjectModal(false)} size="sm">Cancel</Button>
            <Button onClick={handleSaveProject} loading={saving} disabled={!pform.title.trim() || !pform.client_id} size="sm">
              {editingProject ? 'Save Changes' : 'Create Project'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Milestone Modal */}
      <Modal open={showMilestoneModal} onClose={() => setShowMilestoneModal(false)} title="Add Milestone" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#6B6B67] mb-1">Title *</label>
            <input
              type="text"
              value={mform.title}
              onChange={(e) => setMForm({ ...mform, title: e.target.value })}
              placeholder="Milestone name"
              className="w-full px-3 py-2 text-sm border border-[#E5E5E3] rounded-[8px] placeholder:text-[#A3A39E] focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]/20"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6B6B67] mb-1">Due Date</label>
            <input
              type="date"
              value={mform.due_date}
              onChange={(e) => setMForm({ ...mform, due_date: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E5E3] rounded-[8px] focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]/20"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={mform.invoice_on_completion}
              onChange={(e) => setMForm({ ...mform, invoice_on_completion: e.target.checked })}
              className="w-4 h-4 rounded border-[#D4D4D2] text-[#1D9E75] focus:ring-[#1D9E75]"
            />
            <span className="text-xs text-[#6B6B67]">Trigger invoice on completion</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowMilestoneModal(false)} size="sm">Cancel</Button>
            <Button onClick={handleAddMilestone} loading={saving} disabled={!mform.title.trim()} size="sm">Add Milestone</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
