import React, { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, Edit2, Trash2, Building2, Layers, ChevronRight, ArrowUp, ArrowDown, X, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function DepartmentMasterPage() {
  const [departments, setDepartments] = useState([]);
  const [stages, setStages] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDept, setEditDept] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [hierarchyDept, setHierarchyDept] = useState(null);
  const [hierarchy, setHierarchy] = useState([]);
  const [addStageId, setAddStageId] = useState('');
  const [assignUserOpen, setAssignUserOpen] = useState(null);
  const [assignUserId, setAssignUserId] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [dRes, sRes, uRes] = await Promise.all([api.get('/departments'), api.get('/stages'), api.get('/users')]);
      setDepartments(dRes.data);
      setStages(sRes.data);
      setUsers(uRes.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditDept(null); setForm({ name: '', description: '' }); setDialogOpen(true); };
  const openEdit = (dept) => { setEditDept(dept); setForm({ name: dept.name, description: dept.description || '' }); setDialogOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editDept) { await api.put(`/departments/${editDept.id}`, form); toast.success('Department updated'); }
      else { await api.post('/departments', form); toast.success('Department created'); }
      setDialogOpen(false); fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to save'); }
  };

  const handleDelete = async (deptId) => {
    if (!window.confirm('Delete this department?')) return;
    try { await api.delete(`/departments/${deptId}`); toast.success('Department deleted'); fetchData(); if (hierarchyDept?.id === deptId) setHierarchyDept(null); } catch (err) { toast.error('Failed to delete'); }
  };

  const openHierarchy = async (dept) => {
    setHierarchyDept(dept);
    try { const res = await api.get(`/departments/${dept.id}/hierarchy`); setHierarchy(res.data); } catch { setHierarchy([]); }
  };

  const saveHierarchy = async () => {
    if (!hierarchyDept) return;
    try {
      await api.put(`/departments/${hierarchyDept.id}/hierarchy`, { items: hierarchy });
      toast.success('Hierarchy saved');
      fetchData();
    } catch (err) { toast.error('Failed to save hierarchy'); }
  };

  const addStageToHierarchy = () => {
    if (!addStageId || hierarchy.find(h => h.stage_id === addStageId)) { toast.error('Stage already in hierarchy'); return; }
    const maxOrder = hierarchy.length > 0 ? Math.max(...hierarchy.map(h => h.order)) : 0;
    setHierarchy(prev => [...prev, { stage_id: addStageId, order: maxOrder + 1, assigned_users: [] }]);
    setAddStageId('');
  };

  const removeFromHierarchy = (stageId) => { setHierarchy(prev => prev.filter(h => h.stage_id !== stageId)); };
  const moveUp = (idx) => { if (idx <= 0) return; const arr = [...hierarchy]; [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]; arr.forEach((h, i) => h.order = i + 1); setHierarchy(arr); };
  const moveDown = (idx) => { if (idx >= hierarchy.length - 1) return; const arr = [...hierarchy]; [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]; arr.forEach((h, i) => h.order = i + 1); setHierarchy(arr); };

  const addUserToStage = (stageId) => {
    if (!assignUserId) return;
    setHierarchy(prev => prev.map(h => h.stage_id === stageId ? { ...h, assigned_users: [...new Set([...h.assigned_users, assignUserId])] } : h));
    setAssignUserId('');
    setAssignUserOpen(null);
  };

  const removeUserFromStage = (stageId, userId) => {
    setHierarchy(prev => prev.map(h => h.stage_id === stageId ? { ...h, assigned_users: h.assigned_users.filter(u => u !== userId) } : h));
  };

  const setFallback = (stageId, fallbackId) => {
    setHierarchy(prev => prev.map(h => h.stage_id === stageId ? { ...h, fallback_stage_id: fallbackId || null } : h));
  };

  const stageMap = {};
  stages.forEach(s => { stageMap[s.id] = s; });
  const userMap = {};
  users.forEach(u => { userMap[u._id] = u; });
  const sortedHierarchy = [...hierarchy].sort((a, b) => a.order - b.order);
  const availableStages = stages.filter(s => !hierarchy.find(h => h.stage_id === s.id));

  return (
    <div className="space-y-6" data-testid="department-master-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">Departments</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage departments and stage hierarchies</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} data-testid="create-department-button" className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-sm">
              <Plus className="w-4 h-4 mr-2" /> New Department
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md" data-testid="department-dialog">
            <DialogHeader><DialogTitle>{editDept ? 'Edit Department' : 'Create New Department'}</DialogTitle></DialogHeader>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department List */}
        <Card className="bg-white border-zinc-200 rounded-sm overflow-hidden">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-zinc-900">Departments</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto" data-testid="departments-table">
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-50 hover:bg-zinc-50">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500 w-12">#</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Name</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500 w-16">Stages</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500 w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    [...Array(3)].map((_, i) => <TableRow key={i}>{[...Array(4)].map((_, j) => <TableCell key={j}><div className="h-4 bg-zinc-100 rounded-sm animate-pulse" /></TableCell>)}</TableRow>)
                  ) : departments.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-12 text-zinc-400">No departments yet</TableCell></TableRow>
                  ) : departments.map((d, idx) => (
                    <TableRow key={d.id} className={`hover:bg-zinc-50 transition-colors cursor-pointer ${hierarchyDept?.id === d.id ? 'bg-zinc-100' : ''}`} onClick={() => openHierarchy(d)} data-testid={`dept-row-${d.id}`}>
                      <TableCell className="text-zinc-500 text-xs font-mono">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-zinc-400" />
                          <span className="font-medium text-zinc-900">{d.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="rounded-sm text-[10px] bg-zinc-100 text-zinc-600">{d.stage_hierarchy?.length || 0}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" onClick={() => openHierarchy(d)} data-testid={`manage-hierarchy-${d.id}`} title="Manage stages"><Layers className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(d)} data-testid={`edit-dept-${d.id}`}><Edit2 className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(d.id)} data-testid={`delete-dept-${d.id}`} className="text-red-500 hover:text-red-700"><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Hierarchy Panel */}
        <Card className="bg-white border-zinc-200 rounded-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-zinc-900">
                {hierarchyDept ? `Stage Hierarchy: ${hierarchyDept.name}` : 'Select a department'}
              </CardTitle>
              {hierarchyDept && (
                <Button size="sm" onClick={saveHierarchy} data-testid="save-hierarchy-button" className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs">Save Hierarchy</Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!hierarchyDept ? (
              <div className="py-12 text-center text-zinc-400 text-sm">Click a department to manage its stage hierarchy</div>
            ) : (
              <div className="space-y-4">
                {/* Add stage */}
                <div className="flex gap-2">
                  <Select value={addStageId} onValueChange={setAddStageId}>
                    <SelectTrigger className="border-zinc-200 flex-1" data-testid="add-stage-select"><SelectValue placeholder="Add a stage..." /></SelectTrigger>
                    <SelectContent>{availableStages.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.input_type})</SelectItem>)}</SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={addStageToHierarchy} disabled={!addStageId} data-testid="add-stage-to-hierarchy" className="border-zinc-200"><Plus className="w-3 h-3" /></Button>
                </div>

                {/* Stage list */}
                {sortedHierarchy.length === 0 ? (
                  <div className="py-8 text-center text-zinc-400 text-sm">No stages assigned. Add stages above.</div>
                ) : (
                  <div className="space-y-2">
                    {sortedHierarchy.map((h, idx) => {
                      const stageDef = stageMap[h.stage_id];
                      return (
                        <div key={h.stage_id} className="border border-zinc-200 rounded-sm p-3" data-testid={`hierarchy-item-${h.stage_id}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-mono text-zinc-400 w-5">{idx + 1}.</span>
                            {stageDef && <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: stageDef.color }} />}
                            <span className="text-sm font-semibold text-zinc-900 flex-1">{stageDef?.name || h.stage_id}</span>
                            <Badge className="rounded-sm text-[10px] bg-zinc-100 text-zinc-500">{stageDef?.input_type || '?'}</Badge>
                            <div className="flex items-center gap-0.5">
                              <Button variant="ghost" size="sm" onClick={() => moveUp(idx)} disabled={idx === 0} className="h-6 w-6 p-0"><ArrowUp className="w-3 h-3" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => moveDown(idx)} disabled={idx === sortedHierarchy.length - 1} className="h-6 w-6 p-0"><ArrowDown className="w-3 h-3" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => removeFromHierarchy(h.stage_id)} className="h-6 w-6 p-0 text-red-500"><X className="w-3 h-3" /></Button>
                            </div>
                          </div>
                          {/* Assigned users */}
                          <div className="ml-7">
                            <div className="flex items-center gap-1 flex-wrap mb-1.5">
                              <Users className="w-3 h-3 text-zinc-400" />
                              <span className="text-[10px] uppercase font-semibold text-zinc-400">Assigned:</span>
                              {h.assigned_users.length === 0 && <span className="text-[10px] text-zinc-300 italic">No users assigned</span>}
                              {h.assigned_users.map(uid => (
                                <Badge key={uid} className="rounded-sm text-[10px] bg-blue-50 text-blue-700 border border-blue-200 gap-1">
                                  {userMap[uid]?.name || uid}
                                  <button onClick={() => removeUserFromStage(h.stage_id, uid)} className="hover:text-red-500"><X className="w-2.5 h-2.5" /></button>
                                </Badge>
                              ))}
                            </div>
                            {assignUserOpen === h.stage_id ? (
                              <div className="flex gap-1">
                                <Select value={assignUserId} onValueChange={setAssignUserId}>
                                  <SelectTrigger className="border-zinc-200 h-7 text-xs flex-1" data-testid={`assign-user-select-${h.stage_id}`}><SelectValue placeholder="Select user..." /></SelectTrigger>
                                  <SelectContent>{users.filter(u => !h.assigned_users.includes(u._id)).map(u => <SelectItem key={u._id} value={u._id}>{u.name} ({u.department})</SelectItem>)}</SelectContent>
                                </Select>
                                <Button size="sm" variant="outline" onClick={() => addUserToStage(h.stage_id)} disabled={!assignUserId} className="h-7 text-xs border-zinc-200">Add</Button>
                                <Button size="sm" variant="ghost" onClick={() => { setAssignUserOpen(null); setAssignUserId(''); }} className="h-7 text-xs"><X className="w-3 h-3" /></Button>
                              </div>
                            ) : (
                              <Button variant="ghost" size="sm" onClick={() => setAssignUserOpen(h.stage_id)} className="h-6 text-[10px] text-blue-600 px-1" data-testid={`assign-user-btn-${h.stage_id}`}>
                                <Plus className="w-2.5 h-2.5 mr-0.5" /> Assign User
                              </Button>
                            )}
                          </div>
                          {/* Fallback-on-No (yes_no stages only) */}
                          {stageDef?.input_type === 'yes_no' && (
                            <div className="ml-7 mt-2 pt-2 border-t border-dashed border-zinc-200">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] uppercase font-semibold text-rose-600">On No, reset to:</span>
                                <Select
                                  value={h.fallback_stage_id || ''}
                                  onValueChange={v => setFallback(h.stage_id, v === '__none__' ? '' : v)}
                                >
                                  <SelectTrigger className="border-rose-200 h-7 text-xs w-56" data-testid={`fallback-select-${h.stage_id}`}>
                                    <SelectValue placeholder="Select fallback stage..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">— none (disabled) —</SelectItem>
                                    {sortedHierarchy
                                      .filter(x => x.stage_id !== h.stage_id && x.order < h.order)
                                      .map(x => (
                                        <SelectItem key={x.stage_id} value={x.stage_id}>
                                          {stageMap[x.stage_id]?.name || x.stage_id}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                {h.fallback_stage_id && (
                                  <span className="text-[10px] text-zinc-500">
                                    On "No", values from <b>{stageMap[h.fallback_stage_id]?.name || h.fallback_stage_id}</b> through <b>{stageDef.name}</b> will be cleared.
                                  </span>
                                )}
                                {!h.fallback_stage_id && (
                                  <span className="text-[10px] text-rose-600 italic">Required — users can't answer "No" until configured.</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
