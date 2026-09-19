/* =========================================================================
   SIMULATION CONTROLS — Bottom drawer for scenario launcher
   §29: Start/stop scenarios, speed control, clock display
   ========================================================================= */
import React, { useState } from 'react';
import { Play, Pause, Square, Zap, Clock, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '../ui/Button';
import { SimBadge } from '../ui/Chip';

const SCENARIOS = [
  { id: 'flood_sabarmati', name: 'Flood — Sabarmati', desc: '14 reports, 6 locations, duplicate compression → coverage hole', duration: '4 min' },
  { id: 'industrial_fire_vatva', name: 'Industrial Fire — Vatva', desc: 'Conflicting reports, belief fusion, severity recompute', duration: '3 min' },
  { id: 'highway_pileup_sg', name: 'Highway Pileup — SG Hwy', desc: '9 reports in 90s, Hungarian vs greedy dispatch', duration: '3 min' },
  { id: 'cascade_monsoon', name: 'Cascade — Monsoon', desc: 'Flood → road closure → coverage hole → reallocation', duration: '5 min' },
];

export function SimControls() {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [speed, setSpeed] = useState(5);

  const handleStart = (scenario) => {
    setSelectedScenario(scenario);
    setRunning(true);
  };

  const handleStop = () => {
    setRunning(false);
    setSelectedScenario(null);
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

              {/* Mock progress */}
              <div className="h-[3px] bg-inset rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full transition-all duration-1000" style={{ width: '35%' }} />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="text-[11px] text-text-muted uppercase tracking-wider mb-2">
                Launch a scenario
              </div>
              {SCENARIOS.map(scenario => (
                <div
                  key={scenario.id}
                  className="flex items-center gap-3 px-2.5 py-2 bg-inset border border-border-subtle rounded-[4px] hover:border-border-strong transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-text-primary">{scenario.name}</div>
                    <div className="text-[11px] text-text-muted truncate">{scenario.desc}</div>
                  </div>
                  <span className="text-[10px] text-text-muted font-mono shrink-0">{scenario.duration}</span>
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
