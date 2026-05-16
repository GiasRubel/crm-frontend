import React from 'react';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowDown } from 'lucide-react';
const data = [
{
  name: '01',
  last6days: 30,
  lastWeek: 50
},
{
  name: '02',
  last6days: 45,
  lastWeek: 35
},
{
  name: '03',
  last6days: 35,
  lastWeek: 55
},
{
  name: '04',
  last6days: 55,
  lastWeek: 40
},
{
  name: '05',
  last6days: 40,
  lastWeek: 60
},
{
  name: '06',
  last6days: 70,
  lastWeek: 45
}];

export function OrderCard() {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm h-full flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-1">Order</h3>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-bold text-gray-900">2.568</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="flex items-center text-[#F44336] font-medium">
              <ArrowDown size={14} className="mr-0.5" />
              2.1%
            </span>
            <span className="text-gray-400">vs last week</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">Sales from 1-6 Dec, 2020</p>
        </div>
        <button className="text-[#3F51B5] text-sm font-medium px-4 py-1.5 border border-[#3F51B5]/30 rounded-lg hover:bg-[#3F51B5]/5 transition-colors">
          View Report
        </button>
      </div>

      <div className="flex-1 min-h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{
              top: 10,
              right: 10,
              left: -20,
              bottom: 0
            }}>
            
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{
                fill: '#9CA3AF',
                fontSize: 12
              }}
              dy={10} />
            
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }} />
            
            <Line
              type="linear"
              dataKey="last6days"
              stroke="#3F51B5"
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 4
              }} />
            
            <Line
              type="linear"
              dataKey="lastWeek"
              stroke="#E0E0E0"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false} />
            
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-6 mt-4 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#3F51B5]"></span>
          Last 6 days
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#E0E0E0]"></span>
          Last Week
        </div>
      </div>
    </div>);

}