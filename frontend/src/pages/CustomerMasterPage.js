import React, { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Pencil, Trash2, UserCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function CustomerMasterPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: '' });

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/customers');
      setCustomers(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditItem(null); setForm({ name: '' }); setDialogOpen(true); };
  const openEdit = (c) => { setEditItem(c); setForm({ name: c.name }); setDialogOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editItem) {
        await api.put(`/customers/${editItem.id}`, form);
        toast.success('Customer updated');
      } else {
        await api.post('/customers', form);
        toast.success('Customer created');
      }
      setDialogOpen(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to save'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this customer?')) return;
    try { await api.delete(`/customers/${id}`); toast.success('Customer deleted'); fetchData(); }
    catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="space-y-6" data-testid="customer-master-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">Customer Master</h1>
          <p className="text-sm text-zinc-500 mt-1">{customers.length} customers</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} data-testid="create-customer-button" className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-sm">
              <Plus className="w-4 h-4 mr-2" /> Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md" data-testid="customer-dialog">
            <DialogHeader><DialogTitle>{editItem ? 'Edit Customer' : 'New Customer'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Name *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required data-testid="customer-name-input" className="border-zinc-200" placeholder="Customer name" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="rounded-sm border-zinc-200">Cancel</Button>
                <Button type="submit" data-testid="customer-save-button" className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-sm">{editItem ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Card className="bg-white border-zinc-200 rounded-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50 hover:bg-zinc-50">
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Name</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500 w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={2}><div className="h-4 bg-zinc-100 rounded-sm animate-pulse" /></TableCell></TableRow>)
              ) : customers.length === 0 ? (
                <TableRow><TableCell colSpan={2} className="text-center py-8 text-zinc-400">No customers yet</TableCell></TableRow>
              ) : (
                customers.map(c => (
                  <TableRow key={c.id} data-testid={`customer-row-${c.id}`}>
                    <TableCell className="font-medium text-zinc-900">{c.name}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(c)} data-testid={`edit-customer-${c.id}`}><Pencil className="w-3.5 h-3.5 text-zinc-500" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)} data-testid={`delete-customer-${c.id}`}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
