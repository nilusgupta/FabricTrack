import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Pencil, Trash2, UserCircle, Search } from 'lucide-react';
import { toast } from 'sonner';

const PAGE_SIZE = 50; // Render in chunks to avoid freezing on large customer lists

export default function CustomerMasterPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: '' });
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [saving, setSaving] = useState(false);

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
    if (saving) return; // Prevent double-submit
    setSaving(true);
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
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Client-side filter + chunked render to keep large lists responsive
  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(c => c.name?.toLowerCase().includes(q));
  }, [customers, search]);

  // Reset visible window when search changes
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [search]);

  const visibleCustomers = filteredCustomers.slice(0, visibleCount);
  const hasMore = visibleCount < filteredCustomers.length;

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
          <p className="text-sm text-zinc-500 mt-1">{customers.length} customers{search ? ` · ${filteredCustomers.length} match` : ''}</p>
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
                <Button type="submit" disabled={saving} data-testid="customer-save-button" className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-sm">{saving ? 'Saving...' : (editItem ? 'Update' : 'Create')}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Card className="bg-white border-zinc-200 rounded-sm">
        <CardContent className="p-0">
          <div className="p-3 border-b border-zinc-200">
            <div className="relative max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search customers..."
                className="pl-8 border-zinc-200 h-9"
                data-testid="customer-search"
              />
            </div>
          </div>
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
              ) : filteredCustomers.length === 0 ? (
                <TableRow><TableCell colSpan={2} className="text-center py-8 text-zinc-400">{search ? 'No customers match your search' : 'No customers yet'}</TableCell></TableRow>
              ) : (
                visibleCustomers.map(c => (
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
          {hasMore && (
            <div className="p-3 border-t border-zinc-200 text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                className="border-zinc-200"
                data-testid="customer-show-more"
              >
                Show {Math.min(PAGE_SIZE, filteredCustomers.length - visibleCount)} more · {visibleCount} of {filteredCustomers.length}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
