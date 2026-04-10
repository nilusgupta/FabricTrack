import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Textarea } from '../components/ui/textarea';
import { Plus, Search, Filter, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

const departments = ['Sales', 'Production', 'Quality', 'Admin', 'Design', 'Logistics'];

export default function EnquiriesPage() {
  const [enquiries, setEnquiries] = useState([]);
  const [stages, setStages] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const navigate = useNavigate();

  const [form, setForm] = useState({
    customer_name: '', fabric_type: '', quantity: '', style_no: '',
    assigned_to: '', department: '', notes: '', rate: '', po_no: '', po_del_date: '',
    stage_values: {}
  });
  const [imageFile, setImageFile] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const params = {};
      if (search) params.search = search;
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
  }, [search, filterDept]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stageMap = {};
  stages.forEach(s => { stageMap[s.id] = s; });
  const userMap = {};
  users.forEach(u => { userMap[u._id] = u; });

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/enquiries', form);
      // Upload image if selected
      if (imageFile && res.data?.id) {
        const fd = new FormData();
        fd.append('file', imageFile);
        try {
          const uploadRes = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          await api.put(`/enquiries/${res.data.id}`, { image_path: uploadRes.data.path });
        } catch (uploadErr) {
          console.error('Image upload failed', uploadErr);
        }
      }
      toast.success('Enquiry created');
      setDialogOpen(false);
      setForm({ customer_name: '', fabric_type: '', quantity: '', style_no: '', assigned_to: '', department: '', notes: '', rate: '', po_no: '', po_del_date: '', stage_values: {} });
      setImageFile(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create');
    }
  };

  const setStageValue = (stageId, value) => {
    setForm(prev => ({
      ...prev,
      stage_values: { ...prev.stage_values, [stageId]: { value } }
    }));
  };

  const getStageDisplay = (enq, stageId) => {
    const sv = enq.stage_values || {};
    const val = sv[stageId];
    if (!val) return '';
    return typeof val === 'object' ? val.value || '' : String(val);
  };

  const hasFilters = search || filterDept;

  return (
    <div className="space-y-6" data-testid="enquiries-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">Enquiries</h1>
          <p className="text-sm text-zinc-500 mt-1">{enquiries.length} enquiries found</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="create-enquiry-button" className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-sm">
              <Plus className="w-4 h-4 mr-2" /> New Enquiry
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="create-enquiry-dialog">
            <DialogHeader><DialogTitle>Create New Enquiry</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Customer Name *</Label>
                  <Input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} required data-testid="enquiry-customer-name-input" className="border-zinc-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Fabric Type *</Label>
                  <Input value={form.fabric_type} onChange={e => setForm({ ...form, fabric_type: e.target.value })} required data-testid="enquiry-fabric-type-input" className="border-zinc-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Style No.</Label>
                  <Input value={form.style_no} onChange={e => setForm({ ...form, style_no: e.target.value })} data-testid="enquiry-style-no-input" className="border-zinc-200" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Quantity *</Label>
                  <Input value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} required data-testid="enquiry-quantity-input" className="border-zinc-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Department</Label>
                  <Select value={form.department} onValueChange={v => setForm({ ...form, department: v })}>
                    <SelectTrigger data-testid="enquiry-department-select" className="border-zinc-200"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Assign To</Label>
                  <Select value={form.assigned_to} onValueChange={v => setForm({ ...form, assigned_to: v })}>
                    <SelectTrigger data-testid="enquiry-assign-select" className="border-zinc-200"><SelectValue placeholder="Select user" /></SelectTrigger>
                    <SelectContent>{users.map(u => <SelectItem key={u._id} value={u._id}>{u.name} ({u.department})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Rate</Label>
                  <Input value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })} data-testid="enquiry-rate-input" className="border-zinc-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">PO No.</Label>
                  <Input value={form.po_no} onChange={e => setForm({ ...form, po_no: e.target.value })} data-testid="enquiry-po-no-input" className="border-zinc-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">PO Del Date</Label>
                  <Input type="date" value={form.po_del_date} onChange={e => setForm({ ...form, po_del_date: e.target.value })} data-testid="enquiry-po-del-date-input" className="border-zinc-200" />
                </div>
              </div>

              {/* Stage Fields */}
              {stages.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-zinc-200">
                  <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Stage Values</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {stages.map(s => (
                      <div key={s.id} className="space-y-1">
                        <Label className="text-xs text-zinc-600 flex items-center gap-1">
                          <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: s.color }} />
                          {s.name} {s.is_mandatory && <span className="text-red-500">*</span>}
                        </Label>
                        {s.input_type === 'date' ? (
                          s.date_input_mode === 'auto' ? (
                            <Button type="button" variant="outline" size="sm"
                              onClick={() => setStageValue(s.id, new Date().toISOString().split('T')[0])}
                              className={`text-xs border-zinc-200 w-full justify-start ${form.stage_values[s.id]?.value ? 'bg-green-50 border-green-300 text-green-700' : ''}`}
                              data-testid={`stage-value-${s.id}`}
                            >
                              {form.stage_values[s.id]?.value ? `Captured: ${form.stage_values[s.id].value}` : 'Click to capture current date'}
                            </Button>
                          ) : (
                            <div className="flex gap-2">
                              <Input
                                type="date"
                                value={form.stage_values[s.id]?.value || ''}
                                onChange={e => setStageValue(s.id, e.target.value)}
                                required={s.is_mandatory}
                                data-testid={`stage-value-${s.id}`}
                                className="border-zinc-200 flex-1"
                              />
                              <Button type="button" variant="outline" size="sm"
                                onClick={() => setStageValue(s.id, new Date().toISOString().split('T')[0])}
                                className="text-xs border-zinc-200 whitespace-nowrap"
                                data-testid={`stage-today-${s.id}`}
                              >Today</Button>
                            </div>
                          )
                        ) : s.input_type === 'select' ? (
                          <Select
                            value={form.stage_values[s.id]?.value || ''}
                            onValueChange={v => setStageValue(s.id, v)}
                          >
                            <SelectTrigger className="border-zinc-200" data-testid={`stage-value-${s.id}`}>
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              {(s.select_options || []).map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            value={form.stage_values[s.id]?.value || ''}
                            onChange={e => setStageValue(s.id, e.target.value)}
                            required={s.is_mandatory}
                            data-testid={`stage-value-${s.id}`}
                            className="border-zinc-200"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Image upload */}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Image</Label>
                <Input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} data-testid="enquiry-image-input" className="border-zinc-200" />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} data-testid="enquiry-notes-input" className="border-zinc-200 min-h-[60px]" />
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
              <Input placeholder="Search customer, fabric, style..." value={search} onChange={e => setSearch(e.target.value)} data-testid="enquiry-search-input" className="pl-9 border-zinc-200" />
            </div>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-full sm:w-44 border-zinc-200" data-testid="filter-dept-select">
                <Filter className="w-3 h-3 mr-2 text-zinc-400" /><SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setFilterDept(''); }} data-testid="clear-filters-button" className="text-zinc-500 hover:text-zinc-900">
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
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">SR</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Img</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Style No.</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Customer</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Fabric</TableHead>
                {stages.map(s => (
                  <TableHead key={s.id} className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{s.name}</TableHead>
                ))}
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Rate</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Dept</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Assigned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>{[...Array(6 + stages.length)].map((_, j) => <TableCell key={j}><div className="h-4 bg-zinc-100 rounded-sm animate-pulse" /></TableCell>)}</TableRow>
                ))
              ) : enquiries.length === 0 ? (
                <TableRow><TableCell colSpan={9 + stages.length} className="text-center py-12 text-zinc-400">No enquiries found. Create your first enquiry.</TableCell></TableRow>
              ) : (
                enquiries.map((enq, idx) => {
                  const assignedUser = userMap[enq.assigned_to];
                  return (
                    <TableRow key={enq.id} className="cursor-pointer hover:bg-zinc-50 transition-colors" onClick={() => navigate(`/enquiries/${enq.id}`)} data-testid={`enquiry-row-${enq.id}`}>
                      <TableCell className="text-zinc-500 text-xs font-mono">{idx + 1}</TableCell>
                      <TableCell>{enq.image_path ? <ImageIcon className="w-4 h-4 text-zinc-400" /> : <span className="text-zinc-300">—</span>}</TableCell>
                      <TableCell className="text-zinc-600 text-sm">{enq.style_no || '—'}</TableCell>
                      <TableCell className="font-medium text-zinc-900">{enq.customer_name}</TableCell>
                      <TableCell className="text-zinc-600">{enq.fabric_type}</TableCell>
                      {stages.map(s => {
                        const val = getStageDisplay(enq, s.id);
                        const delayStatus = enq.delay_status?.[s.id];
                        const isDelayed = delayStatus === 'delayed' || delayStatus === 'completed_late';
                        const isEarly = delayStatus === 'completed_early';
                        return (
                          <TableCell key={s.id} className="text-xs">
                            <div className="flex flex-col gap-0.5">
                              {val ? (
                                <Badge className="rounded-sm text-xs font-normal" style={{ backgroundColor: s.color + '15', color: s.color, border: `1px solid ${s.color}30` }}>
                                  {val}
                                </Badge>
                              ) : <span className="text-zinc-300">—</span>}
                              {isDelayed && <span className="text-[10px] font-semibold text-red-600" data-testid={`delay-badge-${enq.id}-${s.id}`}>DELAYED</span>}
                              {isEarly && <span className="text-[10px] font-semibold text-green-600" data-testid={`early-badge-${enq.id}-${s.id}`}>ON TIME</span>}
                            </div>
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-zinc-600 text-sm">{enq.rate || '—'}</TableCell>
                      <TableCell className="text-zinc-600 text-xs">{enq.department || '—'}</TableCell>
                      <TableCell className="text-zinc-600 text-xs">{assignedUser?.name || '—'}</TableCell>
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
