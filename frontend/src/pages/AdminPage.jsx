/* =========================================================================
   ADMIN CONSOLE — Operator Directory & Provisioning
   Admin-only (gated by AdminRoute in App.jsx + PERMISSIONS.ADMIN). The only place an operator
   account can be created — self-registration was removed entirely.
   ========================================================================= */
import React, { useEffect, useState } from 'react';
import { ShieldCheck, UserPlus, Trash2, Users } from 'lucide-react';
import { useStore } from '../lib/store';
import { adminApi } from '../lib/api';
import { Button } from '../components/ui/Button';
import { ROLE } from '../lib/constants';
import { formatRelativeTime } from '../lib/format';

const ROLE_BADGE = {
  ADMIN: 'bg-purple-50 text-purple-700 border-purple-200',
  COMMANDER: 'bg-red-50 text-red-700 border-red-200',
  DISPATCHER: 'bg-blue-50 text-blue-700 border-blue-200',
  ANALYST: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  FIELD_UNIT: 'bg-amber-50 text-amber-700 border-amber-200',
  VIEWER: 'bg-slate-100 text-slate-600 border-slate-200',
};

const emptyForm = { name: '', email: '', role: 'DISPATCHER', station_id: '', password: '' };

export function AdminPage() {
  const currentUser = useStore((s) => s.user);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadUsers = () => {
    setLoading(true);
    adminApi.listUsers()
      .then(setUsers)
      .catch((err) => setError(err?.response?.data?.error?.message || 'Failed to load operators'))
      .finally(() => setLoading(false));
  };

  useEffect(loadUsers, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await adminApi.createUser({ ...form, station_id: form.station_id.trim() || null });
      setForm(emptyForm);
      loadUsers();
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Failed to create operator');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id) => {
    if (id === currentUser?.id) return;
    if (!window.confirm('Remove this operator account?')) return;
    try {
      await adminApi.deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Failed to remove operator');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-50 select-none">
      <div className="max-w-[1100px] mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShieldCheck size={24} className="text-blue-600" />
            Admin Console
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create and manage operator accounts. Every role is granted here explicitly — there is no public sign-up.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
          {/* Create Operator */}
          <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3.5 h-fit">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <UserPlus size={16} className="text-blue-600" />
              Create Operator
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Full Name</label>
              <input
                type="text" required value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email</label>
              <input
                type="email" required value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Role</label>
              <div className="grid grid-cols-3 gap-1">
                {ROLE.map((r) => (
                  <button
                    key={r} type="button"
                    onClick={() => setForm((f) => ({ ...f, role: r }))}
                    className={`py-1 px-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer text-center ${
                      form.role === r ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {r.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Station (optional)</label>
              <input
                type="text" value={form.station_id}
                onChange={(e) => setForm((f) => ({ ...f, station_id: e.target.value }))}
                className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Temporary Password</label>
              <input
                type="text" required minLength={6} value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-blue-600 focus:outline-none"
              />
            </div>

            <Button type="submit" variant="primary" disabled={busy} className="w-full justify-center">
              {busy ? 'Creating…' : 'Create Operator'}
            </Button>
          </form>

          {/* Directory */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm h-fit">
            <div className="h-11 px-5 flex items-center gap-2 bg-slate-50/70 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <Users size={14} /> Operator Directory ({users.length})
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="h-10 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-5">Name</th>
                  <th className="px-5">Email</th>
                  <th className="px-5">Role</th>
                  <th className="px-5">Station</th>
                  <th className="px-5 text-right">Created</th>
                  <th className="px-5 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400 text-xs">Loading…</td></tr>
                ) : users.map((u) => (
                  <tr key={u.id} className="h-12 hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 font-semibold text-slate-900">{u.name}</td>
                    <td className="px-5 text-slate-600 font-mono text-xs">{u.email}</td>
                    <td className="px-5">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${ROLE_BADGE[u.role] || ROLE_BADGE.VIEWER}`}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 text-slate-500 text-xs">{u.station_id || '—'}</td>
                    <td className="px-5 text-right text-xs text-slate-400">{formatRelativeTime(u.created_at)}</td>
                    <td className="px-5 text-right">
                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Remove operator"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
