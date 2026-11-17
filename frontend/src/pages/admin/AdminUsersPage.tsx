import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, UserCheck, ShieldAlert, Ban, CheckCircle2 } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import type { User } from '../../mocks/types';
import { ApiError, listAdminUsers, setUserSuspended } from '../../lib/api';
import { Button } from '../../components/ui/Button';

export default function AdminUsersPage() {
  const { lang } = useLang();
  const [users, setUsers] = useState<User[]>([]);
  const [searchParams] = useSearchParams();
  const [roleFilter, setRoleFilter] = useState(() => {
    const role = searchParams.get('role');
    return role && ['citizen', 'lawyer', 'admin'].includes(role) ? role : 'all';
  });
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    listAdminUsers()
      .then(setUsers)
      .catch(() => setError(lang === 'bn' ? 'ব্যবহারকারী তালিকা লোড করা যায়নি' : 'Could not load users'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSuspended = async (u: User) => {
    setBusyId(u.id);
    setError('');
    try {
      const updated = await setUserSuspended(u.id, !u.suspended);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
    } catch (err) {
      setError(err instanceof ApiError ? (lang === 'bn' ? err.messageBn : err.message) : 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  const filtered = users.filter((u) => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <div className="space-y-6 font-body">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">
          {lang === 'bn' ? 'ব্যবহারকারী ব্যবস্থাপনা' : 'User Directory & Account Status'}
        </h1>
        <p className="mt-1 text-xs text-granite">
          {lang === 'bn'
            ? 'প্ল্যাটফর্মের সকল নাগরিক, আইনজীবী ও অ্যাডমিন অ্যাকাউন্ট তালিকা'
            : 'Manage citizen, advocate, and administrative accounts'}
        </p>
      </div>

      {error && <div className="p-2.5 rounded bg-brick/10 border border-brick/30 text-xs text-brick font-medium">{error}</div>}

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded border border-granite shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-granite" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user name or email..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded border border-granite-soft focus:border-clay focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {['all', 'citizen', 'lawyer', 'admin'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1 text-xs font-mono uppercase tracking-wider rounded transition ${
                roleFilter === r
                  ? 'bg-clay text-white font-bold'
                  : 'bg-bone-deep text-ink-soft hover:bg-clay-tint'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* User Table */}
      <div className="border border-granite rounded bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-bone-deep border-b border-granite font-mono uppercase text-clay-deep">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Email Address</th>
              <th className="p-3">Role</th>
              <th className="p-3">District</th>
              <th className="p-3">Joined</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-granite-soft">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-granite">
                  {lang === 'bn' ? 'কোনো ব্যবহারকারী পাওয়া যায়নি' : 'No users to show'}
                </td>
              </tr>
            )}
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-bone/40 transition">
                <td className="p-3 font-semibold text-ink flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-clay-tint border border-clay flex items-center justify-center">
                    <UserCheck className="h-4 w-4 text-clay-deep" />
                  </div>
                  <span>{u.name}</span>
                  {u.suspended && (
                    <span className="font-mono text-[10px] uppercase bg-brick/10 text-brick px-1.5 py-0.5 rounded border border-brick/30">
                      {lang === 'bn' ? 'স্থগিত' : 'Suspended'}
                    </span>
                  )}
                </td>
                <td className="p-3 font-mono text-ink-soft">{u.email}</td>
                <td className="p-3">
                  <span className="font-mono text-[10px] uppercase bg-bone-deep text-clay-deep px-2 py-0.5 rounded font-bold border border-granite-soft">
                    {u.role}
                  </span>
                </td>
                <td className="p-3 text-ink-soft">{u.district || '—'}</td>
                <td className="p-3 font-mono text-granite">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="p-3 text-right">
                  {u.role !== 'admin' && (
                    <Button size="sm" variant="ghost" loading={busyId === u.id} onClick={() => toggleSuspended(u)}>
                      <span>{u.suspended ? (lang === 'bn' ? 'পুনরায় চালু' : 'Reactivate') : (lang === 'bn' ? 'স্থগিত' : 'Suspend')}</span>
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
