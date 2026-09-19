/* =========================================================================
   RELATED TAB — §21 Correlation & Merge
   ========================================================================= */
import React, { useState } from 'react';
import { Search, Link2, GitMerge, X, RefreshCw } from 'lucide-react';
import { PanelSection } from '../ui/Panel';
import { Button } from '../ui/Button';
import { incidentsApi } from '../../lib/api';
import { useStore } from '../../lib/store';

const BAND_COLOR = {
  DUPLICATE: 'text-red-700 bg-red-50 border-red-200',
  LIKELY_SAME: 'text-orange-700 bg-orange-50 border-orange-200',
  RELATED: 'text-amber-700 bg-amber-50 border-amber-200',
  INDEPENDENT: 'text-slate-600 bg-slate-100 border-slate-200',
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
    <div className="space-y-5">
      {links.length > 0 && (
        <PanelSection title={`Linked incidents (${links.length})`}>
          <div className="space-y-2">
            {links.map(link => {
              const otherId = link.from_incident_id === incident.id ? link.to_incident_id : link.from_incident_id;
              return (
                <div key={link.id} className="flex items-center gap-2.5 px-3 py-2.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
                  <Link2 size={14} className="text-slate-400 shrink-0" />
                  <span className="font-mono text-xs font-semibold text-slate-800 flex-1 truncate">{otherId}</span>
                  <span className="text-[10px] font-bold uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">{link.relation.replace(/_/g, ' ')}</span>
                  {link.confirmed
                    ? <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md font-bold">Confirmed</span>
                    : <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-bold">Pending</span>}
                </div>
              );
            })}
          </div>
        </PanelSection>
      )}

      <PanelSection title="Find related incidents">
        {error && <div className="text-xs text-red-600 font-semibold mb-2">{error}</div>}

        {candidates === null ? (
          <Button variant="secondary" size="compact" className="h-9 px-3.5 text-xs font-semibold rounded-xl border-slate-200" onClick={findCandidates} disabled={loading}>
            <Search size={14} />
            {loading ? 'Searching...' : 'Search nearby incidents'}
          </Button>
        ) : candidates.length === 0 ? (
          <p className="text-xs text-slate-500 font-medium">No related incidents found nearby in time or location.</p>
        ) : (
          <div className="space-y-3">
            {candidates.map(c => (
              <div key={c.incident_id} className="p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-900">{c.incident_code}</span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${BAND_COLOR[c.band]}`}>{c.band.replace(/_/g, ' ')}</span>
                  <span className="font-mono text-xs font-bold text-slate-500">{(c.score * 100).toFixed(0)}% match</span>
                </div>
                {c.explanation && <p className="text-xs text-slate-600 font-sans">{c.explanation}</p>}
                <div className="flex gap-2 pt-1">
                  <Button variant="ghost" size="compact" className="h-8 px-2.5 text-xs font-semibold" disabled={busyId === c.incident_id} onClick={() => linkAs(c.incident_id, 'RELATED_TO')}>
                    <Link2 size={12} />
                    Link
                  </Button>
                  {(c.band === 'DUPLICATE' || c.band === 'LIKELY_SAME') && (
                    <Button variant="primary" size="compact" className="h-8 px-3 text-xs font-semibold" disabled={busyId === c.incident_id} onClick={() => mergeIn(c.incident_id)}>
                      <GitMerge size={12} />
                      Merge in
                    </Button>
                  )}
                  <Button
                    variant="ghost" size="compact" className="h-8 px-2 text-xs text-slate-500"
                    onClick={() => setCandidates(prev => prev.filter(x => x.incident_id !== c.incident_id))}
                  >
                    <X size={12} />
                    Dismiss
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="ghost" size="compact" className="h-8 px-3 text-xs font-semibold" onClick={findCandidates} disabled={loading}>
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Refresh
            </Button>
          </div>
        )}
      </PanelSection>
    </div>
  );
}
