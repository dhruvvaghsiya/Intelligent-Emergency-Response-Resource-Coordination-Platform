/* =========================================================================
   REPLAY PAGE — §W6 Operational Time Travel
   Time scrubber over the real event log (§29 GET /replay)
   ========================================================================= */
import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Play, Pause, SkipBack, SkipForward, Clock, Rewind, FastForward } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { replayApi } from '../lib/api';
import { formatTime, formatDateTime } from '../lib/format';

export function ReplayPage() {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [position, setPosition] = useState(50); // 0-100 percentage

  const { data, isLoading } = useQuery({
    queryKey: ['replay'],
    queryFn: () => replayApi.list({ limit: 2000 }),
  });

  const events = data?.data || [];
  const startTime = events.length ? new Date(events[0].ts) : new Date(Date.now() - 6 * 3600000);
  const endTime = events.length ? new Date(events[events.length - 1].ts) : new Date();
  const currentTime = new Date(startTime.getTime() + (endTime.getTime() - startTime.getTime()) * position / 100);

  const nearestEvent = useMemo(() => {
    if (!events.length) return null;
    const t = currentTime.getTime();
    return events.reduce((best, e) => {
      const d = Math.abs(new Date(e.ts).getTime() - t);
      return !best || d < best.d ? { d, event: e } : best;
    }, null)?.event;
  }, [events, currentTime]);

  useEffect(() => {
    if (!playing) return;
    const tick = setInterval(() => {
      setPosition(p => {
        const next = p + speed * 0.5;
        if (next >= 100) {
          setPlaying(false);
          return 100;
        }
        return next;
      });
    }, 200);
    return () => clearInterval(tick);
  }, [playing, speed]);

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-4">
      <div className="max-w-[1200px] mx-auto w-full flex-1 flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <Clock size={24} className="text-accent" />
          <h1 className="text-[21px] font-semibold text-text-primary">Operational Replay</h1>
          <span className="text-[11px] text-text-muted font-mono">{events.length} events</span>
        </div>

        {/* Event display */}
        <div className="flex-1 bg-surface border border-border-subtle rounded-[4px] mb-4 flex items-center justify-center overflow-y-auto">
          {isLoading ? (
            <p className="text-[13px] text-text-muted">Loading event log…</p>
          ) : nearestEvent ? (
            <div className="text-center max-w-[560px] p-4">
              <Clock size={32} className="text-text-muted mx-auto mb-3 opacity-40" />
              <p className="text-[15px] text-text-secondary font-medium mb-1">
                Viewing: {formatDateTime(currentTime.toISOString())}
              </p>
              <p className="text-[13px] text-accent font-mono mb-2">{nearestEvent.type}</p>
              <pre className="text-[11px] text-text-muted text-left bg-inset rounded-[4px] p-2 overflow-x-auto">
                {JSON.stringify(nearestEvent.payload, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="text-center">
              <Clock size={48} className="text-text-muted mx-auto mb-3 opacity-30" />
              <p className="text-[15px] text-text-secondary font-medium mb-1">No events recorded yet</p>
              <p className="text-[12px] text-text-muted">
                Run a simulation scenario or ingest reports to populate the event log.
              </p>
            </div>
          )}
        </div>

        {/* Scrubber */}
        <div className="bg-surface border border-border-subtle rounded-[4px] p-4">
          {/* Time range */}
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[11px] text-text-muted">{formatTime(startTime.toISOString())}</span>
            <span className="font-mono text-[13px] font-semibold text-accent">{formatTime(currentTime.toISOString())}</span>
            <span className="font-mono text-[11px] text-text-muted">{formatTime(endTime.toISOString())}</span>
          </div>

          {/* Slider */}
          <input
            type="range"
            min={0}
            max={100}
            value={position}
            onChange={e => setPosition(Number(e.target.value))}
            className="w-full h-[6px] bg-inset rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-canvas
            "
          />

          {/* Controls */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <Button variant="ghost" size="icon" onClick={() => setPosition(Math.max(0, position - 10))}>
              <SkipBack size={14} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setSpeed(s => Math.max(0.5, s / 2))}>
              <Rewind size={14} />
            </Button>
            <Button
              variant="primary"
              size="icon"
              onClick={() => setPlaying(!playing)}
              className="w-[36px] h-[36px]"
            >
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setSpeed(s => Math.min(20, s * 2))}>
              <FastForward size={14} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setPosition(Math.min(100, position + 10))}>
              <SkipForward size={14} />
            </Button>
            <span className="ml-2 font-mono text-[12px] text-text-muted">{speed}×</span>
          </div>
        </div>
      </div>
    </div>
  );
}
