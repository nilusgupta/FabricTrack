import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';

const PAGE_SIZE = 50;

export default function FabricTypeMasterPage() {
  const [fabrics, setFabrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: '', gsm: '', width: '', composition: '', construction: '' });
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/fabric-types');
      setFabrics(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditItem(null); setForm({ name: '', gsm: '', width: '', composition: '', construction: '' }); setDialogOpen(true); };
  const openEdit = (f) => { setEditItem(f); setForm({ name: f.name, gsm: f.gsm || '', width: f.width || '', composition: f.composition || '', construction: f.construction || '' }); setDialogOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      if (editItem) {
        await api.put(`/fabric-types/${editItem.id}`, form);
        toast.success('Fabric type updated');
      } else {
        await api.post('/fabric-types', form);
        toast.success('Fabric type created');
      }
      setDialogOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const filteredFabrics = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return fabrics;
    return fabrics.filter(f =>
      f.name?.toLowerCase().includes(q)
      || f.composition?.toLowerCase().includes(q)
      || f.construction?.toLowerCase().includes(q)
    );
  }, [fabrics, search]);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [search]);

  const visibleFabrics = filteredFabrics.slice(0, visibleCount);
  const hasMore = visibleCount < filteredFabrics.length;

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this fabric type?')) return;
    try { await api.delete(`/fabric-types/${id}`); toast.success('Fabric type deleted'); fetchData(); }
    catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="space-y-6" data-testid="fabric-type-master-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">Fabric Type Master</h1>
          <p className="text-sm text-zinc-500 mt-1">{fabrics.length} fabric types{search ? ` · ${filteredFabrics.length} match` : ''}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} data-testid="create-fabric-type-button" className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-sm">
              <Plus className="w-4 h-4 mr-2" /> Add Fabric Type
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg" data-testid="fabric-type-dialog">
            <DialogHeader><DialogTitle>{editItem ? 'Edit Fabric Type' : 'New Fabric Type'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Name *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required data-testid="fabric-name-input" className="border-zinc-200" placeholder="e.g. Cotton Linen" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">GSM</Label>
                  <Input value={form.gsm} onChange={e => setForm({ ...form, gsm: e.target.value })} data-testid="fabric-gsm-input" className="border-zinc-200" placeholder="e.g. 180" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Width</Label>
                  <Input value={form.width} onChange={e => setForm({ ...form, width: e.target.value })} data-testid="fabric-width-input" className="border-zinc-200" placeholder="e.g. 58 inches" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Composition</Label>
                <Input value={form.composition} onChange={e => setForm({ ...form, composition: e.target.value })} data-testid="fabric-composition-input" className="border-zinc-200" placeholder="e.g. 60% Cotton 40% Polyester" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Construction</Label>
                <Input value={form.construction} onChange={e => setForm({ ...form, construction: e.target.value })} data-testid="fabric-construction-input" className="border-zinc-200" placeholder="e.g. Plain Weave" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="rounded-sm border-zinc-200">Cancel</Button>
                <Button type="submit" disabled={saving} data-testid="fabric-save-button" className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-sm">{saving ? 'Saving...' : (editItem ? 'Update' : 'Create')}</Button>
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
                placeholder="Search by name / composition / construction..."
                className="pl-8 border-zinc-200 h-9"
                data-testid="fabric-search"
              />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50 hover:bg-zinc-50">
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Name</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">GSM</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Width</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Composition</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Construction</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500 w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={6}><div className="h-4 bg-zinc-100 rounded-sm animate-pulse" /></TableCell></TableRow>)
              ) : filteredFabrics.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-zinc-400">{search ? 'No fabric types match your search' : 'No fabric types yet'}</TableCell></TableRow>
              ) : (
                visibleFabrics.map(f => (
                  <TableRow key={f.id} data-testid={`fabric-row-${f.id}`}>
                    <TableCell className="font-medium text-zinc-900">{f.name}</TableCell>
                    <TableCell className="text-zinc-600 text-sm">{f.gsm || '—'}</TableCell>
                    <TableCell className="text-zinc-600 text-sm">{f.width || '—'}</TableCell>
                    <TableCell className="text-zinc-600 text-sm">{f.composition || '—'}</TableCell>
                    <TableCell className="text-zinc-600 text-sm">{f.construction || '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(f)} data-testid={`edit-fabric-${f.id}`}><Pencil className="w-3.5 h-3.5 text-zinc-500" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(f.id)} data-testid={`delete-fabric-${f.id}`}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
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
                data-testid="fabric-show-more"
              >
                Show {Math.min(PAGE_SIZE, filteredFabrics.length - visibleCount)} more · {visibleCount} of {filteredFabrics.length}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
