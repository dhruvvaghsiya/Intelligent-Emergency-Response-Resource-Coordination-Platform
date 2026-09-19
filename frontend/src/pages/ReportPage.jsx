/* =========================================================================
   PUBLIC REPORT FORM — §W4 Public reporting
   Mobile-first, 3 fields + GPS, no auth required
   ========================================================================= */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Send, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { INCIDENT_TYPE } from '../lib/constants';
import { reportsApi } from '../lib/api';

const inputClass = `
  w-full h-[42px] px-3.5 bg-black/25 border border-border-subtle rounded-[var(--radius-md)]
  text-[13.5px] text-text-primary placeholder:text-text-muted
  focus:border-accent/60 focus:bg-black/40 focus:outline-none
  focus:shadow-[0_0_0_3px_rgba(45,212,191,0.15)]
  transition-all duration-200
`;

export function ReportPage() {
  const [submitted, setSubmitted] = useState(false);
  const [reportId, setReportId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
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
          setForm(f => ({ ...f, location: { lat: 23.0258, lng: 72.5714 } }));
          setLocating(false);
        }
      );
    } else {
      setForm(f => ({ ...f, location: { lat: 23.0258, lng: 72.5714 } }));
      setLocating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const location = form.location || { lat: 23.0258, lng: 72.5714 };
      const data = await reportsApi.submit({
        source_type: 'CITIZEN_APP',
        source_label: form.contact || 'Anonymous citizen report',
        text: form.description,
        location,
        structured: { type: form.type },
      });
      setReportId(data.report_id);
      setSubmitted(true);
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 relative overflow-y-auto">
      <div className="fixed inset-0 -z-10">
        <div className="aurora-bg" />
        <div className="grain-overlay" />
      </div>

      <div className="min-h-full flex items-center justify-center py-10 px-4">
        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-strong rounded-[var(--radius-xl)] p-10 text-center max-w-[440px]"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
                className="relative mx-auto mb-5 w-16 h-16"
              >
                <div className="absolute inset-0 blur-2xl bg-status-available/40 rounded-full" />
                <CheckCircle2 size={64} className="relative text-status-available" strokeWidth={1.5} />
              </motion.div>
              <h2 className="text-[22px] font-bold text-text-primary mb-2 tracking-tight">Report Submitted</h2>
              <p className="text-[13.5px] text-text-secondary mb-5 leading-relaxed">
                Your report has been received and will be processed by our coordination team.
                A tracking ID will be sent to your contact if provided.
              </p>
              <p className="text-[11px] text-text-muted font-mono mb-6 px-3 py-2 bg-black/25 rounded-[var(--radius-sm)] inline-block">
                REF: {reportId || `RPT-${Date.now().toString(36).toUpperCase()}`}
              </p>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => { setSubmitted(false); setReportId(null); setForm({ type: 'UNKNOWN', description: '', location: null, contact: '' }); }}
              >
                Submit another report
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-[480px]"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="relative">
                  <div className="absolute inset-0 blur-lg bg-accent/40 rounded-full" />
                  <div className="relative w-10 h-10 rounded-xl glass-strong flex items-center justify-center">
                    <AlertTriangle size={19} className="text-accent" />
                  </div>
                </div>
                <h1 className="text-[22px] font-bold text-text-primary tracking-tight">Report an Emergency</h1>
              </div>

              <p className="text-[13px] text-text-secondary mb-5 leading-relaxed">
                Submit an emergency report to the Prahari coordination center. Your report will be reviewed and
                correlated with other incoming information. No login required.
              </p>

              <form onSubmit={handleSubmit} className="glass-strong rounded-[var(--radius-xl)] p-6 space-y-5">
                {/* Type */}
                <div>
                  <label className="block text-[12px] font-medium text-text-secondary mb-1.5">What happened?</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className={`${inputClass} cursor-pointer`}
                  >
                    {INCIDENT_TYPE.map(type => (
                      <option key={type} value={type} className="bg-raised">{type.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[12px] font-medium text-text-secondary mb-1.5">Description</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Describe what you see: location details, number of people affected, visible hazards..."
                    rows={4}
                    className={`${inputClass} h-auto py-3 resize-none`}
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-[12px] font-medium text-text-secondary mb-1.5">Location</label>
                  {form.location ? (
                    <div className="flex items-center gap-2 px-3.5 h-[42px] bg-black/25 border border-accent/30 rounded-[var(--radius-md)]">
                      <MapPin size={14} className="text-accent shrink-0" />
                      <span className="font-mono text-[12px] text-text-primary flex-1">
                        {form.location.lat.toFixed(4)}°N, {form.location.lng.toFixed(4)}°E
                      </span>
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, location: null }))}
                        className="text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <Button variant="secondary" onClick={getLocation} disabled={locating} className="w-full h-[42px]">
                      <MapPin size={14} />
                      {locating ? 'Getting location...' : 'Use my current location'}
                    </Button>
                  )}
                </div>

                {/* Contact */}
                <div>
                  <label className="block text-[12px] font-medium text-text-secondary mb-1.5">Contact (optional)</label>
                  <input
                    type="text"
                    value={form.contact}
                    onChange={e => setForm(f => ({ ...f, contact: e.target.value }))}
                    placeholder="Phone number or email"
                    className={inputClass}
                  />
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-3.5 py-2.5 bg-sev-critical-bg border border-sev-critical/30 rounded-[var(--radius-md)] text-[12.5px] text-sev-critical overflow-hidden"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  variant="primary"
                  className="w-full h-[44px] text-[14px]"
                  disabled={!form.description || submitting}
                >
                  <Send size={14} />
                  {submitting ? 'Submitting...' : 'Submit Report'}
                </Button>
              </form>

              <p className="text-[11px] text-text-muted text-center mt-5 font-mono tracking-wide">
                SIM · Reports are processed through the standard AI pipeline
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
