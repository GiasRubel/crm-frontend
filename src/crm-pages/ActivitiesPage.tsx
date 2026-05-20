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
  ChevronDown,
  Phone,
  Mail,
  Users,
  CheckSquare } from
'lucide-react';
interface Activity {
  id: number;
  customerName: string;
  userName: string;
  type: 'call' | 'email' | 'meeting' | 'task';
  notes: string;
  activityDate: string;
}
const initialActivities: Activity[] = [
{
  id: 1,
  customerName: 'John Doe',
  userName: 'Alice Admin',
  type: 'call',
  notes: 'Discussed new requirements',
  activityDate: '2023-10-15T10:00'
},
{
  id: 2,
  customerName: 'Jane Smith',
  userName: 'Bob Sales',
  type: 'email',
  notes: 'Sent proposal PDF',
  activityDate: '2023-10-16T14:30'
},
{
  id: 3,
  customerName: 'Robert Johnson',
  userName: 'Alice Admin',
  type: 'meeting',
  notes: 'Quarterly review meeting',
  activityDate: '2023-10-17T09:00'
},
{
  id: 4,
  customerName: 'Emily Davis',
  userName: 'Charlie Support',
  type: 'task',
  notes: 'Follow up on support ticket',
  activityDate: '2023-10-18T11:15'
},
{
  id: 5,
  customerName: 'Michael Wilson',
  userName: 'Bob Sales',
  type: 'call',
  notes: 'Cold call introduction',
  activityDate: '2023-10-19T15:45'
},
{
  id: 6,
  customerName: 'Sarah Brown',
  userName: 'Alice Admin',
  type: 'email',
  notes: 'Thank you email',
  activityDate: '2023-10-20T13:20'
},
{
  id: 7,
  customerName: 'David Miller',
  userName: 'Bob Sales',
  type: 'meeting',
  notes: 'Product demo',
  activityDate: '2023-10-21T10:30'
},
{
  id: 8,
  customerName: 'Jessica Taylor',
  userName: 'Charlie Support',
  type: 'task',
  notes: 'Prepare invoice',
  activityDate: '2023-10-22T16:00'
},
{
  id: 9,
  customerName: 'John Doe',
  userName: 'Alice Admin',
  type: 'email',
  notes: 'Follow up email',
  activityDate: '2023-10-23T09:45'
},
{
  id: 10,
  customerName: 'Jane Smith',
  userName: 'Bob Sales',
  type: 'call',
  notes: 'Check in call',
  activityDate: '2023-10-24T11:00'
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
export function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Activity>>({
    customerName: '',
    userName: '',
    type: 'call',
    notes: '',
    activityDate: ''
  });
  const filteredActivities = activities.filter(
    (a) =>
    a.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.notes.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const handleOpenModal = (activity?: Activity) => {
    if (activity) {
      setEditingActivity(activity);
      setFormData(activity);
    } else {
      setEditingActivity(null);
      setFormData({
        customerName: customers[0],
        userName: users[0],
        type: 'call',
        notes: '',
        activityDate: ''
      });
    }
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingActivity(null);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingActivity) {
      setActivities(
        activities.map((a) =>
        a.id === editingActivity.id ?
        {
          ...a,
          ...formData
        } as Activity :
        a
        )
      );
    } else {
      const newActivity = {
        ...formData,
        id: Math.max(...activities.map((a) => a.id)) + 1
      } as Activity;
      setActivities([...activities, newActivity]);
    }
    handleCloseModal();
  };
  const handleDelete = (id: number) => {
    setActivities(activities.filter((a) => a.id !== id));
    setDeleteId(null);
  };
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'call':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Phone size={12} /> Call
          </span>);

      case 'email':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            <Mail size={12} /> Email
          </span>);

      case 'meeting':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <Users size={12} /> Meeting
          </span>);

      case 'task':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            <CheckSquare size={12} /> Task
          </span>);

      default:
        return null;
    }
  };
  return (
    <div className="p-6 lg:p-8 bg-[#F4F5F7] min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800">Activities</h1>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-[#3F51B5] text-white px-4 py-2 rounded-lg hover:bg-[#303F9F] transition-colors">
            
            <Plus size={18} />
            Log Activity
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
                placeholder="Search activities..."
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
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Notes</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredActivities.map((activity) =>
                <tr
                  key={activity.id}
                  className={`hover:bg-gray-50 transition-colors ${deleteId === activity.id ? 'bg-red-50' : ''}`}>
                  
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {activity.customerName}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {activity.userName}
                    </td>
                    <td className="px-6 py-4">{getTypeBadge(activity.type)}</td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate">
                      {activity.notes}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(activity.activityDate).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {deleteId === activity.id ?
                    <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-red-600 font-medium mr-2">
                            Confirm?
                          </span>
                          <button
                        onClick={() => handleDelete(activity.id)}
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
                        onClick={() => handleOpenModal(activity)}
                        className="text-gray-400 hover:text-[#3F51B5] hover:bg-[#EEF0FB] p-1.5 rounded-lg transition-colors">
                        
                            <Pencil size={18} />
                          </button>
                          <button
                        onClick={() => setDeleteId(activity.id)}
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
            <span>Showing {filteredActivities.length} entries</span>
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
                {editingActivity ? 'Edit Activity' : 'Log New Activity'}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned To
                </label>
                <div className="relative">
                  <select
                  value={formData.userName}
                  onChange={(e) =>
                  setFormData({
                    ...formData,
                    userName: e.target.value
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
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Activity Type
                </label>
                <div className="flex gap-2">
                  {['call', 'email', 'meeting', 'task'].map((type) =>
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                  setFormData({
                    ...formData,
                    type: type as any
                  })
                  }
                  className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium flex flex-col items-center gap-1 transition-all ${formData.type === type ? 'bg-[#EEF0FB] border-[#3F51B5] text-[#3F51B5]' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  
                      {type === 'call' && <Phone size={16} />}
                      {type === 'email' && <Mail size={16} />}
                      {type === 'meeting' && <Users size={16} />}
                      {type === 'task' && <CheckSquare size={16} />}
                      <span className="capitalize">{type}</span>
                    </button>
                )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date & Time
                </label>
                <input
                type="datetime-local"
                required
                value={formData.activityDate}
                onChange={(e) =>
                setFormData({
                  ...formData,
                  activityDate: e.target.value
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
                required
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
                
                  Save Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>);

}