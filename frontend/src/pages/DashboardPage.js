import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { FileText, Users, Layers, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, stagesRes] = await Promise.all([
          api.get('/dashboard'),
          api.get('/stages')
        ]);
        setData(dashRes.data);
        setStages(stagesRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse" data-testid="dashboard-loading">
        <div className="h-8 w-48 bg-zinc-200 rounded-sm" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-zinc-200 rounded-sm" />)}
        </div>
      </div>
    );
  }

  const stageMap = {};
  stages.forEach(s => { stageMap[s.id] = s; });

  const STAT_CARDS = [
    { label: 'Total Enquiries', value: data?.total_enquiries || 0, icon: FileText, color: 'text-zinc-900' },
    { label: 'Active Users', value: data?.total_users || 0, icon: Users, color: 'text-blue-700' },
    { label: 'Active Stages', value: data?.total_stages || 0, icon: Layers, color: 'text-emerald-700' },
    { label: 'Departments', value: data?.by_department?.length || 0, icon: Clock, color: 'text-amber-700' },
  ];

  const stageChartData = (data?.by_stage || []).map(s => ({
    name: s.stage_name,
    count: s.count,
    color: stageMap[s.stage_id]?.color || '#9CA3AF'
  }));

  const deptChartData = (data?.by_department || []).map(d => ({
    name: d.department,
    count: d.count
  }));

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">Overview of enquiry tracking system</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="stat-cards">
        {STAT_CARDS.map((stat, i) => (
          <Card key={i} className="bg-white border-zinc-200 rounded-sm hover:-translate-y-0.5 hover:shadow-sm transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs tracking-widest uppercase font-semibold text-zinc-400">{stat.label}</p>
                  <p className={`text-3xl font-bold mt-1 ${stat.color}`} data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>{stat.value}</p>
                </div>
                <stat.icon className="w-8 h-8 text-zinc-300" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Stage */}
        <Card className="bg-white border-zinc-200 rounded-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-zinc-900">Enquiries by Stage</CardTitle>
          </CardHeader>
          <CardContent className="pt-2" data-testid="stage-chart">
            {stageChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stageChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#71717A' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#71717A' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ border: '1px solid #E4E4E7', borderRadius: '4px', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                    {stageChartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-zinc-400 text-sm">No data yet</div>
            )}
          </CardContent>
        </Card>

        {/* By Department */}
        <Card className="bg-white border-zinc-200 rounded-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-zinc-900">Enquiries by Department</CardTitle>
          </CardHeader>
          <CardContent className="pt-2" data-testid="department-chart">
            {deptChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={deptChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#71717A' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#71717A' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ border: '1px solid #E4E4E7', borderRadius: '4px', fontSize: '12px' }} />
                  <Bar dataKey="count" fill="#09090B" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-zinc-400 text-sm">No data yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Enquiries */}
      <Card className="bg-white border-zinc-200 rounded-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-zinc-900">Recent Enquiries</CardTitle>
          <button
            onClick={() => navigate('/enquiries')}
            className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 transition-colors"
            data-testid="view-all-enquiries-link"
          >
            View all <ArrowRight className="w-3 h-3" />
          </button>
        </CardHeader>
        <CardContent data-testid="recent-enquiries">
          {(data?.recent_enquiries?.length || 0) > 0 ? (
            <div className="divide-y divide-zinc-100">
              {data.recent_enquiries.map(enq => {
                const stage = stageMap[enq.current_stage_id];
                return (
                  <div
                    key={enq.id}
                    className="flex items-center justify-between py-3 hover:bg-zinc-50 -mx-6 px-6 cursor-pointer transition-colors"
                    onClick={() => navigate(`/enquiries/${enq.id}`)}
                    data-testid={`recent-enquiry-${enq.id}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-900 truncate">{enq.customer_name}</p>
                      <p className="text-xs text-zinc-500">{enq.fabric_type} · {enq.quantity}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {stage && (
                        <Badge
                          className="rounded-sm text-xs font-medium"
                          style={{ backgroundColor: stage.color + '20', color: stage.color, border: `1px solid ${stage.color}40` }}
                        >
                          {stage.name}
                        </Badge>
                      )}
                      <span className="text-xs text-zinc-400">{enq.department}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-zinc-400 text-sm">No enquiries yet</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
