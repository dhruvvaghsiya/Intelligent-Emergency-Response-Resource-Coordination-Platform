/* =========================================================================
   PUBLIC REPORT FORM — §W4 Public reporting
   Mobile-first, 3 fields + GPS, no auth required
   ========================================================================= */
import React, { useState } from 'react';
import { MapPin, Send, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { INCIDENT_TYPE } from '../lib/constants';

export function ReportPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    type: 'UNKNOWN',
    description: '',
    location: null,
    contact: '',
  });
  const [locating, setLocating] = useState(false);

  const getLocation = () => {
    setLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setForm(f => ({ ...f, location: { lat: pos.coords.latitude, lng: pos.coords.longitude } }));
          setLocating(false);
        },
        () => {
          // Fallback to Ahmedabad center
          setForm(f => ({ ...f, location: { lat: 23.0258, lng: 72.5714 } }));
          setLocating(false);
        }
      );
    } else {
      setForm(f => ({ ...f, location: { lat: 23.0258, lng: 72.5714 } }));
      setLocating(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Mock submit
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center max-w-[400px]">
          <CheckCircle size={48} className="text-status-available mx-auto mb-4" />
          <h2 className="text-[21px] font-semibold text-text-primary mb-2">Report Submitted</h2>
          <p className="text-[13px] text-text-secondary mb-4">
            Your report has been received and will be processed by our coordination team. 
            A tracking ID will be sent to your contact if provided.
          </p>
          <p className="text-[11px] text-text-muted font-mono mb-4">
            REF: RPT-{Date.now().toString(36).toUpperCase()}
          </p>
          <Button variant="secondary" onClick={() => { setSubmitted(false); setForm({ type: 'UNKNOWN', description: '', location: null, contact: '' }); }}>
            Submit another report
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="max-w-[480px] mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={24} className="text-accent" />
          <h1 className="text-[21px] font-semibold text-text-primary">Report an Emergency</h1>
        </div>

        <p className="text-[13px] text-text-secondary mb-4">
          Submit an emergency report to the Prahari coordination center. Your report will be reviewed and 
          correlated with other incoming information. No login required.
        </p>

        <form onSubmit={handleSubmit} className="bg-surface border border-border-subtle rounded-[6px] p-4 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-[12px] text-text-secondary mb-1">What happened?</label>
            <select
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              className="w-full h-[32px] px-3 bg-inset border border-border-subtle rounded-[4px] text-[13px] text-text-primary focus:border-border-focus focus:outline-none"
            >
              {INCIDENT_TYPE.map(type => (
                <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[12px] text-text-secondary mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Describe what you see: location details, number of people affected, visible hazards..."
              rows={4}
              className="w-full px-3 py-2 bg-inset border border-border-subtle rounded-[4px] text-[13px] text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none resize-none"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-[12px] text-text-secondary mb-1">Location</label>
            {form.location ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-inset border border-border-subtle rounded-[4px]">
                <MapPin size={14} className="text-accent" />
                <span className="font-mono text-[12px] text-text-primary">
                  {form.location.lat.toFixed(4)}°N, {form.location.lng.toFixed(4)}°E
                </span>
                <Button variant="ghost" size="compact" onClick={() => setForm(f => ({ ...f, location: null }))}>
                  Change
                </Button>
              </div>
            ) : (
              <Button variant="secondary" onClick={getLocation} disabled={locating} className="w-full">
                <MapPin size={14} />
                {locating ? 'Getting location...' : 'Use my current location'}
              </Button>
            )}
          </div>

          {/* Contact */}
          <div>
            <label className="block text-[12px] text-text-secondary mb-1">Contact (optional)</label>
            <input
              type="text"
              value={form.contact}
              onChange={e => setForm(f => ({ ...f, contact: e.target.value }))}
              placeholder="Phone number or email"
              className="w-full h-[32px] px-3 bg-inset border border-border-subtle rounded-[4px] text-[13px] text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none"
            />
          </div>

          <Button
            variant="primary"
            className="w-full"
            disabled={!form.description}
          >
            <Send size={14} />
            Submit Report
          </Button>
        </form>

        <p className="text-[11px] text-text-muted text-center mt-4 font-mono">
          SIM · Reports are processed through the standard AI pipeline
        </p>
      </div>
    </div>
  );
}
