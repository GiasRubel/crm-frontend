import React from 'react';
export function RatingCard() {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm h-full flex flex-col overflow-hidden">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-800">Your Rating</h3>
        <p className="text-xs text-gray-400 mt-1">
          Lorem ipsum dolor sit amet, consectetur
        </p>
      </div>

      <div className="flex-1 relative min-h-[240px] flex items-center justify-center">
        {/* Container for circles to center them */}
        <div className="relative w-[280px] h-[240px]">
          {/* Hygiene - Top Left */}
          <div className="absolute top-0 left-0 w-36 h-36 rounded-full bg-[#7C4DFF] bg-opacity-90 flex flex-col items-center justify-center text-white shadow-lg z-10 border-4 border-white">
            <span className="text-3xl font-bold">85%</span>
            <span className="text-xs opacity-90">Hygiene</span>
          </div>

          {/* Packaging - Bottom Left */}
          <div className="absolute bottom-0 left-4 w-36 h-36 rounded-full bg-[#00BCD4] bg-opacity-90 flex flex-col items-center justify-center text-white shadow-lg z-20 border-4 border-white">
            <span className="text-3xl font-bold">92%</span>
            <span className="text-xs opacity-90">Packaging</span>
          </div>

          {/* Food Taste - Right (Largest) */}
          <div className="absolute top-12 right-0 w-40 h-40 rounded-full bg-[#FF9800] flex flex-col items-center justify-center text-white shadow-xl z-30 border-4 border-white">
            <span className="text-4xl font-bold">85%</span>
            <span className="text-sm opacity-90">Food Taste</span>
          </div>
        </div>
      </div>
    </div>);

}