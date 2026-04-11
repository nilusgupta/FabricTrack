import React, { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { Plus, Edit2, Trash2, GripVertical, X, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '../components/ui/checkbox';

const PRESET_COLORS = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E', '#06B6D4',
  '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280', '#09090B'
];

const INPUT_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown / Status' },
];

export default function StageMasterPage() {
  const [stages, setStages] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editStage, setEditStage] = useState(null);
  const [form, setForm] = useState({ name: '', order: 0, color: '#3B82F6', description: '', input_type: 'text', is_mandatory: false, select_options: [], lead_time_days: 0, date_input_mode: 'manual', assigned_users: [] });
  const [newOption, setNewOption] = useState('');

  const fetchStages = useCallback(async () => {
    try {
      const [stagesRes, usersRes] = await Promise.all([api.get('/stages'), api.get('/users')]);
      setStages(stagesRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStages(); }, [fetchStages]);

  const openCreate = () => {
    setEditStage(null);
    setForm({ name: '', order: stages.length + 1, color: '#3B82F6', description: '', input_type: 'text', is_mandatory: false, select_options: [], lead_time_days: 0, date_input_mode: 'manual', assigned_users: [] });
    setNewOption('');
    setDialogOpen(true);
  };

  const openEdit = (stage) => {
    setEditStage(stage);
    setForm({
      name: stage.name, order: stage.order, color: stage.color,
      description: stage.description || '', input_type: stage.input_type || 'text',
      is_mandatory: stage.is_mandatory || false,
      select_options: stage.select_options || [],
      lead_time_days: stage.lead_time_days || 0,
      date_input_mode: stage.date_input_mode || 'manual',
      assigned_users: stage.assigned_users || []
    });
    setNewOption('');
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
    if (!window.confirm('Delete this stage?')) return;
    try {
      await api.delete(`/stages/${stageId}`);
      toast.success('Stage deleted');
      fetchStages();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const addOption = () => {
    if (newOption.trim() && !form.select_options.includes(newOption.trim())) {
      setForm({ ...form, select_options: [...form.select_options, newOption.trim()] });
      setNewOption('');
    }
  };

  const removeOption = (opt) => {
    setForm({ ...form, select_options: form.select_options.filter(o => o !== opt) });
  };

  const inputTypeLabel = (t) => INPUT_TYPES.find(i => i.value === t)?.label || t;

  return (
    <div className="space-y-6" data-testid="stage-master-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">Stage Master</h1>
          <p className="text-sm text-zinc-500 mt-1">Define custom stages with input types for the enquiry workflow</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} data-testid="create-stage-button" className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-sm">
              <Plus className="w-4 h-4 mr-2" /> New Stage
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" data-testid="stage-dialog">
            <DialogHeader>
              <DialogTitle>{editStage ? 'Edit Stage' : 'Create New Stage'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Stage Name</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required data-testid="stage-name-input" className="border-zinc-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Order</Label>
                  <Input type="number" value={form.order} onChange={e => setForm({ ...form, order: parseInt(e.target.value) || 0 })} required data-testid="stage-order-input" className="border-zinc-200" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Input Type</Label>
                  <Select value={form.input_type} onValueChange={v => setForm({ ...form, input_type: v })}>
                    <SelectTrigger data-testid="stage-input-type-select" className="border-zinc-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INPUT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Mandatory</Label>
                  <div className="flex items-center gap-3 h-10">
                    <Switch checked={form.is_mandatory} onCheckedChange={v => setForm({ ...form, is_mandatory: v })} data-testid="stage-mandatory-switch" />
                    <span className="text-sm text-zinc-600">{form.is_mandatory ? 'Required' : 'Optional'}</span>
                  </div>
                </div>
              </div>

              {form.input_type === 'select' && (
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Dropdown Options</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newOption}
                      onChange={e => setNewOption(e.target.value)}
                      placeholder="Add option..."
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } }}
                      data-testid="stage-option-input"
                      className="border-zinc-200"
                    />
                    <Button type="button" size="sm" onClick={addOption} data-testid="add-option-button" className="bg-zinc-900 text-white">Add</Button>
                  </div>
                  <div className="flex gap-1 flex-wrap mt-2">
                    {form.select_options.map(opt => (
                      <Badge key={opt} className="rounded-sm bg-zinc-100 text-zinc-700 gap-1 pr-1">
                        {opt}
                        <button type="button" onClick={() => removeOption(opt)} className="hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {form.input_type === 'date' && (
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Date Input Mode</Label>
                  <Select value={form.date_input_mode} onValueChange={v => setForm({ ...form, date_input_mode: v })}>
                    <SelectTrigger data-testid="stage-date-mode-select" className="border-zinc-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto - Button captures current date/time</SelectItem>
                      <SelectItem value="manual">Manual - User picks date during enquiry</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-zinc-400 mt-1">
                    {form.date_input_mode === 'auto' ? 'A button will capture the current date when clicked' : 'User will see a date picker to select a date'}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Lead Time (Days)</Label>
                <Input type="number" min="0" value={form.lead_time_days} onChange={e => setForm({ ...form, lead_time_days: parseInt(e.target.value) || 0 })} data-testid="stage-lead-time-input" className="border-zinc-200" />
                <p className="text-xs text-zinc-400">Days allowed from previous stage completion. 0 = no lead time tracking.</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Assigned Users</Label>
                <p className="text-xs text-zinc-400 mb-2">Only selected users (and admins) can update this stage's value or add comments. Leave empty for all users.</p>
                <div className="max-h-40 overflow-y-auto border border-zinc-200 rounded-sm p-2 space-y-1">
                  {users.map(u => (
                    <label key={u._id} className="flex items-center gap-2 py-1 px-2 hover:bg-zinc-50 rounded-sm cursor-pointer" data-testid={`assign-user-${u._id}`}>
                      <Checkbox
                        checked={form.assigned_users.includes(u._id)}
                        onCheckedChange={(checked) => {
                          setForm(prev => ({
                            ...prev,
                            assigned_users: checked
                              ? [...prev.assigned_users, u._id]
                              : prev.assigned_users.filter(id => id !== u._id)
                          }));
                        }}
                      />
                      <span className="text-sm text-zinc-700">{u.name}</span>
                      <span className="text-xs text-zinc-400 ml-auto">{u.department} · {u.role}</span>
                    </label>
                  ))}
                </div>
                {form.assigned_users.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-1">
                    {form.assigned_users.map(uid => {
                      const u = users.find(x => x._id === uid);
                      return u ? (
                        <Badge key={uid} className="rounded-sm bg-zinc-100 text-zinc-700 gap-1 pr-1 text-xs">
                          {u.name}
                          <button type="button" onClick={() => setForm(prev => ({ ...prev, assigned_users: prev.assigned_users.filter(id => id !== uid) }))} className="hover:text-red-500">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Color</Label>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button type="button" key={c} onClick={() => setForm({ ...form, color: c })}
                      className={`w-8 h-8 rounded-sm transition-transform ${form.color === c ? 'ring-2 ring-zinc-900 ring-offset-2 scale-110' : 'hover:scale-105'}`}
                      style={{ backgroundColor: c }} data-testid={`color-${c}`} />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Description</Label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} data-testid="stage-description-input" className="border-zinc-200" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="border-zinc-200">Cancel</Button>
                <Button type="submit" data-testid="stage-submit-button" className="bg-zinc-900 hover:bg-zinc-800 text-white">{editStage ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Visual Pipeline */}
      <Card className="bg-white border-zinc-200 rounded-sm">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-zinc-900">Workflow Pipeline</CardTitle></CardHeader>
        <CardContent data-testid="stage-pipeline">
          {stages.length > 0 ? (
            <div className="flex items-center gap-2 overflow-x-auto py-2">
              {stages.map((s, idx) => (
                <React.Fragment key={s.id}>
                  {idx > 0 && <div className="w-8 h-0.5 bg-zinc-200 flex-shrink-0" />}
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="px-4 py-2 rounded-sm border text-white text-sm font-medium" style={{ backgroundColor: s.color, borderColor: s.color }}>
                      <span className="text-white/70 text-xs mr-1">{s.order}.</span>{s.name}
                    </div>
                    <span className="text-[10px] text-zinc-400">
                      {inputTypeLabel(s.input_type || 'text')} {s.is_mandatory ? '(req)' : ''} {s.lead_time_days ? `· ${s.lead_time_days}d` : ''}
                    </span>
                  </div>
                </React.Fragment>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-zinc-400 text-sm border border-dashed border-zinc-300 rounded-sm">No stages defined yet.</div>
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
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Input Type</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Mandatory</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Lead Time</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Assigned Users</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Options / Mode</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500 w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(3)].map((_, i) => <TableRow key={i}>{[...Array(9)].map((_, j) => <TableCell key={j}><div className="h-4 bg-zinc-100 rounded-sm animate-pulse" /></TableCell>)}</TableRow>)
              ) : stages.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-12 text-zinc-400">No stages yet</TableCell></TableRow>
              ) : (
                stages.map(s => (
                  <TableRow key={s.id} className="hover:bg-zinc-50 transition-colors" data-testid={`stage-row-${s.id}`}>
                    <TableCell><div className="flex items-center gap-2"><GripVertical className="w-3 h-3 text-zinc-300" /><span className="text-zinc-600 font-mono text-sm">{s.order}</span></div></TableCell>
                    <TableCell className="font-medium text-zinc-900">{s.name}</TableCell>
                    <TableCell><div className="flex items-center gap-2"><div className="w-5 h-5 rounded-sm" style={{ backgroundColor: s.color }} /><span className="text-xs text-zinc-500 font-mono">{s.color}</span></div></TableCell>
                    <TableCell><Badge className="rounded-sm text-xs bg-zinc-100 text-zinc-700">{inputTypeLabel(s.input_type || 'text')}</Badge></TableCell>
                    <TableCell><Badge className={`rounded-sm text-xs ${s.is_mandatory ? 'bg-red-50 text-red-700' : 'bg-zinc-50 text-zinc-400'}`}>{s.is_mandatory ? 'Required' : 'Optional'}</Badge></TableCell>
                    <TableCell className="text-zinc-600 text-sm font-mono">{s.lead_time_days ? `${s.lead_time_days}d` : '—'}</TableCell>
                    <TableCell className="text-xs">{(s.assigned_users || []).length > 0 ? (
                      <div className="flex gap-1 flex-wrap">{(s.assigned_users || []).map(uid => { const u = users.find(x => x._id === uid); return u ? <Badge key={uid} className="rounded-sm text-[10px] bg-blue-50 text-blue-700">{u.name}</Badge> : null; })}</div>
                    ) : <span className="text-zinc-400">All users</span>}</TableCell>
                    <TableCell className="text-zinc-500 text-xs">{s.input_type === 'select' ? (s.select_options || []).join(', ') : s.input_type === 'date' ? (s.date_input_mode === 'auto' ? 'Auto capture' : 'Manual pick') : '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(s)} data-testid={`edit-stage-${s.id}`}><Edit2 className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)} data-testid={`delete-stage-${s.id}`} className="text-red-500 hover:text-red-700"><Trash2 className="w-3 h-3" /></Button>
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
