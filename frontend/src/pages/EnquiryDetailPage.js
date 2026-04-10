import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { ArrowLeft, Save, Trash2, Clock, User, Upload } from 'lucide-react';
import { toast } from 'sonner';

const departments = ['Sales', 'Production', 'Quality', 'Admin', 'Design', 'Logistics'];

export default function EnquiryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [enquiry, setEnquiry] = useState(null);
  const [stages, setStages] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [imageBlobUrl, setImageBlobUrl] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [enqRes, stagesRes, usersRes] = await Promise.all([
        api.get(`/enquiries/${id}`),
        api.get('/stages'),
        api.get('/users')
      ]);
      const enq = enqRes.data;
      setEnquiry(enq);
      setStages(stagesRes.data);
      setUsers(usersRes.data);
      setForm({
        customer_name: enq.customer_name,
        fabric_type: enq.fabric_type,
        quantity: enq.quantity,
        style_no: enq.style_no || '',
        assigned_to: enq.assigned_to,
        department: enq.department,
        notes: enq.notes || '',
        rate: enq.rate || '',
        po_no: enq.po_no || '',
        po_del_date: enq.po_del_date || '',
        stage_values: enq.stage_values || {},
        image_path: enq.image_path || ''
      });
      // Load image if exists
      if (enq.image_path) {
        try {
          const imgRes = await api.get(`/files/${enq.image_path}`, { responseType: 'blob' });
          setImageBlobUrl(URL.createObjectURL(imgRes.data));
        } catch { /* image load failed */ }
      }
    } catch (err) {
      toast.error('Failed to load enquiry');
      navigate('/enquiries');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { return () => { if (imageBlobUrl) URL.revokeObjectURL(imageBlobUrl); }; }, [imageBlobUrl]);

  const stageMap = {};
  stages.forEach(s => { stageMap[s.id] = s; });

  const setStageValue = (stageId, value) => {
    setForm(prev => ({
      ...prev,
      stage_values: {
        ...prev.stage_values,
        [stageId]: { ...(prev.stage_values[stageId] || {}), value }
      }
    }));
  };

  const getStageValue = (stageId) => {
    const val = form.stage_values?.[stageId];
    if (!val) return '';
    return typeof val === 'object' ? val.value || '' : String(val);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upload new image if selected
      if (imageFile) {
        const fd = new FormData();
        fd.append('file', imageFile);
        const uploadRes = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        form.image_path = uploadRes.data.path;
        setImageFile(null);
      }
      await api.put(`/enquiries/${id}`, form);
      toast.success('Enquiry updated');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this enquiry?')) return;
    try {
      await api.delete(`/enquiries/${id}`);
      toast.success('Enquiry deleted');
      navigate('/enquiries');
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  if (loading) {
    return <div className="space-y-6 animate-pulse" data-testid="enquiry-detail-loading"><div className="h-8 w-48 bg-zinc-200 rounded-sm" /><div className="h-64 bg-zinc-200 rounded-sm" /></div>;
  }
  if (!enquiry) return null;

  return (
    <div className="space-y-6 max-w-5xl" data-testid="enquiry-detail-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/enquiries')} data-testid="back-to-enquiries"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{enquiry.customer_name}</h1>
          <p className="text-sm text-zinc-500">Style: {enquiry.style_no || '—'} · {enquiry.fabric_type} · Created by {enquiry.created_by_name}</p>
        </div>
        {user?.role === 'admin' && (
          <Button variant="outline" size="sm" onClick={handleDelete} data-testid="delete-enquiry-button" className="border-red-200 text-red-600 hover:bg-red-50">
            <Trash2 className="w-3 h-3 mr-1" /> Delete
          </Button>
        )}
      </div>

      {/* Image */}
      <Card className="bg-white border-zinc-200 rounded-sm">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-zinc-900">Image</CardTitle></CardHeader>
        <CardContent data-testid="enquiry-image-section">
          <div className="flex items-start gap-4">
            {imageBlobUrl ? (
              <img src={imageBlobUrl} alt="Fabric" className="w-32 h-32 object-cover rounded-sm border border-zinc-200" data-testid="enquiry-image-preview" />
            ) : (
              <div className="w-32 h-32 bg-zinc-100 border border-dashed border-zinc-300 rounded-sm flex items-center justify-center">
                <Upload className="w-6 h-6 text-zinc-300" />
              </div>
            )}
            <div className="space-y-2">
              <Input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} data-testid="edit-image-input" className="border-zinc-200" />
              <p className="text-xs text-zinc-400">Upload a fabric image (JPG, PNG)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Details */}
      <Card className="bg-white border-zinc-200 rounded-sm">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-zinc-900">Basic Details</CardTitle></CardHeader>
        <CardContent className="space-y-4" data-testid="enquiry-basic-form">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Customer Name</Label>
              <Input value={form.customer_name || ''} onChange={e => setForm({ ...form, customer_name: e.target.value })} data-testid="edit-customer-name" className="border-zinc-200" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Fabric Type</Label>
              <Input value={form.fabric_type || ''} onChange={e => setForm({ ...form, fabric_type: e.target.value })} data-testid="edit-fabric-type" className="border-zinc-200" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Style No.</Label>
              <Input value={form.style_no || ''} onChange={e => setForm({ ...form, style_no: e.target.value })} data-testid="edit-style-no" className="border-zinc-200" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Quantity</Label>
              <Input value={form.quantity || ''} onChange={e => setForm({ ...form, quantity: e.target.value })} data-testid="edit-quantity" className="border-zinc-200" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Rate</Label>
              <Input value={form.rate || ''} onChange={e => setForm({ ...form, rate: e.target.value })} data-testid="edit-rate" className="border-zinc-200" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">PO No.</Label>
              <Input value={form.po_no || ''} onChange={e => setForm({ ...form, po_no: e.target.value })} data-testid="edit-po-no" className="border-zinc-200" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">PO Del Date</Label>
              <Input type="date" value={form.po_del_date || ''} onChange={e => setForm({ ...form, po_del_date: e.target.value })} data-testid="edit-po-del-date" className="border-zinc-200" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Department</Label>
              <Select value={form.department || ''} onValueChange={v => setForm({ ...form, department: v })}>
                <SelectTrigger data-testid="edit-department" className="border-zinc-200"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Assigned To</Label>
              <Select value={form.assigned_to || ''} onValueChange={v => setForm({ ...form, assigned_to: v })}>
                <SelectTrigger data-testid="edit-assigned-to" className="border-zinc-200"><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>{users.map(u => <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Notes / Comment</Label>
            <Textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} data-testid="edit-notes" className="border-zinc-200 min-h-[60px]" />
          </div>
        </CardContent>
      </Card>

      {/* Stage Values */}
      <Card className="bg-white border-zinc-200 rounded-sm">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-zinc-900">Stage Values</CardTitle></CardHeader>
        <CardContent data-testid="enquiry-stage-values">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stages.map(s => (
              <div key={s.id} className="space-y-1.5 p-3 border border-zinc-200 rounded-sm">
                <Label className="text-xs text-zinc-600 flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
                  {s.name}
                  {s.is_mandatory && <span className="text-red-500 text-[10px]">REQ</span>}
                  <span className="text-zinc-400 text-[10px] ml-auto">{s.input_type}</span>
                </Label>
                {s.input_type === 'date' ? (
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={getStageValue(s.id)}
                      onChange={e => setStageValue(s.id, e.target.value)}
                      data-testid={`stage-value-${s.id}`}
                      className="border-zinc-200 flex-1 text-sm"
                    />
                    <Button type="button" variant="outline" size="sm"
                      onClick={() => setStageValue(s.id, new Date().toISOString().split('T')[0])}
                      className="text-xs border-zinc-200 whitespace-nowrap"
                      data-testid={`stage-today-${s.id}`}
                    >Today</Button>
                  </div>
                ) : s.input_type === 'select' ? (
                  <Select value={getStageValue(s.id)} onValueChange={v => setStageValue(s.id, v)}>
                    <SelectTrigger className="border-zinc-200 text-sm" data-testid={`stage-value-${s.id}`}>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(s.select_options || []).map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={getStageValue(s.id)}
                    onChange={e => setStageValue(s.id, e.target.value)}
                    data-testid={`stage-value-${s.id}`}
                    className="border-zinc-200 text-sm"
                    placeholder={`Enter ${s.name.toLowerCase()}...`}
                  />
                )}
              </div>
            ))}
          </div>
          {stages.length === 0 && <div className="py-6 text-center text-zinc-400 text-sm">No stages defined. Go to Stage Master to create stages.</div>}
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} data-testid="save-enquiry-button" className="bg-zinc-900 hover:bg-zinc-800 text-white">
          <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* History */}
      <Card className="bg-white border-zinc-200 rounded-sm">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-zinc-900">Change History</CardTitle></CardHeader>
        <CardContent data-testid="enquiry-history">
          {(enquiry.history?.length || 0) > 0 ? (
            <div className="space-y-2">
              {enquiry.history.map(h => (
                <div key={h.id} className="flex items-start gap-3 py-2 border-b border-zinc-100 last:border-0">
                  <div className="w-7 h-7 rounded-sm bg-zinc-100 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="font-medium text-zinc-900">{stageMap[h.stage_id]?.name || h.stage_id}</span>
                      {h.old_value && <span className="text-zinc-400 line-through">{h.old_value}</span>}
                      {h.old_value && <span className="text-zinc-400">→</span>}
                      <span className="text-zinc-700">{h.new_value}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      <User className="w-3 h-3 inline mr-0.5" />{h.changed_by_name} · {new Date(h.changed_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-zinc-400 text-sm">No history yet</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
