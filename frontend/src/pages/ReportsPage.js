import React, { useEffect, useState, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import api from '../lib/api';
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { CalendarIcon, Download, Filter, BarChart3, Users, Layers, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

function ReportThumbnail({ imagePath }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef(null);
  useEffect(() => {
    if (!imagePath) return;
    let revoke = null;
    api.get(`/files/${imagePath}`, { responseType: 'blob' })
      .then(res => { const url = URL.createObjectURL(res.data); revoke = url; setBlobUrl(url); })
      .catch(() => {});
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [imagePath]);
  const handleMouseEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, left: rect.left });
    }
    setHovered(true);
  };
  if (!blobUrl) return <span className="text-zinc-300">—</span>;
  return (
    <div ref={ref} className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={() => setHovered(false)}>
      <img src={blobUrl} alt="Fabric" className="w-8 h-8 object-cover rounded-sm border border-zinc-200" data-testid="report-thumb" />
      {hovered && ReactDOM.createPortal(
        <div className="pointer-events-none" style={{ position: 'fixed', zIndex: 9999, top: pos.top, left: pos.left }}>
          <img src={blobUrl} alt="Preview" className="w-64 h-64 object-contain rounded-md border border-zinc-300 shadow-xl bg-white" data-testid="report-thumb-preview" />
        </div>,
        document.body
      )}
    </div>
  );
}

const departments_placeholder = []; // Fetched dynamically in components

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
        <TabsList className="bg-zinc-100 border border-zinc-200 rounded-sm" data-testid="report-tabs">
          <TabsTrigger value="enquiries" className="rounded-sm data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm" data-testid="tab-enquiries"><Filter className="w-3 h-3 mr-1.5" /> Enquiry Report</TabsTrigger>
          <TabsTrigger value="stages" className="rounded-sm data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm" data-testid="tab-stages"><Layers className="w-3 h-3 mr-1.5" /> Stage Summary</TabsTrigger>
          <TabsTrigger value="users" className="rounded-sm data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm" data-testid="tab-users"><Users className="w-3 h-3 mr-1.5" /> User Performance</TabsTrigger>
          <TabsTrigger value="departments" className="rounded-sm data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm" data-testid="tab-departments"><Building2 className="w-3 h-3 mr-1.5" /> Department</TabsTrigger>
        </TabsList>
        <TabsContent value="enquiries"><EnquiryReport stages={stages} users={users} stageMap={stageMap} userMap={userMap} departments={departments} /></TabsContent>
        <TabsContent value="stages"><StageSummary stageMap={stageMap} /></TabsContent>
        <TabsContent value="users"><UserPerformance /></TabsContent>
        <TabsContent value="departments"><DepartmentReport stageMap={stageMap} /></TabsContent>
      </Tabs>
    </div>
  );
}

