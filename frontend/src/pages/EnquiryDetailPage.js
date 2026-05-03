import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { ArrowLeft, Save, Trash2, Clock, User, Upload, Camera, Image as ImageIcon, Send, MessageSquare, Lock, Plus, XCircle, CheckCircle2, Mic, Square, Play, Pause, ScanLine } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';

function VoiceNotePlayer({ storagePath }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!storagePath) return;
    let revoke = null;
    api.get(`/files/${storagePath}`, { responseType: 'blob' })
      .then(res => { const url = URL.createObjectURL(res.data); revoke = url; setBlobUrl(url); })
      .catch(() => {});
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [storagePath]);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setPlaying(!playing);
  };

  if (!blobUrl) return <span className="text-xs text-zinc-400">Loading...</span>;
  return (
    <div className="flex items-center gap-2">
      <audio ref={audioRef} src={blobUrl} onEnded={() => setPlaying(false)} />
      <button onClick={toggle} className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${playing ? 'bg-red-100 text-red-600' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`} data-testid="voice-note-play">
        {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
      </button>
    </div>
  );
}

function QRCodeScanner({ onScan, onClose }) {
  const scannerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    let scanner = null;
    const initScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => { onScan(decodedText); scanner.stop().catch(() => {}); },
          () => {}
        );
      } catch (err) {
        console.error('QR Scanner error:', err);
      }
    };
    initScanner();
    return () => { if (scannerRef.current) { scannerRef.current.stop().catch(() => {}); } };
  }, [onScan]);

  return (
    <div className="space-y-3">
      <div id="qr-reader" ref={containerRef} className="w-full rounded-sm overflow-hidden" />
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={onClose} className="border-zinc-200">Cancel</Button>
      </div>
    </div>
  );
}

export default function EnquiryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/enquiries';
  const { user } = useAuth();
  const [enquiry, setEnquiry] = useState(null);
  const [stages, setStages] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [fabricTypes, setFabricTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [imageBlobUrl, setImageBlobUrl] = useState(null);
  const [stageComments, setStageComments] = useState({});
  const [commentSending, setCommentSending] = useState({});
  const [quickCustomer, setQuickCustomer] = useState({ open: false, name: '' });
  const [quickFabric, setQuickFabric] = useState({ open: false, name: '', gsm: '', width: '', composition: '', construction: '' });
  const [deptHierarchy, setDeptHierarchy] = useState([]);

  // Check if current user can edit a stage (using dept hierarchy)
  const canEditStage = (stage) => {
    if (!stage || !user) return false;
    if (user.role === 'admin') return true;
    if (enquiry?.status === 'closed') return false;
    // Check dept hierarchy first
    const hItem = deptHierarchy.find(h => h.stage_id === stage.id);
    if (hItem && hItem.assigned_users && hItem.assigned_users.length > 0) {
      return hItem.assigned_users.includes(user._id);
    }
    // Fallback to stage-level assigned_users
    if (!stage.assigned_users || stage.assigned_users.length === 0) return true;
    return stage.assigned_users.includes(user._id);
  };

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
        const fd = new FormData();
        fd.append('file', file);
        try {
          await api.post(`/enquiries/${id}/voice-notes`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          toast.success('Voice note added');
          fetchData();
        } catch (err) { toast.error('Failed to upload voice note'); }
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (err) {
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const deleteVoiceNote = async (noteId) => {
    if (!window.confirm('Delete this voice note?')) return;
    try { await api.delete(`/enquiries/${id}/voice-notes/${noteId}`); toast.success('Deleted'); fetchData(); } catch { toast.error('Failed'); }
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const fetchData = useCallback(async () => {
    try {
      const [enqRes, stagesRes, deptsRes, custRes, fabRes] = await Promise.all([
        api.get(`/enquiries/${id}`),
        api.get('/stages'),
        api.get('/departments'),
        api.get('/customers'),
        api.get('/fabric-types')
      ]);
      const enq = enqRes.data;
      setEnquiry(enq);
      setStages(stagesRes.data);
      setDepartments(deptsRes.data);
      setCustomers(custRes.data);
      setFabricTypes(fabRes.data);
      // Load department hierarchy
      if (enq.department) {
        const dept = deptsRes.data.find(d => d.name === enq.department);
        if (dept) {
          try { const hRes = await api.get(`/departments/${dept.id}/hierarchy`); setDeptHierarchy(hRes.data); } catch (err) { console.warn('Failed to load department hierarchy:', err); }
        }
      }
      setForm({
        customer_name: enq.customer_name,
        fabric_type: enq.fabric_type,
        quantity: enq.quantity,
        style_no: enq.style_no || '',
        department: enq.department || '',
        notes: enq.notes || '',
        rate: enq.rate || '',
        po_no: enq.po_no || '',
        po_del_date: enq.po_del_date || '',
        fabric_received: enq.fabric_received || 'no',
        qty_received: enq.qty_received || '',
        sample_number: enq.sample_number || '',
        stage_values: enq.stage_values || {},
        image_path: enq.image_path || ''
      });
      // Load image if exists
      if (enq.image_path) {
        try {
          const imgRes = await api.get(`/files/${enq.image_path}`, { responseType: 'blob' });
          setImageBlobUrl(URL.createObjectURL(imgRes.data));
        } catch (err) { console.warn('Failed to load image preview:', err); }
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

  // Filter and order stages based on department hierarchy
  const visibleStages = React.useMemo(() => {
    if (deptHierarchy.length > 0) {
      const sorted = [...deptHierarchy].sort((a, b) => a.order - b.order);
      return sorted.map(h => stageMap[h.stage_id]).filter(Boolean);
    }
    return stages;
  }, [deptHierarchy, stages, stageMap]);

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
      navigate(returnTo);
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

  const handleAddComment = async (stageId) => {
    const comment = stageComments[stageId]?.trim();
    if (!comment) return;
    setCommentSending(prev => ({ ...prev, [stageId]: true }));
    try {
      await api.post(`/enquiries/${id}/comments`, { stage_id: stageId, comment });
      setStageComments(prev => ({ ...prev, [stageId]: '' }));
      toast.success('Comment added');
      fetchData();
    } catch (err) {
      toast.error('Failed to add comment');
    } finally {
      setCommentSending(prev => ({ ...prev, [stageId]: false }));
    }
  };

  if (loading) {
    return <div className="space-y-6 animate-pulse" data-testid="enquiry-detail-loading"><div className="h-8 w-48 bg-zinc-200 rounded-sm" /><div className="h-64 bg-zinc-200 rounded-sm" /></div>;
  }
  if (!enquiry) return null;

  return (
    <div className="space-y-6 max-w-5xl" data-testid="enquiry-detail-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(returnTo)} data-testid="back-to-enquiries"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 truncate">{enquiry.customer_name}</h1>
            {enquiry.enquiry_number && <Badge className="rounded-sm text-xs bg-zinc-100 text-zinc-600 font-mono shrink-0">#{enquiry.enquiry_number}</Badge>}
            {enquiry.status === 'closed' ? (
              <Badge className="rounded-sm text-xs bg-green-100 text-green-700 border border-green-200 shrink-0" data-testid="enquiry-status-badge">Closed</Badge>
            ) : (
              <Badge className="rounded-sm text-xs bg-blue-50 text-blue-600 border border-blue-200 shrink-0" data-testid="enquiry-status-badge">Open</Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 truncate">Style: {enquiry.style_no || '—'} · {enquiry.fabric_type} · Created by {enquiry.created_by_name}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {user?.role === 'admin' && enquiry.status !== 'closed' && (
            <Button variant="outline" size="sm" onClick={async () => { if (window.confirm('Close this enquiry?')) { try { await api.put(`/enquiries/${id}/close`); toast.success('Enquiry closed'); fetchData(); } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); } } }} data-testid="close-enquiry-button" className="border-amber-200 text-amber-700 hover:bg-amber-50">
              <XCircle className="w-3 h-3 mr-1" /> Close
            </Button>
          )}
          {user?.role === 'admin' && enquiry.status === 'closed' && (
            <Button variant="outline" size="sm" onClick={async () => { try { await api.put(`/enquiries/${id}/reopen`); toast.success('Enquiry reopened'); fetchData(); } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); } }} data-testid="reopen-enquiry-button" className="border-green-200 text-green-700 hover:bg-green-50">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Reopen
            </Button>
          )}
          {user?.role === 'admin' && (
            <Button variant="outline" size="sm" onClick={handleDelete} data-testid="delete-enquiry-button" className="border-red-200 text-red-600 hover:bg-red-50">
              <Trash2 className="w-3 h-3 mr-1" /> Delete
            </Button>
          )}
        </div>
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
              <p className="text-xs text-zinc-500 font-medium">Upload from:</p>
              <div className="flex gap-2 flex-wrap">
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" capture="environment" onChange={e => setImageFile(e.target.files[0])} className="hidden" data-testid="edit-image-camera" />
                  <div className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 rounded-sm text-xs text-zinc-600 hover:bg-zinc-50 transition-colors">
                    <Camera className="w-3 h-3" /> Camera
                  </div>
                </label>
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} className="hidden" data-testid="edit-image-gallery" />
                  <div className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 rounded-sm text-xs text-zinc-600 hover:bg-zinc-50 transition-colors">
                    <ImageIcon className="w-3 h-3" /> Gallery / File
                  </div>
                </label>
              </div>
              {imageFile && <p className="text-xs text-green-600">{imageFile.name}</p>}
              <p className="text-xs text-zinc-400">Supports camera, photo gallery, or file picker</p>
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
              <div className="flex gap-1">
                <Select value={form.customer_name || ''} onValueChange={v => setForm({ ...form, customer_name: v })}>
                  <SelectTrigger data-testid="edit-customer-name" className="border-zinc-200 flex-1"><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
                <Dialog open={quickCustomer.open} onOpenChange={v => setQuickCustomer(p => ({ ...p, open: v }))}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="icon" className="border-zinc-200 shrink-0" data-testid="detail-quick-add-customer"><Plus className="w-4 h-4" /></Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-sm">
                    <DialogHeader><DialogTitle>Quick Add Customer</DialogTitle></DialogHeader>
                    <form onSubmit={async (e) => { e.preventDefault(); try { const res = await api.post('/customers', { name: quickCustomer.name }); setCustomers(prev => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name))); setForm(f => ({ ...f, customer_name: res.data.name })); setQuickCustomer({ open: false, name: '' }); toast.success('Customer created'); } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); } }} className="space-y-4 mt-2">
                      <Input value={quickCustomer.name} onChange={e => setQuickCustomer(p => ({ ...p, name: e.target.value }))} required placeholder="Customer name" className="border-zinc-200" />
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setQuickCustomer({ open: false, name: '' })} className="rounded-sm border-zinc-200">Cancel</Button>
                        <Button type="submit" className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-sm">Add</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Fabric Type</Label>
              <div className="flex gap-1">
                <Select value={form.fabric_type || ''} onValueChange={v => setForm({ ...form, fabric_type: v })}>
                  <SelectTrigger data-testid="edit-fabric-type" className="border-zinc-200 flex-1"><SelectValue placeholder="Select fabric" /></SelectTrigger>
                  <SelectContent>{fabricTypes.map(f => <SelectItem key={f.id} value={f.name}>{f.name}{f.gsm ? ` (${f.gsm} GSM)` : ''}</SelectItem>)}</SelectContent>
                </Select>
                <Dialog open={quickFabric.open} onOpenChange={v => setQuickFabric(p => ({ ...p, open: v }))}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="icon" className="border-zinc-200 shrink-0" data-testid="detail-quick-add-fabric"><Plus className="w-4 h-4" /></Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader><DialogTitle>Quick Add Fabric Type</DialogTitle></DialogHeader>
                    <form onSubmit={async (e) => { e.preventDefault(); try { const res = await api.post('/fabric-types', { name: quickFabric.name, gsm: quickFabric.gsm, width: quickFabric.width, composition: quickFabric.composition, construction: quickFabric.construction }); setFabricTypes(prev => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name))); setForm(f => ({ ...f, fabric_type: res.data.name })); setQuickFabric({ open: false, name: '', gsm: '', width: '', composition: '', construction: '' }); toast.success('Fabric type created'); } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); } }} className="space-y-3 mt-2">
                      <Input value={quickFabric.name} onChange={e => setQuickFabric(p => ({ ...p, name: e.target.value }))} required placeholder="Fabric name *" className="border-zinc-200" />
                      <div className="grid grid-cols-2 gap-3">
                        <Input value={quickFabric.gsm} onChange={e => setQuickFabric(p => ({ ...p, gsm: e.target.value }))} placeholder="GSM" className="border-zinc-200" />
                        <Input value={quickFabric.width} onChange={e => setQuickFabric(p => ({ ...p, width: e.target.value }))} placeholder="Width" className="border-zinc-200" />
                      </div>
                      <Input value={quickFabric.composition} onChange={e => setQuickFabric(p => ({ ...p, composition: e.target.value }))} placeholder="Composition" className="border-zinc-200" />
                      <Input value={quickFabric.construction} onChange={e => setQuickFabric(p => ({ ...p, construction: e.target.value }))} placeholder="Construction" className="border-zinc-200" />
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setQuickFabric({ open: false, name: '', gsm: '', width: '', composition: '', construction: '' })} className="rounded-sm border-zinc-200">Cancel</Button>
                        <Button type="submit" className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-sm">Add</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Style No.</Label>
              <Input value={form.style_no || ''} onChange={e => setForm({ ...form, style_no: e.target.value })} data-testid="edit-style-no" className="border-zinc-200" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Department</Label>
              <Select value={form.department || ''} onValueChange={v => setForm({ ...form, department: v })}>
                <SelectTrigger data-testid="edit-department" className="border-zinc-200"><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>{departments.map(d => <SelectItem key={d.id || d.name} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Fabric Received</Label>
              <Select value={form.fabric_received || 'no'} onValueChange={v => setForm({ ...form, fabric_received: v, qty_received: v === 'no' ? '' : form.qty_received, sample_number: v === 'no' ? '' : form.sample_number })}>
                <SelectTrigger data-testid="edit-fabric-received" className="border-zinc-200"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.fabric_received === 'yes' && (
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Sample No.</Label>
                <Input value={form.sample_number || ''} onChange={e => setForm({ ...form, sample_number: e.target.value })} data-testid="edit-sample-number" placeholder="Enter sample number" className="border-zinc-200" />
              </div>
            )}
            {form.fabric_received === 'yes' && (
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Qty Received</Label>
                <Input value={form.qty_received || ''} onChange={e => setForm({ ...form, qty_received: e.target.value })} data-testid="edit-qty-received" placeholder="Enter qty received" className="border-zinc-200" />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Notes / Comment</Label>
            <Textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} data-testid="edit-notes" className="border-zinc-200 min-h-[60px]" />
          </div>
        </CardContent>
      </Card>

      {/* Voice Notes */}
      <Card className="bg-white border-zinc-200 rounded-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-zinc-900">Voice Notes</CardTitle>
            <Badge className="rounded-sm text-[10px] bg-zinc-100 text-zinc-600">{(enquiry.voice_notes || []).length} notes</Badge>
          </div>
        </CardHeader>
        <CardContent data-testid="enquiry-voice-notes">
          {/* Recorder */}
          <div className="flex items-center gap-3 mb-4 p-3 border border-dashed border-zinc-200 rounded-sm bg-zinc-50/50">
            {isRecording ? (
              <>
                <button onClick={stopRecording} className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white animate-pulse shadow-lg" data-testid="stop-recording-btn">
                  <Square className="w-4 h-4" />
                </button>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-600">Recording...</p>
                  <p className="text-xs text-zinc-500 font-mono">{formatTime(recordingTime)}</p>
                </div>
              </>
            ) : (
              <>
                <button onClick={startRecording} className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-white hover:bg-zinc-700 transition-colors shadow" data-testid="start-recording-btn">
                  <Mic className="w-4 h-4" />
                </button>
                <div className="flex-1">
                  <p className="text-sm text-zinc-600">Tap to record a voice note</p>
                  <p className="text-xs text-zinc-400">Hold and release, or tap to start/stop</p>
                </div>
              </>
            )}
          </div>
          {/* Voice notes list */}
          {(enquiry.voice_notes || []).length === 0 ? (
            <div className="text-center py-4 text-zinc-400 text-xs">No voice notes yet</div>
          ) : (
            <div className="space-y-2">
              {(enquiry.voice_notes || []).map((vn, idx) => (
                <div key={vn.id} className="flex items-center gap-3 p-2.5 border border-zinc-200 rounded-sm hover:bg-zinc-50" data-testid={`voice-note-${vn.id}`}>
                  <VoiceNotePlayer storagePath={vn.storage_path} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-700">Voice Note #{idx + 1}</p>
                    <p className="text-[10px] text-zinc-400">{vn.recorded_by_name} · {new Date(vn.created_at).toLocaleString()}</p>
                  </div>
                  {user?.role === 'admin' && (
                    <button onClick={() => deleteVoiceNote(vn.id)} className="text-zinc-300 hover:text-red-500 transition-colors" data-testid={`delete-voice-${vn.id}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stage Values */}
      <Card className="bg-white border-zinc-200 rounded-sm">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-zinc-900">Stage Values</CardTitle></CardHeader>
        <CardContent data-testid="enquiry-stage-values">
          <div className="space-y-4">
            {visibleStages.map(s => {
              const ds = enquiry.delay_status?.[s.id];
              const isDelayed = ds?.status === 'delayed' || ds?.status === 'completed_late';
              const isEarly = ds?.status === 'completed_early';
              const isPending = ds?.status === 'pending' && ds?.lead_time_days > 0;
              const borderClass = isDelayed ? 'border-red-300 bg-red-50/30' : isEarly ? 'border-green-300 bg-green-50/30' : 'border-zinc-200';
              const stageHistory = (enquiry.history || []).filter(h => h.stage_id === s.id);
              const editable = canEditStage(s);
              return (
                <div key={s.id} className={`p-4 border rounded-sm ${borderClass}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} />
                    <span className="text-sm font-semibold text-zinc-900">{s.name}</span>
                    {s.is_mandatory && <span className="text-red-500 text-[10px] font-semibold">REQ</span>}
                    {!editable && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-sm" data-testid={`stage-locked-${s.id}`}>
                        <Lock className="w-2.5 h-2.5" /> Restricted
                      </span>
                    )}
                    <span className="text-zinc-400 text-[10px] ml-auto">{s.input_type}{s.lead_time_days ? ` · ${s.lead_time_days}d lead` : ''}</span>
                  </div>
                  {/* Delay indicator */}
                  {isDelayed && (
                    <div className="text-xs font-semibold text-red-600 mb-2 px-2 py-1 bg-red-50 rounded-sm inline-flex items-center gap-1" data-testid={`delay-indicator-${s.id}`}>
                      DELAYED {ds?.days_diff != null && <span className="font-normal">({Math.abs(ds.days_diff)}d overdue)</span>}
                    </div>
                  )}
                  {isEarly && (
                    <div className="text-xs font-semibold text-green-600 mb-2 px-2 py-1 bg-green-50 rounded-sm inline-flex items-center gap-1" data-testid={`early-indicator-${s.id}`}>
                      ON TIME {ds?.days_diff != null && <span className="font-normal">({ds.days_diff}d early)</span>}
                    </div>
                  )}
                  {isPending && ds?.due_date && (
                    <div className="text-xs text-amber-600 mb-2 px-2 py-1 bg-amber-50 rounded-sm inline-block" data-testid={`pending-indicator-${s.id}`}>
                      Due: {new Date(ds.due_date).toLocaleDateString()} ({ds.days_diff}d remaining)
                    </div>
                  )}
                  {/* Input field - only editable if user has permission */}
                  <div className="mb-3">
                    {editable ? (
                      <>
                        {s.input_type === 'image' ? (
                          <div className="space-y-2">
                            {getStageValue(s.id) ? (
                              <div className="flex items-center gap-3">
                                <img src={`/api/files/${getStageValue(s.id)}`} alt={s.name} className="w-20 h-20 object-cover rounded-sm border border-zinc-200" />
                                <div className="flex flex-col gap-1">
                                  <span className="text-xs text-green-600 font-medium">Image uploaded</span>
                                  <Button type="button" variant="outline" size="sm" onClick={() => setStageValue(s.id, '')} className="text-xs border-zinc-200">Remove</Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-zinc-300 rounded-sm cursor-pointer hover:bg-zinc-50 transition-colors">
                                  <Upload className="w-4 h-4 text-zinc-400" />
                                  <span className="text-xs text-zinc-500">Upload from Gallery</span>
                                  <input type="file" accept="image/*" className="hidden" data-testid={`stage-image-gallery-${s.id}`} onChange={async (e) => {
                                    const file = e.target.files?.[0]; if (!file) return;
                                    const fd = new FormData(); fd.append('file', file);
                                    try { const res = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); setStageValue(s.id, res.data.path); toast.success('Image uploaded'); } catch { toast.error('Upload failed'); }
                                  }} />
                                </label>
                                <label className="flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-zinc-300 rounded-sm cursor-pointer hover:bg-zinc-50 transition-colors">
                                  <Camera className="w-4 h-4 text-zinc-400" />
                                  <span className="text-xs text-zinc-500">Camera</span>
                                  <input type="file" accept="image/*" capture="environment" className="hidden" data-testid={`stage-image-camera-${s.id}`} onChange={async (e) => {
                                    const file = e.target.files?.[0]; if (!file) return;
                                    const fd = new FormData(); fd.append('file', file);
                                    try { const res = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); setStageValue(s.id, res.data.path); toast.success('Image captured'); } catch { toast.error('Upload failed'); }
                                  }} />
                                </label>
                              </div>
                            )}
                          </div>
                        ) : s.input_type === 'qrcode' ? (
                          <div className="space-y-2">
                            {getStageValue(s.id) ? (
                              <div className="flex items-center gap-3">
                                <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-sm flex-1">
                                  <p className="text-xs text-green-700 font-mono break-all">{getStageValue(s.id)}</p>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={() => setStageValue(s.id, '')} className="text-xs border-zinc-200 shrink-0">Clear</Button>
                              </div>
                            ) : (
                              <div>
                                <div className="flex gap-2 mb-2">
                                  <Button type="button" variant="outline" size="sm" onClick={() => setForm(prev => ({ ...prev, [`_qr_scanning_${s.id}`]: !prev[`_qr_scanning_${s.id}`] }))} className="flex-1 border-zinc-200" data-testid={`stage-qr-scan-${s.id}`}>
                                    <ScanLine className="w-4 h-4 mr-1.5" /> {form[`_qr_scanning_${s.id}`] ? 'Stop Scanner' : 'Scan QR Code'}
                                  </Button>
                                  <Input placeholder="Or type manually..." className="flex-1 border-zinc-200 text-xs" value="" onChange={e => { if (e.target.value) setStageValue(s.id, e.target.value); }} data-testid={`stage-qr-manual-${s.id}`} />
                                </div>
                                {form[`_qr_scanning_${s.id}`] && (
                                  <QRCodeScanner
                                    onScan={(text) => { setStageValue(s.id, text); setForm(prev => ({ ...prev, [`_qr_scanning_${s.id}`]: false })); toast.success(`Scanned: ${text}`); }}
                                    onClose={() => setForm(prev => ({ ...prev, [`_qr_scanning_${s.id}`]: false }))}
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        ) : s.input_type === 'date' ? (
                          s.date_input_mode === 'auto' ? (
                            <Button type="button" variant="outline" size="sm"
                              onClick={() => setStageValue(s.id, new Date().toISOString().split('T')[0])}
                              className={`text-xs w-full justify-start ${getStageValue(s.id) ? 'bg-green-50 border-green-300 text-green-700' : 'border-zinc-200'}`}
                              data-testid={`stage-value-${s.id}`}
                            >
                              {getStageValue(s.id) ? `Captured: ${getStageValue(s.id)}` : 'Click to capture current date'}
                            </Button>
                          ) : (
                            <div className="flex gap-2">
                              <Input type="date" value={getStageValue(s.id)} onChange={e => setStageValue(s.id, e.target.value)} data-testid={`stage-value-${s.id}`} className="border-zinc-200 flex-1 text-sm" />
                              <Button type="button" variant="outline" size="sm" onClick={() => setStageValue(s.id, new Date().toISOString().split('T')[0])} className="text-xs border-zinc-200 whitespace-nowrap" data-testid={`stage-today-${s.id}`}>Today</Button>
                            </div>
                          )
                        ) : s.input_type === 'select' ? (
                          <Select value={getStageValue(s.id)} onValueChange={v => setStageValue(s.id, v)}>
                            <SelectTrigger className="border-zinc-200 text-sm" data-testid={`stage-value-${s.id}`}><SelectValue placeholder="Select..." /></SelectTrigger>
                            <SelectContent>{(s.select_options || []).map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                          </Select>
                        ) : (
                          <Input value={getStageValue(s.id)} onChange={e => setStageValue(s.id, e.target.value)} data-testid={`stage-value-${s.id}`} className="border-zinc-200 text-sm" placeholder={`Enter ${s.name.toLowerCase()}...`} />
                        )}
                      </>
                    ) : (
                      <div className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-sm text-sm text-zinc-500" data-testid={`stage-value-readonly-${s.id}`}>
                        {s.input_type === 'image' && getStageValue(s.id) ? (
                          <img src={`/api/files/${getStageValue(s.id)}`} alt={s.name} className="w-20 h-20 object-cover rounded-sm" />
                        ) : s.input_type === 'qrcode' && getStageValue(s.id) ? (
                          <span className="font-mono text-xs">{getStageValue(s.id)}</span>
                        ) : getStageValue(s.id) || <span className="italic text-zinc-400">No value set</span>}
                      </div>
                    )}
                  </div>
                  {/* Stage Comment Input - only if user has permission */}
                  {editable ? (
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={stageComments[s.id] || ''}
                        onChange={e => setStageComments(prev => ({ ...prev, [s.id]: e.target.value }))}
                        placeholder={`Add comment for ${s.name}...`}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddComment(s.id); } }}
                        data-testid={`stage-comment-input-${s.id}`}
                        className="border-zinc-200 text-sm flex-1"
                      />
                      <Button
                        type="button" size="sm" variant="outline"
                        onClick={() => handleAddComment(s.id)}
                        disabled={commentSending[s.id] || !stageComments[s.id]?.trim()}
                        data-testid={`stage-comment-send-${s.id}`}
                        className="border-zinc-200"
                      >
                        <Send className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : null}
                  {/* Stage History & Comments */}
                  {stageHistory.length > 0 && (
                    <div className="border-t border-zinc-100 pt-2 space-y-1.5">
                      {stageHistory.map(h => (
                        <div key={h.id} className="flex items-start gap-2 text-xs" data-testid={`stage-history-${h.id}`}>
                          <div className={`w-5 h-5 rounded-sm flex items-center justify-center flex-shrink-0 ${h.type === 'comment' ? 'bg-blue-50' : 'bg-zinc-100'}`}>
                            {h.type === 'comment' ? <MessageSquare className="w-2.5 h-2.5 text-blue-500" /> : <Clock className="w-2.5 h-2.5 text-zinc-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            {h.type === 'comment' ? (
                              <p className="text-zinc-700">{h.comment || h.notes}</p>
                            ) : (
                              <div className="flex items-center gap-1 flex-wrap">
                                {h.old_value && <span className="text-zinc-400 line-through">{h.old_value}</span>}
                                {h.old_value && <span className="text-zinc-300">→</span>}
                                <span className="text-zinc-700 font-medium">{h.new_value}</span>
                              </div>
                            )}
                            <p className="text-[10px] text-zinc-400 mt-0.5">
                              {h.changed_by_name} · {new Date(h.changed_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {visibleStages.length === 0 && <div className="py-6 text-center text-zinc-400 text-sm">{deptHierarchy.length === 0 ? 'No stages assigned to this department. Go to Departments to set up stage hierarchy.' : 'No stages defined. Go to Stage Master to create stages.'}</div>}
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} data-testid="save-enquiry-button" className="bg-zinc-900 hover:bg-zinc-800 text-white">
          <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Full History */}
      <Card className="bg-white border-zinc-200 rounded-sm">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-zinc-900">Full Change History</CardTitle></CardHeader>
        <CardContent data-testid="enquiry-history">
          {(enquiry.history?.length || 0) > 0 ? (
            <div className="space-y-2">
              {enquiry.history.map(h => (
                <div key={h.id} className="flex items-start gap-3 py-2 border-b border-zinc-100 last:border-0">
                  <div className={`w-7 h-7 rounded-sm flex items-center justify-center flex-shrink-0 ${h.type === 'comment' ? 'bg-blue-50' : 'bg-zinc-100'}`}>
                    {h.type === 'comment' ? <MessageSquare className="w-3.5 h-3.5 text-blue-500" /> : <Clock className="w-3.5 h-3.5 text-zinc-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <Badge className="rounded-sm text-[10px] px-1.5" style={{ backgroundColor: (stageMap[h.stage_id]?.color || '#9CA3AF') + '20', color: stageMap[h.stage_id]?.color || '#9CA3AF' }}>
                        {stageMap[h.stage_id]?.name || h.stage_id}
                      </Badge>
                      {h.type === 'comment' ? (
                        <span className="text-zinc-700">{h.comment || h.notes}</span>
                      ) : (
                        <>
                          {h.old_value && <span className="text-zinc-400 line-through">{h.old_value}</span>}
                          {h.old_value && <span className="text-zinc-400">→</span>}
                          <span className="text-zinc-700 font-medium">{h.new_value}</span>
                        </>
                      )}
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

      {/* Mobile sticky save button */}
      <div className="sticky bottom-0 md:hidden bg-white border-t border-zinc-200 p-3 -mx-4 sm:-mx-6 mt-4" data-testid="mobile-save-bar">
        <Button onClick={handleSave} disabled={saving} className="w-full bg-zinc-900 hover:bg-zinc-800 text-white" data-testid="mobile-save-button">
          <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
