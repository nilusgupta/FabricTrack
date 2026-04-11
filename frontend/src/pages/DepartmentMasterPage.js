import React, { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Edit2, Trash2, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DepartmentMasterPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDept, setEditDept] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDepartments(); }, [fetchDepartments]);

  const openCreate = () => {
    setEditDept(null);
    setForm({ name: '', description: '' });
    setDialogOpen(true);
  };

  const openEdit = (dept) => {
    setEditDept(dept);
    setForm({ name: dept.name, description: dept.description || '' });
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editDept) {
        await api.put(`/departments/${editDept.id}`, form);
        toast.success('Department updated');
      } else {
        await api.post('/departments', form);
        toast.success('Department created');
      }
      setDialogOpen(false);
      fetchDepartments();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    }
  };

  const handleDelete = async (deptId) => {
    if (!window.confirm('Delete this department?')) return;
    try {
      await api.delete(`/departments/${deptId}`);
      toast.success('Department deleted');
      fetchDepartments();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-6" data-testid="department-master-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">Departments</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage departments for your organization</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} data-testid="create-department-button" className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-sm">
              <Plus className="w-4 h-4 mr-2" /> New Department
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md" data-testid="department-dialog">
            <DialogHeader>
              <DialogTitle>{editDept ? 'Edit Department' : 'Create New Department'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Department Name</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required data-testid="department-name-input" className="border-zinc-200" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Description</Label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} data-testid="department-description-input" className="border-zinc-200" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="border-zinc-200">Cancel</Button>
                <Button type="submit" data-testid="department-submit-button" className="bg-zinc-900 hover:bg-zinc-800 text-white">{editDept ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-white border-zinc-200 rounded-sm overflow-hidden">
        <div className="overflow-x-auto" data-testid="departments-table">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50 hover:bg-zinc-50">
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500 w-12">#</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Name</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Description</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500 w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(3)].map((_, i) => <TableRow key={i}>{[...Array(4)].map((_, j) => <TableCell key={j}><div className="h-4 bg-zinc-100 rounded-sm animate-pulse" /></TableCell>)}</TableRow>)
              ) : departments.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-12 text-zinc-400">No departments yet</TableCell></TableRow>
              ) : (
                departments.map((d, idx) => (
                  <TableRow key={d.id} className="hover:bg-zinc-50 transition-colors" data-testid={`dept-row-${d.id}`}>
                    <TableCell className="text-zinc-500 text-xs font-mono">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-zinc-400" />
                        <span className="font-medium text-zinc-900">{d.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-500 text-sm">{d.description || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(d)} data-testid={`edit-dept-${d.id}`}><Edit2 className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(d.id)} data-testid={`delete-dept-${d.id}`} className="text-red-500 hover:text-red-700"><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
