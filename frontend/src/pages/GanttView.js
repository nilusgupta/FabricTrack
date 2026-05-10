import React, { useEffect, useState, useMemo, useCallback } from 'react';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { ZoomIn, ZoomOut, Maximize2, ChevronDown, ChevronRight } from 'lucide-react';

// Pixels per day at zoom level 1.0
const BASE_PX_PER_DAY = 24;
const ROW_HEIGHT = 28;
const SIDEBAR_WIDTH = 280;
const HEADER_HEIGHT = 56;

const ymd = d => d.toISOString().split('T')[0];
const parseISO = (s) => {
  if (!s) return null;
  const d = new Date(s.replace ? s.replace('Z', '+00:00') : s);
  return isNaN(d.getTime()) ? null : d;
};
const startOfDayUTC = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
const diffDays = (a, b) => Math.round((b - a) / 86400000);

export default function GanttView({ stages, departments, stageMap }) {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('open');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterFabric, setFilterFabric] = useState('');
  const [zoom, setZoom] = useState(1); // multiplier on BASE_PX_PER_DAY
  const [collapsedDepts, setCollapsedDepts] = useState({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: 1, page_size: 100 };
      if (filterDept) params.department = filterDept;
      if (filterStatus) params.status = filterStatus;
      if (filterCustomer) params.customer_name = filterCustomer;
      if (filterFabric) params.fabric_type = filterFabric;
      const res = await api.get('/enquiries', { params });
      setEnquiries(res.data.enquiries || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterDept, filterStatus, filterCustomer, filterFabric]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Build hierarchy lookup once per departments change
  const hierarchyByDept = useMemo(() => {
    const out = {};
    for (const d of departments) {
      const sorted = [...(d.stage_hierarchy || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
      out[d.name] = sorted;
    }
    return out;
  }, [departments]);

  // Compute timeline bars per enquiry
  const today = useMemo(() => startOfDayUTC(new Date()), []);
  const enquiryBars = useMemo(() => {
    return enquiries.map(enq => {
      const hierarchy = hierarchyByDept[enq.department] || [];
      if (hierarchy.length === 0) return { enquiry: enq, bars: [], minDate: null, maxDate: null };
      const sv = enq.stage_values || {};
      const enqStart = parseISO(enq.created_at) || today;
      const bars = [];
      let prevEnd = startOfDayUTC(enqStart);
      let minDate = prevEnd;
      let maxDate = prevEnd;
      for (const h of hierarchy) {
        const stageDef = stageMap[h.stage_id];
        if (!stageDef) continue;
        const lt = stageDef.lead_time_days || 0;
        const sval = sv[h.stage_id];
        const completedAt = (typeof sval === 'object' && sval) ? parseISO(sval.updated_at) : null;
        const value = (typeof sval === 'object' && sval) ? (sval.value || '') : (sval ? String(sval) : '');
        const completed = !!value;
        const start = prevEnd;
        const plannedEnd = addDays(start, lt);
        const actualEnd = completed && completedAt ? startOfDayUTC(completedAt) : null;
        const liveEnd = completed ? actualEnd : today;
        const barEnd = liveEnd > plannedEnd ? liveEnd : plannedEnd;
        // Status
        let status;
        if (completed) {
          status = (actualEnd && actualEnd > plannedEnd) ? 'late' : 'done';
        } else {
          status = (today > plannedEnd && lt > 0) ? 'overdue' : 'inprogress';
        }
        bars.push({
          stage_id: h.stage_id,
          stage_name: stageDef.name,
          color: stageDef.color || '#9CA3AF',
          start, plannedEnd, actualEnd, liveEnd,
          status,
          completed, value, lead_time_days: lt,
        });
        if (start < minDate) minDate = start;
        if (barEnd > maxDate) maxDate = barEnd;
        // Next stage starts when this one finishes (actual if complete, today if pending)
        prevEnd = liveEnd;
      }
      return { enquiry: enq, bars, minDate, maxDate };
    });
  }, [enquiries, hierarchyByDept, stageMap, today]);

  // Compute global timeline range (auto-fit)
  const { rangeStart, rangeEnd, totalDays } = useMemo(() => {
    let mn = null, mx = null;
    for (const eb of enquiryBars) {
      if (!eb.minDate) continue;
      if (!mn || eb.minDate < mn) mn = eb.minDate;
      if (!mx || eb.maxDate > mx) mx = eb.maxDate;
    }
    if (!mn) {
      mn = addDays(today, -14);
      mx = addDays(today, 14);
    } else {
      mn = addDays(mn, -2);
      mx = addDays(mx, 2);
    }
    return { rangeStart: mn, rangeEnd: mx, totalDays: Math.max(diffDays(mn, mx), 1) };
  }, [enquiryBars, today]);

  const pxPerDay = BASE_PX_PER_DAY * zoom;
  const timelineWidth = totalDays * pxPerDay;

  // Group by department
  const groupedByDept = useMemo(() => {
    const groups = {};
    for (const eb of enquiryBars) {
      const dn = eb.enquiry.department || '— No Dept —';
      if (!groups[dn]) groups[dn] = [];
      groups[dn].push(eb);
    }
    return groups;
  }, [enquiryBars]);

  // Build timeline header ticks (auto: day if zoom big, else week, else month)
  const ticks = useMemo(() => {
    const out = [];
    if (pxPerDay >= 30) {
      // daily
      for (let i = 0; i <= totalDays; i++) {
        const d = addDays(rangeStart, i);
        out.push({ d, label: `${d.getUTCDate()}`, sublabel: i === 0 || d.getUTCDate() === 1 ? d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }) : '' });
      }
    } else if (pxPerDay >= 8) {
      // weekly
      for (let i = 0; i <= totalDays; i++) {
        const d = addDays(rangeStart, i);
        if (d.getUTCDay() === 1 || i === 0) {
          out.push({ d, label: `${d.getUTCDate()}/${d.getUTCMonth() + 1}`, sublabel: '' });
        }
      }
    } else {
      // monthly
      for (let i = 0; i <= totalDays; i++) {
        const d = addDays(rangeStart, i);
        if (d.getUTCDate() === 1 || i === 0) {
          out.push({ d, label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' }), sublabel: '' });
        }
      }
    }
    return out;
  }, [rangeStart, totalDays, pxPerDay]);

  const todayPx = diffDays(rangeStart, today) * pxPerDay;

  const fitToData = () => setZoom(1);
  const zoomIn = () => setZoom(z => Math.min(z * 1.4, 8));
  const zoomOut = () => setZoom(z => Math.max(z / 1.4, 0.15));

  const toggleDept = (name) => setCollapsedDepts(prev => ({ ...prev, [name]: !prev[name] }));

  const statusBorder = {
    done: 'border-green-600',
    late: 'border-orange-500',
    inprogress: 'border-amber-400',
    overdue: 'border-red-500',
  };

  return (
    <div className="space-y-4" data-testid="gantt-view">
      {/* Filters */}
      <Card className="bg-white border-zinc-200 rounded-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Department</Label>
              <Select value={filterDept || '__all__'} onValueChange={v => setFilterDept(v === '__all__' ? '' : v)}>
                <SelectTrigger className="w-44 border-zinc-200" data-testid="gantt-filter-dept"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Departments</SelectItem>
                  {departments.map(d => <SelectItem key={d.id || d.name} value={d.name}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Status</Label>
              <Select value={filterStatus || '__all__'} onValueChange={v => setFilterStatus(v === '__all__' ? '' : v)}>
                <SelectTrigger className="w-32 border-zinc-200" data-testid="gantt-filter-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="__all__">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Customer</Label>
              <Input value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)} placeholder="Filter..." className="w-40 border-zinc-200 h-9" data-testid="gantt-filter-customer" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide font-semibold text-zinc-500">Fabric</Label>
              <Input value={filterFabric} onChange={e => setFilterFabric(e.target.value)} placeholder="Filter..." className="w-40 border-zinc-200 h-9" data-testid="gantt-filter-fabric" />
            </div>
            <div className="ml-auto flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={zoomOut} className="border-zinc-200 h-9 w-9 p-0" data-testid="gantt-zoom-out" title="Zoom out"><ZoomOut className="w-3.5 h-3.5" /></Button>
              <Button variant="outline" size="sm" onClick={fitToData} className="border-zinc-200 h-9 px-2 text-xs" data-testid="gantt-fit" title="Fit to data"><Maximize2 className="w-3.5 h-3.5 mr-1" /> Fit</Button>
              <Button variant="outline" size="sm" onClick={zoomIn} className="border-zinc-200 h-9 w-9 p-0" data-testid="gantt-zoom-in" title="Zoom in"><ZoomIn className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-600 px-1">
        <span className="font-semibold uppercase text-zinc-500">Status:</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-zinc-300 border-2 border-green-600" /> Done on time</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-zinc-300 border-2 border-orange-500" /> Done late</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-zinc-300 border-2 border-amber-400" /> In progress</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-zinc-300 border-2 border-red-500" /> Overdue</span>
        <span className="ml-2 text-zinc-400">Bar fill = stage color</span>
      </div>

      {/* Gantt body */}
      <Card className="bg-white border-zinc-200 rounded-sm overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-zinc-900">Enquiry Timeline</CardTitle>
            <span className="text-xs text-zinc-500">{enquiries.length} enquiries · {Object.keys(groupedByDept).length} dept</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-zinc-400 text-sm">Loading…</div>
          ) : enquiries.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 text-sm">No enquiries match the current filters</div>
          ) : (
            <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
              <div style={{ minWidth: SIDEBAR_WIDTH + timelineWidth + 20 }}>
                {/* Header row: timeline ticks */}
                <div className="sticky top-0 z-30 bg-zinc-50 border-b border-zinc-200 flex" style={{ height: HEADER_HEIGHT }}>
                  <div className="sticky left-0 z-40 bg-zinc-50 border-r border-zinc-200 flex items-center px-3 text-xs font-semibold uppercase text-zinc-600" style={{ width: SIDEBAR_WIDTH, minWidth: SIDEBAR_WIDTH }}>
                    Enquiry
                  </div>
                  <div className="relative flex-shrink-0" style={{ width: timelineWidth, height: HEADER_HEIGHT }}>
                    {ticks.map((t, i) => (
                      <div key={i} className="absolute top-0 h-full text-[10px] text-zinc-500" style={{ left: diffDays(rangeStart, t.d) * pxPerDay, width: pxPerDay }}>
                        <div className="border-l border-zinc-200 h-full px-0.5 flex flex-col justify-center">
                          {t.sublabel && <span className="text-[9px] font-bold uppercase text-zinc-400">{t.sublabel}</span>}
                          <span>{t.label}</span>
                        </div>
                      </div>
                    ))}
                    {/* Today line */}
                    {todayPx >= 0 && todayPx <= timelineWidth && (
                      <div className="absolute top-0 h-full" style={{ left: todayPx, width: 2, background: '#ef4444', zIndex: 5 }} title="Today" />
                    )}
                  </div>
                </div>

                {/* Department groups */}
                {Object.keys(groupedByDept).sort().map(deptName => {
                  const items = groupedByDept[deptName];
                  const collapsed = collapsedDepts[deptName];
                  return (
                    <div key={deptName}>
                      <div
                        className="sticky left-0 z-20 flex items-center bg-zinc-100 border-b border-zinc-200 cursor-pointer hover:bg-zinc-200 select-none"
                        style={{ height: 32, width: SIDEBAR_WIDTH + timelineWidth }}
                        onClick={() => toggleDept(deptName)}
                        data-testid={`gantt-dept-${deptName}`}
                      >
                        <div className="sticky left-0 bg-zinc-100 px-3 flex items-center gap-1.5 text-xs font-semibold text-zinc-700 uppercase tracking-wide" style={{ width: SIDEBAR_WIDTH, minWidth: SIDEBAR_WIDTH }}>
                          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          {deptName}
                          <span className="text-[10px] font-normal text-zinc-500 ml-1">({items.length})</span>
                        </div>
                      </div>
                      {!collapsed && items.map(eb => (
                        <div key={eb.enquiry.id} className="flex border-b border-zinc-100 hover:bg-zinc-50" style={{ height: ROW_HEIGHT }} data-testid={`gantt-row-${eb.enquiry.id}`}>
                          <div className="sticky left-0 z-10 bg-white group-hover:bg-zinc-50 border-r border-zinc-200 flex items-center px-3 gap-2 text-xs" style={{ width: SIDEBAR_WIDTH, minWidth: SIDEBAR_WIDTH }}>
                            <span className="text-zinc-400 font-mono text-[10px] shrink-0">#{eb.enquiry.enquiry_number || ''}</span>
                            <span className="font-medium text-zinc-800 truncate" title={eb.enquiry.customer_name}>{eb.enquiry.customer_name}</span>
                            <span className="text-zinc-400 truncate text-[10px]" title={eb.enquiry.fabric_type}>{eb.enquiry.style_no || eb.enquiry.fabric_type}</span>
                          </div>
                          <div className="relative flex-shrink-0" style={{ width: timelineWidth, height: ROW_HEIGHT }}>
                            {/* Subtle daily grid */}
                            {pxPerDay >= 30 && [...Array(totalDays + 1)].map((_, i) => (
                              <div key={i} className="absolute top-0 h-full border-l border-zinc-50" style={{ left: i * pxPerDay }} />
                            ))}
                            {/* Today line behind bars */}
                            {todayPx >= 0 && todayPx <= timelineWidth && (
                              <div className="absolute top-0 h-full" style={{ left: todayPx, width: 1, background: '#fca5a5', opacity: 0.5 }} />
                            )}
                            {/* Stage bars */}
                            {eb.bars.map(b => {
                              const left = diffDays(rangeStart, b.start) * pxPerDay;
                              const width = Math.max(diffDays(b.start, b.liveEnd > b.plannedEnd ? b.liveEnd : b.plannedEnd) * pxPerDay, 4);
                              return (
                                <div
                                  key={b.stage_id}
                                  className={`absolute rounded-sm border-2 ${statusBorder[b.status]} flex items-center px-1 text-[9px] font-semibold text-white overflow-hidden whitespace-nowrap shadow-sm`}
                                  style={{
                                    left, width,
                                    top: 4, height: ROW_HEIGHT - 8,
                                    background: b.color,
                                  }}
                                  title={`${b.stage_name}\n${ymd(b.start)} → ${b.completed && b.actualEnd ? ymd(b.actualEnd) : `today (planned ${ymd(b.plannedEnd)})`}\nLead: ${b.lead_time_days}d · ${b.status}${b.value ? `\nValue: ${b.value}` : ''}`}
                                  data-testid={`gantt-bar-${eb.enquiry.id}-${b.stage_id}`}
                                >
                                  {width > 50 ? b.stage_name : ''}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
