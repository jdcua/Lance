import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { ArrowLeft } from 'lucide-react';

export default function NewProposal() {
  const { clients, loadClients, addProposal } = useStore();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    client_id: '',
    title: '',
    scope: '',
    timeline: '',
    rate: '',
    rate_type: 'flat' as 'flat' | 'hourly',
    body: '',
  });

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const handleSave = async (status: 'draft' | 'sent') => {
    if (!form.title.trim() || !form.client_id) return;
    setSaving(true);
    try {
      await addProposal({
        client_id: form.client_id,
        title: form.title,
        status,
        scope: form.scope,
        timeline: form.timeline || undefined,
        rate: form.rate ? parseFloat(form.rate) : undefined,
        rate_type: form.rate_type,
        body: form.body,
      });
      navigate('/proposals');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <button
        onClick={() => navigate('/proposals')}
        className="flex items-center gap-1.5 text-sm text-[#6B6B67] hover:text-[#1C1C1A] mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Proposals
      </button>

      <h2 className="text-lg font-semibold text-[#1C1C1A] mb-6">New Proposal</h2>

      <Card className="mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#6B6B67] mb-1">Client *</label>
            <select
              value={form.client_id}
              onChange={(e) => setForm({ ...form, client_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E5E3] rounded-[8px] focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]/20"
            >
              <option value="">Select a client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B6B67] mb-1">Proposal Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Website Redesign Proposal"
              className="w-full px-3 py-2 text-sm border border-[#E5E5E3] rounded-[8px] placeholder:text-[#A3A39E] focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]/20"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B6B67] mb-1">Scope of Work</label>
            <textarea
              value={form.scope}
              onChange={(e) => setForm({ ...form, scope: e.target.value })}
              placeholder="Describe the scope of work..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-[#E5E5E3] rounded-[8px] placeholder:text-[#A3A39E] focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]/20 resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#6B6B67] mb-1">Rate Type</label>
              <select
                value={form.rate_type}
                onChange={(e) => setForm({ ...form, rate_type: e.target.value as 'flat' | 'hourly' })}
                className="w-full px-3 py-2 text-sm border border-[#E5E5E3] rounded-[8px] focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]/20"
              >
                <option value="flat">Flat</option>
                <option value="hourly">Hourly</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B6B67] mb-1">Rate ({form.rate_type === 'hourly' ? '$/hr' : '$'})</label>
              <input
                type="number"
                value={form.rate}
                onChange={(e) => setForm({ ...form, rate: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm border border-[#E5E5E3] rounded-[8px] placeholder:text-[#A3A39E] focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B6B67] mb-1">Timeline</label>
              <input
                type="text"
                value={form.timeline}
                onChange={(e) => setForm({ ...form, timeline: e.target.value })}
                placeholder="e.g. 4 weeks"
                className="w-full px-3 py-2 text-sm border border-[#E5E5E3] rounded-[8px] placeholder:text-[#A3A39E] focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B6B67] mb-1">Proposal Body</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Write the full proposal text here. You can generate this with Lance AI later."
              rows={10}
              className="w-full px-3 py-2 text-sm border border-[#E5E5E3] rounded-[8px] placeholder:text-[#A3A39E] focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]/20 resize-none font-mono"
            />
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => navigate('/proposals')} size="md">
          Cancel
        </Button>
        <Button variant="secondary" onClick={() => handleSave('draft')} loading={saving} disabled={!form.title.trim() || !form.client_id} size="md">
          Save Draft
        </Button>
        <Button onClick={() => handleSave('sent')} loading={saving} disabled={!form.title.trim() || !form.client_id} size="md">
          Save &amp; Send
        </Button>
      </div>
    </div>
  );
}