function EnquiryReport({ stages, users, stageMap, userMap, departments }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ start_date: '', end_date: '', department: '', customer_name: '', fabric_type: '', style_no: '', rate: '', po_no: '', po_del_date: '', fabric_received: '', qty_received: '', created_by: '' });
  const [stageFilters, setStageFilters] = useState({});
  const [gridFilters, setGridFilters] = useState({});
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
    setStartDate(null);
    setEndDate(null);
  };

  const activeFilterCount = Object.values(filters).filter(v => v).length + Object.values(stageFilters).filter(v => v).length;
  const gridFilterCount = Object.values(gridFilters).filter(v => v).length;

  // Client-side grid filtering on fetched data
  const filteredEnquiries = React.useMemo(() => {
    if (!data?.enquiries) return [];
    if (gridFilterCount === 0) return data.enquiries;
    return data.enquiries.filter(enq => {
      for (const [key, val] of Object.entries(gridFilters)) {
        if (!val) continue;
        const lower = val.toLowerCase();
        if (key === 'style_no') { if (!(enq.style_no || '').toLowerCase().includes(lower)) return false; }
        else if (key === 'customer_name') { if (!(enq.customer_name || '').toLowerCase().includes(lower)) return false; }
        else if (key === 'fabric_type') { if (!(enq.fabric_type || '').toLowerCase().includes(lower)) return false; }
        else if (key === 'rate') { if (!(enq.rate || '').toLowerCase().includes(lower)) return false; }
        else if (key === 'po_no') { if (!(enq.po_no || '').toLowerCase().includes(lower)) return false; }
        else if (key === 'po_del_date') { if (!(enq.po_del_date || '').toLowerCase().includes(lower)) return false; }
        else if (key === 'department') { if (!(enq.department || '').toLowerCase().includes(lower)) return false; }
        else if (key === 'created_at') { if (!(enq.created_at || '').toLowerCase().includes(lower)) return false; }
        else if (key === 'notes') { if (!(enq.notes || '').toLowerCase().includes(lower)) return false; }
        else if (key.startsWith('stage_')) {
          const stageId = key.replace('stage_', '');
          const stageVal = getStageDisplay(enq, stageId);
          if (!stageVal.toLowerCase().includes(lower)) return false;
        }
      }
      return true;
    });
  }, [data, gridFilters, gridFilterCount]);

  const updateGridFilter = (key, value) => {
    setGridFilters(prev => ({ ...prev, [key]: value }));
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
                <Select value={filters.created_by} onValueChange={v => setFilters({ ...filters, created_by: v })}>
                  <SelectTrigger className="border-zinc-200" data-testid="report-created-by-filter"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>{users.map(u => <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>)}</SelectContent>
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
                        <SelectContent>{s.select_options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : (
                      <Input value={stageFilters[s.id] || ''} onChange={e => setStageFilters(prev => ({ ...prev, [s.id]: e.target.value }))} placeholder="Filter..." className="border-zinc-200" data-testid={`report-stage-filter-${s.id}`} />
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
          <div className="overflow-x-scroll" style={{ scrollbarGutter: 'stable' }}>
            <table className="caption-bottom text-sm border-collapse" style={{ tableLayout: 'fixed', width: `${438 + stages.length * 180 + 820}px` }}>
              <thead>
                <tr className="border-b bg-zinc-50">
                  <th className="h-10 px-2 text-left text-xs font-semibold uppercase text-zinc-500 sticky bg-zinc-50 z-20" style={{ width: 40, left: 0 }}>SR</th>
                  <th className="h-10 px-2 text-left text-xs font-semibold uppercase text-zinc-500 sticky bg-zinc-50 z-20" style={{ width: 48, left: 40 }}>Img</th>
                  <th className="h-10 px-2 text-left text-xs font-semibold uppercase text-zinc-500 sticky bg-zinc-50 z-20" style={{ width: 110, left: 88 }}>Style No.</th>
                  <th className="h-10 px-2 text-left text-xs font-semibold uppercase text-zinc-500 sticky bg-zinc-50 z-20" style={{ width: 130, left: 198 }}>Customer</th>
                  <th className="h-10 px-2 text-left text-xs font-semibold uppercase text-zinc-500 sticky bg-zinc-50 z-20 border-r-2 border-zinc-300" style={{ width: 110, left: 328 }}>Fabric</th>
                  {stages.map(s => <th key={s.id} className="h-10 px-2 text-left text-xs font-semibold uppercase text-zinc-500" style={{ width: 180 }}>{s.name}</th>)}
                  <th className="h-10 px-2 text-left text-xs font-semibold uppercase text-zinc-500" style={{ width: 100 }}>Rate</th>
                  <th className="h-10 px-2 text-left text-xs font-semibold uppercase text-zinc-500" style={{ width: 100 }}>PO No.</th>
                  <th className="h-10 px-2 text-left text-xs font-semibold uppercase text-zinc-500" style={{ width: 100 }}>PO Rcvd</th>
                  <th className="h-10 px-2 text-left text-xs font-semibold uppercase text-zinc-500" style={{ width: 100 }}>Dept</th>
                  <th className="h-10 px-2 text-left text-xs font-semibold uppercase text-zinc-500" style={{ width: 120 }}>Created</th>
                  <th className="h-10 px-2 text-left text-xs font-semibold uppercase text-zinc-500" style={{ width: 200 }}>Comment</th>
                </tr>
                <tr className="border-b bg-zinc-50/50">
                  <th className="px-1 py-1 sticky bg-zinc-50/50 z-20" style={{ width: 40, left: 0 }}></th>
                  <th className="px-1 py-1 sticky bg-zinc-50/50 z-20" style={{ width: 48, left: 40 }}></th>
                  <th className="px-1 py-1 sticky bg-zinc-50/50 z-20" style={{ width: 110, left: 88 }}>
                    <input type="text" value={gridFilters.style_no || ''} onChange={e => updateGridFilter('style_no', e.target.value)} placeholder="Filter..." className="w-full text-xs px-1.5 py-1 border border-zinc-200 rounded bg-white focus:outline-none focus:border-zinc-400" data-testid="grid-filter-style" />
                  </th>
                  <th className="px-1 py-1 sticky bg-zinc-50/50 z-20" style={{ width: 130, left: 198 }}>
                    <input type="text" value={gridFilters.customer_name || ''} onChange={e => updateGridFilter('customer_name', e.target.value)} placeholder="Filter..." className="w-full text-xs px-1.5 py-1 border border-zinc-200 rounded bg-white focus:outline-none focus:border-zinc-400" data-testid="grid-filter-customer" />
                  </th>
                  <th className="px-1 py-1 sticky bg-zinc-50/50 z-20 border-r-2 border-zinc-300" style={{ width: 110, left: 328 }}>
                    <input type="text" value={gridFilters.fabric_type || ''} onChange={e => updateGridFilter('fabric_type', e.target.value)} placeholder="Filter..." className="w-full text-xs px-1.5 py-1 border border-zinc-200 rounded bg-white focus:outline-none focus:border-zinc-400" data-testid="grid-filter-fabric" />
                  </th>
                  {stages.map(s => (
                    <th key={`gf-${s.id}`} className="px-1 py-1" style={{ width: 180 }}>
                      <input type="text" value={gridFilters[`stage_${s.id}`] || ''} onChange={e => updateGridFilter(`stage_${s.id}`, e.target.value)} placeholder="Filter..." className="w-full text-xs px-1.5 py-1 border border-zinc-200 rounded bg-white focus:outline-none focus:border-zinc-400" data-testid={`grid-filter-stage-${s.id}`} />
                    </th>
                  ))}
                  <th className="px-1 py-1" style={{ width: 100 }}>
                    <input type="text" value={gridFilters.rate || ''} onChange={e => updateGridFilter('rate', e.target.value)} placeholder="Filter..." className="w-full text-xs px-1.5 py-1 border border-zinc-200 rounded bg-white focus:outline-none focus:border-zinc-400" data-testid="grid-filter-rate" />
                  </th>
                  <th className="px-1 py-1" style={{ width: 100 }}>
                    <input type="text" value={gridFilters.po_no || ''} onChange={e => updateGridFilter('po_no', e.target.value)} placeholder="Filter..." className="w-full text-xs px-1.5 py-1 border border-zinc-200 rounded bg-white focus:outline-none focus:border-zinc-400" data-testid="grid-filter-po" />
                  </th>
                  <th className="px-1 py-1" style={{ width: 100 }}>
                    <input type="text" value={gridFilters.po_del_date || ''} onChange={e => updateGridFilter('po_del_date', e.target.value)} placeholder="Filter..." className="w-full text-xs px-1.5 py-1 border border-zinc-200 rounded bg-white focus:outline-none focus:border-zinc-400" data-testid="grid-filter-po-date" />
                  </th>
                  <th className="px-1 py-1" style={{ width: 100 }}>
                    <input type="text" value={gridFilters.department || ''} onChange={e => updateGridFilter('department', e.target.value)} placeholder="Filter..." className="w-full text-xs px-1.5 py-1 border border-zinc-200 rounded bg-white focus:outline-none focus:border-zinc-400" data-testid="grid-filter-dept" />
                  </th>
                  <th className="px-1 py-1" style={{ width: 120 }}>
                    <input type="text" value={gridFilters.created_at || ''} onChange={e => updateGridFilter('created_at', e.target.value)} placeholder="Filter..." className="w-full text-xs px-1.5 py-1 border border-zinc-200 rounded bg-white focus:outline-none focus:border-zinc-400" data-testid="grid-filter-created" />
                  </th>
                  <th className="px-1 py-1" style={{ width: 200 }}>
                    <input type="text" value={gridFilters.notes || ''} onChange={e => updateGridFilter('notes', e.target.value)} placeholder="Filter..." className="w-full text-xs px-1.5 py-1 border border-zinc-200 rounded bg-white focus:outline-none focus:border-zinc-400" data-testid="grid-filter-notes" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(3)].map((_, i) => <tr key={i} className="border-b">{[...Array(10 + stages.length)].map((_, j) => <td key={j} className="p-2"><div className="h-4 bg-zinc-100 rounded-sm animate-pulse" /></td>)}</tr>)
                ) : !filteredEnquiries.length ? (
                  <tr><td colSpan={12 + stages.length} className="text-center py-8 text-zinc-400">No data</td></tr>
                ) : (
                  filteredEnquiries.map((e, idx) => (
                    <tr key={e.id} className="border-b hover:bg-zinc-50 group" data-testid={`report-row-${e.id}`}>
                      <td className="p-2 text-zinc-500 text-xs font-mono sticky bg-white group-hover:bg-zinc-50 z-10" style={{ left: 0 }}>{idx + 1}</td>
                      <td className="p-2 sticky bg-white group-hover:bg-zinc-50 z-10" style={{ left: 40 }}>{e.image_path ? <ReportThumbnail imagePath={e.image_path} /> : <span className="text-zinc-300">—</span>}</td>
                      <td className="p-2 text-zinc-600 text-xs sticky bg-white group-hover:bg-zinc-50 z-10" style={{ left: 88 }}>{e.style_no || '—'}</td>
                      <td className="p-2 font-medium text-zinc-900 text-sm sticky bg-white group-hover:bg-zinc-50 z-10" style={{ left: 198 }}>{e.customer_name}</td>
                      <td className="p-2 text-zinc-600 text-sm sticky bg-white group-hover:bg-zinc-50 z-10 border-r-2 border-zinc-300" style={{ left: 328 }}>{e.fabric_type}</td>
                      {stages.map(s => {
                        const val = getStageDisplay(e, s.id);
                        return <td key={s.id} className="p-2 text-xs text-zinc-600">{val || '—'}</td>;
                      })}
                      <td className="p-2 text-zinc-600 text-xs">{e.rate || '—'}</td>
                      <td className="p-2 text-zinc-600 text-xs">{e.po_no || '—'}</td>
                      <td className="p-2 text-zinc-600 text-xs">{e.po_del_date || '—'}</td>
                      <td className="p-2 text-zinc-600 text-xs">{e.department || '—'}</td>
                      <td className="p-2 text-zinc-400 text-xs">{e.created_at ? new Date(e.created_at).toLocaleDateString() : '—'}</td>
                      <td className="p-2 text-zinc-500 text-xs max-w-[200px] truncate">{e.notes || '—'}</td>
                    </tr>
                  ))
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
