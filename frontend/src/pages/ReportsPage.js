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

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('enquiries');
  const [stages, setStages] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    Promise.all([api.get('/stages'), api.get('/users')]).then(([sRes, uRes]) => {
      setStages(sRes.data);
      setUsers(uRes.data);
    });
  }, []);

  const stageMap = {};
  stages.forEach(s => { stageMap[s.id] = s; });
  const userMap = {};
  users.forEach(u => { userMap[u._id] = u; });

  return (
    <div className="space-y-6" data-testid="reports-page">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">Reports</h1>
        <p className="text-sm text-zinc-500 mt-1">Analytics and insights</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-100 border border-zinc-200 rounded-sm" data-testid="report-tabs">
          <TabsTrigger value="enquiries" className="rounded-sm data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm" data-testid="tab-enquiries">
            <Filter className="w-3 h-3 mr-1.5" /> Enquiry Report
          </TabsTrigger>
          <TabsTrigger value="stages" className="rounded-sm data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm" data-testid="tab-stages">
            <Layers className="w-3 h-3 mr-1.5" /> Stage Summary
          </TabsTrigger>
          <TabsTrigger value="users" className="rounded-sm data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm" data-testid="tab-users">
            <Users className="w-3 h-3 mr-1.5" /> User Performance
          </TabsTrigger>
          <TabsTrigger value="departments" className="rounded-sm data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm" data-testid="tab-departments">
            <Building2 className="w-3 h-3 mr-1.5" /> Department
          </TabsTrigger>
        </TabsList>

        <TabsContent value="enquiries">
          <EnquiryReport stages={stages} users={users} stageMap={stageMap} userMap={userMap} />
        </TabsContent>
        <TabsContent value="stages">
          <StageSummary stageMap={stageMap} />
        </TabsContent>
        <TabsContent value="users">
          <UserPerformance />
        </TabsContent>
        <TabsContent value="departments">
          <DepartmentReport stageMap={stageMap} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EnquiryReport({ stages, users, stageMap, userMap }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ start_date: '', end_date: '', stage: '', department: '', assigned_to: '' });
  const departments = ['Sales', 'Production', 'Quality', 'Admin', 'Design', 'Logistics'];
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      if (filters.stage) params.stage = filters.stage;
      if (filters.department) params.department = filters.department;
      if (filters.assigned_to) params.assigned_to = filters.assigned_to;
      const res = await api.get('/reports/enquiries', { params });
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleStartDate = (date) => {
    setStartDate(date);
    setFilters({ ...filters, start_date: date ? date.toISOString() : '' });
  };

  const handleEndDate = (date) => {
    setEndDate(date);
    setFilters({ ...filters, end_date: date ? date.toISOString() : '' });
  };

  const exportCsv = () => {
    if (!data?.enquiries?.length) return;
    const headers = ['Customer', 'Fabric', 'Quantity', 'Stage', 'Department', 'Assigned To', 'Created'];
    const rows = data.enquiries.map(e => [
      e.customer_name, e.fabric_type, e.quantity,
      stageMap[e.current_stage_id]?.name || '', e.department || '',
      userMap[e.assigned_to]?.name || '', e.created_at
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'enquiry_report.csv';
    a.click();
  };

  return (
    <div className="space-y-4" data-testid="enquiry-report">
      <Card className="bg-white border-zinc-200 rounded-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end flex-wrap">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-40 justify-start border-zinc-200 text-sm" data-testid="start-date-picker">
                    <CalendarIcon className="w-3 h-3 mr-2" />
                    {startDate ? format(startDate, 'PP') : 'Start date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={handleStartDate} /></PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-40 justify-start border-zinc-200 text-sm" data-testid="end-date-picker">
                    <CalendarIcon className="w-3 h-3 mr-2" />
                    {endDate ? format(endDate, 'PP') : 'End date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={handleEndDate} /></PopoverContent>
              </Popover>
            </div>
            <Select value={filters.stage} onValueChange={v => setFilters({ ...filters, stage: v })}>
              <SelectTrigger className="w-40 border-zinc-200" data-testid="report-stage-filter"><SelectValue placeholder="All Stages" /></SelectTrigger>
              <SelectContent>{stages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filters.department} onValueChange={v => setFilters({ ...filters, department: v })}>
              <SelectTrigger className="w-40 border-zinc-200" data-testid="report-dept-filter"><SelectValue placeholder="All Depts" /></SelectTrigger>
              <SelectContent>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportCsv} data-testid="export-csv-button" className="border-zinc-200 ml-auto">
              <Download className="w-3 h-3 mr-1.5" /> Export CSV
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
                  <TableHead className="text-xs font-semibold uppercase text-zinc-500">Customer</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-zinc-500">Fabric</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-zinc-500">Qty</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-zinc-500">Stage</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-zinc-500">Dept</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-zinc-500">Assigned</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-zinc-500">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>{[...Array(7)].map((_, j) => <TableCell key={j}><div className="h-4 bg-zinc-100 rounded-sm animate-pulse" /></TableCell>)}</TableRow>
                  ))
                ) : !data?.enquiries?.length ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-zinc-400">No data</TableCell></TableRow>
                ) : (
                  data.enquiries.slice(0, 50).map(e => {
                    const stage = stageMap[e.current_stage_id];
                    return (
                      <TableRow key={e.id} className="hover:bg-zinc-50" data-testid={`report-row-${e.id}`}>
                        <TableCell className="font-medium text-zinc-900">{e.customer_name}</TableCell>
                        <TableCell className="text-zinc-600">{e.fabric_type}</TableCell>
                        <TableCell className="text-zinc-600">{e.quantity}</TableCell>
                        <TableCell>
                          {stage ? (
                            <Badge className="rounded-sm text-xs" style={{ backgroundColor: stage.color + '20', color: stage.color }}>{stage.name}</Badge>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-zinc-600">{e.department || '—'}</TableCell>
                        <TableCell className="text-zinc-600">{userMap[e.assigned_to]?.name || '—'}</TableCell>
                        <TableCell className="text-zinc-400 text-xs">{new Date(e.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    );
                  })
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

  useEffect(() => {
    api.get('/reports/stage-summary').then(res => {
      setData(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const chartData = data.map(s => ({ name: s.stage_name, count: s.count, color: s.color }));

  return (
    <div className="space-y-4" data-testid="stage-summary-report">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border-zinc-200 rounded-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-900">Enquiries per Stage</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#71717A' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#71717A' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ border: '1px solid #E4E4E7', borderRadius: '4px', fontSize: '12px' }} />
                  <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                    {chartData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-zinc-400 text-sm">No data</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border-zinc-200 rounded-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-900">Stage Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50">
                  <TableHead className="text-xs font-semibold uppercase text-zinc-500">Stage</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-zinc-500">Count</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-zinc-500">Avg Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(3)].map((_, i) => <TableRow key={i}>{[...Array(3)].map((_, j) => <TableCell key={j}><div className="h-4 bg-zinc-100 rounded-sm animate-pulse" /></TableCell>)}</TableRow>)
                ) : data.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-zinc-400">No data</TableCell></TableRow>
                ) : (
                  data.map(s => (
                    <TableRow key={s.stage_id} className="hover:bg-zinc-50" data-testid={`stage-summary-row-${s.stage_id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} />
                          <span className="font-medium text-zinc-900">{s.stage_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-zinc-600 font-mono">{s.count}</TableCell>
                      <TableCell className="text-zinc-600 font-mono">{s.avg_hours_in_stage}h</TableCell>
                    </TableRow>
                  ))
                )}
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

  useEffect(() => {
    api.get('/reports/user-performance').then(res => {
      setData(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const chartData = data.filter(u => u.total_assigned > 0).map(u => ({
    name: u.user_name,
    assigned: u.total_assigned,
    completed: u.completed
  }));

  return (
    <div className="space-y-4" data-testid="user-performance-report">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border-zinc-200 rounded-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-900">Assigned vs Completed</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#71717A' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#71717A' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ border: '1px solid #E4E4E7', borderRadius: '4px', fontSize: '12px' }} />
                  <Legend />
                  <Bar dataKey="assigned" fill="#09090B" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="completed" fill="#22C55E" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-zinc-400 text-sm">No data</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border-zinc-200 rounded-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-900">Performance Table</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50">
                  <TableHead className="text-xs font-semibold uppercase text-zinc-500">User</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-zinc-500">Dept</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-zinc-500">Assigned</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-zinc-500">Done</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-zinc-500">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(3)].map((_, i) => <TableRow key={i}>{[...Array(5)].map((_, j) => <TableCell key={j}><div className="h-4 bg-zinc-100 rounded-sm animate-pulse" /></TableCell>)}</TableRow>)
                ) : data.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-zinc-400">No data</TableCell></TableRow>
                ) : (
                  data.map(u => (
                    <TableRow key={u.user_id} className="hover:bg-zinc-50" data-testid={`user-perf-row-${u.user_id}`}>
                      <TableCell className="font-medium text-zinc-900">{u.user_name}</TableCell>
                      <TableCell className="text-zinc-600">{u.department}</TableCell>
                      <TableCell className="text-zinc-600 font-mono">{u.total_assigned}</TableCell>
                      <TableCell className="text-zinc-600 font-mono">{u.completed}</TableCell>
                      <TableCell>
                        <Badge className={`rounded-sm text-xs ${u.completion_rate >= 50 ? 'bg-green-50 text-green-700' : u.completion_rate > 0 ? 'bg-amber-50 text-amber-700' : 'bg-zinc-100 text-zinc-500'}`}>
                          {u.completion_rate}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
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

  useEffect(() => {
    api.get('/reports/department').then(res => {
      setData(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const COLORS = ['#09090B', '#3B82F6', '#22C55E', '#EAB308', '#EF4444', '#8B5CF6', '#EC4899'];

  const pieData = data.map((d, i) => ({
    name: d.department,
    value: d.total,
    fill: COLORS[i % COLORS.length]
  }));

  return (
    <div className="space-y-4" data-testid="department-report">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border-zinc-200 rounded-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-900">Enquiries by Department</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {pieData.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ border: '1px solid #E4E4E7', borderRadius: '4px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-zinc-400 text-sm">No data</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border-zinc-200 rounded-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-900">Department Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-zinc-100 rounded-sm" />)}</div>
            ) : data.length === 0 ? (
              <div className="py-8 text-center text-zinc-400 text-sm">No data</div>
            ) : (
              <div className="space-y-4">
                {data.map(dept => (
                  <div key={dept.department} className="space-y-2" data-testid={`dept-breakdown-${dept.department}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-zinc-900">{dept.department}</span>
                      <span className="text-xs text-zinc-500 font-mono">{dept.total} total</span>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {dept.stage_breakdown?.map(sb => (
                        sb.count > 0 && (
                          <Badge key={sb.stage_id} className="rounded-sm text-xs" style={{ backgroundColor: sb.color + '20', color: sb.color }}>
                            {sb.stage_name}: {sb.count}
                          </Badge>
                        )
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
