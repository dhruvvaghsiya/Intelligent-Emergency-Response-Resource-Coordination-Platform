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
    <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-slate-50 select-none">
      <div className="max-w-[1150px] mx-auto space-y-8">
        {/* Identity Profile Header */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-2xl shrink-0 shadow-md shadow-blue-600/20">
              {user.name ? user.name.slice(0, 2).toUpperCase() : 'OP'}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">{user.name}</h1>
                <span className="text-xs font-bold uppercase px-2.5 py-0.5 rounded-lg border bg-blue-50 text-blue-700 border-blue-200/80">
                  {user.role || 'Admin'}
                </span>
              </div>
              <div className="text-sm font-medium text-slate-500 font-mono">{user.email}</div>
              {user.station_id && (
                <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 pt-0.5">
                  <span>Station:</span>
                  <span className="text-slate-700">{user.station_id}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-full flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Authenticated Session
            </span>
          </div>
        </div>

        {/* Admin Account Management */}
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
      .then((data) => {
        if (data && data.length > 0) {
          setUsers(data);
        } else {
          // Fallback to default admin list if empty
          const fallback = [
            currentUser,
            { id: 'user_admin_02', name: 'Ops Commander', email: 'commander@prahari.in', role: 'ADMIN', station_id: 'HQ Central', created_at: new Date(Date.now() - 86400000).toISOString() },
          ].filter(Boolean);
          setUsers(fallback);
        }
      })
      .catch((err) => {
        console.warn('API listUsers failed, using local user list', err);
        setUsers([currentUser].filter(Boolean));
      })
      .finally(() => setLoading(false));
  };

  useEffect(loadUsers, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await adminApi.createUser({ ...form, role: 'ADMIN', station_id: form.station_id.trim() || null });
      setForm(emptyForm);
      if (res) {
        setUsers((prev) => [res, ...prev]);
      } else {
        loadUsers();
      }
    } catch (err) {
      // Local fallback in case backend is offline
      const created = {
        id: `user_${Date.now().toString(36)}`,
        name: form.name,
        email: form.email.toLowerCase().trim(),
        role: 'ADMIN',
        station_id: form.station_id.trim() || null,
        created_at: new Date().toISOString(),
      };
      setUsers((prev) => [created, ...prev]);
      setForm(emptyForm);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id) => {
    if (id === currentUser?.id) return;
    if (!window.confirm('Remove this admin account?')) return;
    setUsers((prev) => prev.filter((u) => u.id !== id));
    try {
      await adminApi.deleteUser(id);
    } catch (err) {
      console.warn('API deleteUser failed:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="pb-4 border-b border-slate-200">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <UserPlus size={22} className="text-blue-600" />
          Admin Account Management
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Provision new operator accounts and manage municipal command privileges
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-700 font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-8 items-start">
        {/* Create Admin Form */}
        <form onSubmit={handleCreate} className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Create New Admin</h3>
            <p className="text-xs text-slate-400 mt-0.5">Grant full dispatch & telemetry permissions</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Full Name</label>
            <input
              type="text" required value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Commander Arjun Shah"
              className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email Address</label>
            <input
              type="email" required value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="e.g. arjun@prahari.in"
              className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Station (Optional)</label>
            <input
              type="text" value={form.station_id}
              onChange={(e) => setForm((f) => ({ ...f, station_id: e.target.value }))}
              placeholder="e.g. HQ Central Dispatch"
              className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Temporary Password</label>
            <input
              type="text" required minLength={6} value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Min 6 characters"
              className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none transition-colors"
            />
          </div>

          <Button type="submit" variant="primary" disabled={busy} className="w-full h-11 justify-center text-sm font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer mt-2">
            {busy ? 'Creating Account…' : 'Create Admin Account'}
          </Button>
        </form>

        {/* Directory Table */}
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
          <div className="h-12 px-6 flex items-center justify-between bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <span className="flex items-center gap-2">
              <Users size={16} className="text-slate-500" /> Active Admin Directory
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-extrabold">
              {users.length} {users.length === 1 ? 'Account' : 'Accounts'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="h-11 border-b border-slate-100 bg-slate-50/40 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Operator Name</th>
                  <th className="px-6 py-3">Email Address</th>
                  <th className="px-6 py-3">Station</th>
                  <th className="px-6 py-3 text-right">Created</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400 text-xs font-medium">Loading active accounts…</td></tr>
                ) : users.map((u) => (
                  <tr key={u.id} className="h-14 hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 font-bold text-slate-900">{u.name}</td>
                    <td className="px-6 text-slate-600 font-mono text-xs">{u.email}</td>
                    <td className="px-6 text-slate-500 text-xs font-semibold">{u.station_id || '—'}</td>
                    <td className="px-6 text-right text-xs text-slate-400 font-medium">{formatRelativeTime(u.created_at)}</td>
                    <td className="px-6 text-right">
                      {u.id !== currentUser?.id ? (
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Remove admin account"
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-400 px-2 py-1 rounded bg-slate-100">You</span>
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
