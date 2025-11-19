import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Lead, LeadStatus } from '../types';
import { ArrowUpRight, DollarSign, Users, Activity } from 'lucide-react';

interface DashboardProps {
  leads: Lead[];
}

const COLORS = ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1'];

export const Dashboard: React.FC<DashboardProps> = ({ leads }) => {
  const metrics = useMemo(() => {
    const total = leads.length;
    const won = leads.filter(l => l.status === LeadStatus.CLOSED);
    const revenue = won.reduce((acc, curr) => acc + curr.value, 0);
    const conversionRate = total > 0 ? ((won.length / total) * 100).toFixed(1) : '0';

    const statusCounts = Object.values(LeadStatus).map(status => ({
      name: status,
      value: leads.filter(l => l.status === status).length
    }));

    return { total, revenue, conversionRate, statusCounts };
  }, [leads]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Leads" 
          value={metrics.total.toString()} 
          icon={<Users className="text-slate-600" size={20} />} 
          trend="Synced from Sheet"
        />
        <StatCard 
          title="Revenue Closed" 
          value={formatCurrency(metrics.revenue)} 
          icon={<DollarSign className="text-emerald-600" size={20} />} 
          trend="Based on Closed leads"
          accent="text-emerald-600"
        />
        <StatCard 
          title="Conversion Rate" 
          value={`${metrics.conversionRate}%`} 
          icon={<Activity className="text-indigo-600" size={20} />} 
          trend="Leads to Closed"
        />
        <StatCard 
          title="Avg. Deal Size" 
          value={formatCurrency(metrics.total > 0 ? Math.floor(metrics.revenue / (leads.filter(l => l.status === LeadStatus.CLOSED).length || 1)) : 0)} 
          icon={<ArrowUpRight className="text-slate-600" size={20} />} 
          trend="INR"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Pipeline Velocity</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.statusCounts} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" tick={{fontSize: 10}} />
                <YAxis dataKey="name" type="category" tick={{fontSize: 11, fill: '#64748b'}} width={100} stroke="transparent" />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                  cursor={{fill: '#f8fafc'}}
                />
                <Bar dataKey="value" fill="#0f172a" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Lead Distribution</h3>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.statusCounts}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {metrics.statusCounts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-6 text-xs font-medium text-slate-500">
             {metrics.statusCounts.filter(x => x.value > 0).map((entry, index) => (
               <div key={entry.name} className="flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                 <span>{entry.name}</span>
                 <span className="text-slate-900">({entry.value})</span>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, trend, accent = "text-slate-900" }: { title: string; value: string; icon: React.ReactNode; trend: string; accent?: string }) => (
  <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col justify-between transition-all hover:shadow-md">
    <div className="flex justify-between items-start mb-4">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
      <div className="p-2 bg-slate-50 rounded-lg">
        {icon}
      </div>
    </div>
    <div>
      <h4 className={`text-3xl font-bold ${accent} tracking-tight`}>{value}</h4>
      <span className="text-[10px] font-medium text-slate-400 mt-2 block">{trend}</span>
    </div>
  </div>
);