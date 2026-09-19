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

        {/* Floating Overlay Left Rail — Incident Queue (Slides in ABOVE map) */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0.0, 0.2, 1] }}
              className="absolute top-16 left-0 bottom-0 z-30 w-[440px] max-w-[90vw] shadow-2xl overflow-hidden"
            >
              <IncidentQueue />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right rail — Incident Detail (conditional) */}
        {selectedIncidentId && <IncidentDetail />}

        {/* Bottom Left Vertically-Stacked Buttons & 10-12% Height Terminal Console Drawer */}
        <BottomTerminalDrawer />
      </div>
    </div>
  );
}
