/* =========================================================================
   STALE BANNER — §14.2 Component Rules
   Shows when connection drops. STALE means "data is old — actions disabled".
   Never shows stale data as if it were live.
   ========================================================================= */
import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Button } from '../ui/Button';
import { formatRelativeTime } from '../../lib/format';

export function StaleBanner() {
  const { connectionStatus, lastEventAt, setConnectionStatus } = useStore();

  if (connectionStatus === 'connected') return null;

  const isStale = connectionStatus === 'stale';
  const isReconnecting = connectionStatus === 'reconnecting';

  return (
    <div className={`
      flex items-center gap-2 px-4 py-2 text-[12px] font-medium shrink-0
      ${isStale
        ? 'bg-sev-high-bg border-b border-sev-high/30 text-sev-high'
        : 'bg-sev-moderate-bg border-b border-sev-moderate/30 text-sev-moderate'
      }
    `}>
      <WifiOff size={14} />
      {isStale ? (
        <>
          <span>
            DATA STALE — Last update {formatRelativeTime(lastEventAt)}.
            Actions are disabled until connection is restored.
          </span>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="compact"
            onClick={() => setConnectionStatus('connected')}
            className="text-sev-high"
          >
            <RefreshCw size={12} />
            Retry
          </Button>
        </>
      ) : (
        <>
          <span>Reconnecting to server...</span>
          <RefreshCw size={12} className="animate-spin" />
        </>
      )}
    </div>
  );
}
