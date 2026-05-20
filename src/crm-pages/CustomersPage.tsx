"use client";

import React, { useState } from 'react';
import { Search, Plus, Eye, Pencil, Trash2, X, Check } from 'lucide-react';
interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  active: boolean;
  createdAt: string;
}
const initialCustomers: Customer[] = [
{
  id: 1,
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1 234 567 890',
  address: '123 Main St, New York, NY',
  active: true,
  createdAt: '2023-01-15'
},
{
  id: 2,
  name: 'Jane Smith',
  email: 'jane@example.com',
  phone: '+1 987 654 321',
  address: '456 Elm St, Los Angeles, CA',
  active: true,
  createdAt: '2023-02-20'
},
{
  id: 3,
  name: 'Robert Johnson',
  email: 'robert@example.com',
  phone: '+1 555 123 456',
  address: '789 Oak St, Chicago, IL',
  active: false,
  createdAt: '2023-03-10'
},
{
  id: 4,
  name: 'Emily Davis',
  email: 'emily@example.com',
  phone: '+1 444 555 666',
  address: '321 Pine St, Houston, TX',
  active: true,
  createdAt: '2023-04-05'
},
{
  id: 5,
  name: 'Michael Wilson',
  email: 'michael@example.com',
  phone: '+1 777 888 999',
  address: '654 Maple St, Phoenix, AZ',
  active: true,
  createdAt: '2023-05-12'
},
{
  id: 6,
  name: 'Sarah Brown',
  email: 'sarah@example.com',
  phone: '+1 222 333 444',
  address: '987 Cedar St, Philadelphia, PA',
  active: true,
  createdAt: '2023-06-18'
},
{
  id: 7,
  name: 'David Miller',
  email: 'david@example.com',
  phone: '+1 666 777 888',
  address: '159 Birch St, San Antonio, TX',
  active: false,
  createdAt: '2023-07-22'
},
{
  id: 8,
  name: 'Jessica Taylor',
  email: 'jessica@example.com',
  phone: '+1 999 000 111',
  address: '753 Walnut St, San Diego, CA',
  active: true,
  createdAt: '2023-08-30'
}];

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    email: '',
    phone: '',
    address: '',
    active: true
  });
  const filteredCustomers = customers.filter(
    (c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData(customer);
    } else {
      setEditingCustomer(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        active: true
      });
    }
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomer) {
      setCustomers(
        customers.map((c) =>
        c.id === editingCustomer.id ?
        {
          ...c,
          ...formData
        } as Customer :
        c
        )
      );
    } else {
      const newCustomer = {
        ...formData,
        id: Math.max(...customers.map((c) => c.id)) + 1,
        createdAt: new Date().toISOString().split('T')[0]
      } as Customer;
      setCustomers([...customers, newCustomer]);
    }
    handleCloseModal();
  };
  const handleDelete = (id: number) => {
    setCustomers(customers.filter((c) => c.id !== id));
    setDeleteId(null);
  };
  return (
    <div className="p-6 lg:p-8 bg-[#F4F5F7] min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800">Customers</h1>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-[#3F51B5] text-white px-4 py-2 rounded-lg hover:bg-[#303F9F] transition-colors">
            
            <Plus size={18} />
            Add Customer
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
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5]" />
              
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Address</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Created At</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCustomers.map((customer) =>
                <tr
                  key={customer.id}
                  className={`hover:bg-gray-50 transition-colors ${deleteId === customer.id ? 'bg-red-50' : ''}`}>
                  
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {customer.name}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {customer.email}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {customer.phone}
                    </td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate">
                      {customer.address}
                    </td>
                    <td className="px-6 py-4">
                      <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${customer.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      
                        {customer.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {customer.createdAt}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {deleteId === customer.id ?
                    <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-red-600 font-medium mr-2">
                            Confirm Delete?
                          </span>
                          <button
                        onClick={() => handleDelete(customer.id)}
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
                        onClick={() => handleOpenModal(customer)}
                        className="text-gray-400 hover:text-[#3F51B5] hover:bg-[#EEF0FB] p-1.5 rounded-lg transition-colors">
                        
                            <Pencil size={18} />
                          </button>
                          <button
                        onClick={() => setDeleteId(customer.id)}
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
            <span>Showing {filteredCustomers.length} entries</span>
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
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
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
                  Full Name
                </label>
                <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                setFormData({
                  ...formData,
                  name: e.target.value
                })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5]" />
              
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                  setFormData({
                    ...formData,
                    email: e.target.value
                  })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5]" />
                
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                  setFormData({
                    ...formData,
                    phone: e.target.value
                  })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5]" />
                
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                rows={3}
                value={formData.address}
                onChange={(e) =>
                setFormData({
                  ...formData,
                  address: e.target.value
                })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5]" />
              
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-medium text-gray-700">
                  Active Customer
                </span>
                <button
                type="button"
                onClick={() =>
                setFormData({
                  ...formData,
                  active: !formData.active
                })
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#3F51B5] focus:ring-offset-2 ${formData.active ? 'bg-[#3F51B5]' : 'bg-gray-200'}`}>
                
                  <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.active ? 'translate-x-6' : 'translate-x-1'}`} />
                
                </button>
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
                
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>);

}