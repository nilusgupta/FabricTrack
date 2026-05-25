import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Calendar } from '../../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Textarea } from '../../components/ui/textarea';
import { CalendarIcon, Download, Pencil, Upload } from 'lucide-react';
import { format } from 'date-fns';
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
  // Direct <img src> + native lazy loading: the browser only fetches when
  // scrolled into view, and HTTP cache (Cache-Control: immutable) avoids
  // refetches across pages.
  const url = fileUrl(imagePath);
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
const StageEditCell = React.memo(function StageEditCell({ enquiry, stage, hierarchyMap, orderMap, fallbackMap = {}, stageMap = {}, currentUser, onSaved }) {  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const sv = enquiry.stage_values || {};
  const cur = sv[stage.id] || {};
  const curVal = typeof cur === 'object' ? cur.value || '' : String(cur);
  // For empty date cells, prefill today (YYYY-MM-DD) so user can save in one
  // click; they can still change the date before saving.
  const initialVal = (!curVal && stage.input_type === 'date')
    ? new Date().toISOString().split('T')[0]
    : curVal;
  const [val, setVal] = useState(initialVal);
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

export default EnquiryReport;
