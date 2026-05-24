import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Filter, Users, Layers, Building2, ClipboardList, GanttChart } from 'lucide-react';
import GanttView from './GanttView';
import EnquiryReport from './reports/EnquiryReport';
import StageSummary from './reports/StageSummary';
import UserPerformance from './reports/UserPerformance';
import DepartmentReport from './reports/DepartmentReport';
import UserStagesReport from './reports/UserStagesReport';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('enquiries');
  const [stages, setStages] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    Promise.all([api.get('/stages'), api.get('/users'), api.get('/departments')]).then(([sRes, uRes, dRes]) => {
      setStages(sRes.data);
      setUsers(uRes.data);
      setDepartments(dRes.data);
    });
  }, []);

  const stageMap = {};
  stages.forEach(s => { stageMap[s.id] = s; });
  const userMap = {};
  users.forEach(u => { userMap[u._id] = u; });

  return (
    <div className="space-y-6" data-testid="reports-page">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">Reports</h1>
        <p className="text-sm text-zinc-500 mt-1">Analytics and insights</p>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="bg-zinc-100 border border-zinc-200 rounded-sm inline-flex min-w-max" data-testid="report-tabs">
            <TabsTrigger value="enquiries" className="rounded-sm data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm" data-testid="tab-enquiries"><Filter className="w-3 h-3 mr-1.5 hidden sm:block" /> Enquiries</TabsTrigger>
            <TabsTrigger value="stages" className="rounded-sm data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm" data-testid="tab-stages"><Layers className="w-3 h-3 mr-1.5 hidden sm:block" /> Stages</TabsTrigger>
            <TabsTrigger value="users" className="rounded-sm data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm" data-testid="tab-users"><Users className="w-3 h-3 mr-1.5 hidden sm:block" /> Users</TabsTrigger>
            <TabsTrigger value="departments" className="rounded-sm data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm" data-testid="tab-departments"><Building2 className="w-3 h-3 mr-1.5 hidden sm:block" /> Dept</TabsTrigger>
            <TabsTrigger value="pending" className="rounded-sm data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm" data-testid="tab-pending"><ClipboardList className="w-3 h-3 mr-1.5 hidden sm:block" /> User Stages</TabsTrigger>
            <TabsTrigger value="gantt" className="rounded-sm data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm" data-testid="tab-gantt"><GanttChart className="w-3 h-3 mr-1.5 hidden sm:block" /> Gantt</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="enquiries"><EnquiryReport stages={stages} users={users} stageMap={stageMap} userMap={userMap} departments={departments} /></TabsContent>
        <TabsContent value="stages"><StageSummary /></TabsContent>
        <TabsContent value="users"><UserPerformance /></TabsContent>
        <TabsContent value="departments"><DepartmentReport /></TabsContent>
        <TabsContent value="pending"><UserStagesReport stages={stages} users={users} departments={departments} /></TabsContent>
        <TabsContent value="gantt"><GanttView stages={stages} departments={departments} stageMap={stageMap} /></TabsContent>
      </Tabs>
    </div>
  );
}
