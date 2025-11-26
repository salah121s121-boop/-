import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PingDataPoint } from '../types';

interface PingChartProps {
  data: PingDataPoint[];
}

const PingChart: React.FC<PingChartProps> = ({ data }) => {
  return (
    <div className="w-full h-48 bg-gray-900 rounded-lg p-2 border border-gray-700 shadow-inner">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{
            top: 5,
            right: 0,
            left: -20,
            bottom: 0,
          }}
        >
          <defs>
            <linearGradient id="colorMs" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
          <XAxis 
            dataKey="time" 
            tick={{ fill: '#9CA3AF', fontSize: 10 }} 
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            tick={{ fill: '#9CA3AF', fontSize: 10 }} 
            tickLine={false}
            axisLine={false}
            domain={[0, (dataMax: number) => Math.max(dataMax + 20, 100)]}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
            itemStyle={{ color: '#10B981' }}
            labelStyle={{ display: 'none' }}
            formatter={(value: number) => [`${value} ms`, 'Ping']}
          />
          <Area 
            type="monotone" 
            dataKey="ms" 
            stroke="#10B981" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorMs)" 
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PingChart;
