/* =========================================================================
   REPLAY PAGE — Operational Time Travel & Event Stream Playback
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
    <div className="flex-1 overflow-hidden flex flex-col p-8 bg-slate-50">
      <div className="max-w-[1200px] mx-auto w-full flex-1 flex flex-col space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
              <Clock size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Time-Travel Event Replay
              </h1>
              <p className="text-sm font-medium text-slate-500 mt-0.5">
                Deterministic Post-Incident Timeline Reconstruction & Telemetry Scrubbing
              </p>
            </div>
          </div>
          <span className="text-xs font-medium text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm">
            Log Buffer: <strong className="text-slate-900 font-semibold">{events.length}</strong> events
          </span>
        </div>

        {/* Event display window */}
        <div className="flex-1 bg-white border border-slate-200 rounded-xl flex items-center justify-center overflow-y-auto p-8 shadow-sm">
          {isLoading ? (
            <p className="text-sm font-medium text-slate-500">Buffering system event stream...</p>
          ) : nearestEvent ? (
            <div className="text-center max-w-[660px] w-full p-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto mb-3 text-blue-600">
                <Clock size={24} />
              </div>
              <p className="text-sm font-semibold text-slate-900 mb-2">
                Timestamp: {formatDateTime(currentTime.toISOString())}
              </p>
              <div className="inline-block px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-4">
                Event: {nearestEvent.type}
              </div>
              <pre className="text-xs font-mono text-slate-800 text-left bg-slate-50 border border-slate-200 rounded-xl p-4 overflow-x-auto shadow-sm leading-relaxed">
                {JSON.stringify(nearestEvent.payload, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Clock size={32} />
              </div>
              <p className="text-base font-semibold text-slate-900 mb-1">No telemetry recorded in selected slice</p>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                Trigger simulated incident scenarios or submit reports to populate the event log stream.
              </p>
            </div>
          )}
        </div>

        {/* Scrubber & Controls */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          {/* Time range labels */}
          <div className="flex items-center justify-between mb-3 text-slate-500 text-xs font-medium">
            <span>{formatTime(startTime.toISOString())}</span>
            <span className="font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-md">
              Current: {formatTime(currentTime.toISOString())}
            </span>
            <span>{formatTime(endTime.toISOString())}</span>
          </div>

          {/* Slider */}
          <input
            type="range"
            min={0}
            max={100}
            value={position}
            onChange={e => setPosition(Number(e.target.value))}
            className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer border border-slate-200
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-sm
            "
          />

          {/* Controls */}
          <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-slate-100">
            <Button variant="ghost" size="icon" onClick={() => setPosition(Math.max(0, position - 10))}>
              <SkipBack size={15} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setSpeed(s => Math.max(0.5, s / 2))}>
              <Rewind size={15} />
            </Button>
            <Button
              variant="primary"
              size="icon"
              onClick={() => setPlaying(!playing)}
              className="w-10 h-10 rounded-full shadow-sm"
            >
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setSpeed(s => Math.min(20, s * 2))}>
              <FastForward size={15} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setPosition(Math.min(100, position + 10))}>
              <SkipForward size={15} />
            </Button>
            <span className="ml-3 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
              {speed}×
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
