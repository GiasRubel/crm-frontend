"use client";

import React, { useState } from 'react';
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  X,
  Check,
  ChevronDown } from
'lucide-react';
interface Ticket {
  id: number;
  subject: string;
  customerName: string;
  status: 'open' | 'in-progress' | 'closed';
  assignedTo: string;
  tags: string[];
  createdAt: string;
  description?: string;
}
const initialTickets: Ticket[] = [
{
  id: 1,
  subject: 'Login issue',
  customerName: 'John Doe',
  status: 'open',
  assignedTo: 'Charlie Support',
  tags: ['technical', 'urgent'],
  createdAt: '2023-10-20'
},
{
  id: 2,
  subject: 'Billing question',
  customerName: 'Jane Smith',
  status: 'in-progress',
  assignedTo: 'Alice Admin',
  tags: ['billing'],
  createdAt: '2023-10-21'
},
{
  id: 3,
  subject: 'Feature request: Dark mode',
  customerName: 'Robert Johnson',
  status: 'closed',
  assignedTo: 'Bob Sales',
  tags: ['feature-request'],
  createdAt: '2023-10-15'
},
{
  id: 4,
  subject: 'App crashing on startup',
  customerName: 'Emily Davis',
  status: 'open',
  assignedTo: 'Charlie Support',
  tags: ['technical', 'urgent'],
  createdAt: '2023-10-22'
},
{
  id: 5,
  subject: 'Refund request',
  customerName: 'Michael Wilson',
  status: 'in-progress',
  assignedTo: 'Alice Admin',
  tags: ['billing', 'urgent'],
  createdAt: '2023-10-23'
},
{
  id: 6,
  subject: 'How to export data?',
  customerName: 'Sarah Brown',
  status: 'closed',
  assignedTo: 'Charlie Support',
  tags: ['general'],
  createdAt: '2023-10-18'
},
{
  id: 7,
  subject: 'Integration help',
  customerName: 'David Miller',
  status: 'open',
  assignedTo: 'Bob Sales',
  tags: ['technical'],
  createdAt: '2023-10-24'
},
{
  id: 8,
  subject: 'Account locked',
  customerName: 'Jessica Taylor',
  status: 'in-progress',
  assignedTo: 'Alice Admin',
  tags: ['technical', 'urgent'],
  createdAt: '2023-10-24'
}];

const customers = [
'John Doe',
'Jane Smith',
'Robert Johnson',
'Emily Davis',
'Michael Wilson',
'Sarah Brown',
'David Miller',
'Jessica Taylor'];

const users = ['Alice Admin', 'Bob Sales', 'Charlie Support'];
const availableTags = [
'billing',
'technical',
'general',
'urgent',
'feature-request'];

