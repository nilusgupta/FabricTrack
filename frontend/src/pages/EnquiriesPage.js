import React, { useEffect, useState, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
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
  const [pos, setPos] = useState({ top: 0, left: 0 });
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

  const handleMouseEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, left: rect.left });
    }
    setHovered(true);
  };

  if (!blobUrl) return <span className="text-zinc-300">—</span>;

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setHovered(false)}
      onClick={e => e.stopPropagation()}
    >
      <img
        src={blobUrl}
        alt="Fabric"
        className="w-8 h-8 object-cover rounded-sm border border-zinc-200 cursor-pointer"
        data-testid="enquiry-thumb"
      />
      {hovered && ReactDOM.createPortal(
        <div className="pointer-events-none" style={{ position: 'fixed', zIndex: 9999, top: pos.top, left: pos.left }} data-testid="enquiry-thumb-preview-wrap">
          <img
            src={blobUrl}
            alt="Fabric preview"
            className="w-64 h-64 object-contain rounded-md border border-zinc-300 shadow-xl bg-white"
            data-testid="enquiry-thumb-preview"
          />
        </div>,
        document.body
      )}
    </div>
  );
}

export default function EnquiriesPage() {
  const [enquiries, setEnquiries] = useState([]);
  const [stages, setStages] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [fabricTypes, setFabricTypes] = useState([]);
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
    customer_name: '', fabric_type: '', style_no: '',
    department: '', notes: '', fabric_received: 'no', qty_received: '', sample_number: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkFiles, setBulkFiles] = useState([]);
  const [bulkCreating, setBulkCreating] = useState(false);
  const [quickCustomer, setQuickCustomer] = useState({ open: false, name: '' });
  const [quickFabric, setQuickFabric] = useState({ open: false, name: '', gsm: '', width: '', composition: '', construction: '' });

  const fetchData = useCallback(async () => {
    try {
      const params = { page, page_size: pageSize };
      if (search) params.search = search;
      if (filterDept) params.department = filterDept;
      const [enqRes, stagesRes, deptsRes, custRes, fabRes] = await Promise.all([
        api.get('/enquiries', { params }),
        api.get('/stages'),
        api.get('/departments'),
        api.get('/customers'),
        api.get('/fabric-types')
      ]);
      setEnquiries(enqRes.data.enquiries);
      setTotalCount(enqRes.data.total);
      setTotalPages(enqRes.data.total_pages);
      setStages(stagesRes.data);
      setDepartments(deptsRes.data);
      setCustomers(custRes.data);
      setFabricTypes(fabRes.data);
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

  // When a department filter is active, show only that department's hierarchy stages
  const visibleStages = React.useMemo(() => {
    if (filterDept) {
      const dept = departments.find(d => d.name === filterDept);
      if (dept && dept.stage_hierarchy && dept.stage_hierarchy.length > 0) {
        const sMap = {};
        stages.forEach(s => { sMap[s.id] = s; });
        const sorted = [...dept.stage_hierarchy].sort((a, b) => a.order - b.order);
        const result = sorted.map(h => sMap[h.stage_id]).filter(Boolean);
        return result;
      }
    }
    return stages;
  }, [filterDept, departments, stages]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/enquiries', form);
      // Upload image immediately if selected
      if (imageFile && res.data?.id) {
        try {
          const fd = new FormData();
          fd.append('file', imageFile);
          const uploadRes = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          if (uploadRes.data?.path) {
            await api.put(`/enquiries/${res.data.id}`, { image_path: uploadRes.data.path });
          }
        } catch (uploadErr) {
          toast.error('Enquiry created but image upload failed. Please edit and re-upload.');
        }
      }
      toast.success('Enquiry created');
      setDialogOpen(false);
      setForm({ customer_name: '', fabric_type: '', style_no: '', department: '', notes: '', fabric_received: 'no', qty_received: '', sample_number: '' });
      setImageFile(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create');
    }
  };

  const handleBulkCreate = async () => {
    if (!form.customer_name || !form.fabric_type || bulkFiles.length === 0) {
      toast.error('Select customer, fabric type, and at least one image');
      return;
    }
    setBulkCreating(true);
    try {
      const fd = new FormData();
      fd.append('customer_name', form.customer_name);
      fd.append('fabric_type', form.fabric_type);
      fd.append('style_no', form.style_no || '');
      fd.append('department', form.department || '');
      fd.append('notes', form.notes || '');
      fd.append('fabric_received', form.fabric_received || 'no');
      fd.append('qty_received', form.qty_received || '');
      fd.append('sample_number', form.sample_number || '');
      for (const f of bulkFiles) { fd.append('files', f); }
      const res = await api.post('/enquiries/bulk', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`${res.data.created} enquiries created!`);
      setDialogOpen(false);
      setBulkMode(false);
      setBulkFiles([]);
      setForm({ customer_name: '', fabric_type: '', style_no: '', department: '', notes: '', fabric_received: 'no', qty_received: '', sample_number: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Bulk creation failed');
    } finally { setBulkCreating(false); }
  };

  const handleQuickCustomer = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/customers', { name: quickCustomer.name });
      setCustomers(prev => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
      setForm(f => ({ ...f, customer_name: res.data.name }));
      setQuickCustomer({ open: false, name: '' });
      toast.success('Customer created');
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const handleQuickFabric = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/fabric-types', { name: quickFabric.name, gsm: quickFabric.gsm, width: quickFabric.width, composition: quickFabric.composition, construction: quickFabric.construction });
      setFabricTypes(prev => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
      setForm(f => ({ ...f, fabric_type: res.data.name }));
      setQuickFabric({ open: false, name: '', gsm: '', width: '', composition: '', construction: '' });
      toast.success('Fabric type created');
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
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
                  <div className="flex gap-1">
                    <Select value={form.customer_name} onValueChange={v => setForm({ ...form, customer_name: v })}>
                      <SelectTrigger data-testid="enquiry-customer-name-input" className="border-zinc-200 flex-1"><SelectValue placeholder="Select customer" /></SelectTrigger>
                      <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Dialog open={quickCustomer.open} onOpenChange={v => setQuickCustomer(p => ({ ...p, open: v }))}>
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline" size="icon" className="border-zinc-200 shrink-0" data-testid="quick-add-customer"><Plus className="w-4 h-4" /></Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-sm">
                        <DialogHeader><DialogTitle>Quick Add Customer</DialogTitle></DialogHeader>
                        <form onSubmit={handleQuickCustomer} className="space-y-4 mt-2">
                          <Input value={quickCustomer.name} onChange={e => setQuickCustomer(p => ({ ...p, name: e.target.value }))} required placeholder="Customer name" data-testid="quick-customer-name" className="border-zinc-200" />
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setQuickCustomer({ open: false, name: '' })} className="rounded-sm border-zinc-200">Cancel</Button>
                            <Button type="submit" data-testid="quick-customer-save" className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-sm">Add</Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Fabric Type *</Label>
                  <div className="flex gap-1">
                    <Select value={form.fabric_type} onValueChange={v => setForm({ ...form, fabric_type: v })}>
                      <SelectTrigger data-testid="enquiry-fabric-type-input" className="border-zinc-200 flex-1"><SelectValue placeholder="Select fabric" /></SelectTrigger>
                      <SelectContent>{fabricTypes.map(f => <SelectItem key={f.id} value={f.name}>{f.name}{f.gsm ? ` (${f.gsm} GSM)` : ''}</SelectItem>)}</SelectContent>
                    </Select>
                    <Dialog open={quickFabric.open} onOpenChange={v => setQuickFabric(p => ({ ...p, open: v }))}>
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline" size="icon" className="border-zinc-200 shrink-0" data-testid="quick-add-fabric"><Plus className="w-4 h-4" /></Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-lg">
                        <DialogHeader><DialogTitle>Quick Add Fabric Type</DialogTitle></DialogHeader>
                        <form onSubmit={handleQuickFabric} className="space-y-3 mt-2">
                          <Input value={quickFabric.name} onChange={e => setQuickFabric(p => ({ ...p, name: e.target.value }))} required placeholder="Fabric name *" data-testid="quick-fabric-name" className="border-zinc-200" />
                          <div className="grid grid-cols-2 gap-3">
                            <Input value={quickFabric.gsm} onChange={e => setQuickFabric(p => ({ ...p, gsm: e.target.value }))} placeholder="GSM" data-testid="quick-fabric-gsm" className="border-zinc-200" />
                            <Input value={quickFabric.width} onChange={e => setQuickFabric(p => ({ ...p, width: e.target.value }))} placeholder="Width" data-testid="quick-fabric-width" className="border-zinc-200" />
                          </div>
                          <Input value={quickFabric.composition} onChange={e => setQuickFabric(p => ({ ...p, composition: e.target.value }))} placeholder="Composition" data-testid="quick-fabric-composition" className="border-zinc-200" />
                          <Input value={quickFabric.construction} onChange={e => setQuickFabric(p => ({ ...p, construction: e.target.value }))} placeholder="Construction" data-testid="quick-fabric-construction" className="border-zinc-200" />
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setQuickFabric({ open: false, name: '', gsm: '', width: '', composition: '', construction: '' })} className="rounded-sm border-zinc-200">Cancel</Button>
                            <Button type="submit" data-testid="quick-fabric-save" className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-sm">Add</Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Style No.</Label>
                  <Input value={form.style_no} onChange={e => setForm({ ...form, style_no: e.target.value })} data-testid="enquiry-style-no-input" className="border-zinc-200" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Department</Label>
                  <Select value={form.department} onValueChange={v => setForm({ ...form, department: v })}>
                    <SelectTrigger data-testid="enquiry-department-select" className="border-zinc-200"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{departments.map(d => <SelectItem key={d.id || d.name} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Fabric Received</Label>
                  <Select value={form.fabric_received || 'no'} onValueChange={v => setForm({ ...form, fabric_received: v, qty_received: v === 'no' ? '' : form.qty_received, sample_number: v === 'no' ? '' : form.sample_number })}>
                    <SelectTrigger data-testid="enquiry-fabric-received-select" className="border-zinc-200"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.fabric_received === 'yes' && (
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Sample No.</Label>
                    <Input value={form.sample_number} onChange={e => setForm({ ...form, sample_number: e.target.value })} data-testid="enquiry-sample-number-input" placeholder="Enter sample number" className="border-zinc-200" />
                  </div>
                )}
                {form.fabric_received === 'yes' && (
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Qty Received</Label>
                    <Input value={form.qty_received} onChange={e => setForm({ ...form, qty_received: e.target.value })} data-testid="enquiry-qty-received-input" placeholder="Enter qty received" className="border-zinc-200" />
                  </div>
                )}
              </div>

              {/* Image upload - supports camera, gallery, file */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Image</Label>
                  <button type="button" className={`text-xs px-2 py-0.5 rounded-sm border ${bulkMode ? 'bg-zinc-900 text-white border-zinc-900' : 'text-zinc-500 border-zinc-200 hover:bg-zinc-50'}`} onClick={() => { setBulkMode(!bulkMode); setBulkFiles([]); setImageFile(null); }} data-testid="toggle-bulk-mode">
                    {bulkMode ? 'Bulk Mode ON' : 'Bulk Create'}
                  </button>
                </div>
                {bulkMode ? (
                  <div>
                    <label className="block cursor-pointer">
                      <input type="file" accept="image/*" multiple onChange={e => setBulkFiles(Array.from(e.target.files || []))} data-testid="bulk-image-input" className="hidden" />
                      <div className="flex items-center justify-center gap-2 px-3 py-4 border-2 border-dashed border-zinc-300 rounded-sm text-sm text-zinc-500 hover:bg-zinc-50 transition-colors">
                        <ImageIcon className="w-5 h-5" /> Select multiple images ({bulkFiles.length} selected)
                      </div>
                    </label>
                    {bulkFiles.length > 0 && (
                      <div className="mt-2 flex gap-1 flex-wrap">
                        {bulkFiles.map((f, i) => <Badge key={i} className="rounded-sm text-[10px] bg-zinc-100 text-zinc-600">{f.name}</Badge>)}
                      </div>
                    )}
                    <p className="text-[10px] text-amber-600 mt-1">Each image = one enquiry with same customer/fabric details</p>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <label className="flex-1 cursor-pointer">
                        <input type="file" accept="image/*" capture="environment" onChange={e => { if (e.target.files[0]) setImageFile(e.target.files[0]); }} data-testid="enquiry-image-camera" className="hidden" />
                        <div className="flex items-center justify-center gap-2 px-3 py-2 border border-zinc-200 rounded-sm text-sm text-zinc-600 hover:bg-zinc-50 transition-colors">
                          <Camera className="w-4 h-4" /> Camera
                        </div>
                      </label>
                      <label className="flex-1 cursor-pointer">
                        <input type="file" accept="image/*" onChange={e => { if (e.target.files[0]) setImageFile(e.target.files[0]); }} data-testid="enquiry-image-gallery" className="hidden" />
                        <div className="flex items-center justify-center gap-2 px-3 py-2 border border-zinc-200 rounded-sm text-sm text-zinc-600 hover:bg-zinc-50 transition-colors">
                          <ImageIcon className="w-4 h-4" /> Gallery / File
                        </div>
                      </label>
                    </div>
                    {imageFile && (
                      <div className="mt-2 flex items-center gap-2">
                        <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-12 h-12 object-cover rounded-sm border" />
                        <span className="text-xs text-green-600 flex-1 truncate">{imageFile.name}</span>
                        <button type="button" onClick={() => setImageFile(null)} className="text-xs text-red-500">Remove</button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} data-testid="enquiry-notes-input" className="border-zinc-200 min-h-[60px]" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="border-zinc-200">Cancel</Button>
                {bulkMode ? (
                  <Button type="button" onClick={handleBulkCreate} disabled={bulkCreating || bulkFiles.length === 0} data-testid="bulk-create-button" className="bg-zinc-900 hover:bg-zinc-800 text-white">
                    {bulkCreating ? 'Creating...' : `Create ${bulkFiles.length} Enquiries`}
                  </Button>
                ) : (
                  <Button type="submit" data-testid="enquiry-submit-button" className="bg-zinc-900 hover:bg-zinc-800 text-white">Create Enquiry</Button>
                )}
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

      {/* Mobile Card View */}
      <div className="md:hidden space-y-2" data-testid="enquiries-cards">
        {loading ? (
          [...Array(3)].map((_, i) => <div key={i} className="h-24 bg-white border border-zinc-200 rounded-sm animate-pulse" />)
        ) : enquiries.length === 0 ? (
          <div className="text-center py-12 text-zinc-400 text-sm">No enquiries found.</div>
        ) : enquiries.map((enq, idx) => (
          <Card key={enq.id} className="bg-white border-zinc-200 rounded-sm cursor-pointer hover:shadow-sm transition-shadow" onClick={() => navigate(`/enquiries/${enq.id}`)} data-testid={`enquiry-card-${enq.id}`}>
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                {enq.image_path ? <EnquiryThumbnail imagePath={enq.image_path} /> : <div className="w-10 h-10 bg-zinc-100 rounded-sm flex items-center justify-center text-zinc-300 text-xs shrink-0">No img</div>}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-900 truncate">{enq.customer_name}</span>
                    {enq.status === 'closed' ? <Badge className="rounded-sm text-[9px] bg-green-100 text-green-700 shrink-0">Closed</Badge> : <Badge className="rounded-sm text-[9px] bg-blue-50 text-blue-600 shrink-0">Open</Badge>}
                  </div>
                  <p className="text-xs text-zinc-500 truncate">{enq.fabric_type} · {enq.style_no || 'No style'}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {enq.department && <Badge className="rounded-sm text-[9px] bg-zinc-100 text-zinc-600">{enq.department}</Badge>}
                    {visibleStages.slice(0, 2).map(s => {
                      const val = getStageDisplay(enq, s.id);
                      return val ? <Badge key={s.id} className="rounded-sm text-[9px]" style={{ backgroundColor: s.color + '15', color: s.color, border: `1px solid ${s.color}30` }}>{s.name}: {val}</Badge> : null;
                    })}
                  </div>
                </div>
                <span className="text-[10px] text-zinc-400 shrink-0">{new Date(enq.created_at).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {/* Mobile Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between py-3" data-testid="mobile-pagination">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="border-zinc-200">
              <ChevronLeft className="w-4 h-4 mr-1" /> Prev
            </Button>
            <span className="text-xs text-zinc-500">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="border-zinc-200">
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <Card className="bg-white border-zinc-200 rounded-sm hidden md:block" style={{ overflow: 'hidden', maxWidth: '100%' }}>
        <div className="overflow-x-scroll" data-testid="enquiries-table" style={{ scrollbarGutter: 'stable' }}>
          <table className="caption-bottom text-sm border-collapse" style={{ tableLayout: 'fixed', width: `${438 + visibleStages.length * 180 + 500}px` }}>
            <thead>
              <tr className="border-b bg-zinc-50">
                <th className="h-10 px-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 sticky left-0 bg-zinc-50 z-20" style={{ width: 40 }}>SR</th>
                <th className="h-10 px-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 sticky bg-zinc-50 z-20" style={{ width: 48, left: 40 }}>Img</th>
                <th className="h-10 px-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 sticky bg-zinc-50 z-20" style={{ width: 110, left: 88 }}>Style No.</th>
                <th className="h-10 px-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 sticky bg-zinc-50 z-20" style={{ width: 130, left: 198 }}>Customer</th>
                <th className="h-10 px-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 sticky bg-zinc-50 z-20 border-r-2 border-zinc-300" style={{ width: 110, left: 328 }}>Fabric</th>
                {visibleStages.map(s => (
                  <th key={s.id} className="h-10 px-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500" style={{ width: 180 }}>{s.name}</th>
                ))}
                <th className="h-10 px-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500" style={{ width: 100 }}>Rate</th>
                <th className="h-10 px-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500" style={{ width: 100 }}>Dept</th>
                <th className="h-10 px-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500" style={{ width: 80 }}>Status</th>
                <th className="h-10 px-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500" style={{ width: 120 }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b">{[...Array(8 + visibleStages.length)].map((_, j) => <td key={j} className="p-2"><div className="h-4 bg-zinc-100 rounded-sm animate-pulse" /></td>)}</tr>
                ))
              ) : enquiries.length === 0 ? (
                <tr><td colSpan={8 + visibleStages.length} className="text-center py-12 text-zinc-400">No enquiries found. Create your first enquiry.</td></tr>
              ) : (
                enquiries.map((enq, idx) => (
                  <tr key={enq.id} className="border-b cursor-pointer hover:bg-zinc-50 transition-colors group" onClick={() => navigate(`/enquiries/${enq.id}`)} data-testid={`enquiry-row-${enq.id}`}>
                    <td className="p-2 text-zinc-500 text-xs font-mono sticky bg-white group-hover:bg-zinc-50 z-10" style={{ left: 0 }}>{(page - 1) * pageSize + idx + 1}</td>
                    <td className="p-2 sticky bg-white group-hover:bg-zinc-50 z-10" style={{ left: 40 }}>{enq.image_path ? <EnquiryThumbnail imagePath={enq.image_path} /> : <span className="text-zinc-300">—</span>}</td>
                    <td className="p-2 text-zinc-600 text-sm sticky bg-white group-hover:bg-zinc-50 z-10" style={{ left: 88 }}>{enq.style_no || '—'}</td>
                    <td className="p-2 font-medium text-zinc-900 sticky bg-white group-hover:bg-zinc-50 z-10" style={{ left: 198 }}>{enq.customer_name}</td>
                    <td className="p-2 text-zinc-600 sticky bg-white group-hover:bg-zinc-50 z-10 border-r-2 border-zinc-300" style={{ left: 328 }}>{enq.fabric_type}</td>
                    {visibleStages.map(s => {
                      const val = getStageDisplay(enq, s.id);
                      const delayStatus = enq.delay_status?.[s.id];
                      const isDelayed = delayStatus === 'delayed' || delayStatus === 'completed_late';
                      const isEarly = delayStatus === 'completed_early';
                      return (
                        <td key={s.id} className="p-2 text-xs">
                          <div className="flex flex-col gap-0.5">
                            {val ? (
                              <Badge className="rounded-sm text-xs font-normal" style={{ backgroundColor: s.color + '15', color: s.color, border: `1px solid ${s.color}30` }}>
                                {val}
                              </Badge>
                            ) : <span className="text-zinc-300">—</span>}
                            {isDelayed && <span className="text-[10px] font-semibold text-red-600" data-testid={`delay-badge-${enq.id}-${s.id}`}>DELAYED</span>}
                            {isEarly && <span className="text-[10px] font-semibold text-green-600" data-testid={`early-badge-${enq.id}-${s.id}`}>ON TIME</span>}
                          </div>
                        </td>
                      );
                    })}
                    <td className="p-2 text-zinc-600 text-sm">{enq.rate || '—'}</td>
                    <td className="p-2 text-zinc-600 text-xs">{enq.department || '—'}</td>
                    <td className="p-2 text-xs">
                      {enq.status === 'closed' ? <Badge className="rounded-sm text-[10px] bg-green-100 text-green-700 border border-green-200">Closed</Badge> : <Badge className="rounded-sm text-[10px] bg-blue-50 text-blue-600 border border-blue-200">Open</Badge>}
                    </td>
                    <td className="p-2 text-zinc-400 text-xs">{new Date(enq.created_at).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
