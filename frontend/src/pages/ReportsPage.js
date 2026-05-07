import React, { useEffect, useState, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Textarea } from '../components/ui/textarea';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { CalendarIcon, Download, Filter, BarChart3, Users, Layers, Building2, ClipboardList, Pencil, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

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
  // Direct <img src> + native lazy loading: the browser only fetches when
  // scrolled into view, and HTTP cache (Cache-Control: immutable) avoids
  // refetches across pages.
  const url = `/api/files/${imagePath}`;
  return (
    <div ref={ref} className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={() => setHovered(false)}>
      <img
        src={url}
        alt="Fabric"
        loading="lazy"
        decoding="async"
        className="w-8 h-8 object-cover rounded-sm border border-zinc-200"
        data-testid="report-thumb"
      />
      {hovered && ReactDOM.createPortal(
        <div className="pointer-events-none" style={{ position: 'fixed', zIndex: 9999, top: pos.top, left: pos.left }}>
          <img src={url} alt="Preview" decoding="async" className="w-64 h-64 object-contain rounded-md border border-zinc-300 shadow-xl bg-white" data-testid="report-thumb-preview" />
        </div>,
        document.body
      )}
    </div>
  );
}

const departments_placeholder = []; // Fetched dynamically in components

function GridFilterCell({ filterKey, gridFilters, gridModes, updateGridFilter, toggleGridMode }) {
  const mode = gridModes[filterKey];
  const textVal = gridFilters[filterKey] || '';
  const modeLabel = mode === 'blank' ? 'B' : mode === 'filled' ? 'F' : null;
  const modeColor = mode === 'blank' ? 'bg-red-100 text-red-700 border-red-300' : mode === 'filled' ? 'bg-green-100 text-green-700 border-green-300' : '';
  const modeTitle = mode === 'blank' ? 'Showing Blank only (click to switch to Filled)' : mode === 'filled' ? 'Showing Filled only (click to clear)' : 'Click to filter Blank';
  return (
    <div className="flex items-center gap-0.5">
      <input
        type="text"
        value={textVal}
        onChange={e => updateGridFilter(filterKey, e.target.value)}
        placeholder={mode ? (mode === 'blank' ? 'Blank' : 'Filled') : 'Filter...'}
        disabled={!!mode}
        className={`flex-1 min-w-0 text-xs px-1.5 py-1 border rounded focus:outline-none focus:border-zinc-400 ${mode ? 'bg-zinc-100 text-zinc-400 border-zinc-200' : 'bg-white border-zinc-200'}`}
        data-testid={`grid-filter-${filterKey}`}
      />
      <button
        type="button"
        onClick={() => toggleGridMode(filterKey)}
        title={modeTitle}
        className={`shrink-0 w-5 h-5 text-[9px] font-bold rounded border flex items-center justify-center transition-colors ${modeLabel ? modeColor : 'bg-zinc-50 text-zinc-400 border-zinc-200 hover:bg-zinc-100'}`}
        data-testid={`grid-mode-${filterKey}`}
      >
        {modeLabel || 'BF'}
      </button>
    </div>
  );
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('enquiries');
  const [stages, setStages] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    Promise.all([api.get('/stages'), api.get('/users'), api.get('/departments')]).then(([sRes, uRes, dRes]) => {
      setStages(sRes.data);
      setUsers(uRes.data);
      setDepartments(dRes.data);
    });
  }, []);

  const stageMap = {};
  stages.forEach(s => { stageMap[s.id] = s; });
  const userMap = {};
  users.forEach(u => { userMap[u._id] = u; });

  return (
    <div className="space-y-6" data-testid="reports-page">
      <div><h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">Reports</h1><p className="text-sm text-zinc-500 mt-1">Analytics and insights</p></div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="bg-zinc-100 border border-zinc-200 rounded-sm inline-flex min-w-max" data-testid="report-tabs">
            <TabsTrigger value="enquiries" className="rounded-sm data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm" data-testid="tab-enquiries"><Filter className="w-3 h-3 mr-1.5 hidden sm:block" /> Enquiries</TabsTrigger>
            <TabsTrigger value="stages" className="rounded-sm data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm" data-testid="tab-stages"><Layers className="w-3 h-3 mr-1.5 hidden sm:block" /> Stages</TabsTrigger>
            <TabsTrigger value="users" className="rounded-sm data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm" data-testid="tab-users"><Users className="w-3 h-3 mr-1.5 hidden sm:block" /> Users</TabsTrigger>
            <TabsTrigger value="departments" className="rounded-sm data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm" data-testid="tab-departments"><Building2 className="w-3 h-3 mr-1.5 hidden sm:block" /> Dept</TabsTrigger>
            <TabsTrigger value="pending" className="rounded-sm data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm" data-testid="tab-pending"><ClipboardList className="w-3 h-3 mr-1.5 hidden sm:block" /> User Stages</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="enquiries"><EnquiryReport stages={stages} users={users} stageMap={stageMap} userMap={userMap} departments={departments} /></TabsContent>
        <TabsContent value="stages"><StageSummary stageMap={stageMap} /></TabsContent>
        <TabsContent value="users"><UserPerformance /></TabsContent>
        <TabsContent value="departments"><DepartmentReport stageMap={stageMap} /></TabsContent>
        <TabsContent value="pending"><UserStagesReport stages={stages} users={users} departments={departments} /></TabsContent>
      </Tabs>
    </div>
  );
}

