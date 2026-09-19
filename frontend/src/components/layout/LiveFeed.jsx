/* =========================================================================
   LIVE FEED — Collapsible bottom event ticker (Light Theme)
   ========================================================================= */
 import React from 'react';
 import { ChevronUp, ChevronDown, Radio } from 'lucide-react';
 import { useStore } from '../../lib/store';
 import { SEVERITY_CONFIG } from '../../lib/constants';
 import { formatTime } from '../../lib/format';

export function LiveFeed() {
  const { liveFeed, liveFeedExpanded, toggleLiveFeed } = useStore();

  return (
    <div className="border-t border-slate-200 bg-white shrink-0 z-20">
      {/* Toggle bar */}
      <button
        onClick={toggleLiveFeed}
        className="w-full h-8 px-4 flex items-center gap-2.5 hover:bg-slate-50 transition-colors cursor-pointer text-left select-none"
      >
        <Radio size={12} className="text-blue-600 shrink-0" />
        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Event Stream
        </span>
        <span className="text-xs text-slate-400 font-mono">
          ({liveFeed.length})
        </span>
        <div className="flex-1" />
        <span className="text-xs text-slate-400 mr-2 hidden sm:inline">
          {liveFeedExpanded ? 'Collapse' : 'Expand Stream'}
        </span>
        {liveFeedExpanded ? (
          <ChevronDown size={14} className="text-slate-400" />
        ) : (
          <ChevronUp size={14} className="text-slate-400" />
        )}
      </button>

      {/* Feed items */}
      {liveFeedExpanded && (
        <div className="max-h-[160px] overflow-y-auto border-t border-slate-100 divide-y divide-slate-100 bg-slate-50/50">
          {liveFeed.map(item => {
            const config = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.INFO;
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 px-4 py-2 hover:bg-white transition-colors"
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${config.color.replace('text-', 'bg-')}`} />
                <span className="font-mono text-xs text-slate-400 shrink-0 w-14">
                  {formatTime(item.ts)}
                </span>
                <span className="text-sm text-slate-700 flex-1 truncate">
                  {item.text}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
