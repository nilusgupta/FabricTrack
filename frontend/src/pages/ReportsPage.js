import React, { useEffect, useState, useCallback } from 'react';
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
  const [filters, setFilters] = useState({ start_date: '', end_date: '', department: '', assigned_to: '', customer_name: '', fabric_type: '', style_no: '' });
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await api.get('/reports/enquiries', { params });
      setData(res.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleStartDate = (date) => { setStartDate(date); setFilters({ ...filters, start_date: date ? date.toISOString() : '' }); };
  const handleEndDate = (date) => { setEndDate(date); setFilters({ ...filters, end_date: date ? date.toISOString() : '' }); };

  const exportExcel = async () => {
    try {
      const params = {};
      if (filters.department) params.department = filters.department;
      if (filters.customer_name) params.customer_name = filters.customer_name;
      if (filters.fabric_type) params.fabric_type = filters.fabric_type;
      const res = await api.get('/reports/export-excel', { params, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'enquiry_report.xlsx';
      a.click();
      URL.revokeObjectURL(url);
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

  return (
    <div className="space-y-4" data-testid="enquiry-report">
      <Card className="bg-white border-zinc-200 rounded-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 items-end">
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
            <Button variant="outline" size="sm" onClick={exportExcel} data-testid="export-excel-button" className="border-zinc-200 self-end">
              <Download className="w-3 h-3 mr-1.5" /> Export Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-zinc-200 rounded-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-zinc-900">Results</CardTitle>
            {data && <span className="text-xs text-zinc-500">{data.total} enquiries</span>}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50">
                  <TableHead className="text-xs font-semibold uppercase text-zinc-500">SR</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-zinc-500">Style No.</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-zinc-500">Customer</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-zinc-500">Fabric</TableHead>
                  {stages.map(s => <TableHead key={s.id} className="text-xs font-semibold uppercase text-zinc-500">{s.name}</TableHead>)}
                  <TableHead className="text-xs font-semibold uppercase text-zinc-500">Rate</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-zinc-500">PO No.</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-zinc-500">PO Del</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-zinc-500">Dept</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-zinc-500">Comment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(3)].map((_, i) => <TableRow key={i}>{[...Array(7 + stages.length)].map((_, j) => <TableCell key={j}><div className="h-4 bg-zinc-100 rounded-sm animate-pulse" /></TableCell>)}</TableRow>)
                ) : !data?.enquiries?.length ? (
                  <TableRow><TableCell colSpan={10 + stages.length} className="text-center py-8 text-zinc-400">No data</TableCell></TableRow>
                ) : (
                  data.enquiries.map((e, idx) => (
                    <TableRow key={e.id} className="hover:bg-zinc-50" data-testid={`report-row-${e.id}`}>
                      <TableCell className="text-zinc-500 text-xs font-mono">{idx + 1}</TableCell>
                      <TableCell className="text-zinc-600 text-xs">{e.style_no || '—'}</TableCell>
                      <TableCell className="font-medium text-zinc-900 text-sm">{e.customer_name}</TableCell>
                      <TableCell className="text-zinc-600 text-sm">{e.fabric_type}</TableCell>
                      {stages.map(s => {
                        const val = getStageDisplay(e, s.id);
                        return <TableCell key={s.id} className="text-xs text-zinc-600">{val || '—'}</TableCell>;
                      })}
                      <TableCell className="text-zinc-600 text-xs">{e.rate || '—'}</TableCell>
                      <TableCell className="text-zinc-600 text-xs">{e.po_no || '—'}</TableCell>
                      <TableCell className="text-zinc-600 text-xs">{e.po_del_date || '—'}</TableCell>
                      <TableCell className="text-zinc-600 text-xs">{e.department || '—'}</TableCell>
                      <TableCell className="text-zinc-500 text-xs max-w-[200px] truncate">{e.notes || '—'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
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
