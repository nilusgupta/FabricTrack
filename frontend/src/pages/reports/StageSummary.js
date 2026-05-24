import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function StageSummary() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/reports/stage-summary').then(res => { setData(res.data); setLoading(false); }).catch(() => setLoading(false)); }, []);

  const chartData = data.map(s => ({ name: s.stage_name, count: s.total_enquiries, filled: s.filled_count, color: s.color }));

  return (
    <div className="space-y-4" data-testid="stage-summary-report">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border-zinc-200 rounded-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-zinc-900">Enquiries per Stage</CardTitle></CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#71717A' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#71717A' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ border: '1px solid #E4E4E7', borderRadius: '4px', fontSize: '12px' }} />
                  <Bar dataKey="count" radius={[2, 2, 0, 0]}>{chartData.map(entry => <Cell key={entry.name} fill={entry.color} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-[300px] flex items-center justify-center text-zinc-400 text-sm">No data</div>}
          </CardContent>
        </Card>
        <Card className="bg-white border-zinc-200 rounded-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-zinc-900">Stage Details</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow className="bg-zinc-50">
                <TableHead className="text-xs font-semibold uppercase text-zinc-500">Stage</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-zinc-500">Type</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-zinc-500">Required</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-zinc-500">Total</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-zinc-500">Filled</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loading ? [...Array(3)].map((_, i) => <TableRow key={i}>{[...Array(5)].map((_, j) => <TableCell key={j}><div className="h-4 bg-zinc-100 rounded-sm animate-pulse" /></TableCell>)}</TableRow>) :
                data.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-zinc-400">No data</TableCell></TableRow> :
                data.map(s => (
                  <TableRow key={s.stage_id} className="hover:bg-zinc-50" data-testid={`stage-summary-row-${s.stage_id}`}>
                    <TableCell><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} /><span className="font-medium text-zinc-900 text-sm">{s.stage_name}</span></div></TableCell>
                    <TableCell><Badge className="rounded-sm text-xs bg-zinc-100 text-zinc-600">{s.input_type}</Badge></TableCell>
                    <TableCell><Badge className={`rounded-sm text-xs ${s.is_mandatory ? 'bg-red-50 text-red-600' : 'bg-zinc-50 text-zinc-400'}`}>{s.is_mandatory ? 'Yes' : 'No'}</Badge></TableCell>
                    <TableCell className="font-mono text-zinc-600">{s.total_enquiries}</TableCell>
                    <TableCell className="font-mono text-zinc-600">{s.filled_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
