import React, { useState } from 'react';
import { Search, Plus, Eye, Pencil, Trash2, X, Check } from 'lucide-react';
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
  permissions: [
  'view_reports',
  'manage_customers',
  'manage_leads',
  'manage_tickets',
  'admin_panel'],

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
  permissions: [
  'view_reports',
  'manage_customers',
  'manage_leads',
  'manage_tickets',
  'admin_panel'],

  active: false,
  createdAt: '2023-04-05'
},
{
  id: 5,
  name: 'Eve Sales',
  email: 'eve@goodfood.com',
  role: 'sales',
  permissions: ['view_reports', 'manage_customers', 'manage_leads'],
  active: true,
  createdAt: '2023-05-20'
},
{
  id: 6,
  name: 'Frank Support',
  email: 'frank@goodfood.com',
  role: 'support',
  permissions: ['manage_customers', 'manage_tickets'],
  active: true,
  createdAt: '2023-06-12'
}];

const availablePermissions = [
'view_reports',
'manage_customers',
'manage_leads',
'manage_tickets',
'admin_panel'];

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
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      setUsers(
        users.map((u) =>
        u.id === editingUser.id ?
        {
          ...u,
          ...formData
        } as User :
        u
        )
      );
    } else {
      const newUser = {
        ...formData,
        id: Math.max(...users.map((u) => u.id)) + 1,
        createdAt: new Date().toISOString().split('T')[0]
      } as User;
      setUsers([...users, newUser]);
    }
    handleCloseModal();
  };
  const handleDelete = (id: number) => {
    setUsers(users.filter((u) => u.id !== id));
    setDeleteId(null);
  };
  const togglePermission = (perm: string) => {
    const currentPerms = formData.permissions || [];
    if (currentPerms.includes(perm)) {
      setFormData({
        ...formData,
        permissions: currentPerms.filter((p) => p !== perm)
      });
    } else {
      setFormData({
        ...formData,
        permissions: [...currentPerms, perm]
      });
    }
  };
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Admin
          </span>);

      case 'sales':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Sales
          </span>);

      case 'support':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Support
          </span>);

      default:
        return null;
    }
  };
  return (
    <div className="p-6 lg:p-8 bg-[#F4F5F7] min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800">Users</h1>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-[#3F51B5] text-white px-4 py-2 rounded-lg hover:bg-[#303F9F] transition-colors">
            
            <Plus size={18} />
            Add User
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
                placeholder="Search users..."
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
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Created At</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((user) =>
                <tr
                  key={user.id}
                  className={`hover:bg-gray-50 transition-colors ${deleteId === user.id ? 'bg-red-50' : ''}`}>
                  
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {user.name}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{user.email}</td>
                    <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                    <td className="px-6 py-4">
                      <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      
                        {user.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {user.createdAt}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {deleteId === user.id ?
                    <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-red-600 font-medium mr-2">
                            Confirm?
                          </span>
                          <button
                        onClick={() => handleDelete(user.id)}
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
                        onClick={() => handleOpenModal(user)}
                        className="text-gray-400 hover:text-[#3F51B5] hover:bg-[#EEF0FB] p-1.5 rounded-lg transition-colors">
                        
                            <Pencil size={18} />
                          </button>
                          <button
                        onClick={() => setDeleteId(user.id)}
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
            <span>Showing {filteredUsers.length} entries</span>
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
                {editingUser ? 'Edit User' : 'Add New User'}
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
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Role
                </label>
                <div className="flex rounded-lg border border-gray-200 p-1 bg-gray-50">
                  {['admin', 'sales', 'support'].map((role) =>
                <button
                  key={role}
                  type="button"
                  onClick={() =>
                  setFormData({
                    ...formData,
                    role: role as any
                  })
                  }
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md capitalize transition-all ${formData.role === role ? 'bg-[#3F51B5] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  
                      {role}
                    </button>
                )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permissions
                </label>
                <div className="space-y-2">
                  {availablePermissions.map((perm) =>
                <label
                  key={perm}
                  className="flex items-center gap-2 cursor-pointer group">
                  
                      <div
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.permissions?.includes(perm) ? 'bg-[#3F51B5] border-[#3F51B5]' : 'border-gray-300 bg-white group-hover:border-[#3F51B5]'}`}>
                    
                        {formData.permissions?.includes(perm) &&
                    <Check size={14} className="text-white" />
                    }
                      </div>
                      <input
                    type="checkbox"
                    className="hidden"
                    checked={formData.permissions?.includes(perm)}
                    onChange={() => togglePermission(perm)} />
                  
                      <span className="text-sm text-gray-600 capitalize">
                        {perm.replace('_', ' ')}
                      </span>
                    </label>
                )}
                </div>
              </div>

              {!editingUser &&
            <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                type="password"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5]" />
              
                </div>
            }

              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-medium text-gray-700">
                  Active User
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
                
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>);

}