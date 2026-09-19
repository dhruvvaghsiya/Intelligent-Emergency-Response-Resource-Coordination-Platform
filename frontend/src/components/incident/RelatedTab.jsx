/* =========================================================================
   RELATED TAB — §21 Correlation & Merge
   Shows confirmed/pending IncidentLinks on this incident, plus a
   "Find related incidents" search that scores nearby incidents and lets
   an operator confirm a link or merge a duplicate in.
   ========================================================================= */
import React, { useState } from 'react';
import { Search, Link2, GitMerge, X, RefreshCw } from 'lucide-react';
import { PanelSection } from '../ui/Panel';
import { Button } from '../ui/Button';
import { incidentsApi } from '../../lib/api';
import { useStore } from '../../lib/store';

const BAND_COLOR = {
  DUPLICATE: 'text-sev-critical',
  LIKELY_SAME: 'text-sev-high',
  RELATED: 'text-sev-moderate',
  INDEPENDENT: 'text-text-muted',
};

export function RelatedTab({ incident }) {
  const [candidates, setCandidates] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const fetchIncidentDetail = useStore(s => s.fetchIncidentDetail);
  const fetchIncidents = useStore(s => s.fetchIncidents);

  const links = incident.links || [];

  const findCandidates = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await incidentsApi.candidates(incident.id);
      setCandidates(data.filter(c => c.band !== 'INDEPENDENT'));
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Failed to search for related incidents');
    } finally {
      setLoading(false);
    }
  };

  const linkAs = async (candidateIncidentId, relation) => {
    setBusyId(candidateIncidentId);
    setError('');
    try {
      await incidentsApi.addLink(incident.id, candidateIncidentId, relation);
      await fetchIncidentDetail(incident.id);
      setCandidates(prev => prev?.filter(c => c.incident_id !== candidateIncidentId) ?? null);
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Failed to link incident');
    } finally {
      setBusyId(null);
    }
  };

  const mergeIn = async (candidateIncidentId) => {
    setBusyId(candidateIncidentId);
    setError('');
    try {
      await incidentsApi.merge(incident.id, [candidateIncidentId], 'Confirmed duplicate via correlation candidates');
      // fetchIncidents() replaces the whole (summary-only) incidents array — it must resolve
      // before fetchIncidentDetail() merges the full detail back in, or the detail fields
      // (evidence, beliefs, assignments, links) get silently wiped by the summary refresh.
      await fetchIncidents();
      await fetchIncidentDetail(incident.id);
      setCandidates(prev => prev?.filter(c => c.incident_id !== candidateIncidentId) ?? null);
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Failed to merge incident');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      {links.length > 0 && (
        <PanelSection title={`Linked incidents (${links.length})`}>
          <div className="space-y-1.5">
            {links.map(link => {
              const otherId = link.from_incident_id === incident.id ? link.to_incident_id : link.from_incident_id;
              return (
                <div key={link.id} className="flex items-center gap-2 px-2.5 py-2 bg-inset border border-border-subtle rounded-[4px]">
                  <Link2 size={12} className="text-text-muted shrink-0" />
                  <span className="font-mono text-[11px] text-text-secondary flex-1 truncate">{otherId}</span>
                  <span className="text-[10px] font-mono uppercase text-text-muted">{link.relation.replace(/_/g, ' ')}</span>
                  {link.confirmed
                    ? <span className="text-[10px] text-accent font-medium uppercase">Confirmed</span>
                    : <span className="text-[10px] text-sev-moderate font-medium uppercase">Pending</span>}
                </div>
              );
            })}
          </div>
        </PanelSection>
      )}

      <PanelSection title="Find related incidents">
        {error && <div className="text-[12px] text-sev-critical mb-2">{error}</div>}

        {candidates === null ? (
          <Button variant="secondary" size="compact" onClick={findCandidates} disabled={loading}>
            <Search size={12} />
            {loading ? 'Searching...' : 'Search nearby incidents'}
          </Button>
        ) : candidates.length === 0 ? (
          <p className="text-[12px] text-text-muted">No related incidents found nearby in time or location.</p>
        ) : (
          <div className="space-y-2">
            {candidates.map(c => (
              <div key={c.incident_id} className="px-2.5 py-2 bg-inset border border-border-subtle rounded-[4px]">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[12px] font-semibold text-text-primary">{c.incident_code}</span>
                  <span className={`text-[10px] font-bold uppercase ${BAND_COLOR[c.band]}`}>{c.band.replace(/_/g, ' ')}</span>
                  <span className="font-mono text-[11px] text-text-muted">{(c.score * 100).toFixed(0)}%</span>
                </div>
                {c.explanation && <p className="text-[11px] text-text-muted mb-1.5">{c.explanation}</p>}
                <div className="flex gap-1.5">
                  <Button variant="ghost" size="compact" disabled={busyId === c.incident_id} onClick={() => linkAs(c.incident_id, 'RELATED_TO')}>
                    <Link2 size={11} />
                    Link
                  </Button>
                  {(c.band === 'DUPLICATE' || c.band === 'LIKELY_SAME') && (
                    <Button variant="primary" size="compact" disabled={busyId === c.incident_id} onClick={() => mergeIn(c.incident_id)}>
                      <GitMerge size={11} />
                      Merge in
                    </Button>
                  )}
                  <Button
                    variant="ghost" size="compact"
                    onClick={() => setCandidates(prev => prev.filter(x => x.incident_id !== c.incident_id))}
                  >
                    <X size={11} />
                    Dismiss
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="ghost" size="compact" onClick={findCandidates} disabled={loading}>
              <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
              Refresh
            </Button>
          </div>
        )}
      </PanelSection>
    </div>
  );
}
