import React, { useEffect, useState, useRef } from 'react';
import { Search, Bell, ChevronDown, User, Settings, LogOut } from 'lucide-react';
interface HeaderProps {
  currentPage?: string;
  setCurrentPage?: (page: string) => void;
}
export function Header({ currentPage, setCurrentPage }: HeaderProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target as Node))
      {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  return (
    <header className="bg-white h-20 px-8 flex items-center justify-between sticky top-0 z-20 shadow-sm lg:shadow-none">
      {/* Search Bar */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <input
            type="text"
            placeholder="Search"
            className="w-full bg-[#F4F5F7] text-gray-600 placeholder-gray-400 rounded-full py-2.5 pl-6 pr-12 focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 transition-all" />
          
          <Search
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
            size={18} />
          
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-6 ml-4">
        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <div
            className="flex items-center gap-3 cursor-pointer p-1 rounded-lg hover:bg-gray-50 transition-colors"
            onClick={() => setIsProfileOpen(!isProfileOpen)}>
            
            <div className="w-10 h-10 bg-[#FFECB3] rounded-full flex items-center justify-center text-xl">
              🍔
            </div>
            <div className="hidden md:flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                Delicious Burger
              </span>
              <ChevronDown
                size={16}
                className={`text-gray-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
              
            </div>
          </div>

          {/* Dropdown Menu */}
          {isProfileOpen &&
          <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-3 border-b border-gray-50">
                <p className="text-sm font-bold text-gray-900">
                  Delicious Burger
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Administrator</p>
              </div>

              <div className="py-1">
                <button
                onClick={() => {
                  setCurrentPage?.('accounts');
                  setIsProfileOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                
                  <User size={16} className="text-gray-400" />
                  Profile
                </button>
                <button
                onClick={() => {
                  setCurrentPage?.('settings');
                  setIsProfileOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                
                  <Settings size={16} className="text-gray-400" />
                  Settings
                </button>
              </div>

              <div className="border-t border-gray-50 py-1">
                <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </div>
          }
        </div>

        {/* Notification */}
        <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
      </div>
    </header>);

}