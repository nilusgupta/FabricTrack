import React, { useEffect, useState, useCallback, useRef } from 'react';
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
import { Plus, Search, Filter, X, Image as ImageIcon, Camera, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { toast } from 'sonner';

function EnquiryThumbnail({ imagePath }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [hovered, setHovered] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!imagePath) return;
    let revoke = null;
    api.get(`/files/${imagePath}`, { responseType: 'blob' })
      .then(res => {
        const url = URL.createObjectURL(res.data);
        revoke = url;
        setBlobUrl(url);
      })
      .catch(() => {});
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [imagePath]);

  if (!blobUrl) return <span className="text-zinc-300">—</span>;

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={e => e.stopPropagation()}
    >
      <img
        src={blobUrl}
        alt="Fabric"
        className="w-8 h-8 object-cover rounded-sm border border-zinc-200 cursor-pointer"
        data-testid="enquiry-thumb"
      />
      {hovered && (
        <div className="fixed z-[100] pointer-events-none" style={{
          top: ref.current ? ref.current.getBoundingClientRect().bottom + 8 : 0,
          left: ref.current ? ref.current.getBoundingClientRect().left : 0,
        }}>
          <img
            src={blobUrl}
            alt="Fabric preview"
            className="w-64 h-64 object-contain rounded-md border border-zinc-300 shadow-xl bg-white"
            data-testid="enquiry-thumb-preview"
          />
        </div>
      )}
    </div>
  );
}

export default function EnquiriesPage() {
  const [enquiries, setEnquiries] = useState([]);
  const [stages, setStages] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    customer_name: '', fabric_type: '', quantity: '', style_no: '',
    department: '', notes: '', rate: '', po_no: '', po_del_date: ''
  });
  const [imageFile, setImageFile] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const params = { page, page_size: pageSize };
      if (search) params.search = search;
      if (filterDept) params.department = filterDept;
      const [enqRes, stagesRes, deptsRes] = await Promise.all([
        api.get('/enquiries', { params }),
        api.get('/stages'),
        api.get('/departments')
      ]);
      setEnquiries(enqRes.data.enquiries);
      setTotalCount(enqRes.data.total);
      setTotalPages(enqRes.data.total_pages);
      setStages(stagesRes.data);
      setDepartments(deptsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, filterDept, page, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, filterDept]);

  const stageMap = {};
  stages.forEach(s => { stageMap[s.id] = s; });

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
      setForm({ customer_name: '', fabric_type: '', quantity: '', style_no: '', department: '', notes: '', rate: '', po_no: '', po_del_date: '' });
      setImageFile(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create');
    }
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
          <p className="text-sm text-zinc-500 mt-1">{totalCount} enquiries found</p>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Quantity *</Label>
                  <Input value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} required data-testid="enquiry-quantity-input" className="border-zinc-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Department</Label>
                  <Select value={form.department} onValueChange={v => setForm({ ...form, department: v })}>
                    <SelectTrigger data-testid="enquiry-department-select" className="border-zinc-200"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{departments.map(d => <SelectItem key={d.id || d.name} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
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

              {/* Image upload - supports camera, gallery, file */}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Image</Label>
                <div className="flex gap-2">
                  <label className="flex-1 cursor-pointer">
                    <Input type="file" accept="image/*" capture="environment" onChange={e => setImageFile(e.target.files[0])} data-testid="enquiry-image-camera" className="hidden" />
                    <div className="flex items-center justify-center gap-2 px-3 py-2 border border-zinc-200 rounded-sm text-sm text-zinc-600 hover:bg-zinc-50 transition-colors">
                      <Camera className="w-4 h-4" /> Camera
                    </div>
                  </label>
                  <label className="flex-1 cursor-pointer">
                    <Input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} data-testid="enquiry-image-gallery" className="hidden" />
                    <div className="flex items-center justify-center gap-2 px-3 py-2 border border-zinc-200 rounded-sm text-sm text-zinc-600 hover:bg-zinc-50 transition-colors">
                      <ImageIcon className="w-4 h-4" /> Gallery / File
                    </div>
                  </label>
                </div>
                {imageFile && <p className="text-xs text-green-600">{imageFile.name}</p>}
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
              <SelectContent>{departments.map(d => <SelectItem key={d.id || d.name} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
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
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>{[...Array(6 + stages.length)].map((_, j) => <TableCell key={j}><div className="h-4 bg-zinc-100 rounded-sm animate-pulse" /></TableCell>)}</TableRow>
                ))
              ) : enquiries.length === 0 ? (
                <TableRow><TableCell colSpan={8 + stages.length} className="text-center py-12 text-zinc-400">No enquiries found. Create your first enquiry.</TableCell></TableRow>
              ) : (
                enquiries.map((enq, idx) => {
                  return (
                    <TableRow key={enq.id} className="cursor-pointer hover:bg-zinc-50 transition-colors" onClick={() => navigate(`/enquiries/${enq.id}`)} data-testid={`enquiry-row-${enq.id}`}>
                      <TableCell className="text-zinc-500 text-xs font-mono">{(page - 1) * pageSize + idx + 1}</TableCell>
                      <TableCell>{enq.image_path ? <EnquiryThumbnail imagePath={enq.image_path} /> : <span className="text-zinc-300">—</span>}</TableCell>
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
                      <TableCell className="text-zinc-400 text-xs">{new Date(enq.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200" data-testid="pagination-controls">
            <p className="text-xs text-zinc-500">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(1)} data-testid="pagination-first" className="border-zinc-200 h-8 w-8 p-0">
                <ChevronsLeft className="w-3.5 h-3.5" />
              </Button>
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} data-testid="pagination-prev" className="border-zinc-200 h-8 w-8 p-0">
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce((acc, p, i, arr) => {
                  if (i > 0 && p - arr[i - 1] > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === '...' ? (
                    <span key={`dot-${i}`} className="text-xs text-zinc-400 px-1">...</span>
                  ) : (
                    <Button
                      key={p}
                      variant={p === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPage(p)}
                      data-testid={`pagination-page-${p}`}
                      className={`h-8 w-8 p-0 text-xs ${p === page ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'border-zinc-200'}`}
                    >
                      {p}
                    </Button>
                  )
                )}
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} data-testid="pagination-next" className="border-zinc-200 h-8 w-8 p-0">
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(totalPages)} data-testid="pagination-last" className="border-zinc-200 h-8 w-8 p-0">
                <ChevronsRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
