"use client";

import React, { useState } from 'react';
import { Search, Plus, Eye, Pencil, Trash2, X, Check, MoreHorizontal } from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";


interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'sales' | 'support';
  permissions: string[];
  active: boolean;
  createdAt: string;
}

const initialUsers: User[] = [
  {
    id: 1,
    name: 'Alice Admin',
    email: 'alice@goodfood.com',
    role: 'admin',
    permissions: ['view_reports', 'manage_customers', 'manage_leads', 'manage_tickets', 'admin_panel'],
    active: true,
    createdAt: '2023-01-01'
  },
  {
    id: 2,
    name: 'Bob Sales',
    email: 'bob@goodfood.com',
    role: 'sales',
    permissions: ['view_reports', 'manage_customers', 'manage_leads'],
    active: true,
    createdAt: '2023-02-15'
  },
  {
    id: 3,
    name: 'Charlie Support',
    email: 'charlie@goodfood.com',
    role: 'support',
    permissions: ['manage_customers', 'manage_tickets'],
    active: true,
    createdAt: '2023-03-10'
  },
  {
    id: 4,
    name: 'David Manager',
    email: 'david@goodfood.com',
    role: 'admin',
    permissions: ['view_reports', 'manage_customers', 'manage_leads', 'manage_tickets', 'admin_panel'],
    active: false,
    createdAt: '2023-04-05'
  }
];

const availablePermissions = ['view_reports', 'manage_customers', 'manage_leads', 'manage_tickets', 'admin_panel'];

export function UsersPage() {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    email: '',
    role: 'sales',
    permissions: [],
    active: true
  });

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData(user);
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        role: 'sales',
        permissions: [],
        active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      setUsers(users.map((u) => u.id === editingUser.id ? { ...u, ...formData } as User : u));
    } else {
      const newUser = {
        ...formData,
        id: Math.max(...users.map((u) => u.id)) + 1,
        createdAt: new Date().toISOString().split('T')[0]
      } as User;
      setUsers([...users, newUser]);
    }
    setIsModalOpen(false);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return <Badge variant="destructive">Admin</Badge>;
      case 'sales': return <Badge className="bg-blue-500 hover:bg-blue-600">Sales</Badge>;
      case 'support': return <Badge className="bg-emerald-500 hover:bg-emerald-600">Support</Badge>;
      default: return <Badge variant="secondary">{role}</Badge>;
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage your team members and their access permissions.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="shadow-lg shadow-primary/20 gap-2">
          <Plus size={18} />
          Add Team Member
        </Button>
      </div>

      <Card className="border-none shadow-sm bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="relative max-w-md group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-50/50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 h-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50">
                <TableRow>
                  <TableHead className="w-[250px]">Team Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="group hover:bg-slate-50/30 dark:hover:bg-slate-800 transition-colors">
                      <TableCell className="py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 dark:text-white">{user.name}</span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        <Badge variant={user.active ? "outline" : "secondary"} className={user.active ? "text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15 border-emerald-100 dark:border-emerald-500/30" : "text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50"}>
                          {user.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500 dark:text-slate-400 text-sm">{user.createdAt}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
                              <MoreHorizontal size={18} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40 rounded-xl">
                            <DropdownMenuItem className="cursor-pointer" onClick={() => handleOpenModal(user)}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={() => setUsers(users.filter(u => u.id !== user.id))}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No team members found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">{editingUser ? 'Update Member' : 'Add New Member'}</DialogTitle>
            <DialogDescription>
              {editingUser ? 'Make changes to the team member details below.' : 'Invite a new member to your team.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Full Name</label>
              <Input 
                required 
                value={formData.name} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                className="rounded-xl border-slate-200 dark:border-slate-700"
                placeholder="e.g. John Doe"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Email Address</label>
              <Input 
                type="email" 
                required 
                value={formData.email} 
                onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                className="rounded-xl border-slate-200 dark:border-slate-700"
                placeholder="name@company.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Team Role</label>
              <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                {['admin', 'sales', 'support'].map((role) => (
                  <Button
                    key={role}
                    type="button"
                    variant={formData.role === role ? "default" : "ghost"}
                    className={cn(
                      "h-9 capitalize rounded-lg text-sm",
                      formData.role === role ? "shadow-sm" : "text-slate-500 dark:text-slate-400"
                    )}
                    onClick={() => setFormData({ ...formData, role: role as any })}
                  >
                    {role}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between pt-4">
              <div className="space-y-0.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Account Status</label>
                <p className="text-xs text-muted-foreground">Member can access the platform when active.</p>
              </div>
              <Button
                type="button"
                variant={formData.active ? "default" : "outline"}
                className={cn("rounded-full px-6 h-9", formData.active ? "bg-emerald-500 hover:bg-emerald-600" : "")}
                onClick={() => setFormData({ ...formData, active: !formData.active })}
              >
                {formData.active ? 'Active' : 'Inactive'}
              </Button>
            </div>
            <DialogFooter className="pt-6">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="px-8 shadow-lg shadow-primary/20">
                {editingUser ? 'Save Changes' : 'Create Account'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}