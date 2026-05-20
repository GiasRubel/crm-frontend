"use client";

import React from 'react';
import { RevenueCard } from '../components/RevenueCard';
import { OrderTimeCard } from '../components/OrderTimeCard';
import { RatingCard } from '../components/RatingCard';
import { MostOrderedCard } from '../components/MostOrderedCard';
import { OrderCard } from '../components/OrderCard';
export function Dashboard() {
  return (
    <main className="flex-1 p-6 lg:p-8 overflow-y-auto bg-[#F4F5F7] min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        </div>

        {/* Top Row: Revenue (2/3) + Order Time (1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2 h-[400px]">
            <RevenueCard />
          </div>
          <div className="lg:col-span-1 h-[400px]">
            <OrderTimeCard />
          </div>
        </div>

        {/* Bottom Row: Rating + Most Ordered + Order (Equal width) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="h-[400px]">
            <RatingCard />
          </div>
          <div className="h-[400px]">
            <MostOrderedCard />
          </div>
          <div className="h-[400px]">
            <OrderCard />
          </div>
        </div>
      </div>
    </main>);

}