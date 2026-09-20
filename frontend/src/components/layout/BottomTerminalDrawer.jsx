/* =========================================================================
   BOTTOM TERMINAL DRAWER — Vertically-Stacked Left Floating Triggers & 10-12% Terminal Console
   Replaces full-width bottom strips with 2 frosted-glass buttons at bottom-left
   and an interactive 10-12% height terminal console drawer.
   ========================================================================= */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Radio, Zap, X, Play, Square, Terminal, CheckCircle2, Power, Activity } from 'lucide-react';
import { useStore } from '../../lib/store';
import { formatTime } from '../../lib/format';
import { SEVERITY_CONFIG } from '../../lib/constants';
import { adminApi } from '../../lib/api';
import { hasPermission, PERMISSIONS } from '../../lib/permissions';

// Only scenarios with a real backend handler (modules/admin/scenarios.js) belong here — this list
// previously had 2 extra entries with no server-side implementation ("highway_pileup_sg",
// "cascade_monsoon"): buttons that looked real but silently did nothing when clicked.
const SCENARIOS = [
  { id: 'flood_sabarmati', name: 'Flood Inundation — Sabarmati Basin', desc: '14 multi-source reports, deduplication clustering → coverage hole in West Zone', duration: '4 min', durationSeconds: 240 },
  { id: 'industrial_fire_vatva', name: 'Chemical Fire — Vatva GIDC', desc: 'Conflicting toxicity reports, belief probability fusion, dynamic severity escalation', duration: '3 min', durationSeconds: 180 },
];

const SOURCE_SHORT_LABEL = {
  EMERGENCY_CALL: '108 Call', CITIZEN_APP: 'Citizen App', CITIZEN_SMS: 'Citizen SMS',
  SOCIAL_MEDIA: 'Social', IOT_SENSOR: 'IoT Sensor', CCTV_ANALYTICS: 'CCTV',
  FIELD_UNIT: 'Field Unit', HOSPITAL: 'Hospital', GOV_DEPARTMENT: 'Gov Dept',
};
const INTENSITY_STEPS = [0.5, 1, 2, 3];
const SOURCE_ACTIVITY_WINDOW_MS = 60_000;

