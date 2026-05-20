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
interface Lead {
  id: number;
  customerName: string;
  status: 'new' | 'contacted' | 'converted' | 'lost';
  source: 'website' | 'referral' | 'campaign';
  assignedTo: string;
  createdAt: string;
  notes?: string;
}
const initialLeads: Lead[] = [
{
  id: 1,
  customerName: 'John Doe',
  status: 'new',
  source: 'website',
  assignedTo: 'Alice Admin',
  createdAt: '2023-10-01'
},
{
  id: 2,
  customerName: 'Jane Smith',
  status: 'contacted',
  source: 'referral',
  assignedTo: 'Bob Sales',
  createdAt: '2023-10-02'
},
{
  id: 3,
  customerName: 'Robert Johnson',
  status: 'converted',
  source: 'campaign',
  assignedTo: 'Alice Admin',
  createdAt: '2023-10-03'
},
{
  id: 4,
  customerName: 'Emily Davis',
  status: 'lost',
  source: 'website',
  assignedTo: 'Charlie Support',
  createdAt: '2023-10-04'
},
{
  id: 5,
  customerName: 'Michael Wilson',
  status: 'new',
  source: 'referral',
  assignedTo: 'Bob Sales',
  createdAt: '2023-10-05'
},
{
  id: 6,
  customerName: 'Sarah Brown',
  status: 'contacted',
  source: 'campaign',
  assignedTo: 'Alice Admin',
  createdAt: '2023-10-06'
},
{
  id: 7,
  customerName: 'David Miller',
  status: 'new',
  source: 'website',
  assignedTo: 'Bob Sales',
  createdAt: '2023-10-07'
},
{
  id: 8,
  customerName: 'Jessica Taylor',
  status: 'converted',
  source: 'referral',
  assignedTo: 'Charlie Support',
  createdAt: '2023-10-08'
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
export function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Lead>>({
    customerName: '',
    status: 'new',
    source: 'website',
    assignedTo: '',
    notes: ''
  });
  const filteredLeads = leads.filter(
    (l) =>
    l.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.assignedTo.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const handleOpenModal = (lead?: Lead) => {
    if (lead) {
      setEditingLead(lead);
      setFormData(lead);
    } else {
      setEditingLead(null);
      setFormData({
        customerName: customers[0],
        status: 'new',
        source: 'website',
        assignedTo: users[0],
        notes: ''
      });
    }
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingLead(null);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLead) {
      setLeads(
        leads.map((l) =>
        l.id === editingLead.id ?
        {
          ...l,
          ...formData
        } as Lead :
        l
        )
      );
    } else {
      const newLead = {
        ...formData,
        id: Math.max(...leads.map((l) => l.id)) + 1,
        createdAt: new Date().toISOString().split('T')[0]
      } as Lead;
      setLeads([...leads, newLead]);
    }
    handleCloseModal();
  };
  const handleDelete = (id: number) => {
    setLeads(leads.filter((l) => l.id !== id));
    setDeleteId(null);
  };
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            New
          </span>);

      case 'contacted':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Contacted
          </span>);

      case 'converted':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Converted
          </span>);

      case 'lost':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Lost
          </span>);

      default:
        return null;
    }
  };
  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'website':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            Website
          </span>);

      case 'referral':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
            Referral
          </span>);

      case 'campaign':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            Campaign
          </span>);

      default:
        return null;
    }
  };
  return (
    <div className="p-6 lg:p-8 bg-[#F4F5F7] min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800">Leads</h1>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-[#3F51B5] text-white px-4 py-2 rounded-lg hover:bg-[#303F9F] transition-colors">
            
            <Plus size={18} />
            Add Lead
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
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5]" />
              
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Source</th>
                  <th className="px-6 py-4">Assigned To</th>
                  <th className="px-6 py-4">Created At</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLeads.map((lead) =>
                <tr
                  key={lead.id}
                  className={`hover:bg-gray-50 transition-colors ${deleteId === lead.id ? 'bg-red-50' : ''}`}>
                  
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {lead.customerName}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(lead.status)}</td>
                    <td className="px-6 py-4">{getSourceBadge(lead.source)}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {lead.assignedTo}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {lead.createdAt}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {deleteId === lead.id ?
                    <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-red-600 font-medium mr-2">
                            Confirm?
                          </span>
                          <button
                        onClick={() => handleDelete(lead.id)}
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
                        onClick={() => handleOpenModal(lead)}
                        className="text-gray-400 hover:text-[#3F51B5] hover:bg-[#EEF0FB] p-1.5 rounded-lg transition-colors">
                        
                            <Pencil size={18} />
                          </button>
                          <button
                        onClick={() => setDeleteId(lead.id)}
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
            <span>Showing {filteredLeads.length} entries</span>
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
                {editingLead ? 'Edit Lead' : 'Add New Lead'}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="converted">Converted</option>
                      <option value="lost">Lost</option>
                    </select>
                    <ChevronDown
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    size={16} />
                  
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Source
                  </label>
                  <div className="relative">
                    <select
                    value={formData.source}
                    onChange={(e) =>
                    setFormData({
                      ...formData,
                      source: e.target.value as any
                    })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5] appearance-none bg-white">
                    
                      <option value="website">Website</option>
                      <option value="referral">Referral</option>
                      <option value="campaign">Campaign</option>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) =>
                setFormData({
                  ...formData,
                  notes: e.target.value
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
                
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>);

}