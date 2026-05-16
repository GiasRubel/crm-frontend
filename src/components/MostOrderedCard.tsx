import React from 'react';
export function MostOrderedCard() {
  const items = [
  {
    name: 'Fresh Salad Bowl',
    price: 'IDR 45.000',
    image:
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=100&h=100&fit=crop'
  },
  {
    name: 'Chicken Noodles',
    price: 'IDR 75.000',
    image:
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=100&h=100&fit=crop'
  },
  {
    name: 'Smoothie Fruits',
    price: 'IDR 45.000',
    image:
    'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=100&h=100&fit=crop'
  },
  {
    name: 'Hot Chicken Wings',
    price: 'IDR 45.000',
    image:
    'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=100&h=100&fit=crop'
  }];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm h-full flex flex-col">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-800">Most Ordered Food</h3>
        <p className="text-xs text-gray-400 mt-1">
          Adipiscing elit, sed do eiusmod tempor
        </p>
      </div>

      <div className="flex-1 flex flex-col justify-between">
        {items.map((item, index) =>
        <div
          key={index}
          className={`flex items-center justify-between py-4 ${index !== items.length - 1 ? 'border-b border-gray-100' : ''}`}>
          
            <div className="flex items-center gap-4">
              <img
              src={item.image}
              alt={item.name}
              className="w-10 h-10 rounded-full object-cover shadow-sm" />
            
              <span className="text-sm font-medium text-gray-700">
                {item.name}
              </span>
            </div>
            <span className="text-sm text-gray-500 font-medium">
              {item.price}
            </span>
          </div>
        )}
      </div>
    </div>);

}