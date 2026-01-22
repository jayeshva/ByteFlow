import React, { useEffect, useState } from 'react';
import { TrendingUp, Users, MessageCircle, ArrowUpRight, ArrowDownRight, Zap } from 'lucide-react';
import { AnalyticsApiService } from '../../services/api';

const AnalyticsView: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const data = await AnalyticsApiService.getOverview();
        setAnalytics(data);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const StatCard = ({ icon: Icon, label, value, trend, color }: any) => (
    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300">
      <div className="flex justify-between items-start mb-6">
        <div className={`p-4 rounded-2xl ${color} bg-opacity-10 text-${color}`}>
          <Icon size={24} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-[10px] font-black ${trend >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{label}</p>
      <p className="text-3xl font-black text-gray-900">{value}</p>
    </div>
  );

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-gray-900">Performance Hub</h1>
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Growth analytics for your creator profile</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={MessageCircle} label="Total DMs Sent" value={analytics?.totalExecutions || 0} trend={12} color="indigo-600" />
        <StatCard icon={TrendingUp} label="Conv. Rate" value={`${analytics?.overallCtr || 0}%`} trend={5} color="green-600" />
        <StatCard icon={Users} label="Total Automations" value={analytics?.totalAutomations || 0} color="pink-600" />
        <StatCard icon={Zap} label="Total Clicks" value={analytics?.totalClicks || 0} trend={22} color="orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-lg font-black text-gray-900">Automation Performance</h3>
          </div>
          <div className="space-y-6">
            {(analytics?.automations || []).slice(0, 5).map((a: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-black text-gray-800 tracking-tight">{a.flowName}</span>
                </div>
                <div className="flex items-center space-x-8">
                  <span className="text-xs font-bold text-gray-500">{a.clicks} Clicks</span>
                  <span className="text-xs font-black text-indigo-600">{a.ctr}% CTR</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
          <h3 className="text-lg font-black text-gray-900 mb-8">System Engagement</h3>
          <div className="h-64 flex items-end justify-between space-x-2">
            {[40, 70, 50, 90, 60, 80, 100].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center space-y-3 group">
                <div className="w-full bg-indigo-50 rounded-t-xl group-hover:bg-indigo-100 transition-colors relative" style={{ height: `${h}%` }}>
                  <div className="absolute inset-0 bg-indigo-600 rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity" style={{ height: '20%' }}></div>
                </div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Day {i+1}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView;
