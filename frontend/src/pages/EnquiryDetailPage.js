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
import { ArrowLeft, Save, Trash2, Clock, User, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

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
  const departments = ['Sales', 'Production', 'Quality', 'Admin', 'Design', 'Logistics'];

  const fetchData = useCallback(async () => {
    try {
      const [enqRes, stagesRes, usersRes] = await Promise.all([
        api.get(`/enquiries/${id}`),
        api.get('/stages'),
        api.get('/users')
      ]);
      setEnquiry(enqRes.data);
      setStages(stagesRes.data);
      setUsers(usersRes.data);
      setForm({
        customer_name: enqRes.data.customer_name,
        fabric_type: enqRes.data.fabric_type,
        quantity: enqRes.data.quantity,
        current_stage_id: enqRes.data.current_stage_id,
        assigned_to: enqRes.data.assigned_to,
        department: enqRes.data.department,
        notes: enqRes.data.notes || ''
      });
    } catch (err) {
      toast.error('Failed to load enquiry');
      navigate('/enquiries');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stageMap = {};
  stages.forEach(s => { stageMap[s.id] = s; });
  const userMap = {};
  users.forEach(u => { userMap[u._id] = u; });

  const handleSave = async () => {
    setSaving(true);
    try {
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
    return (
      <div className="space-y-6 animate-pulse" data-testid="enquiry-detail-loading">
        <div className="h-8 w-48 bg-zinc-200 rounded-sm" />
        <div className="h-64 bg-zinc-200 rounded-sm" />
      </div>
    );
  }

  if (!enquiry) return null;

  return (
    <div className="space-y-6 max-w-4xl" data-testid="enquiry-detail-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/enquiries')} data-testid="back-to-enquiries">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{enquiry.customer_name}</h1>
          <p className="text-sm text-zinc-500">Created by {enquiry.created_by_name} on {new Date(enquiry.created_at).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-2">
          {user?.role === 'admin' && (
            <Button variant="outline" size="sm" onClick={handleDelete} data-testid="delete-enquiry-button" className="border-red-200 text-red-600 hover:bg-red-50">
              <Trash2 className="w-3 h-3 mr-1" /> Delete
            </Button>
          )}
        </div>
      </div>

      {/* Stage Progress */}
      <Card className="bg-white border-zinc-200 rounded-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-zinc-900">Stage Progress</CardTitle>
        </CardHeader>
        <CardContent data-testid="stage-progress">
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {stages.map((s, idx) => {
              const isCurrent = s.id === form.current_stage_id;
              const currentIdx = stages.findIndex(st => st.id === form.current_stage_id);
              const isPast = idx < currentIdx;
              return (
                <React.Fragment key={s.id}>
                  {idx > 0 && <ArrowRight className="w-4 h-4 text-zinc-300 flex-shrink-0" />}
                  <button
                    onClick={() => setForm({ ...form, current_stage_id: s.id })}
                    className={`
                      px-3 py-1.5 rounded-sm text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 border
                      ${isCurrent
                        ? 'text-white shadow-sm'
                        : isPast
                          ? 'bg-zinc-100 text-zinc-600 border-zinc-200'
                          : 'bg-white text-zinc-400 border-zinc-200 hover:border-zinc-300'
                      }
                    `}
                    style={isCurrent ? { backgroundColor: s.color, borderColor: s.color } : {}}
                    data-testid={`stage-step-${s.id}`}
                  >
                    {s.name}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Edit Form */}
      <Card className="bg-white border-zinc-200 rounded-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-zinc-900">Enquiry Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4" data-testid="enquiry-edit-form">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Customer Name</Label>
              <Input value={form.customer_name || ''} onChange={e => setForm({ ...form, customer_name: e.target.value })} data-testid="edit-customer-name" className="border-zinc-200" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Fabric Type</Label>
              <Input value={form.fabric_type || ''} onChange={e => setForm({ ...form, fabric_type: e.target.value })} data-testid="edit-fabric-type" className="border-zinc-200" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Quantity</Label>
              <Input value={form.quantity || ''} onChange={e => setForm({ ...form, quantity: e.target.value })} data-testid="edit-quantity" className="border-zinc-200" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Department</Label>
              <Select value={form.department || ''} onValueChange={v => setForm({ ...form, department: v })}>
                <SelectTrigger data-testid="edit-department" className="border-zinc-200">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Assigned To</Label>
              <Select value={form.assigned_to || ''} onValueChange={v => setForm({ ...form, assigned_to: v })}>
                <SelectTrigger data-testid="edit-assigned-to" className="border-zinc-200">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Notes</Label>
            <Textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} data-testid="edit-notes" className="border-zinc-200 min-h-[80px]" />
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving} data-testid="save-enquiry-button" className="bg-zinc-900 hover:bg-zinc-800 text-white">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* History */}
      <Card className="bg-white border-zinc-200 rounded-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-zinc-900">Stage History</CardTitle>
        </CardHeader>
        <CardContent data-testid="enquiry-history">
          {(enquiry.history?.length || 0) > 0 ? (
            <div className="space-y-3">
              {enquiry.history.map(h => (
                <div key={h.id} className="flex items-start gap-3 py-2 border-b border-zinc-100 last:border-0">
                  <div className="w-8 h-8 rounded-sm bg-zinc-100 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-zinc-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {h.from_stage && stageMap[h.from_stage] && (
                        <>
                          <Badge className="rounded-sm text-xs" style={{ backgroundColor: stageMap[h.from_stage].color + '20', color: stageMap[h.from_stage].color }}>
                            {stageMap[h.from_stage].name}
                          </Badge>
                          <ArrowRight className="w-3 h-3 text-zinc-400" />
                        </>
                      )}
                      {stageMap[h.to_stage] && (
                        <Badge className="rounded-sm text-xs" style={{ backgroundColor: stageMap[h.to_stage].color + '20', color: stageMap[h.to_stage].color }}>
                          {stageMap[h.to_stage].name}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      <User className="w-3 h-3 inline mr-1" />
                      {h.changed_by_name} · {new Date(h.changed_at).toLocaleString()} · {h.notes}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-zinc-400 text-sm">No stage history yet</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
