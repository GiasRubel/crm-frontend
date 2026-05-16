import React, { useState } from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  Star,
  Settings,
  CreditCard,
  User,
  HelpCircle,
  Users2,
  UserCheck,
  TrendingUp,
  Target,
  Activity,
  TicketCheck,
  ChevronDown,
  ChevronRight,
  Shield } from
'lucide-react';
interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
}
export function Sidebar({ currentPage, setCurrentPage }: SidebarProps) {
  const [isCrmOpen, setIsCrmOpen] = useState(true);
  const menuItems = [
  {
    icon: LayoutDashboard,
    label: 'Dashboard',
    id: 'dashboard'
  },
  {
    icon: ShoppingBag,
    label: 'Food Order',
    id: 'food-order'
  },
  {
    icon: UtensilsCrossed,
    label: 'Manage Menu',
    id: 'manage-menu'
  },
  {
    icon: Star,
    label: 'Customer Review',
    id: 'reviews'
  }];

  const crmItems = [
  {
    icon: UserCheck,
    label: 'Customers',
    id: 'customers'
  },
  {
    icon: TrendingUp,
    label: 'Leads',
    id: 'leads'
  },
  {
    icon: Target,
    label: 'Opportunities',
    id: 'opportunities'
  },
  {
    icon: Activity,
    label: 'Activities',
    id: 'activities'
  },
  {
    icon: TicketCheck,
    label: 'Tickets',
    id: 'tickets'
  }];

  const otherItems = [
  {
    icon: Settings,
    label: 'Settings',
    id: 'settings'
  },
  {
    icon: CreditCard,
    label: 'Payment',
    id: 'payment'
  },
  {
    icon: User,
    label: 'Accounts',
    id: 'accounts'
  },
  {
    icon: Shield,
    label: 'Users',
    id: 'users'
  },
  {
    icon: HelpCircle,
    label: 'Help',
    id: 'help'
  }];

  const isCrmActive = crmItems.some((item) => item.id === currentPage);
  return (
    <nav className="w-64 bg-[#F4F5F7] h-screen fixed left-0 top-0 border-r border-gray-200 hidden lg:flex flex-col p-6 z-10 overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10 px-2 flex-shrink-0">
        <div className="w-8 h-8 bg-[#3F51B5] rounded-full flex items-center justify-center text-white font-bold text-lg">
          G
        </div>
        <span className="text-[#3F51B5] font-bold text-xl tracking-tight">
          GOODFOOD
        </span>
      </div>

      {/* Menu Section */}
      <div className="mb-8">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-4">
          Menu
        </h3>
        <ul className="space-y-1">
          {/* Dashboard */}
          <li>
            <button
              onClick={() => setCurrentPage('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${currentPage === 'dashboard' ? 'bg-[#EEF0FB] text-[#3F51B5]' : 'text-gray-500 hover:bg-gray-100'}`}>
              
              <LayoutDashboard
                size={18}
                className={
                currentPage === 'dashboard' ?
                'text-[#3F51B5]' :
                'text-gray-400'
                } />
              
              Dashboard
            </button>
          </li>

          {/* CRM Group */}
          <li>
            <button
              onClick={() => setIsCrmOpen(!isCrmOpen)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${isCrmActive ? 'text-[#3F51B5]' : 'text-gray-500 hover:bg-gray-100'}`}>
              
              <div className="flex items-center gap-3">
                <Users2
                  size={18}
                  className={isCrmActive ? 'text-[#3F51B5]' : 'text-gray-400'} />
                
                CRM
              </div>
              {isCrmOpen ?
              <ChevronDown size={16} /> :

              <ChevronRight size={16} />
              }
            </button>

            {/* CRM Submenu */}
            {isCrmOpen &&
            <ul className="mt-1 ml-4 space-y-1 border-l-2 border-gray-100 pl-2">
                {crmItems.map((item) =>
              <li key={item.id}>
                    <button
                  onClick={() => setCurrentPage(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${currentPage === item.id ? 'bg-[#EEF0FB] text-[#3F51B5]' : 'text-gray-500 hover:bg-gray-50'}`}>
                  
                      <item.icon
                    size={16}
                    className={
                    currentPage === item.id ?
                    'text-[#3F51B5]' :
                    'text-gray-400'
                    } />
                  
                      {item.label}
                    </button>
                  </li>
              )}
              </ul>
            }
          </li>

          {/* Other Menu Items */}
          {menuItems.slice(1).map((item) =>
          <li key={item.id}>
              <button
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${currentPage === item.id ? 'bg-[#EEF0FB] text-[#3F51B5]' : 'text-gray-500 hover:bg-gray-100'}`}>
              
                <item.icon
                size={18}
                className={
                currentPage === item.id ? 'text-[#3F51B5]' : 'text-gray-400'
                } />
              
                {item.label}
              </button>
            </li>
          )}
        </ul>
      </div>

      {/* Others Section */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-4">
          Others
        </h3>
        <ul className="space-y-1">
          {otherItems.map((item) =>
          <li key={item.id}>
              <button
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${currentPage === item.id ? 'bg-[#EEF0FB] text-[#3F51B5]' : 'text-gray-500 hover:bg-gray-100'}`}>
              
                <item.icon
                size={18}
                className={
                currentPage === item.id ? 'text-[#3F51B5]' : 'text-gray-400'
                } />
              
                {item.label}
              </button>
            </li>
          )}
        </ul>
      </div>
    </nav>);

}