import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Textarea } from '../../components/ui/textarea';
import { Upload, Pencil, Download } from 'lucide-react';
import { toast } from 'sonner';

import { fileUrl } from '../../lib/fileUrl';

function ReportThumbnail({ imagePath }) {
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef(null);
  const handleMouseEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, left: rect.left });
    }
    setHovered(true);
  };
  if (!imagePath) return <span className="inline-block w-8 h-8 bg-zinc-100 rounded-sm" />;
  const url = fileUrl(imagePath);
  return (
    <div ref={ref} className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={() => setHovered(false)}>
      <img src={url} alt="Fabric" loading="lazy" decoding="async" className="w-8 h-8 object-cover rounded-sm border border-zinc-200" />
      {hovered && ReactDOM.createPortal(
        <div className="pointer-events-none" style={{ position: 'fixed', zIndex: 9999, top: pos.top, left: pos.left }}>
          <img src={url} alt="Preview" decoding="async" className="w-64 h-64 object-contain rounded-md border border-zinc-300 shadow-xl bg-white" />
        </div>,
        document.body
      )}
    </div>
  );
}

function PendingStageInlineEdit({ item, stages, departments, currentUser, onSaved }) {
  const [open, setOpen] = useState(false);
  const [enq, setEnq] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [val, setVal] = useState('');
  const [comment, setComment] = useState('');
  const [file, setFile] = useState(null);

  const stage = stages.find(s => s.id === item.stage_id);
  const dept = departments.find(d => d.name === item.department);
  const orderMap = {};
  (dept?.stage_hierarchy || []).forEach(h => { orderMap[h.stage_id] = h.order ?? 0; });

  const handleToggle = async (e) => {
    e.stopPropagation();
    if (open) { setOpen(false); return; }
    setLoading(true);
    setOpen(true);
    try {
      const res = await api.get(`/enquiries/${item.enquiry_id}`);
      setEnq(res.data);
      const cur = res.data.stage_values?.[item.stage_id];
      const curVal = typeof cur === 'object' ? cur?.value || '' : String(cur || '');
      // Prefill today's date for empty date stages so user can save in one click.
      if (!curVal && stage?.input_type === 'date') {
        setVal(new Date().toISOString().split('T')[0]);
      } else {
        setVal(curVal);
      }
    } catch {
      toast.error('Failed to load enquiry');
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const prevComplete = (() => {
    if (currentUser?.role === 'admin') return true;
    if (!enq) return true;
    const order = orderMap[item.stage_id];
    if (order == null) return true;
    const sv = enq.stage_values || {};
    for (const [sid, o] of Object.entries(orderMap)) {
      if (o < order) {
        const pv = sv[sid];
        const pval = typeof pv === 'object' ? pv?.value || '' : String(pv || '');
        if (!pval) return false;
      }
    }
    return true;
  })();

  const handleSave = async (e) => {
    e.stopPropagation();
    setSaving(true);
    try {
      let imagePath = null;
      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        const up = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        imagePath = up.data?.path;
      }
      const newStageVal = { value: val };
      if (comment) newStageVal.comment = comment;
      if (imagePath) newStageVal.image_path = imagePath;
      await api.put(`/enquiries/${item.enquiry_id}`, { stage_values: { [item.stage_id]: newStageVal } });
      toast.success(`${item.stage_name} updated`);
      setOpen(false);
      setComment('');
      setFile(null);
      onSaved?.();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (!stage) return <span className="text-zinc-300 text-xs">—</span>;

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-sm border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
        data-testid={`pending-edit-${item.enquiry_id}-${item.stage_id}`}
      >
        <Pencil className="w-3 h-3" />
        Fill
      </button>
      {open && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/40 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-md shadow-2xl p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-700">{item.stage_name}</div>
                <div className="text-sm font-semibold text-zinc-900 mt-0.5">{item.customer_name}</div>
                <div className="text-[11px] text-zinc-500">{item.style_no || item.fabric_type || ''}</div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-600 text-xl leading-none">&times;</button>
            </div>
            {loading || !enq ? (
              <div className="text-xs text-zinc-500 py-6 text-center">Loading enquiry…</div>
            ) : !prevComplete ? (
              <div className="text-xs text-red-600 p-3 bg-red-50 rounded-sm">Complete previous stages first.</div>
            ) : (
              <>
                {stage.input_type === 'select' && (stage.select_options || []).length > 0 ? (
                  <Select value={val} onValueChange={setVal}>
                    <SelectTrigger data-testid="pending-edit-value"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {stage.select_options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : stage.input_type === 'date' ? (
                  <Input type="date" value={val} onChange={e => setVal(e.target.value)} data-testid="pending-edit-value" />
                ) : stage.input_type === 'yes_no' ? (
                  (() => {
                    const hItem = (dept?.stage_hierarchy || []).find(x => x.stage_id === item.stage_id);
                    const fbId = hItem?.fallback_stage_id;
                    const fbName = fbId ? (stages.find(s => s.id === fbId)?.name || fbId) : null;
                    return (
                      <div className="space-y-2" data-testid="pending-edit-value">
                        <div className="flex gap-2">
                          <label className={`flex-1 flex items-center justify-center px-3 py-2 border rounded-sm cursor-pointer text-sm font-semibold transition-colors ${val.toLowerCase() === 'yes' ? 'border-green-500 bg-green-50 text-green-700' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>
                            <input type="radio" name={`yn-${item.enquiry_id}-${item.stage_id}`} value="yes" checked={val.toLowerCase() === 'yes'} onChange={() => setVal('yes')} className="sr-only" data-testid="pending-edit-yn-yes" />
                            Pass (Yes)
                          </label>
                          <label className={`flex-1 flex items-center justify-center px-3 py-2 border rounded-sm cursor-pointer text-sm font-semibold transition-colors ${val.toLowerCase() === 'no' ? 'border-red-500 bg-red-50 text-red-700' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'} ${!fbId ? 'opacity-40 cursor-not-allowed' : ''}`}>
                            <input type="radio" name={`yn-${item.enquiry_id}-${item.stage_id}`} value="no" checked={val.toLowerCase() === 'no'} onChange={() => fbId && setVal('no')} disabled={!fbId} className="sr-only" data-testid="pending-edit-yn-no" />
                            Fail (No)
                          </label>
                        </div>
                        {!fbId && <p className="text-[10px] text-rose-600">Admin must configure a fallback stage for "No" in Departments → Hierarchy.</p>}
                        {val.toLowerCase() === 'no' && fbName && (
                          <p className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200 rounded-sm px-2 py-1">
                            On save, all values from <b>{fbName}</b> through <b>{stage.name}</b> will be cleared.
                          </p>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <Input value={val} onChange={e => setVal(e.target.value)} placeholder="Value" data-testid="pending-edit-value" autoFocus />
                )}
                <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Add comment (optional)" rows={3} className="text-sm" data-testid="pending-edit-comment" />
                <label className="flex items-center gap-2 text-xs text-zinc-600 cursor-pointer p-2 border border-dashed border-zinc-300 rounded-sm hover:bg-zinc-50">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{file ? file.name : 'Attach image (optional)'}</span>
                  <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0])} className="hidden" data-testid="pending-edit-image" />
                </label>
                <div className="flex gap-2 pt-1">
                  <Button onClick={handleSave} disabled={saving || !val} className="flex-1" data-testid="pending-edit-save">
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function UserStagesReport({ stages, users, departments }) {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('pending');
  const [expandedUser, setExpandedUser] = useState(null);
  const [filterDept, setFilterDept] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [didApplyDefault, setDidApplyDefault] = useState(false);

  // Preset: default to logged-in user; can change to All or a specific user.
  useEffect(() => {
    if (!didApplyDefault && currentUser?._id) {
      setFilterUser(currentUser._id);
      setDidApplyDefault(true);
    }
  }, [currentUser, didApplyDefault]);

  // Wait for the default filter (current user) to be applied before firing the first
  // request — otherwise a stale unfiltered response can race ahead and overwrite the
  // filtered one, showing every user instead of the selected one.
  const fetchReport = useCallback(async (signal) => {
    setLoading(true);
    try {
      const params = {};
      if (filterDept) params.filter_department = filterDept;
      if (filterUser) params.filter_user = filterUser;
      if (filterStage) params.filter_stage = filterStage;
      const res = await api.get('/reports/user-stages', { params, signal });
      setData(res.data);
    } catch (err) {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') console.error(err);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [filterDept, filterUser, filterStage]);

  useEffect(() => {
    // Wait until the default filter (current user) is applied before the first fetch.
    // Otherwise an unfiltered request fires while currentUser is still null and may
    // resolve after the filtered request, overwriting it with all-users data.
    if (!didApplyDefault) return;
    const ctrl = new AbortController();
    fetchReport(ctrl.signal);
    return () => ctrl.abort();
  }, [fetchReport, didApplyDefault]);

  const totalPending = data.reduce((sum, u) => sum + u.pending_count, 0);
  const totalDone = data.reduce((sum, u) => sum + u.done_count, 0);
  const totalOverdue = data.reduce((sum, u) => sum + (u.pending || []).filter(p => p.is_overdue).length, 0);

  const exportExcel = async () => {
    try {
      const params = {};
      if (filterDept) params.filter_department = filterDept;
      if (filterUser) params.filter_user = filterUser;
      if (filterStage) params.filter_stage = filterStage;
      const res = await api.get('/reports/user-stages/export-excel', { params, responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'user_stages_report.xlsx'; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 200);
      toast.success('Excel exported');
    } catch { toast.error('Export failed'); }
  };

  const clearFilters = () => { setFilterDept(''); setFilterUser(''); setFilterStage(''); setViewMode('pending'); };
  const hasFilters = filterDept || filterUser || filterStage || viewMode !== 'pending';

  return (
    <div className="space-y-4" data-testid="user-stages-report">
      {/* Filters */}
      <Card className="bg-white border-zinc-200 rounded-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Department</Label>
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger className="w-40 border-zinc-200" data-testid="us-filter-dept"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>{departments.map(d => <SelectItem key={d.id || d.name} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">User</Label>
              <Select value={filterUser || '__all__'} onValueChange={v => setFilterUser(v === '__all__' ? '' : v)}>
                <SelectTrigger className="w-40 border-zinc-200" data-testid="us-filter-user"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Users</SelectItem>
                  {users.map(u => <SelectItem key={u._id} value={u._id}>{u.name}{u._id === currentUser?._id ? ' (Me)' : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Stage</Label>
              <Select value={filterStage} onValueChange={setFilterStage}>
                <SelectTrigger className="w-44 border-zinc-200" data-testid="us-filter-stage"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>{stages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Status</Label>
              <Select value={viewMode} onValueChange={setViewMode}>
                <SelectTrigger className="w-36 border-zinc-200" data-testid="us-filter-status"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="done">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-red-500" data-testid="us-clear-filters">Clear</Button>}
            <div className="ml-auto">
              <Button variant="outline" size="sm" onClick={exportExcel} className="border-zinc-200" data-testid="us-export-excel"><Download className="w-3 h-3 mr-1.5" /> Export Excel</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className={`border-zinc-200 rounded-sm cursor-pointer transition-colors ${viewMode === 'all' ? 'bg-zinc-900 text-white' : 'bg-white hover:bg-zinc-50'}`} onClick={() => setViewMode('all')}>
          <CardContent className="p-3 text-center">
            <p className={`text-xl font-bold ${viewMode === 'all' ? 'text-white' : 'text-zinc-900'}`}>{totalPending + totalDone}</p>
            <p className={`text-[10px] uppercase font-semibold ${viewMode === 'all' ? 'text-zinc-300' : 'text-zinc-500'}`}>Total</p>
          </CardContent>
        </Card>
        <Card className={`border-zinc-200 rounded-sm cursor-pointer transition-colors ${viewMode === 'pending' ? 'bg-amber-500 text-white' : 'bg-white hover:bg-zinc-50'}`} onClick={() => setViewMode('pending')}>
          <CardContent className="p-3 text-center">
            <p className={`text-xl font-bold ${viewMode === 'pending' ? 'text-white' : 'text-amber-600'}`}>{totalPending}</p>
            <p className={`text-[10px] uppercase font-semibold ${viewMode === 'pending' ? 'text-amber-100' : 'text-zinc-500'}`}>Pending</p>
          </CardContent>
        </Card>
        <Card className={`border-zinc-200 rounded-sm cursor-pointer transition-colors ${viewMode === 'done' ? 'bg-green-600 text-white' : 'bg-white hover:bg-zinc-50'}`} onClick={() => setViewMode('done')}>
          <CardContent className="p-3 text-center">
            <p className={`text-xl font-bold ${viewMode === 'done' ? 'text-white' : 'text-green-600'}`}>{totalDone}</p>
            <p className={`text-[10px] uppercase font-semibold ${viewMode === 'done' ? 'text-green-100' : 'text-zinc-500'}`}>Done</p>
          </CardContent>
        </Card>
        <Card className={`border-zinc-200 rounded-sm ${totalOverdue > 0 ? 'border-red-200' : ''}`}>
          <CardContent className="p-3 text-center">
            <p className={`text-xl font-bold ${totalOverdue > 0 ? 'text-red-600' : 'text-zinc-300'}`}>{totalOverdue}</p>
            <p className="text-[10px] uppercase font-semibold text-zinc-500">Overdue</p>
          </CardContent>
        </Card>
      </div>

      {/* User-wise breakdown */}
      <Card className="bg-white border-zinc-200 rounded-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-zinc-900">User-wise Stage Status</CardTitle>
            <span className="text-xs text-zinc-500">{data.length} users</span>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="animate-pulse space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-zinc-100 rounded-sm" />)}</div>
          ) : data.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 text-sm">No data. Set up department hierarchies and assign users to stages.</div>
          ) : (
            <div className="space-y-3">
              {data.map(u => {
                const isExpanded = expandedUser === u.user_id;
                const pendingItems = u.pending || [];
                const doneItems = u.done || [];
                const showPending = viewMode === 'all' || viewMode === 'pending';
                const showDone = viewMode === 'all' || viewMode === 'done';
                const total = u.pending_count + u.done_count;
                const pct = total > 0 ? Math.round((u.done_count / total) * 100) : 0;
                const overdueCount = pendingItems.filter(p => p.is_overdue).length;
                return (
                  <div key={u.user_id} className="border border-zinc-200 rounded-sm overflow-hidden" data-testid={`user-stage-${u.user_id}`}>
                    <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-zinc-50" onClick={() => setExpandedUser(isExpanded ? null : u.user_id)}>
                      <div className="w-8 h-8 rounded-sm bg-zinc-900 flex items-center justify-center text-white text-xs font-bold shrink-0">{u.user_name?.charAt(0)?.toUpperCase()}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-zinc-900">{u.user_name}</span>
                          <span className="text-[10px] text-zinc-400">{u.department}</span>
                          {overdueCount > 0 && <Badge className="rounded-sm text-[10px] bg-red-100 text-red-700 border border-red-200">{overdueCount} overdue</Badge>}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-zinc-500 font-mono w-8">{pct}%</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className="rounded-sm text-[10px] bg-amber-50 text-amber-700 border border-amber-200">{u.pending_count} pending</Badge>
                        <Badge className="rounded-sm text-[10px] bg-green-50 text-green-700 border border-green-200">{u.done_count} done</Badge>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-zinc-100">
                        {showPending && pendingItems.length > 0 && (
                          <div className="px-3 pt-3 pb-1">
                            <p className="text-[10px] uppercase font-semibold text-amber-600 mb-2">Pending ({pendingItems.length})</p>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs border-collapse">
                                <thead>
                                  <tr className="bg-amber-50/50">
                                    <th className="text-left px-2 py-1.5 font-semibold text-zinc-500 text-[10px] uppercase w-10">Img</th>
                                    <th className="text-left px-2 py-1.5 font-semibold text-zinc-500 text-[10px] uppercase">Stage</th>
                                    <th className="text-left px-2 py-1.5 font-semibold text-zinc-500 text-[10px] uppercase">Action</th>
                                    <th className="text-left px-2 py-1.5 font-semibold text-zinc-500 text-[10px] uppercase">Customer</th>
                                    <th className="text-left px-2 py-1.5 font-semibold text-zinc-500 text-[10px] uppercase">Style</th>
                                    <th className="text-left px-2 py-1.5 font-semibold text-zinc-500 text-[10px] uppercase">Fabric</th>
                                    <th className="text-left px-2 py-1.5 font-semibold text-zinc-500 text-[10px] uppercase">Dept</th>
                                    <th className="text-left px-2 py-1.5 font-semibold text-zinc-500 text-[10px] uppercase">Days Pending</th>
                                    <th className="text-left px-2 py-1.5 font-semibold text-zinc-500 text-[10px] uppercase">Due Date</th>
                                    <th className="text-left px-2 py-1.5 font-semibold text-zinc-500 text-[10px] uppercase">Overdue</th>
                                    <th className="text-left px-2 py-1.5 font-semibold text-zinc-500 text-[10px] uppercase">Prev Stage</th>
                                    <th className="text-left px-2 py-1.5 font-semibold text-zinc-500 text-[10px] uppercase">Prev By</th>
                                    <th className="text-left px-2 py-1.5 font-semibold text-zinc-500 text-[10px] uppercase">Prev At</th>
                                    <th className="text-left px-2 py-1.5 font-semibold text-zinc-500 text-[10px] uppercase">Enq Created</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {pendingItems.map((item, idx) => {
                                    const canEditPending = currentUser?.role === 'admin' || item.assigned_user_id === currentUser?._id || u.user_id === currentUser?._id;
                                    return (
                                    <tr key={`${item.enquiry_id}-${item.stage_id}`} className={`border-t border-zinc-100 ${item.is_overdue ? 'bg-red-50/50' : ''}`}>
                                      <td className="px-2 py-1.5">{item.image_path ? <ReportThumbnail imagePath={item.image_path} /> : <span className="text-zinc-300">—</span>}</td>
                                      <td className="px-2 py-1.5"><Badge className="rounded-sm text-[10px] bg-zinc-100 text-zinc-700">{item.stage_name}</Badge></td>
                                      <td className="px-2 py-1.5">
                                        {canEditPending ? (
                                          <PendingStageInlineEdit
                                            item={{ ...item, stage_id: item.stage_id }}
                                            stages={stages}
                                            departments={departments}
                                            currentUser={currentUser}
                                            onSaved={fetchReport}
                                          />
                                        ) : (
                                          <span className="text-zinc-300 text-xs">—</span>
                                        )}
                                      </td>
                                      <td className="px-2 py-1.5 text-zinc-700 font-medium">{item.customer_name}</td>
                                      <td className="px-2 py-1.5 text-zinc-500">{item.style_no || '—'}</td>
                                      <td className="px-2 py-1.5 text-zinc-500">{item.fabric_type || '—'}</td>
                                      <td className="px-2 py-1.5 text-zinc-400">{item.department}</td>
                                      <td className="px-2 py-1.5 font-mono font-semibold text-amber-700">{item.days_pending}d</td>
                                      <td className="px-2 py-1.5 text-zinc-500">{item.due_date ? new Date(item.due_date).toLocaleDateString() : '—'}</td>
                                      <td className="px-2 py-1.5">{item.is_overdue ? <Badge className="rounded-sm text-[10px] bg-red-100 text-red-700 border border-red-200">OVERDUE</Badge> : <span className="text-zinc-300">—</span>}</td>
                                      <td className="px-2 py-1.5 text-zinc-500">{item.prev_stage_name || '—'}</td>
                                      <td className="px-2 py-1.5 text-zinc-500">{item.prev_completed_by || '—'}</td>
                                      <td className="px-2 py-1.5 text-zinc-400">{item.prev_completed_at ? new Date(item.prev_completed_at).toLocaleDateString() : '—'}</td>
                                      <td className="px-2 py-1.5 text-zinc-400">{item.enquiry_created_at ? new Date(item.enquiry_created_at).toLocaleDateString() : '—'}</td>
                                    </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                        {showDone && doneItems.length > 0 && (
                          <div className="px-3 pt-3 pb-1">
                            <p className="text-[10px] uppercase font-semibold text-green-600 mb-2">Completed ({doneItems.length})</p>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs border-collapse">
                                <thead>
                                  <tr className="bg-green-50/50">
                                    <th className="text-left px-2 py-1.5 font-semibold text-zinc-500 text-[10px] uppercase w-10">Img</th>
                                    <th className="text-left px-2 py-1.5 font-semibold text-zinc-500 text-[10px] uppercase">Stage</th>
                                    <th className="text-left px-2 py-1.5 font-semibold text-zinc-500 text-[10px] uppercase">Customer</th>
                                    <th className="text-left px-2 py-1.5 font-semibold text-zinc-500 text-[10px] uppercase">Style</th>
                                    <th className="text-left px-2 py-1.5 font-semibold text-zinc-500 text-[10px] uppercase">Fabric</th>
                                    <th className="text-left px-2 py-1.5 font-semibold text-zinc-500 text-[10px] uppercase">Dept</th>
                                    <th className="text-left px-2 py-1.5 font-semibold text-zinc-500 text-[10px] uppercase">Value</th>
                                    <th className="text-left px-2 py-1.5 font-semibold text-zinc-500 text-[10px] uppercase">Days Taken</th>
                                    <th className="text-left px-2 py-1.5 font-semibold text-zinc-500 text-[10px] uppercase">Completed</th>
                                    <th className="text-left px-2 py-1.5 font-semibold text-zinc-500 text-[10px] uppercase">Prev Stage</th>
                                    <th className="text-left px-2 py-1.5 font-semibold text-zinc-500 text-[10px] uppercase">Prev By</th>
                                    <th className="text-left px-2 py-1.5 font-semibold text-zinc-500 text-[10px] uppercase">Enq Created</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {doneItems.map((item, idx) => (
                                    <tr key={`${item.enquiry_id}-${item.stage_id}`} className="border-t border-zinc-100 hover:bg-zinc-50">
                                      <td className="px-2 py-1.5">{item.image_path ? <ReportThumbnail imagePath={item.image_path} /> : <span className="text-zinc-300">—</span>}</td>
                                      <td className="px-2 py-1.5"><Badge className="rounded-sm text-[10px] bg-green-50 text-green-700">{item.stage_name}</Badge></td>
                                      <td className="px-2 py-1.5 text-zinc-700 font-medium">{item.customer_name}</td>
                                      <td className="px-2 py-1.5 text-zinc-500">{item.style_no || '—'}</td>
                                      <td className="px-2 py-1.5 text-zinc-500">{item.fabric_type || '—'}</td>
                                      <td className="px-2 py-1.5 text-zinc-400">{item.department}</td>
                                      <td className="px-2 py-1.5 text-green-700 font-medium">{item.value}</td>
                                      <td className="px-2 py-1.5 font-mono text-zinc-600">{item.days_taken ? `${item.days_taken}d` : '—'}</td>
                                      <td className="px-2 py-1.5 text-zinc-500">{item.completed_at ? new Date(item.completed_at).toLocaleDateString() : '—'}</td>
                                      <td className="px-2 py-1.5 text-zinc-500">{item.prev_stage_name || '—'}</td>
                                      <td className="px-2 py-1.5 text-zinc-500">{item.prev_completed_by || '—'}</td>
                                      <td className="px-2 py-1.5 text-zinc-400">{item.enquiry_created_at ? new Date(item.enquiry_created_at).toLocaleDateString() : '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                        {((showPending && pendingItems.length === 0 && !showDone) || (showDone && doneItems.length === 0 && !showPending) || (pendingItems.length === 0 && doneItems.length === 0)) && (
                          <div className="text-center py-4 text-zinc-400 text-xs">No items to display</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default UserStagesReport;
