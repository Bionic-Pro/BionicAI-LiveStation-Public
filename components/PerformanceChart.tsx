
import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { PerformancePoint } from '../types';

interface PerformanceChartProps {
  data: PerformancePoint[];
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ data }) => {
  return (
    <div className="glass-card rounded-xl p-6 mt-8 h-[350px] border border-slate-800/50">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-[11px] font-black uppercase text-slate-500 tracking-[0.2em]">Growth Analytics</h3>
          <p className="text-xs text-slate-400 mt-0.5">Cumulative Profit over current period</p>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <span className="block text-[9px] font-bold text-slate-500 uppercase">Max Drawdown</span>
            <span className="text-xs font-black text-rose-400">-1.2%</span>
          </div>
          <div className="text-right">
            <span className="block text-[9px] font-bold text-slate-500 uppercase">Avg Gain</span>
            <span className="text-xs font-black text-emerald-400">+18.4%</span>
          </div>
        </div>
      </div>
      
      <div className="w-full h-[250px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} 
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#0d1117', 
                border: '1px solid #30363d', 
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#e2e8f0'
              }}
              itemStyle={{ color: '#10b981' }}
              cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '4 4' }}
              formatter={(value: number) => [`+${value}%`, 'Net P&L']}
            />
            <Area 
              type="monotone" 
              dataKey="pnl" 
              stroke="#10b981" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorPnl)" 
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PerformanceChart;
