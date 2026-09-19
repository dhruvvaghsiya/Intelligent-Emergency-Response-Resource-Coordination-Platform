/* =========================================================================
   LIVE FEED — Collapsible bottom ticker
   §14.3: Live Feed strip + Sim controls (admin only)
   ========================================================================= */
import React from 'react';
import { ChevronUp, ChevronDown, Radio } from 'lucide-react';
import { useStore } from '../../lib/store';
import { SEVERITY_CONFIG } from '../../lib/constants';
import { formatTime } from '../../lib/format';
import { Button } from '../ui/Button';

export function LiveFeed() {
  const { liveFeed, liveFeedExpanded, toggleLiveFeed } = useStore();

  return (
    <div className="border-t border-border-subtle bg-surface shrink-0">
      {/* Toggle bar */}
      <button
        onClick={toggleLiveFeed}
        className="w-full h-[28px] px-3 flex items-center gap-2 hover:bg-hover transition-colors cursor-pointer"
      >
        <Radio size={10} className="text-accent animate-pulse" />
        <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
          Live Feed
        </span>
        <span className="text-[10px] text-text-muted font-mono">
          ({liveFeed.length})
        </span>
        <div className="flex-1" />
        {liveFeedExpanded ? <ChevronDown size={12} className="text-text-muted" /> : <ChevronUp size={12} className="text-text-muted" />}
      </button>

      {/* Feed items */}
      {liveFeedExpanded && (
        <div className="max-h-[160px] overflow-y-auto border-t border-border-subtle">
          {liveFeed.map(item => {
            const config = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.INFO;
            return (
              <div
                key={item.id}
                className="flex items-center gap-2 px-3 py-1 border-b border-border-subtle last:border-b-0 hover:bg-hover transition-colors"
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.color.replace('text-', 'bg-')}`} />
                <span className="font-mono text-[10px] text-text-muted shrink-0 w-[56px]">
                  {formatTime(item.ts)}
                </span>
                <span className="text-[12px] text-text-secondary flex-1 truncate">
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
