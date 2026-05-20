"use client";

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell } from
'recharts';
import { ArrowUp } from 'lucide-react';
const data = [
{
  name: '01',
  last6days: 120,
  lastWeek: 90
},
{
  name: '02',
  last6days: 80,
  lastWeek: 110
},
{
  name: '03',
  last6days: 140,
  lastWeek: 100
},
{
  name: '04',
  last6days: 90,
  lastWeek: 120
},
{
  name: '05',
  last6days: 160,
  lastWeek: 80
},
{
  name: '06',
  last6days: 200,
  lastWeek: 130
},
{
  name: '07',
  last6days: 130,
  lastWeek: 110
},
{
  name: '08',
  last6days: 110,
  lastWeek: 90
},
{
  name: '09',
  last6days: 150,
  lastWeek: 120
},
{
  name: '10',
  last6days: 95,
  lastWeek: 110
},
{
  name: '11',
  last6days: 170,
  lastWeek: 100
},
{
  name: '12',
  last6days: 140,
  lastWeek: 120
}];

export function RevenueCard() {
  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm h-full flex flex-col animate-pulse">
        <div className="flex justify-between items-start mb-6">
          <div className="space-y-2 w-full">
            <div className="h-6 bg-slate-200 rounded w-1/4"></div>
            <div className="h-8 bg-slate-200 rounded w-1/2"></div>
            <div className="h-4 bg-slate-200 rounded w-1/3"></div>
          </div>
        </div>
        <div className="flex-1 bg-slate-100 rounded-xl min-h-[250px]"></div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm h-full flex flex-col">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-1">Revenue</h3>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-bold text-gray-900">
              IDR 7.852.000
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="flex items-center text-[#4CAF50] font-medium">
              <ArrowUp size={14} className="mr-0.5" />
              2.1%
            </span>
            <span className="text-gray-400">vs last week</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Sales from 1-12 Dec, 2020
          </p>
        </div>
        <button className="text-[#3F51B5] text-sm font-medium px-4 py-1.5 border border-[#3F51B5]/30 rounded-lg hover:bg-[#3F51B5]/5 transition-colors">
          View Report
        </button>
      </div>

      <div className="flex-1 min-h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 10,
              right: 0,
              left: -20,
              bottom: 0
            }}
            barGap={8}>
            
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#F0F0F0" />
            
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
              cursor={{
                fill: '#F4F5F7'
              }}
              contentStyle={{
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }} />
            
            <Bar
              dataKey="last6days"
              fill="#3F51B5"
              radius={[4, 4, 0, 0]}
              barSize={6} />
            
            <Bar
              dataKey="lastWeek"
              fill="#E0E0E0"
              radius={[4, 4, 0, 0]}
              barSize={6} />
            
          </BarChart>
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