const StageEditCell = React.memo(function StageEditCell({ enquiry, stage, hierarchyMap, orderMap, fallbackMap = {}, stageMap = {}, currentUser, onSaved }) {  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const sv = enquiry.stage_values || {};
  const cur = sv[stage.id] || {};
  const curVal = typeof cur === 'object' ? cur.value || '' : String(cur);
  const [val, setVal] = useState(curVal);
  const [comment, setComment] = useState('');
  const [file, setFile] = useState(null);

  const isAdmin = currentUser?.role === 'admin';
  const assigned = hierarchyMap[stage.id] || stage.assigned_users || [];
  const canEdit = isAdmin || (assigned.length > 0 && assigned.includes(currentUser?._id));
  const prevComplete = (() => {
    if (isAdmin) return true;
    const order = orderMap[stage.id];
    if (order == null) return true;
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
        imagePath = up.data?.path || up.data?.storage_path || up.data?.filename;
      }
      const newStageVal = { value: val };
      if (comment) newStageVal.comment = comment;
      if (imagePath) newStageVal.image_path = imagePath;
      await api.put(`/enquiries/${enquiry.id}`, { stage_values: { [stage.id]: newStageVal } });
      toast.success(`${stage.name} updated`);
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

  const display = curVal || '—';

  if (!canEdit) {
    return <span className="text-xs text-zinc-600">{display}</span>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={`w-full text-left text-xs px-1.5 py-1 rounded-sm border transition-colors ${
            curVal ? 'text-zinc-700 border-zinc-200 bg-white hover:border-amber-300' : 'text-zinc-400 border-dashed border-zinc-300 hover:border-amber-400 hover:bg-amber-50'
          }`}
          data-testid={`stage-edit-${enquiry.id}-${stage.id}`}
        >
          {display} <Pencil className="w-3 h-3 inline ml-1 text-amber-500" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase text-zinc-500">{stage.name}</div>
          {!prevComplete && !isAdmin ? (
            <div className="text-xs text-red-600 p-2 bg-red-50 rounded-sm">Complete previous stages first.</div>
          ) : (
            <>
              {stage.input_type === 'select' && (stage.select_options || []).length > 0 ? (
                <Select value={val} onValueChange={setVal}>
                  <SelectTrigger data-testid="stage-edit-value"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {stage.select_options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : stage.input_type === 'date' ? (
                <Input type="date" value={val} onChange={e => setVal(e.target.value)} data-testid="stage-edit-value" />
              ) : stage.input_type === 'yes_no' ? (
                (() => {
                  const fbId = fallbackMap[stage.id];
                  const fbName = fbId ? (stageMap[fbId]?.name || fbId) : null;
                  return (
                    <div className="space-y-2" data-testid="stage-edit-value">
                      <div className="flex gap-2">
                        <label className={`flex-1 flex items-center justify-center px-2 py-1.5 border rounded-sm cursor-pointer text-xs font-semibold transition-colors ${val.toLowerCase() === 'yes' ? 'border-green-500 bg-green-50 text-green-700' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>
                          <input type="radio" name={`yn-cell-${enquiry.id}-${stage.id}`} value="yes" checked={val.toLowerCase() === 'yes'} onChange={() => setVal('yes')} className="sr-only" data-testid="stage-edit-yn-yes" />
                          Pass
                        </label>
                        <label className={`flex-1 flex items-center justify-center px-2 py-1.5 border rounded-sm cursor-pointer text-xs font-semibold transition-colors ${val.toLowerCase() === 'no' ? 'border-red-500 bg-red-50 text-red-700' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'} ${!fbId ? 'opacity-40 cursor-not-allowed' : ''}`}>
                          <input type="radio" name={`yn-cell-${enquiry.id}-${stage.id}`} value="no" checked={val.toLowerCase() === 'no'} onChange={() => fbId && setVal('no')} disabled={!fbId} className="sr-only" data-testid="stage-edit-yn-no" />
                          Fail
                        </label>
                      </div>
                      {!fbId && <p className="text-[10px] text-rose-600">Admin must configure a fallback stage in Departments → Hierarchy.</p>}
                      {val.toLowerCase() === 'no' && fbName && (
                        <p className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200 rounded-sm px-1.5 py-0.5">
                          Will reset values from <b>{fbName}</b> through <b>{stage.name}</b>.
                        </p>
                      )}
                    </div>
                  );
                })()
              ) : (
                <Input value={val} onChange={e => setVal(e.target.value)} placeholder="Value" data-testid="stage-edit-value" />
              )}
              <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Add comment (optional)" rows={2} className="text-xs" data-testid="stage-edit-comment" />
              <label className="flex items-center gap-2 text-xs text-zinc-600 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>{file ? file.name : 'Attach image (optional)'}</span>
                <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0])} className="hidden" data-testid="stage-edit-image" />
              </label>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1 h-7 text-xs" data-testid="stage-edit-save">
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setOpen(false)} className="h-7 text-xs">Cancel</Button>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
});

// Self-contained inline editor for User Stages report pending rows.
// Renders as a centered modal (via portal) so it never gets clipped by table overflow.
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
      setVal(typeof cur === 'object' ? cur?.value || '' : String(cur || ''));
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

function EnquiryReport({ stages, users, stageMap, userMap, departments }) {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ start_date: '', end_date: '', department: '', customer_name: '', fabric_type: '', style_no: '', rate: '', po_no: '', po_del_date: '', fabric_received: '', qty_received: '', created_by: '' });
  const [didApplyDefault, setDidApplyDefault] = useState(false);
  // Default the `Created By` filter to the logged-in user; admins/users can change to All or a specific user
  useEffect(() => {
    if (!didApplyDefault && currentUser?._id) {
      setFilters(f => ({ ...f, created_by: currentUser._id }));
      setDidApplyDefault(true);
    }
  }, [currentUser, didApplyDefault]);
  const [stageFilters, setStageFilters] = useState({});
  const [gridFilters, setGridFilters] = useState({});
  const [gridModes, setGridModes] = useState({}); // 'blank' | 'filled' | undefined per column key
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showMore, setShowMore] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const activeStageFilters = {};
      Object.entries(stageFilters).forEach(([k, v]) => { if (v) activeStageFilters[k] = v; });
      if (Object.keys(activeStageFilters).length > 0) {
        params.stage_filters = JSON.stringify(activeStageFilters);
      }
      const res = await api.get('/reports/enquiries', { params });
      setData(res.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [filters, stageFilters]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  // Memoize hierarchy maps once per departments change (was recomputed for every row)
  const hierarchyByDept = React.useMemo(() => {
    const out = {};
    for (const d of departments) {
      const hMap = {};
      const oMap = {};
      const fMap = {};
      (d.stage_hierarchy || []).forEach(h => {
        hMap[h.stage_id] = h.assigned_users || [];
        oMap[h.stage_id] = h.order ?? 0;
        if (h.fallback_stage_id) fMap[h.stage_id] = h.fallback_stage_id;
      });
      out[d.name] = { hierarchyMap: hMap, orderMap: oMap, fallbackMap: fMap };
    }
    return out;
  }, [departments]);

  const handleStartDate = (date) => { setStartDate(date); setFilters({ ...filters, start_date: date ? date.toISOString() : '' }); };
  const handleEndDate = (date) => { setEndDate(date); setFilters({ ...filters, end_date: date ? date.toISOString() : '' }); };

  const exportExcel = async () => {
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const activeStageFilters = {};
      Object.entries(stageFilters).forEach(([k, v]) => { if (v) activeStageFilters[k] = v; });
      if (Object.keys(activeStageFilters).length > 0) {
        params.stage_filters = JSON.stringify(activeStageFilters);
      }
      const res = await api.get('/reports/export-excel', { params, responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'enquiry_report.xlsx';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 200);
      toast.success('Excel exported');
    } catch (err) {
      toast.error('Export failed');
    }
  };

  const getStageDisplay = (enq, stageId) => {
    const sv = enq.stage_values || {};
    const val = sv[stageId];
    if (!val) return '';
    return typeof val === 'object' ? val.value || '' : String(val);
  };

  const clearFilters = () => {
    setFilters({ start_date: '', end_date: '', department: '', customer_name: '', fabric_type: '', style_no: '', rate: '', po_no: '', po_del_date: '', fabric_received: '', qty_received: '', created_by: '' });
    setStageFilters({});
    setGridFilters({});
    setGridModes({});
    setStartDate(null);
    setEndDate(null);
  };

  const activeFilterCount = Object.values(filters).filter(v => v).length + Object.values(stageFilters).filter(v => v).length;
  const gridFilterCount = Object.values(gridFilters).filter(v => v).length + Object.values(gridModes).filter(v => v).length;

  // Helper to get a field value as string for filtering
  const getFieldValue = (enq, key) => {
    if (key.startsWith('stage_')) {
      return getStageDisplay(enq, key.replace('stage_', ''));
    }
    if (key === 'created_at') return enq.created_at || '';
    return enq[key] || '';
  };

  // Client-side grid filtering on fetched data
  const filteredEnquiries = React.useMemo(() => {
    if (!data?.enquiries) return [];
    if (gridFilterCount === 0) return data.enquiries;
    return data.enquiries.filter(enq => {
      // Check modes first (blank/filled)
      for (const [key, mode] of Object.entries(gridModes)) {
        if (!mode) continue;
        const val = getFieldValue(enq, key).trim();
        if (mode === 'blank' && val !== '') return false;
        if (mode === 'filled' && val === '') return false;
      }
      // Then check text filters
      for (const [key, val] of Object.entries(gridFilters)) {
        if (!val) continue;
        const lower = val.toLowerCase();
        const fieldVal = getFieldValue(enq, key);
        if (!fieldVal.toLowerCase().includes(lower)) return false;
      }
      return true;
    });
  }, [data, gridFilters, gridModes, gridFilterCount]);

  const updateGridFilter = (key, value) => {
    setGridFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleGridMode = (key) => {
    setGridModes(prev => {
      const current = prev[key];
      const next = !current ? 'blank' : current === 'blank' ? 'filled' : undefined;
      return { ...prev, [key]: next };
    });
  };

  return (
    <div className="space-y-4" data-testid="enquiry-report">
      <Card className="bg-white border-zinc-200 rounded-sm">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start border-zinc-200 text-sm" data-testid="start-date-picker">
                    <CalendarIcon className="w-3 h-3 mr-2" />{startDate ? format(startDate, 'PP') : 'Start date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={handleStartDate} /></PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start border-zinc-200 text-sm" data-testid="end-date-picker">
                    <CalendarIcon className="w-3 h-3 mr-2" />{endDate ? format(endDate, 'PP') : 'End date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={handleEndDate} /></PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Customer</Label>
              <Input value={filters.customer_name} onChange={e => setFilters({ ...filters, customer_name: e.target.value })} placeholder="Filter..." className="border-zinc-200" data-testid="report-customer-filter" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Fabric</Label>
              <Input value={filters.fabric_type} onChange={e => setFilters({ ...filters, fabric_type: e.target.value })} placeholder="Filter..." className="border-zinc-200" data-testid="report-fabric-filter" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Style No.</Label>
              <Input value={filters.style_no} onChange={e => setFilters({ ...filters, style_no: e.target.value })} placeholder="Filter..." className="border-zinc-200" data-testid="report-style-filter" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Dept</Label>
              <Select value={filters.department} onValueChange={v => setFilters({ ...filters, department: v })}>
                <SelectTrigger className="border-zinc-200" data-testid="report-dept-filter"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>{departments.map(d => <SelectItem key={d.id || d.name} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          {showMore && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 items-end">
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Rate</Label>
                <Input value={filters.rate} onChange={e => setFilters({ ...filters, rate: e.target.value })} placeholder="Filter..." className="border-zinc-200" data-testid="report-rate-filter" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">PO No.</Label>
                <Input value={filters.po_no} onChange={e => setFilters({ ...filters, po_no: e.target.value })} placeholder="Filter..." className="border-zinc-200" data-testid="report-po-filter" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">PO Received Date</Label>
                <Input value={filters.po_del_date} onChange={e => setFilters({ ...filters, po_del_date: e.target.value })} placeholder="Filter..." className="border-zinc-200" data-testid="report-po-date-filter" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Fabric Received</Label>
                <Select value={filters.fabric_received} onValueChange={v => setFilters({ ...filters, fabric_received: v })}>
                  <SelectTrigger className="border-zinc-200" data-testid="report-fabric-received-filter"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Qty Received</Label>
                <Input value={filters.qty_received} onChange={e => setFilters({ ...filters, qty_received: e.target.value })} placeholder="Filter..." className="border-zinc-200" data-testid="report-qty-received-filter" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Created By</Label>
                <Select value={filters.created_by || '__all__'} onValueChange={v => setFilters({ ...filters, created_by: v === '__all__' ? '' : v })}>
                  <SelectTrigger className="border-zinc-200" data-testid="report-created-by-filter"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Users</SelectItem>
                    {users.map(u => <SelectItem key={u._id} value={u._id}>{u.name}{u._id === currentUser?._id ? ' (Me)' : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          {showMore && stages.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide font-semibold text-amber-600">Stage Filters</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 items-end">
                {stages.map(s => (
                  <div key={s.id} className="space-y-1">
                    <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">{s.name}</Label>
                    {s.input_type === 'select' && s.select_options?.length > 0 ? (
                      <Select value={stageFilters[s.id] || ''} onValueChange={v => setStageFilters(prev => ({ ...prev, [s.id]: v }))}>
                        <SelectTrigger className="border-zinc-200" data-testid={`report-stage-filter-${s.id}`}><SelectValue placeholder="All" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__blank__">Blank</SelectItem>
                          <SelectItem value="__filled__">Filled</SelectItem>
                          {s.select_options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Input value={stageFilters[s.id] || ''} onChange={e => setStageFilters(prev => ({ ...prev, [s.id]: e.target.value }))} placeholder={stageFilters[s.id] === '__blank__' ? 'Blank' : stageFilters[s.id] === '__filled__' ? 'Filled' : 'Filter...'} disabled={stageFilters[s.id] === '__blank__' || stageFilters[s.id] === '__filled__'} className="border-zinc-200 flex-1" data-testid={`report-stage-filter-${s.id}`} />
                        <button type="button" onClick={() => {
                          setStageFilters(prev => {
                            const cur = prev[s.id];
                            const next = !cur || (cur !== '__blank__' && cur !== '__filled__') ? '__blank__' : cur === '__blank__' ? '__filled__' : '';
                            return { ...prev, [s.id]: next };
                          });
                        }} title={stageFilters[s.id] === '__blank__' ? 'Blank (click for Filled)' : stageFilters[s.id] === '__filled__' ? 'Filled (click to clear)' : 'Filter Blank/Filled'} className={`shrink-0 h-9 px-2 text-[10px] font-bold rounded border transition-colors ${stageFilters[s.id] === '__blank__' ? 'bg-red-100 text-red-700 border-red-300' : stageFilters[s.id] === '__filled__' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-zinc-50 text-zinc-400 border-zinc-200 hover:bg-zinc-100'}`} data-testid={`report-stage-mode-${s.id}`}>
                          {stageFilters[s.id] === '__blank__' ? 'B' : stageFilters[s.id] === '__filled__' ? 'F' : 'BF'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowMore(!showMore)} className="text-xs text-zinc-500" data-testid="toggle-more-filters">
              {showMore ? 'Less Filters' : 'More Filters'}{!showMore && activeFilterCount > 6 ? ` (${activeFilterCount - 6} active)` : ''}
            </Button>
            {(activeFilterCount > 0 || gridFilterCount > 0) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-red-500" data-testid="clear-filters">
                Clear All ({activeFilterCount + gridFilterCount})
              </Button>
            )}
            <div className="ml-auto flex items-center gap-2">
              {gridFilterCount > 0 && <span className="text-xs text-amber-600 font-medium" data-testid="grid-filter-count">Grid: {filteredEnquiries.length}/{data?.enquiries?.length || 0}</span>}
              <Button variant="outline" size="sm" onClick={exportExcel} data-testid="export-excel-button" className="border-zinc-200">
                <Download className="w-3 h-3 mr-1.5" /> Export Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-zinc-200 rounded-sm" style={{ overflow: 'hidden', maxWidth: '100%' }}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-zinc-900">Results</CardTitle>
            {data && <span className="text-xs text-zinc-500">{gridFilterCount > 0 ? `${filteredEnquiries.length} of ${data.total}` : `${data.total}`} enquiries</span>}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 220px)', scrollbarGutter: 'stable' }}>
            <table className="caption-bottom text-sm border-collapse enquiry-report-table" style={{ tableLayout: 'fixed', width: `${438 + stages.length * 180 + 820}px` }}>
              {/* Sticky-header rules: first thead row sticks at top:0, second filter row at top:40 */}
              <style>{`
                .enquiry-report-table thead tr:nth-child(1) th { position: sticky; top: 0; z-index: 25; background: #fafafa; }
                .enquiry-report-table thead tr:nth-child(2) th { position: sticky; top: 40px; z-index: 24; background: #fafafa; }
                /* Cells that already need horizontal stickiness (left + top) get a higher z-index so they overlay row stickiness */
                .enquiry-report-table thead tr:nth-child(1) th[data-sticky-left] { z-index: 35; }
                .enquiry-report-table thead tr:nth-child(2) th[data-sticky-left] { z-index: 34; }
              `}</style>
              <thead>
                <tr className="border-b bg-zinc-50">
                  <th data-sticky-left className="h-10 px-2 text-left text-xs font-semibold uppercase text-zinc-500 sticky bg-zinc-50 z-20" style={{ width: 40, left: 0 }}>SR</th>
                  <th data-sticky-left className="h-10 px-2 text-left text-xs font-semibold uppercase text-zinc-500 sticky bg-zinc-50 z-20" style={{ width: 48, left: 40 }}>Img</th>
                  <th data-sticky-left className="h-10 px-2 text-left text-xs font-semibold uppercase text-zinc-500 sticky bg-zinc-50 z-20" style={{ width: 110, left: 88 }}>Style No.</th>
                  <th data-sticky-left className="h-10 px-2 text-left text-xs font-semibold uppercase text-zinc-500 sticky bg-zinc-50 z-20" style={{ width: 130, left: 198 }}>Customer</th>
                  <th data-sticky-left className="h-10 px-2 text-left text-xs font-semibold uppercase text-zinc-500 sticky bg-zinc-50 z-20 border-r-2 border-zinc-300" style={{ width: 110, left: 328 }}>Fabric</th>
                  {stages.map(s => <th key={s.id} className="h-10 px-2 text-left text-xs font-semibold uppercase text-zinc-500" style={{ width: 180 }}>{s.name}</th>)}
                  <th className="h-10 px-2 text-left text-xs font-semibold uppercase text-zinc-500" style={{ width: 100 }}>Rate</th>
                  <th className="h-10 px-2 text-left text-xs font-semibold uppercase text-zinc-500" style={{ width: 100 }}>PO No.</th>
                  <th className="h-10 px-2 text-left text-xs font-semibold uppercase text-zinc-500" style={{ width: 100 }}>PO Rcvd</th>
                  <th className="h-10 px-2 text-left text-xs font-semibold uppercase text-zinc-500" style={{ width: 100 }}>Dept</th>
                  <th className="h-10 px-2 text-left text-xs font-semibold uppercase text-zinc-500" style={{ width: 120 }}>Created</th>
                  <th className="h-10 px-2 text-left text-xs font-semibold uppercase text-zinc-500" style={{ width: 200 }}>Comment</th>
                </tr>
                <tr className="border-b bg-zinc-50/50">
                  <th data-sticky-left className="px-1 py-1 sticky bg-zinc-50/50 z-20" style={{ width: 40, left: 0 }}></th>
                  <th data-sticky-left className="px-1 py-1 sticky bg-zinc-50/50 z-20" style={{ width: 48, left: 40 }}></th>
                  <th data-sticky-left className="px-1 py-1 sticky bg-zinc-50/50 z-20" style={{ width: 110, left: 88 }}>
                    <GridFilterCell filterKey="style_no" gridFilters={gridFilters} gridModes={gridModes} updateGridFilter={updateGridFilter} toggleGridMode={toggleGridMode} />
                  </th>
                  <th data-sticky-left className="px-1 py-1 sticky bg-zinc-50/50 z-20" style={{ width: 130, left: 198 }}>
                    <GridFilterCell filterKey="customer_name" gridFilters={gridFilters} gridModes={gridModes} updateGridFilter={updateGridFilter} toggleGridMode={toggleGridMode} />
                  </th>
                  <th data-sticky-left className="px-1 py-1 sticky bg-zinc-50/50 z-20 border-r-2 border-zinc-300" style={{ width: 110, left: 328 }}>
                    <GridFilterCell filterKey="fabric_type" gridFilters={gridFilters} gridModes={gridModes} updateGridFilter={updateGridFilter} toggleGridMode={toggleGridMode} />
                  </th>
                  {stages.map(s => (
                    <th key={`gf-${s.id}`} className="px-1 py-1" style={{ width: 180 }}>
                      <GridFilterCell filterKey={`stage_${s.id}`} gridFilters={gridFilters} gridModes={gridModes} updateGridFilter={updateGridFilter} toggleGridMode={toggleGridMode} />
                    </th>
                  ))}
                  <th className="px-1 py-1" style={{ width: 100 }}>
                    <GridFilterCell filterKey="rate" gridFilters={gridFilters} gridModes={gridModes} updateGridFilter={updateGridFilter} toggleGridMode={toggleGridMode} />
                  </th>
                  <th className="px-1 py-1" style={{ width: 100 }}>
                    <GridFilterCell filterKey="po_no" gridFilters={gridFilters} gridModes={gridModes} updateGridFilter={updateGridFilter} toggleGridMode={toggleGridMode} />
                  </th>
                  <th className="px-1 py-1" style={{ width: 100 }}>
                    <GridFilterCell filterKey="po_del_date" gridFilters={gridFilters} gridModes={gridModes} updateGridFilter={updateGridFilter} toggleGridMode={toggleGridMode} />
                  </th>
                  <th className="px-1 py-1" style={{ width: 100 }}>
                    <GridFilterCell filterKey="department" gridFilters={gridFilters} gridModes={gridModes} updateGridFilter={updateGridFilter} toggleGridMode={toggleGridMode} />
                  </th>
                  <th className="px-1 py-1" style={{ width: 120 }}>
                    <GridFilterCell filterKey="created_at" gridFilters={gridFilters} gridModes={gridModes} updateGridFilter={updateGridFilter} toggleGridMode={toggleGridMode} />
                  </th>
                  <th className="px-1 py-1" style={{ width: 200 }}>
                    <GridFilterCell filterKey="notes" gridFilters={gridFilters} gridModes={gridModes} updateGridFilter={updateGridFilter} toggleGridMode={toggleGridMode} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(3)].map((_, i) => <tr key={i} className="border-b">{[...Array(10 + stages.length)].map((_, j) => <td key={j} className="p-2"><div className="h-4 bg-zinc-100 rounded-sm animate-pulse" /></td>)}</tr>)
                ) : !filteredEnquiries.length ? (
                  <tr><td colSpan={12 + stages.length} className="text-center py-8 text-zinc-400">No data</td></tr>
                ) : (
                  filteredEnquiries.map((e, idx) => {
                    const { hierarchyMap = {}, orderMap = {}, fallbackMap = {} } = hierarchyByDept[e.department] || {};
                    return (
                    <tr key={e.id} className="border-b hover:bg-zinc-50 group" data-testid={`report-row-${e.id}`}>
                      <td className="p-2 text-zinc-500 text-xs font-mono sticky bg-white group-hover:bg-zinc-50 z-10" style={{ left: 0 }}>{e.enquiry_number || idx + 1}</td>
                      <td className="p-2 sticky bg-white group-hover:bg-zinc-50 z-10" style={{ left: 40 }}>{e.image_path ? <ReportThumbnail imagePath={e.image_path} /> : <span className="text-zinc-300">—</span>}</td>
                      <td className="p-2 text-zinc-600 text-xs sticky bg-white group-hover:bg-zinc-50 z-10" style={{ left: 88 }}>{e.style_no || '—'}</td>
                      <td className="p-2 font-medium text-zinc-900 text-sm sticky bg-white group-hover:bg-zinc-50 z-10" style={{ left: 198 }}>{e.customer_name}</td>
                      <td className="p-2 text-zinc-600 text-sm sticky bg-white group-hover:bg-zinc-50 z-10 border-r-2 border-zinc-300" style={{ left: 328 }}>{e.fabric_type}</td>
                      {stages.map(s => (
                        <td key={s.id} className="p-1 text-xs text-zinc-600 align-middle">
                          <StageEditCell
                            enquiry={e}
                            stage={s}
                            hierarchyMap={hierarchyMap}
                            orderMap={orderMap}
                            fallbackMap={fallbackMap}
                            stageMap={stageMap}
                            currentUser={currentUser}
                            onSaved={fetchReport}
                          />
                        </td>
                      ))}
                      <td className="p-2 text-zinc-600 text-xs">{e.rate || '—'}</td>
                      <td className="p-2 text-zinc-600 text-xs">{e.po_no || '—'}</td>
                      <td className="p-2 text-zinc-600 text-xs">{e.po_del_date || '—'}</td>
                      <td className="p-2 text-zinc-600 text-xs">{e.department || '—'}</td>
                      <td className="p-2 text-zinc-400 text-xs">{e.created_at ? new Date(e.created_at).toLocaleDateString() : '—'}</td>
                      <td className="p-2 text-zinc-500 text-xs max-w-[200px] truncate">{e.notes || '—'}</td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StageSummary({ stageMap }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/reports/stage-summary').then(res => { setData(res.data); setLoading(false); }).catch(() => setLoading(false)); }, []);

  const chartData = data.map(s => ({ name: s.stage_name, count: s.total_enquiries, filled: s.filled_count, color: s.color }));

  return (
    <div className="space-y-4" data-testid="stage-summary-report">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border-zinc-200 rounded-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-zinc-900">Enquiries per Stage</CardTitle></CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#71717A' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#71717A' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ border: '1px solid #E4E4E7', borderRadius: '4px', fontSize: '12px' }} />
                  <Bar dataKey="count" radius={[2, 2, 0, 0]}>{chartData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-[300px] flex items-center justify-center text-zinc-400 text-sm">No data</div>}
          </CardContent>
        </Card>
        <Card className="bg-white border-zinc-200 rounded-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-zinc-900">Stage Details</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow className="bg-zinc-50">
                <TableHead className="text-xs font-semibold uppercase text-zinc-500">Stage</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-zinc-500">Type</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-zinc-500">Required</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-zinc-500">Total</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-zinc-500">Filled</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loading ? [...Array(3)].map((_, i) => <TableRow key={i}>{[...Array(5)].map((_, j) => <TableCell key={j}><div className="h-4 bg-zinc-100 rounded-sm animate-pulse" /></TableCell>)}</TableRow>) :
                data.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-zinc-400">No data</TableCell></TableRow> :
                data.map(s => (
                  <TableRow key={s.stage_id} className="hover:bg-zinc-50" data-testid={`stage-summary-row-${s.stage_id}`}>
                    <TableCell><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} /><span className="font-medium text-zinc-900 text-sm">{s.stage_name}</span></div></TableCell>
                    <TableCell><Badge className="rounded-sm text-xs bg-zinc-100 text-zinc-600">{s.input_type}</Badge></TableCell>
                    <TableCell><Badge className={`rounded-sm text-xs ${s.is_mandatory ? 'bg-red-50 text-red-600' : 'bg-zinc-50 text-zinc-400'}`}>{s.is_mandatory ? 'Yes' : 'No'}</Badge></TableCell>
                    <TableCell className="font-mono text-zinc-600">{s.total_enquiries}</TableCell>
                    <TableCell className="font-mono text-zinc-600">{s.filled_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function UserPerformance() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/reports/user-performance').then(res => { setData(res.data); setLoading(false); }).catch(() => setLoading(false)); }, []);

  const chartData = data.filter(u => u.total_assigned > 0 || u.changes_made > 0).map(u => ({ name: u.user_name, assigned: u.total_assigned, changes: u.changes_made }));

  return (
    <div className="space-y-4" data-testid="user-performance-report">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border-zinc-200 rounded-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-zinc-900">Assigned vs Changes Made</CardTitle></CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" /><XAxis dataKey="name" tick={{ fontSize: 11, fill: '#71717A' }} /><YAxis tick={{ fontSize: 11, fill: '#71717A' }} allowDecimals={false} /><Tooltip contentStyle={{ border: '1px solid #E4E4E7', borderRadius: '4px', fontSize: '12px' }} /><Legend /><Bar dataKey="assigned" fill="#09090B" radius={[2, 2, 0, 0]} /><Bar dataKey="changes" fill="#22C55E" radius={[2, 2, 0, 0]} /></BarChart>
              </ResponsiveContainer>
            ) : <div className="h-[300px] flex items-center justify-center text-zinc-400 text-sm">No data</div>}
          </CardContent>
        </Card>
        <Card className="bg-white border-zinc-200 rounded-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-zinc-900">Performance Table</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow className="bg-zinc-50">
                <TableHead className="text-xs font-semibold uppercase text-zinc-500">User</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-zinc-500">Dept</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-zinc-500">Assigned</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-zinc-500">Changes</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loading ? [...Array(3)].map((_, i) => <TableRow key={i}>{[...Array(4)].map((_, j) => <TableCell key={j}><div className="h-4 bg-zinc-100 rounded-sm animate-pulse" /></TableCell>)}</TableRow>) :
                data.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-zinc-400">No data</TableCell></TableRow> :
                data.map(u => (
                  <TableRow key={u.user_id} className="hover:bg-zinc-50" data-testid={`user-perf-row-${u.user_id}`}>
                    <TableCell className="font-medium text-zinc-900">{u.user_name}</TableCell>
                    <TableCell className="text-zinc-600">{u.department}</TableCell>
                    <TableCell className="text-zinc-600 font-mono">{u.total_assigned}</TableCell>
                    <TableCell className="text-zinc-600 font-mono">{u.changes_made}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DepartmentReport({ stageMap }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/reports/department').then(res => { setData(res.data); setLoading(false); }).catch(() => setLoading(false)); }, []);

  const COLORS = ['#09090B', '#3B82F6', '#22C55E', '#EAB308', '#EF4444', '#8B5CF6', '#EC4899'];
  const pieData = data.map((d, i) => ({ name: d.department, value: d.total, fill: COLORS[i % COLORS.length] }));

  return (
    <div className="space-y-4" data-testid="department-report">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border-zinc-200 rounded-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-zinc-900">Enquiries by Department</CardTitle></CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart><Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>{pieData.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}</Pie><Tooltip contentStyle={{ border: '1px solid #E4E4E7', borderRadius: '4px', fontSize: '12px' }} /></PieChart>
              </ResponsiveContainer>
            ) : <div className="h-[300px] flex items-center justify-center text-zinc-400 text-sm">No data</div>}
          </CardContent>
        </Card>
        <Card className="bg-white border-zinc-200 rounded-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-zinc-900">Department Breakdown</CardTitle></CardHeader>
          <CardContent>
            {loading ? <div className="animate-pulse space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-zinc-100 rounded-sm" />)}</div> :
            data.length === 0 ? <div className="py-8 text-center text-zinc-400 text-sm">No data</div> :
            <div className="space-y-4">
              {data.map(dept => (
                <div key={dept.department} className="space-y-2" data-testid={`dept-breakdown-${dept.department}`}>
                  <div className="flex items-center justify-between"><span className="text-sm font-medium text-zinc-900">{dept.department}</span><span className="text-xs text-zinc-500 font-mono">{dept.total} total</span></div>
                  <div className="flex gap-1 flex-wrap">{dept.stage_breakdown?.map(sb => sb.count > 0 && <Badge key={sb.stage_id} className="rounded-sm text-xs" style={{ backgroundColor: sb.color + '20', color: sb.color }}>{sb.stage_name}: {sb.count}</Badge>)}</div>
                </div>
              ))}
            </div>}
          </CardContent>
        </Card>
      </div>
    </div>
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
