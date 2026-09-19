/* =========================================================================
   SIMULATION CONTROLS — Scenario Launcher & Speed Regulator (Light Theme)
   ========================================================================= */
import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Zap, Clock, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '../ui/Button';
import { SimBadge } from '../ui/Chip';
import { adminApi } from '../../lib/api';

// Duration (seconds) matches the last event's `t` in backend/src/modules/admin/scenarios.js —
// only scenarios defined there actually run; there is no server-side handler for anything else.
const SCENARIOS = [
  { id: 'flood_sabarmati', name: 'Flood Inundation — Sabarmati Basin', desc: '14 multi-source reports, deduplication clustering → coverage hole in West Zone', duration: '4 min' },
  { id: 'industrial_fire_vatva', name: 'Chemical Fire — Vatva GIDC', desc: 'Conflicting toxicity reports, belief probability fusion, dynamic severity escalation', duration: '3 min' },
  { id: 'highway_pileup_sg', name: 'Mass Casualty Collision — SG Highway', desc: '9 reports in 90s, Hungarian matrix dispatch vs greedy heuristic', duration: '3 min' },
  { id: 'cascade_monsoon', name: 'Cascading Monsoon Emergency', desc: 'Flash flood → power outage → road closures → multi-unit preemption', duration: '5 min' },
];

export function SimControls() {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [speed, setSpeed] = useState(5);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const startedAtRef = useRef(null);

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
      const pct = Math.min(100, (elapsedSimSeconds / selectedScenario.durationSeconds) * 100);
      setProgress(pct);
      if (pct >= 100) setRunning(false);
    }, 500);
    return () => clearInterval(tick);
  }, [running, selectedScenario, speed]);

  const handleStart = async (scenario) => {
    setError('');
    try {
      await adminApi.startScenario(scenario.id, speed);
      startedAtRef.current = Date.now();
      setProgress(0);
      setSelectedScenario(scenario);
      setRunning(true);
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Failed to start scenario');
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
    <div className="border-t border-slate-200 bg-white shrink-0 z-20 select-none">
      {/* Toggle bar */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full h-8 px-4 flex items-center gap-2 hover:bg-slate-50 transition-colors cursor-pointer text-left"
      >
        <Zap size={13} className="text-blue-600" />
        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Simulation Engine
        </span>
        {running && (
          <span className="flex items-center gap-1.5 text-xs text-blue-700 font-medium pl-2.5 border-l border-slate-200">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            {selectedScenario?.name} · {speed}× Speed
          </span>
        )}
        <div className="flex-1" />
        <span className="text-xs text-slate-400 mr-2 hidden sm:inline">
          {open ? 'Hide Controls' : 'Open Controls'}
        </span>
        {open ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronUp size={14} className="text-slate-400" />}
      </button>

      {/* Drawer */}
      {open && (
        <div className="border-t border-slate-200 p-5 bg-slate-50/50">
          {running ? (
            <div className="space-y-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              {/* Running scenario */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    {selectedScenario?.name}
                    <SimBadge />
                  </div>
                  <div className="text-sm text-slate-500 mt-0.5">{selectedScenario?.desc}</div>
                </div>

                {/* Speed control */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Speed:</span>
                  <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white">
                    {[1, 2, 5, 10].map(s => (
                      <button
                        key={s}
                        onClick={() => setSpeed(s)}
                        className={`
                          h-7 px-2.5 text-xs font-semibold cursor-pointer transition-colors
                          ${speed === s
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-600 hover:bg-slate-50'
                          }
                        `}
                      >
                        {s}×
                      </button>
                    ))}
                  </div>
                </div>

                <Button variant="danger" size="compact" onClick={handleStop}>
                  <Square size={13} />
                  Stop Run
                </Button>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full transition-all duration-1000" style={{ width: '42%' }} />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Launch an Emergency Response Scenario
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SCENARIOS.map(scenario => (
                  <div
                    key={scenario.id}
                    className="flex items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-900">{scenario.name}</div>
                      <div className="text-xs text-slate-500 truncate mt-0.5">{scenario.desc}</div>
                    </div>
                    <span className="text-xs text-slate-400 font-medium shrink-0">{scenario.duration}</span>
                    <Button variant="secondary" size="compact" onClick={() => handleStart(scenario)}>
                      <Play size={12} className="text-blue-600" />
                      Run
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
