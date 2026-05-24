import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function UserPerformance() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/reports/user-performance').then(res => { setData(res.data); setLoading(false); }).catch(() => setLoading(false)); }, []);

  const chartData = data.filter(u => u.total_assigned > 0 || u.changes_made > 0).map(u => ({ name: u.user_name, assigned: u.total_assigned, changes: u.changes_made }));

  return (
    <div className="space-y-4" data-testid="user-performance-report">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border-zinc-200 rounded-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-zinc-900">Assigned vs Changes Made</CardTitle></CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" /><XAxis dataKey="name" tick={{ fontSize: 11, fill: '#71717A' }} /><YAxis tick={{ fontSize: 11, fill: '#71717A' }} allowDecimals={false} /><Tooltip contentStyle={{ border: '1px solid #E4E4E7', borderRadius: '4px', fontSize: '12px' }} /><Legend /><Bar dataKey="assigned" fill="#09090B" radius={[2, 2, 0, 0]} /><Bar dataKey="changes" fill="#22C55E" radius={[2, 2, 0, 0]} /></BarChart>
              </ResponsiveContainer>
            ) : <div className="h-[300px] flex items-center justify-center text-zinc-400 text-sm">No data</div>}
          </CardContent>
        </Card>
        <Card className="bg-white border-zinc-200 rounded-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-zinc-900">Performance Table</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow className="bg-zinc-50">
                <TableHead className="text-xs font-semibold uppercase text-zinc-500">User</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-zinc-500">Dept</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-zinc-500">Assigned</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-zinc-500">Changes</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loading ? [...Array(3)].map((_, i) => <TableRow key={i}>{[...Array(4)].map((_, j) => <TableCell key={j}><div className="h-4 bg-zinc-100 rounded-sm animate-pulse" /></TableCell>)}</TableRow>) :
                data.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-zinc-400">No data</TableCell></TableRow> :
                data.map(u => (
                  <TableRow key={u.user_id} className="hover:bg-zinc-50" data-testid={`user-perf-row-${u.user_id}`}>
                    <TableCell className="font-medium text-zinc-900">{u.user_name}</TableCell>
                    <TableCell className="text-zinc-600">{u.department}</TableCell>
                    <TableCell className="text-zinc-600 font-mono">{u.total_assigned}</TableCell>
                    <TableCell className="text-zinc-600 font-mono">{u.changes_made}</TableCell>
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
