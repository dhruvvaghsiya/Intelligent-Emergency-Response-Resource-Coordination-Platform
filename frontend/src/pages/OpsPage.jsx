/* =========================================================================
   OPS PAGE — Situation Console
   §14.3: Left rail (queue) + Centre (map) + Right rail (detail) + Bottom (feed)
   80% of the demo lives here
   ========================================================================= */
import React from 'react';
import { IncidentQueue } from '../components/incident/IncidentQueue';
import { IncidentDetail } from '../components/incident/IncidentDetail';
import { SituationMap } from '../components/map/SituationMap';
import { LiveFeed } from '../components/layout/LiveFeed';
import { useStore } from '../lib/store';

export function OpsPage() {
  const { selectedIncidentId } = useStore();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {/* Left rail — Incident Queue */}
        <IncidentQueue />

        {/* Centre — Situation Map */}
        <SituationMap />

        {/* Right rail — Incident Detail (conditional) */}
        {selectedIncidentId && <IncidentDetail />}
      </div>

      {/* Bottom — Live Feed */}
      <LiveFeed />
    </div>
  );
}
