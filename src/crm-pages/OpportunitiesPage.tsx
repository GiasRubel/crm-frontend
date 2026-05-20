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
interface Opportunity {
  id: number;
  leadName: string;
  value: number;
  stage: 'prospecting' | 'negotiation' | 'closed-won' | 'closed-lost';
  expectedCloseDate: string;
  notes?: string;
}
const initialOpportunities: Opportunity[] = [
{
  id: 1,
  leadName: 'John Doe',
  value: 5000000,
  stage: 'prospecting',
  expectedCloseDate: '2023-11-15'
},
{
  id: 2,
  leadName: 'Jane Smith',
  value: 12000000,
  stage: 'negotiation',
  expectedCloseDate: '2023-11-20'
},
{
  id: 3,
  leadName: 'Robert Johnson',
  value: 3500000,
  stage: 'closed-won',
  expectedCloseDate: '2023-10-30'
},
{
  id: 4,
  leadName: 'Emily Davis',
  value: 8000000,
  stage: 'closed-lost',
  expectedCloseDate: '2023-10-25'
},
{
  id: 5,
  leadName: 'Michael Wilson',
  value: 6500000,
  stage: 'prospecting',
  expectedCloseDate: '2023-12-01'
},
{
  id: 6,
  leadName: 'Sarah Brown',
  value: 15000000,
  stage: 'negotiation',
  expectedCloseDate: '2023-11-28'
},
{
  id: 7,
  leadName: 'David Miller',
  value: 4200000,
  stage: 'prospecting',
  expectedCloseDate: '2023-12-10'
},
{
  id: 8,
  leadName: 'Jessica Taylor',
  value: 9500000,
  stage: 'closed-won',
  expectedCloseDate: '2023-10-15'
}];

const leads = [
'John Doe',
'Jane Smith',
'Robert Johnson',
'Emily Davis',
'Michael Wilson',
'Sarah Brown',
'David Miller',
'Jessica Taylor'];

export function OpportunitiesPage() {
  const [opportunities, setOpportunities] =
  useState<Opportunity[]>(initialOpportunities);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] =
  useState<Opportunity | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Opportunity>>({
    leadName: '',
    value: 0,
    stage: 'prospecting',
    expectedCloseDate: '',
    notes: ''
  });
  const filteredOpportunities = opportunities.filter((o) =>
  o.leadName.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const handleOpenModal = (opportunity?: Opportunity) => {
    if (opportunity) {
      setEditingOpportunity(opportunity);
      setFormData(opportunity);
    } else {
      setEditingOpportunity(null);
      setFormData({
        leadName: leads[0],
        value: 0,
        stage: 'prospecting',
        expectedCloseDate: '',
        notes: ''
      });
    }
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingOpportunity(null);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingOpportunity) {
      setOpportunities(
        opportunities.map((o) =>
        o.id === editingOpportunity.id ?
        {
          ...o,
          ...formData
        } as Opportunity :
        o
        )
      );
    } else {
      const newOpportunity = {
        ...formData,
        id: Math.max(...opportunities.map((o) => o.id)) + 1
      } as Opportunity;
      setOpportunities([...opportunities, newOpportunity]);
    }
    handleCloseModal();
  };
  const handleDelete = (id: number) => {
    setOpportunities(opportunities.filter((o) => o.id !== id));
    setDeleteId(null);
  };
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(value);
  };
  const getStageBadge = (stage: string) => {
    switch (stage) {
      case 'prospecting':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Prospecting
          </span>);

      case 'negotiation':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Negotiation
          </span>);

      case 'closed-won':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Closed Won
          </span>);

      case 'closed-lost':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Closed Lost
          </span>);

      default:
        return null;
    }
  };
  return (
    <div className="p-6 lg:p-8 bg-[#F4F5F7] min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800">Opportunities</h1>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-[#3F51B5] text-white px-4 py-2 rounded-lg hover:bg-[#303F9F] transition-colors">
            
            <Plus size={18} />
            Add Opportunity
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
                placeholder="Search opportunities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5]" />
              
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
                  <th className="px-6 py-4">Lead / Customer</th>
                  <th className="px-6 py-4">Value</th>
                  <th className="px-6 py-4">Stage</th>
                  <th className="px-6 py-4">Expected Close</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOpportunities.map((opportunity) =>
                <tr
                  key={opportunity.id}
                  className={`hover:bg-gray-50 transition-colors ${deleteId === opportunity.id ? 'bg-red-50' : ''}`}>
                  
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {opportunity.leadName}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-700">
                      {formatCurrency(opportunity.value)}
                    </td>
                    <td className="px-6 py-4">
                      {getStageBadge(opportunity.stage)}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {opportunity.expectedCloseDate}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {deleteId === opportunity.id ?
                    <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-red-600 font-medium mr-2">
                            Confirm?
                          </span>
                          <button
                        onClick={() => handleDelete(opportunity.id)}
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
                        onClick={() => handleOpenModal(opportunity)}
                        className="text-gray-400 hover:text-[#3F51B5] hover:bg-[#EEF0FB] p-1.5 rounded-lg transition-colors">
                        
                            <Pencil size={18} />
                          </button>
                          <button
                        onClick={() => setDeleteId(opportunity.id)}
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
            <span>Showing {filteredOpportunities.length} entries</span>
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
                {editingOpportunity ?
              'Edit Opportunity' :
              'Add New Opportunity'}
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
                  Lead / Customer
                </label>
                <div className="relative">
                  <select
                  value={formData.leadName}
                  onChange={(e) =>
                  setFormData({
                    ...formData,
                    leadName: e.target.value
                  })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5] appearance-none bg-white">
                  
                    {leads.map((l) =>
                  <option key={l} value={l}>
                        {l}
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
                    Value (IDR)
                  </label>
                  <input
                  type="number"
                  required
                  value={formData.value}
                  onChange={(e) =>
                  setFormData({
                    ...formData,
                    value: Number(e.target.value)
                  })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5]" />
                
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stage
                  </label>
                  <div className="relative">
                    <select
                    value={formData.stage}
                    onChange={(e) =>
                    setFormData({
                      ...formData,
                      stage: e.target.value as any
                    })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5] appearance-none bg-white">
                    
                      <option value="prospecting">Prospecting</option>
                      <option value="negotiation">Negotiation</option>
                      <option value="closed-won">Closed Won</option>
                      <option value="closed-lost">Closed Lost</option>
                    </select>
                    <ChevronDown
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    size={16} />
                  
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Close Date
                </label>
                <input
                type="date"
                required
                value={formData.expectedCloseDate}
                onChange={(e) =>
                setFormData({
                  ...formData,
                  expectedCloseDate: e.target.value
                })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5]" />
              
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
                
                  Save Opportunity
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>);

}