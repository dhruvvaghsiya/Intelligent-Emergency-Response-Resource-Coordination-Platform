/* =========================================================================
   PROFILE PAGE — identity + admin account management. Single-role system:
   the only account type is Admin, so this page is just "who am I" plus
   "who else can sign in" (create/remove admin accounts). Everyone else
   browses the public views with no account at all.
   ========================================================================= */
import React, { useEffect, useState } from 'react';
import { UserPlus, Trash2, Users } from 'lucide-react';
import { useStore } from '../lib/store';
import { adminApi } from '../lib/api';
import { Button } from '../components/ui/Button';
import { formatRelativeTime } from '../lib/format';

export function ProfilePage() {
  const user = useStore((s) => s.user);

  if (!user) return null;

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-50 select-none">
      <div className="max-w-[1100px] mx-auto space-y-6">
        {/* Identity header */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-sm shadow-blue-500/25">
            {user.name ? user.name.slice(0, 2).toUpperCase() : 'OP'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{user.name}</h1>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border bg-purple-50 text-purple-700 border-purple-200">
                Admin
              </span>
            </div>
            <div className="text-sm text-slate-500 mt-0.5">{user.email}</div>
            {user.station_id && (
              <div className="text-xs text-slate-400 mt-1">Station: {user.station_id}</div>
            )}
          </div>
        </div>

        <AdminAccountManagement currentUser={user} />
      </div>
    </div>
  );
}

const emptyForm = { name: '', email: '', station_id: '', password: '' };

function AdminAccountManagement({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadUsers = () => {
    setLoading(true);
    adminApi.listUsers()
      .then(setUsers)
      .catch((err) => setError(err?.response?.data?.error?.message || 'Failed to load admin accounts'))
      .finally(() => setLoading(false));
  };

  useEffect(loadUsers, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await adminApi.createUser({ ...form, role: 'ADMIN', station_id: form.station_id.trim() || null });
      setForm(emptyForm);
      loadUsers();
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Failed to create admin account');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id) => {
    if (id === currentUser?.id) return;
    if (!window.confirm('Remove this admin account?')) return;
    try {
      await adminApi.deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Failed to remove admin account');
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-1 px-0.5">
        <UserPlus size={16} className="text-blue-600" />
        Manage Admin Accounts
      </div>
      <p className="text-xs text-slate-500 mb-4 px-0.5">
        Create and remove admin accounts — this is the only place one is ever granted. There is no public sign-up;
        everyone else browses live, read-only, with no account.
      </p>

      {error && (
        <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        {/* Create Admin */}
        <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3.5 h-fit">
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
            {busy ? 'Creating…' : 'Create Admin Account'}
          </Button>
        </form>

        {/* Directory */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm h-fit">
          <div className="h-11 px-5 flex items-center gap-2 bg-slate-50/70 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <Users size={14} /> Admin Directory ({users.length})
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="h-10 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-5">Name</th>
                <th className="px-5">Email</th>
                <th className="px-5">Station</th>
                <th className="px-5 text-right">Created</th>
                <th className="px-5 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400 text-xs">Loading…</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="h-12 hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 font-semibold text-slate-900">{u.name}</td>
                  <td className="px-5 text-slate-600 font-mono text-xs">{u.email}</td>
                  <td className="px-5 text-slate-500 text-xs">{u.station_id || '—'}</td>
                  <td className="px-5 text-right text-xs text-slate-400">{formatRelativeTime(u.created_at)}</td>
                  <td className="px-5 text-right">
                    {u.id !== currentUser?.id && (
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Remove admin account"
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
  );
}
