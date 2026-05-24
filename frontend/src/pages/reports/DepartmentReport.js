import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#09090B', '#3B82F6', '#22C55E', '#EAB308', '#EF4444', '#8B5CF6', '#EC4899'];

export default function DepartmentReport() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/reports/department').then(res => { setData(res.data); setLoading(false); }).catch(() => setLoading(false)); }, []);

  const pieData = data.map((d, i) => ({ name: d.department, value: d.total, fill: COLORS[i % COLORS.length] }));

  return (
    <div className="space-y-4" data-testid="department-report">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border-zinc-200 rounded-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-zinc-900">Enquiries by Department</CardTitle></CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart><Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>{pieData.map(entry => <Cell key={entry.name} fill={entry.fill} />)}</Pie><Tooltip contentStyle={{ border: '1px solid #E4E4E7', borderRadius: '4px', fontSize: '12px' }} /></PieChart>
              </ResponsiveContainer>
            ) : <div className="h-[300px] flex items-center justify-center text-zinc-400 text-sm">No data</div>}
          </CardContent>
        </Card>
        <Card className="bg-white border-zinc-200 rounded-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-zinc-900">Department Breakdown</CardTitle></CardHeader>
          <CardContent>
            {loading ? <div className="animate-pulse space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-zinc-100 rounded-sm" />)}</div> :
            data.length === 0 ? <div className="py-8 text-center text-zinc-400 text-sm">No data</div> :
            <div className="space-y-4">
              {data.map(dept => (
                <div key={dept.department} className="space-y-2" data-testid={`dept-breakdown-${dept.department}`}>
                  <div className="flex items-center justify-between"><span className="text-sm font-medium text-zinc-900">{dept.department}</span><span className="text-xs text-zinc-500 font-mono">{dept.total} total</span></div>
                  <div className="flex gap-1 flex-wrap">{dept.stage_breakdown?.map(sb => sb.count > 0 && <Badge key={sb.stage_id} className="rounded-sm text-xs" style={{ backgroundColor: sb.color + '20', color: sb.color }}>{sb.stage_name}: {sb.count}</Badge>)}</div>
                </div>
              ))}
            </div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