export function BottomTerminalDrawer() {
  const { liveFeed, sidebarOpen, selectedIncidentId, sourceActivityLog, user } = useStore();
  const canRunSimulation = hasPermission(user, PERMISSIONS.RUN_SIMULATION);
  const [activeTerminal, setActiveTerminal] = useState(null); // 'feed' | 'sim' | null

  // Simulation Engine State (2 hand-scripted "signature" replays)
  const [running, setRunning] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [speed, setSpeed] = useState(5);
  const [progress, setProgress] = useState(0);
  const startedAtRef = useRef(null);
  const feedEndRef = useRef(null);

  // Live World Engine — the always-on multi-source feed, independent of the 2 scripted replays.
  const [worldEngine, setWorldEngine] = useState({ running: false, intensity: 1 });
  const [worldEngineBusy, setWorldEngineBusy] = useState(false);

  const refreshWorldEngineStatus = () => {
    adminApi.worldEngineStatus().then(setWorldEngine).catch(() => {});
  };

  useEffect(() => {
    if (!canRunSimulation) return;
    refreshWorldEngineStatus();
    const poll = setInterval(refreshWorldEngineStatus, 8000);
    return () => clearInterval(poll);
  }, [canRunSimulation]);

  const handleToggleWorldEngine = async () => {
    setWorldEngineBusy(true);
    try {
      const next = worldEngine.running ? await adminApi.stopWorldEngine() : await adminApi.startWorldEngine(worldEngine.intensity || 1);
      setWorldEngine((prev) => ({ ...prev, ...next }));
    } catch { /* best-effort */ }
    setWorldEngineBusy(false);
  };

  const handleWorldEngineIntensity = async (intensity) => {
    setWorldEngine((prev) => ({ ...prev, intensity }));
    if (!worldEngine.running) return;
    try {
      const next = await adminApi.startWorldEngine(intensity);
      setWorldEngine((prev) => ({ ...prev, ...next }));
    } catch { /* best-effort */ }
  };

  // Real-time per-source tally over the last 60s, fed by the report.ingested socket event
  // (lib/store.js) — recomputed from the rolling log on every render, no separate pruning needed.
  const sourceCounts = useMemo(() => {
    const cutoff = Date.now() - SOURCE_ACTIVITY_WINDOW_MS;
    const counts = {};
    for (const entry of sourceActivityLog) {
      if (entry.ts < cutoff) break; // log is newest-first
      counts[entry.source_type] = (counts[entry.source_type] || 0) + 1;
    }
    return counts;
  }, [sourceActivityLog]);

  useEffect(() => {
    adminApi.simStatus().then(status => {
      if (status.running) {
        const scenario = SCENARIOS.find(s => s.name === status.name) || null;
        setSelectedScenario(scenario);
        setSpeed(status.speed || 5);
        startedAtRef.current = status.started_at ? new Date(status.started_at).getTime() : Date.now();
        setRunning(true);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!running || !selectedScenario) return;
    const tick = setInterval(() => {
      const elapsedRealMs = Date.now() - startedAtRef.current;
      const elapsedSimSeconds = (elapsedRealMs / 1000) * speed;
      const pct = Math.min(100, (elapsedSimSeconds / (selectedScenario.durationSeconds || 180)) * 100);
      setProgress(pct);
      if (pct >= 100) setRunning(false);
    }, 500);
    return () => clearInterval(tick);
  }, [running, selectedScenario, speed]);

  const handleStart = async (scenario) => {
    try {
      await adminApi.startScenario(scenario.id, speed);
      startedAtRef.current = Date.now();
      setProgress(0);
      setSelectedScenario(scenario);
      setRunning(true);
    } catch {
      // best-effort fallback
      startedAtRef.current = Date.now();
      setProgress(0);
      setSelectedScenario(scenario);
      setRunning(true);
    }
  };

  const handleStop = async () => {
    try {
      await adminApi.stopSim();
    } catch { /* best-effort */ }
    setRunning(false);
    setSelectedScenario(null);
    setProgress(0);
  };

  return (
    <>
      {/* Vertically Aligned Floating Control Buttons — dynamically shifts when sidebar is open */}
      <div
        className={`absolute z-30 flex flex-col gap-2 transition-all duration-300 ${
          sidebarOpen ? 'left-[452px]' : 'left-5'
        } ${
          activeTerminal ? 'bottom-[calc(24vh+14px)]' : 'bottom-5'
        }`}
      >
        {/* Button 1: Event Stream */}
        <button
          type="button"
          onClick={() => setActiveTerminal(activeTerminal === 'feed' ? null : 'feed')}
          className={`
            h-10 px-3.5 rounded-2xl border shadow-md backdrop-blur-xl transition-all flex items-center gap-2.5 cursor-pointer select-none
            ${activeTerminal === 'feed'
              ? 'bg-blue-600 border-blue-500 text-white shadow-blue-500/25 scale-102'
              : 'border-white/60 text-slate-800 hover:scale-105'
            }
          `}
          style={activeTerminal !== 'feed' ? { backgroundColor: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(16px)' } : {}}
          title="Toggle Event Stream"
        >
          <Radio size={20} className={activeTerminal === 'feed' ? 'text-white animate-pulse' : 'text-blue-600 shrink-0'} strokeWidth={2.2} />
          <span className="text-xs font-bold tracking-tight">Event Stream</span>
          <span
            className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
              activeTerminal === 'feed'
                ? 'bg-blue-700 text-white'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            {liveFeed.length}
          </span>
        </button>

        {/* Button 2: Simulation Engine — requires RUN_SIMULATION; nothing view-only lives in this
            tab, so unauthorized operators don't see the button at all rather than a dead one. */}
        {canRunSimulation && (
        <button
          type="button"
          onClick={() => setActiveTerminal(activeTerminal === 'sim' ? null : 'sim')}
          className={`
            h-10 px-3.5 rounded-2xl border shadow-md backdrop-blur-xl transition-all flex items-center gap-2.5 cursor-pointer select-none
            ${activeTerminal === 'sim'
              ? 'bg-blue-600 border-blue-500 text-white shadow-blue-500/25 scale-102'
              : 'border-white/60 text-slate-800 hover:scale-105'
            }
          `}
          style={activeTerminal !== 'sim' ? { backgroundColor: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(16px)' } : {}}
          title="Toggle Simulation Engine"
        >
          <Zap
            size={20}
            className={
              running
                ? 'text-amber-500 fill-amber-500 animate-pulse shrink-0'
                : activeTerminal === 'sim'
                ? 'text-white shrink-0'
                : 'text-blue-600 shrink-0'
            }
            strokeWidth={2.2}
          />
          <span className="text-xs font-bold tracking-tight">Simulation Engine</span>
          {running && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" title="Signature scenario running" />
          )}
          {!running && worldEngine.running && (
            <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LIVE
            </span>
          )}
        </button>
        )}
      </div>

      {/* Terminal Drawer — Transparent Container with Floating White Components (Matching Navbar Theme) */}
      {activeTerminal && (
        <div
          className={`absolute bottom-0 z-30 pointer-events-none flex flex-col select-none pb-3 transition-all duration-300 animate-in slide-in-from-bottom ${
            sidebarOpen ? 'left-[436px] pl-3 pr-4' : 'left-0 px-4'
          } ${
            selectedIncidentId ? 'right-[476px] mr-2' : 'right-0'
          }`}
          style={{
            height: '24vh',
            minHeight: '170px',
            maxHeight: '260px',
            backgroundColor: 'transparent',
          }}
        >
          {/* Floating Transparent Container — Exactly like Navbar's semi-transparent dock */}
          <div
            className="pointer-events-auto h-full w-full rounded-2xl border border-white/20 shadow-lg overflow-hidden relative p-3"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            {/* Floating Close Button in Top-Right Corner — Crisp White Component */}
            <button
              type="button"
              onClick={() => setActiveTerminal(null)}
              className="absolute top-2.5 right-3 z-20 w-7 h-7 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all cursor-pointer shadow-sm"
              title="Close"
            >
              <X size={15} />
            </button>

            {activeTerminal === 'feed' ? (
              /* Event Stream — White Component Cards on Transparent Dock */
              <div className="h-full overflow-y-auto px-1 py-0.5 space-y-1.5 font-mono text-xs pr-10">
                {liveFeed.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="bg-white/90 border border-slate-200 px-4 py-2 rounded-xl text-slate-500 font-sans text-xs shadow-xs">
                      No active incident events currently in buffer...
                    </div>
                  </div>
                ) : (
                  liveFeed.map(item => (
                    <div
                      key={item.id}
                      className="py-1.5 px-3 bg-white/95 hover:bg-white border border-slate-200/80 rounded-xl shadow-xs flex items-center gap-3 transition-colors"
                    >
                      <span className="text-xs font-mono text-slate-500 font-semibold shrink-0">
                        {formatTime(item.ts)}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border shrink-0 ${
                          item.severity === 'CRITICAL'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : item.severity === 'HIGH'
                            ? 'bg-orange-50 text-orange-700 border-orange-200'
                            : item.severity === 'MODERATE'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {item.severity || 'INFO'}
                      </span>
                      <span className="text-xs text-slate-800 font-medium truncate flex-1 font-sans">
                        {item.text}
                      </span>
                    </div>
                  ))
                )}
                <div ref={feedEndRef} />
              </div>
            ) : (
              /* Simulation Engine Controller — White Component Cards on Transparent Dock */
              <div className="h-full pr-10">
                {running ? (
                  <div className="h-full w-full flex items-center justify-between gap-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0 shadow-xs">
                        <Zap size={22} className="animate-pulse" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-base font-bold text-slate-900 truncate">
                          {selectedScenario?.name}
                        </div>
                        <div className="text-xs text-slate-500 truncate mt-1">
                          {selectedScenario?.desc}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      {/* Speed selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500">Speed:</span>
                        <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
                          {[1, 2, 5, 10].map(s => (
                            <button
                              key={s}
                              onClick={() => setSpeed(s)}
                              className={`h-8 px-3 text-xs font-bold transition-colors cursor-pointer ${
                                speed === s ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {s}×
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-36 h-3 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleStop}
                        className="h-9 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
                      >
                        <Square size={13} />
                        Stop Run
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-full grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-3">
                    {/* Live City Feed — the always-on engine, independent of scripted replays */}
                    <div className="h-full flex flex-col justify-between p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm min-w-0">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md font-mono uppercase tracking-wide">
                            Always-On
                          </span>
                          {worldEngine.running && (
                            <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Activity size={13} className="text-emerald-600" /> Live City Feed
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 leading-snug">
                          Continuous reports from 9 sources — calls, citizens, IoT, CCTV, social, field units, hospitals, gov — with procedurally spawned, correlated incidents.
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {Object.keys(sourceCounts).length === 0 ? (
                            <span className="text-[10px] text-slate-400">no activity in last 60s</span>
                          ) : Object.entries(sourceCounts).map(([src, count]) => (
                            <span key={src} className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                              {SOURCE_SHORT_LABEL[src] || src} · {count}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs shrink-0">
                          {INTENSITY_STEPS.map((i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleWorldEngineIntensity(i)}
                              className={`h-8 px-2 text-xs font-bold transition-colors cursor-pointer ${
                                (worldEngine.intensity || 1) === i ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {i}×
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={handleToggleWorldEngine}
                          disabled={worldEngineBusy}
                          className={`flex-1 h-8 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 ${
                            worldEngine.running ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          <Power size={13} />
                          {worldEngine.running ? 'Pause' : 'Start'}
                        </button>
                      </div>
                    </div>

                    {/* Signature Scenario Replay — the 2 hand-scripted, deterministic walkthroughs */}
                    <div className="h-full flex flex-col gap-1.5 min-w-0">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide px-0.5">Signature Scenario Replay</div>
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        {SCENARIOS.map(scenario => (
                          <div
                            key={scenario.id}
                            className="h-full flex flex-col justify-between p-3.5 bg-white hover:bg-white/95 border border-slate-200 hover:border-blue-500 rounded-2xl shadow-sm hover:shadow-md transition-all group"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md font-mono">
                                  {scenario.duration}
                                </span>
                              </div>
                              <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                                {scenario.name}
                              </div>
                              <div className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-snug">
                                {scenario.desc}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleStart(scenario)}
                              className="mt-2 w-full h-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                            >
                              <Play size={11} fill="currentColor" />
                              Run Scenario
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
