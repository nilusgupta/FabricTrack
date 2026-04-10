import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Textarea } from '../components/ui/textarea';
import { Plus, Search, Filter, X } from 'lucide-react';
import { toast } from 'sonner';

export default function EnquiriesPage() {
  const [enquiries, setEnquiries] = useState([]);
  const [stages, setStages] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const navigate = useNavigate();

  const [form, setForm] = useState({
    customer_name: '', fabric_type: '', quantity: '',
    current_stage_id: '', assigned_to: '', department: '', notes: ''
  });

  const departments = ['Sales', 'Production', 'Quality', 'Admin', 'Design', 'Logistics'];

  const fetchData = useCallback(async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (filterStage) params.stage = filterStage;
      if (filterDept) params.department = filterDept;
      const [enqRes, stagesRes, usersRes] = await Promise.all([
        api.get('/enquiries', { params }),
        api.get('/stages'),
        api.get('/users')
      ]);
      setEnquiries(enqRes.data);
      setStages(stagesRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, filterStage, filterDept]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stageMap = {};
  stages.forEach(s => { stageMap[s.id] = s; });
  const userMap = {};
  users.forEach(u => { userMap[u._id] = u; });

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/enquiries', form);
      toast.success('Enquiry created');
      setDialogOpen(false);
      setForm({ customer_name: '', fabric_type: '', quantity: '', current_stage_id: '', assigned_to: '', department: '', notes: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create');
    }
  };

  const clearFilters = () => {
    setSearch('');
    setFilterStage('');
    setFilterDept('');
  };

  const hasFilters = search || filterStage || filterDept;

  return (
    <div className="space-y-6" data-testid="enquiries-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">Enquiries</h1>
          <p className="text-sm text-zinc-500 mt-1">{enquiries.length} enquiries found</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="create-enquiry-button" className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-sm transition-colors">
              <Plus className="w-4 h-4 mr-2" /> New Enquiry
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg" data-testid="create-enquiry-dialog">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">Create New Enquiry</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Customer Name</Label>
                  <Input
                    value={form.customer_name}
                    onChange={e => setForm({ ...form, customer_name: e.target.value })}
                    required
                    data-testid="enquiry-customer-name-input"
                    className="border-zinc-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Fabric Type</Label>
                  <Input
                    value={form.fabric_type}
                    onChange={e => setForm({ ...form, fabric_type: e.target.value })}
                    required
                    data-testid="enquiry-fabric-type-input"
                    className="border-zinc-200"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Quantity</Label>
                  <Input
                    value={form.quantity}
                    onChange={e => setForm({ ...form, quantity: e.target.value })}
                    required
                    data-testid="enquiry-quantity-input"
                    className="border-zinc-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Department</Label>
                  <Select value={form.department} onValueChange={v => setForm({ ...form, department: v })}>
                    <SelectTrigger data-testid="enquiry-department-select" className="border-zinc-200">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Stage</Label>
                  <Select value={form.current_stage_id} onValueChange={v => setForm({ ...form, current_stage_id: v })}>
                    <SelectTrigger data-testid="enquiry-stage-select" className="border-zinc-200">
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Assign To</Label>
                  <Select value={form.assigned_to} onValueChange={v => setForm({ ...form, assigned_to: v })}>
                    <SelectTrigger data-testid="enquiry-assign-select" className="border-zinc-200">
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(u => <SelectItem key={u._id} value={u._id}>{u.name} ({u.department})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  data-testid="enquiry-notes-input"
                  className="border-zinc-200 min-h-[80px]"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="border-zinc-200">Cancel</Button>
                <Button type="submit" data-testid="enquiry-submit-button" className="bg-zinc-900 hover:bg-zinc-800 text-white">Create Enquiry</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="bg-white border-zinc-200 rounded-sm">
        <CardContent className="p-4" data-testid="enquiry-filters">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 min-w-0 w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                placeholder="Search customer or fabric..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                data-testid="enquiry-search-input"
                className="pl-9 border-zinc-200"
              />
            </div>
            <Select value={filterStage} onValueChange={setFilterStage}>
              <SelectTrigger className="w-full sm:w-44 border-zinc-200" data-testid="filter-stage-select">
                <Filter className="w-3 h-3 mr-2 text-zinc-400" />
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent>
                {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-full sm:w-44 border-zinc-200" data-testid="filter-dept-select">
                <Filter className="w-3 h-3 mr-2 text-zinc-400" />
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="clear-filters-button" className="text-zinc-500 hover:text-zinc-900">
                <X className="w-3 h-3 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-white border-zinc-200 rounded-sm overflow-hidden">
        <div className="overflow-x-auto" data-testid="enquiries-table">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50 hover:bg-zinc-50">
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Customer</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Fabric</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Qty</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Stage</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Assigned To</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Department</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(7)].map((_, j) => (
                      <TableCell key={j}><div className="h-4 bg-zinc-100 rounded-sm animate-pulse" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : enquiries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-zinc-400">
                    No enquiries found. Create your first enquiry.
                  </TableCell>
                </TableRow>
              ) : (
                enquiries.map(enq => {
                  const stage = stageMap[enq.current_stage_id];
                  const assignedUser = userMap[enq.assigned_to];
                  return (
                    <TableRow
                      key={enq.id}
                      className="cursor-pointer hover:bg-zinc-50 transition-colors"
                      onClick={() => navigate(`/enquiries/${enq.id}`)}
                      data-testid={`enquiry-row-${enq.id}`}
                    >
                      <TableCell className="font-medium text-zinc-900">{enq.customer_name}</TableCell>
                      <TableCell className="text-zinc-600">{enq.fabric_type}</TableCell>
                      <TableCell className="text-zinc-600">{enq.quantity}</TableCell>
                      <TableCell>
                        {stage ? (
                          <Badge
                            className="rounded-sm text-xs font-medium"
                            style={{ backgroundColor: stage.color + '20', color: stage.color, border: `1px solid ${stage.color}40` }}
                            data-testid={`stage-badge-${enq.id}`}
                          >
                            {stage.name}
                          </Badge>
                        ) : <span className="text-zinc-400 text-xs">—</span>}
                      </TableCell>
                      <TableCell className="text-zinc-600">{assignedUser?.name || '—'}</TableCell>
                      <TableCell className="text-zinc-600">{enq.department || '—'}</TableCell>
                      <TableCell className="text-zinc-400 text-xs">{new Date(enq.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
