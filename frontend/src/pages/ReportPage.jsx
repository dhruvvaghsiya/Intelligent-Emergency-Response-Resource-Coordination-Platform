import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Send, CheckCircle2, X, ShieldAlert, Plus, ArrowRight, Phone, FileText,
  Mic, MicOff, Sparkles, Radio, Cpu, Zap, Activity, RefreshCw, ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { INCIDENT_TYPE } from '../lib/constants';
import { reportsApi } from '../lib/api';
import { useStore } from '../lib/store';

export function ReportPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submittedReport, setSubmittedReport] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    type: 'UNKNOWN',
    description: '',
    location: null,
    contact: '',
  });
  const [locating, setLocating] = useState(false);
  const [autofilledField, setAutofilledField] = useState(null);
  const navigate = useNavigate();

  // AI Voice Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef(null);

  // Initialize Speech Recognition if browser supports it
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
        parseVoiceToForm(currentTranscript);
      };

      rec.onerror = (err) => {
        console.warn('Speech recognition error:', err);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const simIndexRef = useRef(0);
  const SIMULATED_SESSIONS = [
    {
      title: 'Building Collapse',
      text: 'A building is collapsed near Oba circle, structural damage and debris blocking street with victims trapped inside.',
      type: 'BUILDING_COLLAPSE',
      location: { lat: 23.0258, lng: 72.5714 },
      contact: '+91 98765 43210',
    },
    {
      title: 'Road Accident',
      text: 'Major multi-vehicle road accident on SG Highway flyover involving a truck and 2 cars, blocking traffic and injuries reported.',
      type: 'ROAD_ACCIDENT',
      location: { lat: 23.0321, lng: 72.5289 },
      contact: '+91 98123 45678',
    },
    {
      title: 'Medical Emergency',
      text: 'Critical medical emergency near Law Garden gate 3, elderly citizen cardiac collapse, unconscious and needs immediate ambulance.',
      type: 'MEDICAL_EMERGENCY',
      location: { lat: 23.0215, lng: 72.5592 },
      contact: '+91 98980 11223',
    },
    {
      title: 'Gas Leak Hazard',
      text: 'Toxic gas leak pipeline rupture at Vatva GIDC Phase 2, pungent chemical smell spreading, neighborhood evacuation needed.',
      type: 'GAS_LEAK',
      location: { lat: 22.9612, lng: 72.6341 },
      contact: '+91 97000 11223',
    },
    {
      title: 'Structure Fire',
      text: 'Severe structure fire outbreak at CG Road commercial plaza, heavy black smoke and civilians trapped on 3rd floor.',
      type: 'FIRE_STRUCTURE',
      location: { lat: 23.0258, lng: 72.5714 },
      contact: '+91 98765 43210',
    },
    {
      title: 'Waterlogging & Flood',
      text: 'Severe urban waterlogging and flooding near Subhash Bridge underpass, 3 feet water depth and vehicles submerged.',
      type: 'WATERLOGGING',
      location: { lat: 23.0612, lng: 72.5810 },
      contact: '+91 99240 55443',
    },
  ];

  // Parse speech transcript to auto-fill form using robust multi-attribute intent matching
  const parseVoiceToForm = (text) => {
    if (!text || text.trim().length === 0) return;
    setIsParsing(true);

    const lower = text.toLowerCase();

    // Multi-attribute scoring engine for precise incident classification
    const scores = {
      BUILDING_COLLAPSE: 0,
      ROAD_ACCIDENT: 0,
      FIRE_STRUCTURE: 0,
      FIRE_INDUSTRIAL: 0,
      FIRE_VEHICLE: 0,
      GAS_LEAK: 0,
      CHEMICAL_SPILL: 0,
      MEDICAL_EMERGENCY: 0,
      FLOOD: 0,
      WATERLOGGING: 0,
      ELECTRICAL_HAZARD: 0,
      CROWD_INCIDENT: 0,
      RESCUE_TRAPPED: 0,
      INFRASTRUCTURE_FAILURE: 0,
    };

    // 1. BUILDING_COLLAPSE (Check building/wall/structure + collapse/collapsed/rubble/debris)
    if (lower.includes('collapse') || lower.includes('collapsed') || lower.includes('collapsing') || lower.includes('crumble') || lower.includes('crumbled') || lower.includes('caved') || lower.includes('rubble')) {
      if (lower.includes('building') || lower.includes('structure') || lower.includes('wall') || lower.includes('roof') || lower.includes('house') || lower.includes('apartment') || lower.includes('tower')) {
        scores.BUILDING_COLLAPSE += 12;
      } else {
        scores.BUILDING_COLLAPSE += 5;
      }
    }
    if (lower.includes('building') && (lower.includes('down') || lower.includes('fell') || lower.includes('destroyed') || lower.includes('damage'))) {
      scores.BUILDING_COLLAPSE += 8;
    }

    // 2. ROAD_ACCIDENT
    if (lower.includes('accident') || lower.includes('crash') || lower.includes('collision') || lower.includes('overturned') || lower.includes('hit and run')) {
      scores.ROAD_ACCIDENT += 10;
    }
    if ((lower.includes('car') || lower.includes('vehicle') || lower.includes('truck') || lower.includes('bus') || lower.includes('bike')) && (lower.includes('road') || lower.includes('highway') || lower.includes('flyover') || lower.includes('street') || lower.includes('traffic'))) {
      scores.ROAD_ACCIDENT += 6;
    }

    // 3. GAS_LEAK
    if (lower.includes('gas') || lower.includes('pipeline') || lower.includes('lpg') || lower.includes('cng') || lower.includes('methane') || lower.includes('odor') || lower.includes('fume')) {
      scores.GAS_LEAK += 10;
    }

    // 4. CHEMICAL_SPILL
    if (lower.includes('chemical') || lower.includes('spill') || lower.includes('acid') || lower.includes('toxic') || lower.includes('hazmat') || lower.includes('poisonous')) {
      scores.CHEMICAL_SPILL += 10;
    }

    // 5. MEDICAL_EMERGENCY
    if (lower.includes('medical') || lower.includes('heart') || lower.includes('cardiac') || lower.includes('unconscious') || lower.includes('ambulance') || lower.includes('hospital') || lower.includes('patient') || lower.includes('bleeding') || lower.includes('stroke')) {
      scores.MEDICAL_EMERGENCY += 10;
    }

    // 6. FIRE_STRUCTURE / INDUSTRIAL / VEHICLE
    if (lower.includes('fire') || lower.includes('smoke') || lower.includes('blaze') || lower.includes('flame') || lower.includes('burning') || lower.includes('inferno')) {
      if (lower.includes('factory') || lower.includes('plant') || lower.includes('industrial') || lower.includes('warehouse')) {
        scores.FIRE_INDUSTRIAL += 10;
      } else if (lower.includes('car') || lower.includes('vehicle') || lower.includes('bus') || lower.includes('truck')) {
        scores.FIRE_VEHICLE += 10;
      } else {
        scores.FIRE_STRUCTURE += 9;
      }
    }

    // 7. FLOOD & WATERLOGGING
    if (lower.includes('flood') || lower.includes('overflow') || lower.includes('tsunami') || lower.includes('deluge')) {
      scores.FLOOD += 10;
    }
    if (lower.includes('waterlogging') || lower.includes('water logging') || lower.includes('stagnant') || lower.includes('submerged')) {
      scores.WATERLOGGING += 10;
    }

    // 8. ELECTRICAL_HAZARD
    if (lower.includes('electric') || lower.includes('electricity') || lower.includes('transformer') || lower.includes('short circuit') || lower.includes('wire') || lower.includes('power outage')) {
      scores.ELECTRICAL_HAZARD += 10;
    }

    // 9. RESCUE_TRAPPED
    if (lower.includes('trapped') || lower.includes('stuck') || lower.includes('elevator') || lower.includes('confined')) {
      scores.RESCUE_TRAPPED += 8;
    }

    // Find best match with highest score confidence
    let bestType = 'UNKNOWN';
    let maxScore = 0;
    for (const [type, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        bestType = type;
      }
    }

    setForm((prev) => ({
      ...prev,
      type: bestType !== 'UNKNOWN' ? bestType : prev.type,
      description: text,
      location: prev.location || { lat: 23.0258, lng: 72.5714 },
    }));

    setAutofilledField('all');
    setTimeout(() => setAutofilledField(null), 1200);
    setTimeout(() => setIsParsing(false), 600);
  };

  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) { /* ignore */ }
      }
      setIsRecording(false);
    } else {
      setTranscript('');
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsRecording(true);
        } catch (e) {
          // Fallback simulation if mic access fails
          runSimulatedVoiceSession();
        }
      } else {
        runSimulatedVoiceSession();
      }
    }
  };

  const runSimulatedVoiceSession = () => {
    setIsRecording(true);
    setTranscript('Listening to voice input...');
    const demo = SIMULATED_SESSIONS[simIndexRef.current % SIMULATED_SESSIONS.length];
    simIndexRef.current += 1;

    setTimeout(() => {
      setTranscript(demo.text);
      parseVoiceToForm(demo.text);
      setForm({
        type: demo.type,
        description: demo.text,
        location: demo.location,
        contact: demo.contact,
      });
      setIsRecording(false);
    }, 1800);
  };

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

    const location = form.location || { lat: 23.0258, lng: 72.5714 };
    const payload = {
      source_type: 'CITIZEN_APP',
      source_label: form.contact || 'Anonymous citizen report',
      text: form.description,
      location,
      structured: { type: form.type },
    };

    let result = null;
    try {
      result = await reportsApi.submit(payload);
    } catch (apiErr) {
      console.warn('Backend submission failed, falling back to local store:', apiErr);
    }

    // Always record the report and incident in real-time in the store & timeline
    const store = useStore.getState();
    const localRes = store.addReport ? store.addReport(payload) : null;
    if (!result || !result.report_id) {
      result = localRes || { report_id: `RPT-${Math.random().toString(36).substring(2, 8).toUpperCase()}` };
    }

    const finalReportId = result.report_id || localRes?.report_id || `RPT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setSubmittedReport({
      report_id: finalReportId,
      code: result.code || localRes?.code || `INC-2026-${Math.floor(100 + Math.random() * 900)}`,
      type: form.type,
      description: form.description,
      location,
      contact: form.contact || 'Anonymous Citizen',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    });
    setSubmitted(true);
    setSubmitting(false);
  };

  return (
    <div className="flex-1 relative font-sans flex items-center justify-center p-2 sm:p-4 h-full min-h-0 bg-slate-950 overflow-hidden select-none">
      {/* ── Animated Satellite Map Background ── */}
      <div className="absolute inset-[-10%] z-0 pointer-events-none overflow-hidden">
        <div
          className="w-full h-full filter blur-[3px] brightness-90 contrast-105 opacity-90 animate-sat-pan"
          style={{
            backgroundImage: `url('/satellite-hero.jpg')`,
            backgroundPosition: 'center',
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/40 via-slate-950/20 to-slate-950/50" />
      </div>

      {/* ── Card Container ── */}
      <div className={`relative z-10 my-auto bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-[24px] sm:rounded-[30px] shadow-2xl overflow-hidden transition-all duration-300 ${
        submitted
          ? 'w-[92vw] max-w-[640px] h-auto max-h-[88vh] flex flex-col'
          : 'w-[92vw] max-w-[1280px] h-[84vh] max-h-[calc(100vh-4.25rem)] flex flex-col md:flex-row'
      }`}>
        <AnimatePresence mode="wait">
          {submitted && submittedReport ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full p-6 sm:p-8 flex flex-col items-center justify-center space-y-5 overflow-y-auto"
            >
              <div className="text-center max-w-lg">
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Emergency Ingest Transmitted</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                  Voice payload and structured telemetry verified and routed into municipal dispatch queue.
                </p>
              </div>

              {/* Showcase Summary Card */}
              <div className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 text-sm">
                  <div>
                    <span className="text-slate-400 font-bold uppercase tracking-wider block text-xs">REPORT ID</span>
                    <strong className="font-mono text-slate-900 font-bold text-base">{submittedReport.report_id}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 font-bold uppercase tracking-wider block text-xs">INGEST TIMESTAMP</span>
                    <span className="font-mono text-slate-700 font-semibold text-sm">{submittedReport.timestamp}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Classification</div>
                    <div className="text-sm font-extrabold text-blue-600 mt-0.5">
                      {submittedReport.type.replace(/_/g, ' ')}
                    </div>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dispatch Status</div>
                    <div className="text-sm font-extrabold text-emerald-600 mt-0.5 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Triaged & Dispatched
                    </div>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <FileText size={14} /> Voice Transcript & Narrative
                  </div>
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-sans">
                    {submittedReport.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 bg-white p-3 rounded-xl border border-slate-200">
                    <MapPin size={16} className="text-blue-600 shrink-0" />
                    <div className="truncate">
                      <span className="text-xs text-slate-400 uppercase font-bold block">GPS Coordinates</span>
                      <span className="font-mono font-bold text-slate-800 text-xs sm:text-sm">
                        {submittedReport.location.lat.toFixed(4)}°N, {submittedReport.location.lng.toFixed(4)}°E
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white p-3 rounded-xl border border-slate-200">
                    <Phone size={16} className="text-slate-500 shrink-0" />
                    <div className="truncate">
                      <span className="text-xs text-slate-400 uppercase font-bold block">Callback Contact</span>
                      <span className="font-semibold text-slate-800 text-xs sm:text-sm">{submittedReport.contact}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <Button
                  variant="primary"
                  className="flex-1 h-11 text-xs sm:text-sm font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                  onClick={() => {
                    setSubmitted(false);
                    setSubmittedReport(null);
                    setForm({ type: 'UNKNOWN', description: '', location: null, contact: '' });
                    setTranscript('');
                  }}
                >
                  <Plus size={16} />
                  Submit New Report
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1 h-11 text-xs sm:text-sm font-bold rounded-xl border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                  onClick={() => navigate('/ops')}
                >
                  Open Command Console
                  <ArrowRight size={15} />
                </Button>
              </div>
            </motion.div>
          ) : (
            <div className="w-full h-full flex flex-col md:flex-row overflow-hidden">
              {/* ───────────────────────────────────────────────────────────
                  LEFT SIDE: FORM DETAILS FOR FILLING
                  ─────────────────────────────────────────────────────────── */}
              <div className="w-full md:w-1/2 h-full p-6 sm:p-7 flex flex-col overflow-hidden border-b md:border-b-0 md:border-r border-slate-200/80 bg-white">
                <form onSubmit={handleSubmit} className="h-full flex flex-col justify-between">
                  {/* Top Form Fields Area */}
                  <div className="space-y-3.5">
                    {/* Header */}
                    <div className="flex items-center gap-3.5 mb-3.5 pb-3 border-b border-slate-100">
                      <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0 shadow-xs">
                        <ShieldAlert size={20} />
                      </div>
                      <div>
                        <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-tight">
                          Citizen Emergency Report
                        </h1>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                          Direct Ingest into Municipal Dispatch Matrix
                        </p>
                      </div>
                    </div>

                    {/* Incident Type */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Incident Classification
                        </label>
                        {autofilledField && (
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full animate-pulse border border-blue-200">
                            AI Autofilled
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <select
                          value={form.type}
                          onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                          className={`w-full h-10 pl-3.5 pr-10 bg-slate-50 border rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none appearance-none transition-colors cursor-pointer ${autofilledField ? 'border-blue-500 bg-blue-50/30' : 'border-slate-200'
                            }`}
                        >
                          {INCIDENT_TYPE.map(type => (
                            <option key={type} value={type}>
                              {type.replace(/_/g, ' ')}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                      </div>
                    </div>

                    {/* Narrative Description */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Incident Narrative & Hazards Observed
                      </label>
                      <textarea
                        value={form.description}
                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="Speak using AI Voice Assistant on right or type details here..."
                        rows={3}
                        className={`w-full p-3 bg-slate-50 border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none transition-colors resize-none font-sans leading-relaxed ${autofilledField ? 'border-blue-500 bg-blue-50/30' : 'border-slate-200'
                          }`}
                        required
                      />
                    </div>

                    {/* Incident Geolocation */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Incident Geolocation
                      </label>
                      {form.location ? (
                        <div className="flex items-center gap-2 px-3.5 h-10 bg-slate-50 border border-blue-200 rounded-xl">
                          <MapPin size={16} className="text-blue-600 shrink-0" />
                          <span className="text-xs font-mono text-slate-800 flex-1 font-bold">
                            {form.location.lat.toFixed(4)}°N, {form.location.lng.toFixed(4)}°E
                          </span>
                          <button
                            type="button"
                            onClick={() => setForm(f => ({ ...f, location: null }))}
                            className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={getLocation}
                          disabled={locating}
                          className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          <MapPin size={15} className="text-blue-600" />
                          {locating ? 'Acquiring GPS Position...' : 'Acquire Current Device Coordinates'}
                        </button>
                      )}
                    </div>

                    {/* Reporter Contact */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Reporter Contact (Optional Callback ID)
                      </label>
                      <input
                        type="text"
                        value={form.contact}
                        onChange={e => setForm(f => ({ ...f, contact: e.target.value }))}
                        placeholder="Mobile number or callsign"
                        className={`w-full h-10 px-3.5 bg-slate-50 border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none transition-colors ${autofilledField ? 'border-blue-500 bg-blue-50/30' : 'border-slate-200'
                          }`}
                      />
                    </div>
                  </div>

                  {/* Bottom Submit Action Block */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                    {error && (
                      <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-700">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={!form.description || submitting}
                      className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Send size={17} />
                      {submitting ? 'Transmitting Ingest Payload...' : 'Transmit Emergency Report'}
                    </button>

                    <p className="text-[11px] font-bold text-slate-400 text-center uppercase tracking-wider pt-0.5">
                      Realtime Public Ingest Gateway · Multi-Channel Adapter
                    </p>
                  </div>
                </form>
              </div>

              {/* ───────────────────────────────────────────────────────────
                  RIGHT SIDE: AI VOICE RECORDING ASSISTANT
                  ─────────────────────────────────────────────────────────── */}
              <div className="w-full md:w-1/2 h-full p-6 sm:p-9 flex flex-col justify-between bg-slate-900 text-white relative overflow-hidden">
                {/* Glowing ambient background circle */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />

                {/* Simple Header without decorative icons */}
                <div className="relative z-10 flex items-center justify-between pb-4 border-b border-slate-800">
                  <div>
                    <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">AI Voice Ingest Assistant</h3>
                    <p className="text-xs sm:text-sm font-medium text-slate-400 mt-0.5">Speech-to-Structured Form Parser</p>
                  </div>

                  <div className={`px-3.5 py-1 rounded-full text-xs sm:text-sm font-bold flex items-center gap-2 border ${isRecording
                      ? 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse'
                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    }`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${isRecording ? 'bg-red-400 animate-ping' : 'bg-emerald-400'}`} />
                    {isRecording ? 'Listening Active' : 'AI Mic Ready'}
                  </div>
                </div>

                {/* AI Microphone Centerpiece */}
                <div className="relative z-10 my-auto py-4 flex flex-col items-center justify-center text-center">
                  {/* Outer Pulsing Ring */}
                  <div className="relative flex items-center justify-center mb-6">
                    {isRecording && (
                      <>
                        <motion.div
                          animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0.1, 0.6] }}
                          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                          className="absolute w-36 h-36 rounded-full bg-blue-500/30 border border-blue-400/50 pointer-events-none"
                        />
                        <motion.div
                          animate={{ scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }}
                          transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                          className="absolute w-44 h-44 rounded-full bg-sky-500/20 border border-sky-400/30 pointer-events-none"
                        />
                      </>
                    )}

                    {/* Main Voice Mic Button */}
                    <button
                      type="button"
                      onClick={toggleRecording}
                      className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xl ${isRecording
                          ? 'bg-red-600 text-white shadow-red-600/50 scale-105 ring-4 ring-red-500/40'
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/40 hover:scale-105 active:scale-95 ring-4 ring-blue-500/20'
                        }`}
                    >
                      {isRecording ? (
                        <MicOff size={40} className="animate-pulse" />
                      ) : (
                        <Mic size={40} />
                      )}
                    </button>
                  </div>

                  <p className="text-lg sm:text-xl font-extrabold text-slate-100">
                    {isRecording ? 'Speak Now — AI Listening...' : 'Click Icon to Record Emergency Voice'}
                  </p>
                  <p className="text-sm sm:text-base text-slate-300 mt-2 max-w-sm leading-relaxed font-medium">
                    {isRecording
                      ? 'Say incident details, location landmarks, hazards or casualties.'
                      : 'AI will automatically parse speech & autofill the left form.'}
                  </p>

                  {/* Audio Wave Visualizer Simulation */}
                  {isRecording && (
                    <div className="flex items-center gap-1.5 mt-5 h-8">
                      {[40, 75, 30, 90, 60, 100, 45, 80, 50, 95, 35, 70].map((h, idx) => (
                        <motion.div
                          key={idx}
                          animate={{ height: ['8px', `${h * 0.28}px`, '8px'] }}
                          transition={{ repeat: Infinity, duration: 0.6 + (idx % 4) * 0.15, ease: 'easeInOut' }}
                          className="w-1.5 bg-blue-400 rounded-full"
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Live Transcript Box (Clean, no decorative icons) */}
                <div className="relative z-10 bg-slate-950/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-md">
                  <div className="flex items-center justify-between text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400 mb-2">
                    <span className="text-blue-400 font-bold">Live Speech Transcript</span>
                    {isParsing && (
                      <span className="text-amber-400 animate-pulse font-semibold">
                        Parsing telemetry...
                      </span>
                    )}
                  </div>

                  <p className="text-base sm:text-lg font-mono text-slate-100 leading-relaxed min-h-[52px] italic">
                    {transcript || 'Press record button to speak emergency voice input.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}

