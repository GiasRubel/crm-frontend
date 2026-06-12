"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import { Search, Bell, User, Settings, LogOut } from 'lucide-react';
import { useAuth } from "@/providers/keycloak-provider";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/customers': 'Customers',
  '/leads': 'Leads',
  '/opportunities': 'Opportunities',
  '/activities': 'Activities',
  '/tickets': 'Tickets',
  '/users': 'Users',
  '/accounts': 'My Account',
  '/settings': 'Settings',
};

export function Header() {
  const pathname = usePathname();
  const currentTitle = (pathname && pageTitles[pathname]) || 'CRM Pro';
  const { user, logout } = useAuth();

  const fullName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || user.email
    : "Loading...";

  const initials = user
    ? ((user.firstName?.[0] || '') + (user.lastName?.[0] || '')).toUpperCase() || user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()
    : "??";

  const roleName = user?.role || "User";

  return (
    <header className="bg-white h-20 px-8 flex items-center justify-between sticky top-0 z-20 border-b border-gray-100 lg:border-none">
      {/* Page Title / Search Bar */}
      <div className="flex items-center gap-8 flex-1">
        <h2 className="text-xl font-bold text-slate-800 hidden xl:block min-w-[150px]">
          {currentTitle}
        </h2>
        
        <div className="flex-1 max-w-xl">
          <div className="relative group">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors"
              size={18}
            />
            <Input
              placeholder="Search everything..."
              className="w-full bg-slate-50 border-none rounded-full pl-10 h-11 focus-visible:ring-primary/20"
            />
          </div>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4 ml-4">
        {/* Notification */}
        <Button variant="ghost" size="icon" className="relative text-gray-400 hover:text-primary transition-colors rounded-full">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-white"></span>
        </Button>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-3 cursor-pointer p-1 rounded-full hover:bg-slate-50 transition-colors">
              <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                <AvatarImage src="" />
                <AvatarFallback className="bg-amber-100 text-amber-700 font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden md:block pr-2">
                <p className="text-sm font-semibold text-gray-700 leading-tight">{fullName}</p>
                <p className="text-xs text-gray-500">{roleName}</p>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-2 rounded-xl">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive cursor-pointer"
              onClick={logout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}