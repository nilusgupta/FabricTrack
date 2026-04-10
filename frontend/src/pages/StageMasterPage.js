import React, { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Edit2, Trash2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

const PRESET_COLORS = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E', '#06B6D4',
  '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280', '#09090B'
];

export default function StageMasterPage() {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editStage, setEditStage] = useState(null);
  const [form, setForm] = useState({ name: '', order: 0, color: '#3B82F6', description: '' });

  const fetchStages = useCallback(async () => {
    try {
      const res = await api.get('/stages');
      setStages(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStages(); }, [fetchStages]);

  const openCreate = () => {
    setEditStage(null);
    setForm({ name: '', order: stages.length + 1, color: '#3B82F6', description: '' });
    setDialogOpen(true);
  };

  const openEdit = (stage) => {
    setEditStage(stage);
    setForm({ name: stage.name, order: stage.order, color: stage.color, description: stage.description || '' });
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editStage) {
        await api.put(`/stages/${editStage.id}`, form);
        toast.success('Stage updated');
      } else {
        await api.post('/stages', form);
        toast.success('Stage created');
      }
      setDialogOpen(false);
      fetchStages();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    }
  };

  const handleDelete = async (stageId) => {
    if (!window.confirm('Delete this stage? Enquiries using it will lose their stage reference.')) return;
    try {
      await api.delete(`/stages/${stageId}`);
      toast.success('Stage deleted');
      fetchStages();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-6" data-testid="stage-master-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">Stage Master</h1>
          <p className="text-sm text-zinc-500 mt-1">Define custom stages for the enquiry workflow</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} data-testid="create-stage-button" className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-sm">
              <Plus className="w-4 h-4 mr-2" /> New Stage
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md" data-testid="stage-dialog">
            <DialogHeader>
              <DialogTitle>{editStage ? 'Edit Stage' : 'Create New Stage'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Stage Name</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required data-testid="stage-name-input" className="border-zinc-200" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Order</Label>
                <Input type="number" value={form.order} onChange={e => setForm({ ...form, order: parseInt(e.target.value) || 0 })} required data-testid="stage-order-input" className="border-zinc-200" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Color</Label>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setForm({ ...form, color: c })}
                      className={`w-8 h-8 rounded-sm transition-transform ${form.color === c ? 'ring-2 ring-zinc-900 ring-offset-2 scale-110' : 'hover:scale-105'}`}
                      style={{ backgroundColor: c }}
                      data-testid={`color-${c}`}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Description</Label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} data-testid="stage-description-input" className="border-zinc-200" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="border-zinc-200">Cancel</Button>
                <Button type="submit" data-testid="stage-submit-button" className="bg-zinc-900 hover:bg-zinc-800 text-white">
                  {editStage ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Visual Pipeline */}
      <Card className="bg-white border-zinc-200 rounded-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-zinc-900">Workflow Pipeline</CardTitle>
        </CardHeader>
        <CardContent data-testid="stage-pipeline">
          {stages.length > 0 ? (
            <div className="flex items-center gap-2 overflow-x-auto py-2">
              {stages.map((s, idx) => (
                <React.Fragment key={s.id}>
                  {idx > 0 && <div className="w-8 h-0.5 bg-zinc-200 flex-shrink-0" />}
                  <div
                    className="flex items-center gap-2 px-4 py-2.5 rounded-sm border flex-shrink-0 text-white text-sm font-medium"
                    style={{ backgroundColor: s.color, borderColor: s.color }}
                  >
                    <span className="text-white/70 text-xs">{s.order}.</span>
                    {s.name}
                  </div>
                </React.Fragment>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-zinc-400 text-sm border border-dashed border-zinc-300 rounded-sm">
              No stages defined. Create your first stage to start.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-white border-zinc-200 rounded-sm overflow-hidden">
        <div className="overflow-x-auto" data-testid="stages-table">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50 hover:bg-zinc-50">
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500 w-12">Order</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Name</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Color</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Description</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500 w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(5)].map((_, j) => <TableCell key={j}><div className="h-4 bg-zinc-100 rounded-sm animate-pulse" /></TableCell>)}
                  </TableRow>
                ))
              ) : stages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-zinc-400">No stages yet</TableCell>
                </TableRow>
              ) : (
                stages.map(s => (
                  <TableRow key={s.id} className="hover:bg-zinc-50 transition-colors" data-testid={`stage-row-${s.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-3 h-3 text-zinc-300" />
                        <span className="text-zinc-600 font-mono text-sm">{s.order}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-zinc-900">{s.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-sm" style={{ backgroundColor: s.color }} />
                        <span className="text-xs text-zinc-500 font-mono">{s.color}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-500 text-sm">{s.description || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(s)} data-testid={`edit-stage-${s.id}`}>
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)} data-testid={`delete-stage-${s.id}`} className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-3 h-3" />
                        </Button>
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
