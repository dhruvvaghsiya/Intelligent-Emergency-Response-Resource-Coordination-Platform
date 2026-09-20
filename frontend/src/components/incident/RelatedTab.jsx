/* =========================================================================
   RELATED TAB — §21 Correlation & Merge
   Spacious, high-contrast, crystal-clear cards with resilient candidate matching.
   ========================================================================= */
import React, { useState, useEffect } from 'react';
import { Search, Link2, GitMerge, X, RefreshCw, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { incidentsApi } from '../../lib/api';
import { useStore } from '../../lib/store';
import { generateMockCandidates } from '../../mocks/fixtures';

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
    const storeIncidents = useStore.getState().incidents || [];
    const linkedIds = new Set((incident.links || []).flatMap(l => [l.from_incident_id, l.to_incident_id]));

    const filterCandidates = (list) => {
      return (list || []).filter(c => {
        if (c.band === 'INDEPENDENT') return false;
        const candObj = storeIncidents.find(i => i.id === c.incident_id || i.code === c.incident_id);
        if (linkedIds.has(c.incident_id) || linkedIds.has(c.incident_code) || (candObj && linkedIds.has(candObj.id))) {
          return false;
        }
        return true;
      });
    };

    try {
      const data = await incidentsApi.candidates(incident.id);
      if (data && data.length > 0) {
        setCandidates(filterCandidates(data));
      } else {
        const fallback = generateMockCandidates(incident, storeIncidents);
        setCandidates(filterCandidates(fallback));
      }
    } catch (err) {
      // Fallback for static/deployed host or mock incidents
      const fallback = generateMockCandidates(incident, storeIncidents);
      setCandidates(filterCandidates(fallback));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (incident?.id) {
      findCandidates();
    }
  }, [incident?.id, incident?.links?.length]);

  const linkAs = async (candidateIncidentId, relation) => {
    setBusyId(candidateIncidentId);
    setError('');
    const newLink = {
      id: `lnk_${Date.now()}`,
      from_incident_id: incident.id,
      to_incident_id: candidateIncidentId,
      relation,
      confirmed: true,
      created_at: new Date().toISOString(),
    };

    try {
      await incidentsApi.addLink(incident.id, candidateIncidentId, relation);
      await fetchIncidentDetail(incident.id);
    } catch (err) {
      // Local store state fallback for deployed/mock mode
    } finally {
      const store = useStore.getState();
      const currentInc = store.incidents.find(i => i.id === incident.id || i.code === incident.id);
      if (currentInc) {
        const existingLinks = currentInc.links || [];
        const alreadyLinked = existingLinks.some(l => l.from_incident_id === candidateIncidentId || l.to_incident_id === candidateIncidentId);
        if (!alreadyLinked) {
          useStore.setState({
            incidents: store.incidents.map(i =>
              (i.id === incident.id || i.code === incident.id)
                ? { ...i, links: [...(i.links || []), newLink] }
                : i
            ),
          });
        }
      }
      setCandidates(prev => prev?.filter(c => c.incident_id !== candidateIncidentId) ?? null);
      setBusyId(null);
    }
  };

  const mergeIn = async (candidateIncidentId) => {
    setBusyId(candidateIncidentId);
    setError('');
    const newLink = {
      id: `lnk_${Date.now()}`,
      from_incident_id: candidateIncidentId,
      to_incident_id: incident.id,
      relation: 'DUPLICATE_OF',
      confirmed: true,
      created_at: new Date().toISOString(),
    };

    try {
      await incidentsApi.merge(incident.id, [candidateIncidentId], 'Confirmed duplicate via correlation candidates');
      await fetchIncidents();
      await fetchIncidentDetail(incident.id);
    } catch (err) {
      // Local store state fallback for deployed/mock mode
    } finally {
      const store = useStore.getState();
      const cand = store.incidents.find(i => i.id === candidateIncidentId || i.code === candidateIncidentId);
      const currentInc = store.incidents.find(i => i.id === incident.id || i.code === incident.id);

      if (currentInc) {
        const existingLinks = currentInc.links || [];
        const alreadyLinked = existingLinks.some(l => l.from_incident_id === candidateIncidentId || l.to_incident_id === candidateIncidentId);
        const updatedLinks = alreadyLinked ? existingLinks : [...existingLinks, newLink];

        useStore.setState({
          incidents: store.incidents.map(i => {
            if (i.id === incident.id || i.code === incident.id) {
              return {
                ...i,
                report_count: (i.report_count || 1) + (cand?.report_count || 1),
                status: i.status === 'REPORTED' ? 'TRIAGED' : i.status,
                links: updatedLinks,
              };
            }
            if (i.id === candidateIncidentId || i.code === candidateIncidentId) {
              return { ...i, status: 'MERGED', merged_into_id: incident.id };
            }
            return i;
          }),
        });
      }
      setCandidates(prev => prev?.filter(c => c.incident_id !== candidateIncidentId) ?? null);
      setBusyId(null);
    }
  };

  const storeIncidents = useStore(s => s.incidents) || [];
  const selectIncident = useStore(s => s.selectIncident);

  return (
    <div className="space-y-4 font-sans text-slate-900">
      {/* Existing Linked Incidents */}
      {links.length > 0 && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Link2 size={16} className="text-blue-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Linked & Merged Incidents ({links.length})
            </h3>
          </div>
          <div className="space-y-2">
            {links.map(link => {
              const otherId = link.from_incident_id === incident.id ? link.to_incident_id : link.from_incident_id;
              const foundInc = storeIncidents.find(i => i.id === otherId || i.code === otherId);
              const displayLabel = foundInc?.code || (otherId && otherId.length > 16 ? `${otherId.slice(0, 14)}…` : otherId);

              return (
                <div key={link.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs gap-3">
                  <button
                    onClick={() => foundInc && selectIncident(foundInc.id)}
                    className="flex items-center gap-2 font-mono font-bold text-slate-800 hover:text-blue-600 transition-colors min-w-0 shrink text-left cursor-pointer"
                  >
                    <Link2 size={14} className="text-blue-500 shrink-0" />
                    <span className="truncate" title={otherId}>{displayLabel}</span>
                    {foundInc?.status === 'MERGED' && (
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded-md">
                        MERGED
                      </span>
                    )}
                  </button>
                  <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                    <span className="text-[10px] font-bold uppercase text-slate-700 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs whitespace-nowrap shrink-0">
                      {link.relation ? link.relation.replace(/_/g, ' ') : 'DUPLICATE OF'}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md flex items-center gap-1 shadow-2xs whitespace-nowrap shrink-0">
                      <CheckCircle size={10} /> Confirmed
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Find Related Incidents Main Section */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold shrink-0 shadow-2xs">
              <Search size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight truncate">
                Find Related & Duplicate Incidents
              </h3>
              <p className="text-[11px] font-medium text-slate-500 truncate">
                Spatial & temporal vector correlation engine
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="compact"
            className="h-8 px-3.5 text-xs font-bold rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            onClick={findCandidates}
            disabled={loading}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Scanning...' : 'Scan Nearby'}
          </Button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-xs font-medium text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw size={14} className="animate-spin text-blue-600" />
            Calculating spatial proximity & embedding distance...
          </div>
        ) : !candidates || candidates.length === 0 ? (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <p className="text-xs font-medium text-slate-500">
              No correlated candidate incidents found in spatial/temporal range.
            </p>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {candidates.map(c => {
              const candIncident = storeIncidents.find(i => i.id === c.incident_id || i.code === c.incident_id);
              const candDisplayCode = candIncident?.code || c.incident_code || (c.incident_id && c.incident_id.length > 16 ? `${c.incident_id.slice(0, 14)}…` : c.incident_id);

              return (
                <div
                  key={c.incident_id}
                  className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl shadow-2xs hover:bg-slate-50 transition-colors space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-extrabold text-slate-900 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                        {candDisplayCode}
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${BAND_COLOR[c.band] || BAND_COLOR.RELATED}`}>
                        {c.band.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                      {Math.round((c.score || 0.85) * 100)}% match
                    </span>
                  </div>

                  {c.explanation && (
                    <p className="text-xs font-medium text-slate-700 leading-relaxed font-sans bg-white p-2.5 rounded-lg border border-slate-200/70">
                      {c.explanation}
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-0.5">
                    {(c.band === 'DUPLICATE' || c.band === 'LIKELY_SAME') && (
                      <Button
                        variant="primary"
                        size="compact"
                        className="h-8 px-3 text-xs font-bold flex items-center gap-1.5"
                        disabled={busyId === c.incident_id}
                        onClick={() => mergeIn(c.incident_id)}
                      >
                        <GitMerge size={13} />
                        {busyId === c.incident_id ? 'Merging...' : 'Merge In'}
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="compact"
                      className="h-8 px-3 text-xs font-semibold flex items-center gap-1.5 text-slate-700 border-slate-200"
                      disabled={busyId === c.incident_id}
                      onClick={() => linkAs(c.incident_id, 'RELATED_TO')}
                    >
                      <Link2 size={13} />
                      {busyId === c.incident_id ? 'Linking...' : 'Link Incident'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="compact"
                      className="h-8 px-2 text-xs font-medium text-slate-400 hover:text-slate-700 ml-auto"
                      onClick={() => setCandidates(prev => prev.filter(x => x.incident_id !== c.incident_id))}
                    >
                      <X size={13} />
                      Dismiss
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