export function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Ticket>>({
    subject: '',
    customerName: '',
    status: 'open',
    assignedTo: '',
    tags: [],
    description: ''
  });
  const filteredTickets = tickets.filter(
    (t) =>
    t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const handleOpenModal = (ticket?: Ticket) => {
    if (ticket) {
      setEditingTicket(ticket);
      setFormData(ticket);
    } else {
      setEditingTicket(null);
      setFormData({
        subject: '',
        customerName: customers[0],
        status: 'open',
        assignedTo: users[0],
        tags: [],
        description: ''
      });
    }
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTicket(null);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTicket) {
      setTickets(
        tickets.map((t) =>
        t.id === editingTicket.id ?
        {
          ...t,
          ...formData
        } as Ticket :
        t
        )
      );
    } else {
      const newTicket = {
        ...formData,
        id: Math.max(...tickets.map((t) => t.id)) + 1,
        createdAt: new Date().toISOString().split('T')[0]
      } as Ticket;
      setTickets([...tickets, newTicket]);
    }
    handleCloseModal();
  };
  const handleDelete = (id: number) => {
    setTickets(tickets.filter((t) => t.id !== id));
    setDeleteId(null);
  };
  const toggleTag = (tag: string) => {
    const currentTags = formData.tags || [];
    if (currentTags.includes(tag)) {
      setFormData({
        ...formData,
        tags: currentTags.filter((t) => t !== tag)
      });
    } else {
      setFormData({
        ...formData,
        tags: [...currentTags, tag]
      });
    }
  };
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Open
          </span>);

      case 'in-progress':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            In Progress
          </span>);

      case 'closed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Closed
          </span>);

      default:
        return null;
    }
  };
  return (
    <div className="p-6 lg:p-8 bg-[#F4F5F7] min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800">Support Tickets</h1>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-[#3F51B5] text-white px-4 py-2 rounded-lg hover:bg-[#303F9F] transition-colors">
            
            <Plus size={18} />
            New Ticket
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="relative max-w-md">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18} />
              
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5]" />
              
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
                  <th className="px-6 py-4">Subject</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Assigned To</th>
                  <th className="px-6 py-4">Created At</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTickets.map((ticket) =>
                <tr
                  key={ticket.id}
                  className={`hover:bg-gray-50 transition-colors ${deleteId === ticket.id ? 'bg-red-50' : ''}`}>
                  
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {ticket.subject}
                      </div>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {ticket.tags.map((tag) =>
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                        
                            {tag}
                          </span>
                      )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {ticket.customerName}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(ticket.status)}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {ticket.assignedTo}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {ticket.createdAt}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {deleteId === ticket.id ?
                    <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-red-600 font-medium mr-2">
                            Confirm?
                          </span>
                          <button
                        onClick={() => handleDelete(ticket.id)}
                        className="text-red-600 hover:bg-red-100 p-1 rounded">
                        
                            <Check size={16} />
                          </button>
                          <button
                        onClick={() => setDeleteId(null)}
                        className="text-gray-500 hover:bg-gray-100 p-1 rounded">
                        
                            <X size={16} />
                          </button>
                        </div> :

                    <div className="flex items-center justify-end gap-2">
                          <button className="text-gray-400 hover:text-[#3F51B5] hover:bg-[#EEF0FB] p-1.5 rounded-lg transition-colors">
                            <Eye size={18} />
                          </button>
                          <button
                        onClick={() => handleOpenModal(ticket)}
                        className="text-gray-400 hover:text-[#3F51B5] hover:bg-[#EEF0FB] p-1.5 rounded-lg transition-colors">
                        
                            <Pencil size={18} />
                          </button>
                          <button
                        onClick={() => setDeleteId(ticket.id)}
                        className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                        
                            <Trash2 size={18} />
                          </button>
                        </div>
                    }
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>Showing {filteredTickets.length} entries</span>
            <div className="flex gap-2">
              <button
                className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
                disabled>
                
                Previous
              </button>
              <button
                className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
                disabled>
                
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen &&
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">
                {editingTicket ? 'Edit Ticket' : 'Create New Ticket'}
              </h3>
              <button
              onClick={handleCloseModal}
              className="text-gray-400 hover:text-gray-600">
              
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                type="text"
                required
                value={formData.subject}
                onChange={(e) =>
                setFormData({
                  ...formData,
                  subject: e.target.value
                })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5]" />
              
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer
                  </label>
                  <div className="relative">
                    <select
                    value={formData.customerName}
                    onChange={(e) =>
                    setFormData({
                      ...formData,
                      customerName: e.target.value
                    })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5] appearance-none bg-white">
                    
                      {customers.map((c) =>
                    <option key={c} value={c}>
                          {c}
                        </option>
                    )}
                    </select>
                    <ChevronDown
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    size={16} />
                  
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <div className="relative">
                    <select
                    value={formData.status}
                    onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as any
                    })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5] appearance-none bg-white">
                    
                      <option value="open">Open</option>
                      <option value="in-progress">In Progress</option>
                      <option value="closed">Closed</option>
                    </select>
                    <ChevronDown
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    size={16} />
                  
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned To
                </label>
                <div className="relative">
                  <select
                  value={formData.assignedTo}
                  onChange={(e) =>
                  setFormData({
                    ...formData,
                    assignedTo: e.target.value
                  })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5] appearance-none bg-white">
                  
                    {users.map((u) =>
                  <option key={u} value={u}>
                        {u}
                      </option>
                  )}
                  </select>
                  <ChevronDown
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={16} />
                
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags?.map((tag) =>
                <span
                  key={tag}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#EEF0FB] text-[#3F51B5]">
                  
                      {tag}
                      <button
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className="ml-1.5 text-[#3F51B5] hover:text-[#303F9F]">
                    
                        <X size={12} />
                      </button>
                    </span>
                )}
                </div>
                <div className="relative">
                  <select
                  value=""
                  onChange={(e) => toggleTag(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5] appearance-none bg-white text-gray-500">
                  
                    <option value="" disabled>
                      Add a tag...
                    </option>
                    {availableTags.
                  filter((t) => !formData.tags?.includes(t)).
                  map((t) =>
                  <option key={t} value={t}>
                          {t}
                        </option>
                  )}
                  </select>
                  <ChevronDown
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={16} />
                
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                rows={3}
                value={formData.description}
                onChange={(e) =>
                setFormData({
                  ...formData,
                  description: e.target.value
                })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5]" />
              
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                
                  Cancel
                </button>
                <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-[#3F51B5] rounded-lg hover:bg-[#303F9F]">
                
                  Save Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>);

}