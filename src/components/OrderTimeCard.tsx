import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
const data = [
{
  name: 'Afternoon',
  value: 40,
  color: '#3F51B5'
},
{
  name: 'Evening',
  value: 32,
  color: '#9FA8DA'
},
{
  name: 'Morning',
  value: 28,
  color: '#E8EAF6'
}];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#2D3748] text-white p-3 rounded-lg shadow-lg text-xs">
        <p className="font-bold mb-1">{payload[0].name}</p>
        <p className="text-gray-300 mb-1">1pm - 4pm</p>
        <p className="font-bold text-lg">1.890 orders</p>
      </div>);

  }
  return null;
};
export function OrderTimeCard() {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm h-full flex flex-col">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="text-lg font-bold text-gray-800">Order Time</h3>
          <p className="text-xs text-gray-400 mt-1">From 1-6 Dec, 2020</p>
        </div>
        <button className="text-[#3F51B5] text-sm font-medium px-4 py-1.5 border border-[#3F51B5]/30 rounded-lg hover:bg-[#3F51B5]/5 transition-colors">
          View Report
        </button>
      </div>

      <div className="flex-1 min-h-[200px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={0}
              dataKey="value"
              startAngle={90}
              endAngle={-270}>
              
              {data.map((entry, index) =>
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                strokeWidth={0} />

              )}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Text Overlay (Optional, visually similar to donut hole) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Empty center */}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4">
        {data.map((item) =>
        <div
          key={item.name}
          className="flex flex-col items-center text-center">
          
            <div className="flex items-center gap-1.5 mb-1">
              <span
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: item.color
              }}>
            </span>
              <span className="text-xs text-gray-500">{item.name}</span>
            </div>
            <span className="text-sm font-bold text-gray-700">
              {item.value}%
            </span>
          </div>
        )}
      </div>
    </div>);

}