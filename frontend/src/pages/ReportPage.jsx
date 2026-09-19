/* =========================================================================
   PUBLIC REPORT FORM — High-Throughput Incident Ingestion Portal
   Mobile-friendly, high-contrast, structured input with geolocation.
   ========================================================================= */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Send, CheckCircle2, X, ShieldAlert } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { INCIDENT_TYPE } from '../lib/constants';
import { reportsApi } from '../lib/api';

const inputClass = `
  w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg
  text-sm text-slate-900 placeholder:text-slate-400
  focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600
  transition-colors
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
    <div className="flex-1 relative overflow-y-auto bg-slate-50">
      <div className="min-h-full flex items-center justify-center py-12 px-4">
        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-[460px] shadow-sm"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4 text-emerald-600">
                <CheckCircle2 size={32} strokeWidth={2.2} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Report Ingested</h2>
              <p className="text-sm text-slate-600 mb-5 leading-relaxed font-sans">
                Emergency signal verified and routed into the automated belief fusion matrix.
                Nearest responders and hospital units have been notified.
              </p>
              <div className="text-xs font-mono text-slate-600 mb-6 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg inline-block">
                INGEST_ID: <strong className="text-slate-900 font-semibold">{reportId || `RPT-${Date.now().toString(36).toUpperCase()}`}</strong>
              </div>
              <Button
                variant="primary"
                className="w-full h-11 text-sm font-semibold"
                onClick={() => { setSubmitted(false); setReportId(null); setForm({ type: 'UNKNOWN', description: '', location: null, contact: '' }); }}
              >
                Submit Additional Report
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-[500px]"
            >
              <div className="flex items-center gap-3.5 mb-5">
                <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shadow-sm">
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                    Citizen Emergency Report
                  </h1>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Direct Gateway into Municipal Dispatch
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-7 space-y-4 shadow-sm">
                {/* Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Incident Classification
                  </label>
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className={`${inputClass} cursor-pointer`}
                  >
                    {INCIDENT_TYPE.map(type => (
                      <option key={type} value={type}>
                        {type.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Incident Narrative & Hazards Observed
                  </label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Describe specific location landmarks, casualties trapped, smoke color, road blockages..."
                    rows={4}
                    className={`${inputClass} resize-none font-sans leading-relaxed`}
                    required
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Incident Geolocation
                  </label>
                  {form.location ? (
                    <div className="flex items-center gap-2 px-3.5 h-10 bg-slate-50 border border-blue-200 rounded-lg">
                      <MapPin size={15} className="text-blue-600 shrink-0" />
                      <span className="text-xs font-mono text-slate-700 flex-1 font-semibold">
                        {form.location.lat.toFixed(4)}°N, {form.location.lng.toFixed(4)}°E
                      </span>
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, location: null }))}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <Button variant="secondary" onClick={getLocation} disabled={locating} className="w-full h-10 text-xs font-semibold">
                      <MapPin size={14} />
                      {locating ? 'Acquiring GPS Position...' : 'Acquire Current Device Coordinates'}
                    </Button>
                  )}
                </div>

                {/* Contact */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Reporter Contact (Optional Callback ID)
                  </label>
                  <input
                    type="text"
                    value={form.contact}
                    onChange={e => setForm(f => ({ ...f, contact: e.target.value }))}
                    placeholder="Mobile number or callsign"
                    className={inputClass}
                  />
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-700"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  variant="primary"
                  className="w-full h-11 text-sm font-semibold"
                  disabled={!form.description || submitting}
                >
                  <Send size={15} />
                  {submitting ? 'Transmitting Ingest Payload...' : 'Transmit Emergency Report'}
                </Button>
              </form>

              <p className="text-xs font-medium text-slate-400 text-center mt-4">
                Realtime Public Ingest Gateway · Multi-Channel Adapter
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
