import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Edit2, Trash2, UserCheck, UserX, Search } from 'lucide-react';
import { toast } from 'sonner';

const PAGE_SIZE = 50;

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'sales', department: '' });
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [saving, setSaving] = useState(false);
  const roles = ['admin', 'sales', 'production', 'quality', 'design', 'logistics'];

  const fetchData = useCallback(async () => {
    try {
      const [usersRes, deptsRes] = await Promise.all([
        api.get('/users'),
        api.get('/departments')
      ]);
      setUsers(usersRes.data);
      setDepartments(deptsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditUser(null);
    setForm({ email: '', password: '', name: '', role: 'sales', department: departments[0]?.name || '' });
    setDialogOpen(true);
  };

  const openEdit = (u) => {
    setEditUser(u);
    setForm({ email: u.email, password: '', name: u.name, role: u.role, department: u.department || '' });
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      if (editUser) {
        const updateData = { name: form.name, role: form.role, department: form.department };
        await api.put(`/users/${editUser._id}`, updateData);
        toast.success('User updated');
      } else {
        await api.post('/users', form);
        toast.success('User created');
      }
      setDialogOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await api.delete(`/users/${userId}`);
      toast.success('User deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const toggleActive = async (u) => {
    try {
      await api.put(`/users/${u._id}`, { is_active: !u.is_active });
      toast.success(`User ${u.is_active ? 'deactivated' : 'activated'}`);
      fetchData();
    } catch (err) {
      toast.error('Failed to update');
    }
  };

  const roleColor = (role) => {
    const map = {
      admin: { bg: '#FEE2E2', text: '#991B1B' },
      sales: { bg: '#DBEAFE', text: '#1E40AF' },
      production: { bg: '#D1FAE5', text: '#065F46' },
      quality: { bg: '#FEF3C7', text: '#92400E' },
      design: { bg: '#F3E8FF', text: '#6B21A8' },
      logistics: { bg: '#E0E7FF', text: '#3730A3' },
    };
    return map[role] || { bg: '#F3F4F6', text: '#374151' };
  };

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      u.name?.toLowerCase().includes(q)
      || u.email?.toLowerCase().includes(q)
      || u.role?.toLowerCase().includes(q)
      || u.department?.toLowerCase().includes(q)
    );
  }, [users, search]);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [search]);

  const visibleUsers = filteredUsers.slice(0, visibleCount);
  const hasMore = visibleCount < filteredUsers.length;

  return (
    <div className="space-y-6" data-testid="users-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">Users</h1>
          <p className="text-sm text-zinc-500 mt-1">{users.length} users in the system{search ? ` · ${filteredUsers.length} match` : ''}</p>
        </div>
        {currentUser?.role === 'admin' && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} data-testid="create-user-button" className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-sm">
                <Plus className="w-4 h-4 mr-2" /> New User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" data-testid="user-dialog">
              <DialogHeader>
                <DialogTitle>{editUser ? 'Edit User' : 'Create New User'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                {!editUser && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Email</Label>
                      <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required data-testid="user-email-input" className="border-zinc-200" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Password</Label>
                      <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required data-testid="user-password-input" className="border-zinc-200" />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Name</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required data-testid="user-name-input" className="border-zinc-200" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Role</Label>
                    <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                      <SelectTrigger data-testid="user-role-select" className="border-zinc-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map(r => <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Department</Label>
                    <Select value={form.department} onValueChange={v => setForm({ ...form, department: v })}>
                      <SelectTrigger data-testid="user-department-select" className="border-zinc-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map(d => <SelectItem key={d.id || d.name} value={d.name}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="border-zinc-200">Cancel</Button>
                  <Button type="submit" disabled={saving} data-testid="user-submit-button" className="bg-zinc-900 hover:bg-zinc-800 text-white">{saving ? 'Saving...' : (editUser ? 'Update' : 'Create')}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="bg-white border-zinc-200 rounded-sm overflow-hidden">
        <div className="p-3 border-b border-zinc-200">
          <div className="relative max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name / email / role / dept..."
              className="pl-8 border-zinc-200 h-9"
              data-testid="users-search"
            />
          </div>
        </div>
        <div className="overflow-x-auto" data-testid="users-table">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50 hover:bg-zinc-50">
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Name</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Email</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Role</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Department</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Status</TableHead>
                {currentUser?.role === 'admin' && (
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500 w-32">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(6)].map((_, j) => <TableCell key={j}><div className="h-4 bg-zinc-100 rounded-sm animate-pulse" /></TableCell>)}
                  </TableRow>
                ))
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-zinc-400">{search ? 'No users match your search' : 'No users found'}</TableCell>
                </TableRow>
              ) : (
                visibleUsers.map(u => {
                  const rc = roleColor(u.role);
                  return (
                    <TableRow key={u._id} className="hover:bg-zinc-50 transition-colors" data-testid={`user-row-${u._id}`}>
                      <TableCell className="font-medium text-zinc-900">{u.name}</TableCell>
                      <TableCell className="text-zinc-600">{u.email}</TableCell>
                      <TableCell>
                        <Badge className="rounded-sm text-xs font-medium" style={{ backgroundColor: rc.bg, color: rc.text }}>
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-zinc-600">{u.department || '—'}</TableCell>
                      <TableCell>
                        <Badge className={`rounded-sm text-xs ${u.is_active !== false ? 'bg-green-50 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                          {u.is_active !== false ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      {currentUser?.role === 'admin' && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(u)} data-testid={`edit-user-${u._id}`}>
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => toggleActive(u)} data-testid={`toggle-user-${u._id}`}>
                              {u.is_active !== false ? <UserX className="w-3 h-3 text-amber-500" /> : <UserCheck className="w-3 h-3 text-green-500" />}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(u._id)} data-testid={`delete-user-${u._id}`} className="text-red-500 hover:text-red-700">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        {hasMore && (
          <div className="p-3 border-t border-zinc-200 text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
              className="border-zinc-200"
              data-testid="users-show-more"
            >
              Show {Math.min(PAGE_SIZE, filteredUsers.length - visibleCount)} more · {visibleCount} of {filteredUsers.length}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
