"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from "@/providers/keycloak-provider";
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  Star,
  Settings,
  CreditCard,
  HelpCircle,
  Users2,
  UsersRound,
  UserCheck,
  TrendingUp,
  Target,
  Activity,
  TicketCheck,
  Building2,
  BookUser,
  Zap,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Shield,
  LogOut
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const [isCrmOpen, setIsCrmOpen] = useState(true);
  const { logout } = useAuth();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard', href: '/dashboard' },
    { icon: ShoppingBag, label: 'Food Order', id: 'food-order', href: '/food-order' },
    { icon: UtensilsCrossed, label: 'Manage Menu', id: 'manage-menu', href: '/manage-menu' },
    { icon: Star, label: 'Customer Review', id: 'reviews', href: '/reviews' }
  ];

  const crmItems = [
    { icon: UserCheck, label: 'Customers', id: 'customers', href: '/customers' },
    { icon: Building2, label: 'Accounts', id: 'accounts', href: '/accounts' },
    { icon: BookUser, label: 'Contacts', id: 'contacts', href: '/contacts' },
    { icon: UsersRound, label: 'Teams', id: 'teams', href: '/teams' },
    { icon: TrendingUp, label: 'Leads', id: 'leads', href: '/leads' },
    { icon: Target, label: 'Opportunities', id: 'opportunities', href: '/opportunities' },
    { icon: Activity, label: 'Activities', id: 'activities', href: '/activities' },
    { icon: Zap, label: 'Automation', id: 'automations', href: '/automations' },
    { icon: TicketCheck, label: 'Tickets', id: 'tickets', href: '/tickets' },
    { icon: BookOpen, label: 'Knowledge Base', id: 'kb', href: '/kb' }
  ];

  const otherItems = [
    { icon: Settings, label: 'Settings', id: 'settings', href: '/settings' },
    { icon: CreditCard, label: 'Payment', id: 'payment', href: '/payment' },
    { icon: Shield, label: 'Users', id: 'users', href: '/users' },
    { icon: HelpCircle, label: 'Help', id: 'help', href: '/help' }
  ];

  const isCrmActive = pathname ? crmItems.some((item) => pathname.startsWith(item.href)) : false;

  const SidebarButton = ({ item, isActive, onClick, className }: any) => (
    <Link href={item.href} className="block w-full">
      <Button
        variant={isActive ? "secondary" : "ghost"}
        className={cn(
          "w-full justify-start gap-3 h-11 px-4 rounded-xl transition-all duration-200",
          isActive ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800" : "text-slate-500 hover:bg-slate-50",
          className
        )}
      >
        <item.icon size={18} className={cn(isActive ? "text-indigo-600" : "text-slate-400")} />
        <span className="font-medium">{item.label}</span>
      </Button>
    </Link>
  );

  return (
    <nav className="w-64 bg-white h-screen fixed left-0 top-0 border-r border-slate-100 hidden lg:flex flex-col p-6 z-10 overflow-y-auto">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-3 mb-10 px-2 flex-shrink-0 group cursor-pointer">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform">
          G
        </div>
        <span className="text-slate-800 font-bold text-xl tracking-tight">
          GOODFOOD
        </span>
      </Link>

      {/* Menu Section */}
      <div className="space-y-6 flex-1">
        <div>
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[2px] mb-4 px-4">
            Main Menu
          </h3>
          <div className="space-y-1">
            <SidebarButton 
              item={menuItems[0]} 
              isActive={pathname === menuItems[0].href} 
            />

            {/* CRM Group */}
            <div className="space-y-1">
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-between gap-3 h-11 px-4 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-600",
                  isCrmActive && "text-indigo-700"
                )}
                onClick={() => setIsCrmOpen(!isCrmOpen)}
              >
                <div className="flex items-center gap-3">
                  <Users2 size={18} className={isCrmActive ? "text-indigo-600" : "text-slate-400"} />
                  <span className="font-medium">CRM</span>
                </div>
                {isCrmOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </Button>

              {isCrmOpen && (
                <div className="ml-4 pl-4 border-l border-slate-100 space-y-1 mt-1">
                  {crmItems.map((item) => (
                    <SidebarButton
                      key={item.id}
                      item={item}
                      isActive={pathname === item.href}
                      className="h-10 text-sm"
                    />
                  ))}
                </div>
              )}
            </div>

            {menuItems.slice(1).map((item) => (
              <SidebarButton
                key={item.id}
                item={item}
                isActive={pathname === item.href}
              />
            ))}
          </div>
        </div>

        <Separator className="bg-slate-50" />

        {/* Others Section */}
        <div>
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[2px] mb-4 px-4">
            System
          </h3>
          <div className="space-y-1">
            {otherItems.map((item) => (
              <SidebarButton
                key={item.id}
                item={item}
                isActive={pathname === item.href}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Logout */}
      <div className="mt-auto pt-6">
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 h-11 px-4 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-xl"
          onClick={logout}
        >
          <LogOut size={18} />
          <span className="font-medium">Logout</span>
        </Button>
      </div>
    </nav>
  );
}