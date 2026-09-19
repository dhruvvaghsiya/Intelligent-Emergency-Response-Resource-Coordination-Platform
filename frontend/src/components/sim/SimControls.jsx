/* =========================================================================
   SIMULATION CONTROLS — Bottom drawer for scenario launcher
   §29: Start/stop scenarios, speed control, clock display
   ========================================================================= */
import React, { useEffect, useRef, useState } from 'react';
import { Play, Square, Zap, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '../ui/Button';
import { SimBadge } from '../ui/Chip';
import { adminApi } from '../../lib/api';

// Duration (seconds) matches the last event's `t` in backend/src/modules/admin/scenarios.js —
// only scenarios defined there actually run; there is no server-side handler for anything else.
const SCENARIOS = [
  { id: 'flood_sabarmati', name: 'Flood — Sabarmati', desc: '14 reports, 6 locations, duplicate compression → coverage hole', durationSeconds: 160 },
  { id: 'industrial_fire_vatva', name: 'Industrial Fire — Vatva', desc: 'Conflicting reports, belief fusion, severity recompute', durationSeconds: 95 },
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
    <div className="border-t border-border-subtle bg-surface">
      {/* Toggle bar */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full h-[28px] px-3 flex items-center gap-2 hover:bg-hover transition-colors cursor-pointer"
      >
        <Zap size={10} className="text-accent" />
        <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
          Simulation
        </span>
        {running && (
          <span className="flex items-center gap-1 text-[10px] text-accent font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            {selectedScenario?.name} · {speed}×
          </span>
        )}
        <div className="flex-1" />
        {open ? <ChevronDown size={12} className="text-text-muted" /> : <ChevronUp size={12} className="text-text-muted" />}
      </button>

      {/* Drawer */}
      {open && (
        <div className="border-t border-border-subtle p-3">
          {running ? (
            <div className="space-y-3">
              {/* Running scenario */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="text-[13px] font-medium text-text-primary flex items-center gap-2">
                    {selectedScenario?.name}
                    <SimBadge />
                  </div>
                  <div className="text-[11px] text-text-muted mt-0.5">{selectedScenario?.desc}</div>
                </div>

                {/* Speed control */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-text-muted">Speed:</span>
                  {[1, 2, 5, 10].map(s => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`
                        h-[24px] px-2 rounded text-[11px] font-mono cursor-pointer border transition-colors
                        ${speed === s
                          ? 'bg-accent-muted text-accent border-accent/30'
                          : 'bg-transparent text-text-muted border-border-subtle hover:border-border-strong'
                        }
                      `}
                    >
                      {s}×
                    </button>
                  ))}
                </div>

                <Button variant="danger" size="compact" onClick={handleStop}>
                  <Square size={12} />
                  Stop
                </Button>
              </div>

              {/* Real progress, derived from elapsed time vs scenario duration */}
              <div className="h-[3px] bg-inset rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="text-[11px] text-text-muted uppercase tracking-wider mb-2">
                Launch a scenario
              </div>
              {error && (
                <div className="text-[11px] text-sev-critical mb-1.5">{error}</div>
              )}
              {SCENARIOS.map(scenario => (
                <div
                  key={scenario.id}
                  className="flex items-center gap-3 px-2.5 py-2 bg-inset border border-border-subtle rounded-[4px] hover:border-border-strong transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-text-primary">{scenario.name}</div>
                    <div className="text-[11px] text-text-muted truncate">{scenario.desc}</div>
                  </div>
                  <span className="text-[10px] text-text-muted font-mono shrink-0">{Math.round(scenario.durationSeconds / 60)} min</span>
                  <Button variant="primary" size="compact" onClick={() => handleStart(scenario)}>
                    <Play size={12} />
                    Start
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
