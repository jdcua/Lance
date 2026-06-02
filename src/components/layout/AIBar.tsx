import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { queryLocalAI } from '../../ai';

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

  const prompt = screenPrompts[location.pathname];

  useEffect(() => {
    setInsight('');
    setExpanded(false);
    if (prompt) {
      queryLocalAI(prompt).then((result) => {
        if (result) setInsight(result);
      });
    }
  }, [prompt, location.pathname]);

  if (!insight) return null;

  return (
    <div className="border-b border-[#E5E5E3] bg-gradient-to-r from-[#E6F1FB] to-[#EEF8F3]">
      <div className="flex items-start gap-2 px-6 py-2.5">
        <Sparkles size={14} className="text-[#1D9E75] mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 w-full text-left"
          >
            <span className={`text-xs text-[#1C1C1A] leading-relaxed ${expanded ? '' : 'truncate'}`}>
              {insight}
            </span>
            {insight.length > 120 && (
              expanded
                ? <ChevronUp size={14} className="text-[#6B6B67] flex-shrink-0" />
                : <ChevronDown size={14} className="text-[#6B6B67] flex-shrink-0" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
