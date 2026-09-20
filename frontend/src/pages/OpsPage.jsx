/* =========================================================================
   OPS PAGE — Situation Console
   Features floating overlay sidebar (IncidentQueue) above full-screen map.
   ========================================================================= */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IncidentQueue } from '../components/incident/IncidentQueue';
import { IncidentDetail } from '../components/incident/IncidentDetail';
import { SituationMap } from '../components/map/SituationMap';
import { BottomTerminalDrawer } from '../components/layout/BottomTerminalDrawer';
import { useStore } from '../lib/store';

export function OpsPage() {
  const { selectedIncidentId, sidebarOpen } = useStore();

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      <div className="flex-1 flex overflow-hidden relative">
        {/* Centre — Situation Map (100% full screen view, uninterrupted) */}
        <SituationMap />

        {/* Floating Overlay Left Rail — Incident Queue (Slides in ABOVE map, below navbar) */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ x: -24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -24, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.4, 0.0, 0.2, 1] }}
              className="absolute top-20 left-4 bottom-4 z-50 w-[420px] max-w-[90vw] shadow-xl overflow-hidden rounded-2xl border border-white/20 flex flex-col p-2.5"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              }}
            >
              <IncidentQueue />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Overlay Right Rail — Incident Detail (Slides in from right, below navbar) */}
        <AnimatePresence>
          {selectedIncidentId && (
            <motion.div
              initial={{ x: 24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 24, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.4, 0.0, 0.2, 1] }}
              className="absolute top-20 right-4 bottom-4 z-50 w-[460px] max-w-[92vw] shadow-xl overflow-hidden rounded-2xl border border-white/20 flex flex-col p-2.5"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              }}
            >
              <IncidentDetail />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Left Vertically-Stacked Buttons & Terminal Console Drawer */}
        <BottomTerminalDrawer />
      </div>
    </div>
  );
}
