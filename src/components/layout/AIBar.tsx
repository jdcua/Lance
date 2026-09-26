import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { queryLocalAI } from '../../ai';
import { useStore } from '../../store';

// TODO v1.1: Set AI_ENABLED = true when queryLocalAI() is implemented
// The AIBar shows contextual AI insights per screen. Currently a stub.
const AI_ENABLED = false;

const screenPrompts: Record<string, string> = {
  '/proposals': 'Summarize the current state of proposals. Highlight any that need follow-up.',
  '/contracts': 'Summarize active contracts and any approaching deadlines.',
  '/projects': 'Summarize active projects, their progress, and any risks.',
  '/time': 'Summarize time tracked this week and unbilled hours.',
  '/invoices': 'Summarize outstanding invoices and overdue amounts.',
  '/clients': 'Highlight top clients and any client relationship insights.',
  '/finance': 'Provide a quick financial summary: income, expenses, and profit trend.',
  '/insights': 'Generate business insights based on the current data state.',
};

export default function AIBar() {
  const location = useLocation();
  const [insight, setInsight] = useState('');
  const [expanded, setExpanded] = useState(false);
  const aiEnabled = useStore((s) => s.profile?.ai_enabled ?? false);

  const prompt = screenPrompts[location.pathname];

  useEffect(() => {
    if (!AI_ENABLED) return;
    setInsight('');
    setExpanded(false);
    if (!aiEnabled) return;
    if (prompt) {
      queryLocalAI(prompt).then((result) => {
        if (result) setInsight(result);
      }).catch(() => {});
    } else {
      setInsight('Tip: Use \u2318K to search, \u2318N to create new items, and \u23181-8 to navigate between sections.');
    }
  }, [prompt, location.pathname, aiEnabled]);

  if (!AI_ENABLED) return null;
  if (!aiEnabled || !insight) return null;

  return (
    <div className="border-b border-[var(--border-color)] bg-[var(--accent-bg)] border-l-[3px] border-l-[var(--accent)] print:hidden">
      <div className="flex items-start gap-2 px-6 py-2.5">
        <div className="w-5 h-5 rounded-full bg-[var(--accent)] flex items-center justify-center flex-shrink-0 mt-0.5">
          <Sparkles size={11} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 w-full text-left"
          >
            <span className={`text-xs text-[var(--text-primary)] leading-relaxed ${expanded ? '' : 'truncate'}`}>
              {insight}
            </span>
            {insight.length > 120 && (
              expanded
                ? <ChevronUp size={14} className="text-[var(--text-secondary)] flex-shrink-0" />
                : <ChevronDown size={14} className="text-[var(--text-secondary)] flex-shrink-0" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
