"use client";

import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  X,
  Check,
  Mail,
  Building,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  User,
  Info
} from 'lucide-react';
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/keycloak-provider";

interface Customer {
  id: string;
  keycloakId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  company?: string;
  address?: string;
  notes?: string;
  status: 'active' | 'inactive' | 'prospect';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function CustomersPage() {
  const { user } = useAuth();
  console.log("CurrentUser in CustomersPage:", user);
  const isStaffAdmin = user?.role === 'Admin' || user?.role === 'Administrator';

  // State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modals & Notifications
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    company: '',
    address: '',
    notes: '',
    status: 'active' as 'active' | 'inactive' | 'prospect',
  });

  // Fetch customer list with debounce
  useEffect(() => {
    const fetchCustomers = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        let endpoint = `/customers?page=${page}&limit=10`;
        if (searchTerm.trim()) {
          endpoint += `&search=${encodeURIComponent(searchTerm.trim())}`;
        }
        if (statusFilter) {
          endpoint += `&status=${statusFilter}`;
        }
        const response = await apiClient.get<{ data: Customer[]; meta: Meta }>(endpoint);
        setCustomers(response.data);
        setMeta(response.meta);
      } catch (err: any) {
        console.error("Error loading customers", err);
        setErrorMsg(err.message || 'Failed to load customers from server');
      } finally {
        setIsLoading(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchCustomers();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [page, searchTerm, statusFilter, refreshTrigger]);

  // Open modal for Create/Edit
  const handleOpenModal = (customer?: Customer) => {
    setErrorMsg(null);
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        company: customer.company || '',
        address: customer.address || '',
        notes: customer.notes || '',
        status: customer.status,
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        phone: '',
        company: '',
        address: '',
        notes: '',
        status: 'active',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  // Create/Update Customer
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validate phone number as required
    if (!formData.phone.trim()) {
      setErrorMsg('Phone number is required');
      setIsSubmitting(false);
      return;
    }

    try {
      if (editingCustomer) {
        await apiClient.patch(`/customers/${editingCustomer.id}`, formData);
        setSuccessMsg(`Customer "${formData.firstName} ${formData.lastName}" updated successfully.`);
      } else {
        await apiClient.post('/customers', formData);
        setSuccessMsg(`Customer "${formData.firstName} ${formData.lastName}" created successfully. Invitation email sent!`);
        setSearchTerm('');
        setStatusFilter('');
      }
      setPage(1);
      setRefreshTrigger(prev => prev + 1);
      handleCloseModal();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Customer
  const handleDelete = async (id: string) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await apiClient.delete(`/customers/${id}`);
      setSuccessMsg('Customer deleted successfully.');
      setDeleteId(null);
      setPage(1);
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete customer');
      setDeleteId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend Invite Email
  const handleResendInvite = async (customer: Customer) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await apiClient.post(`/customers/${customer.id}/resend`, {});
      setSuccessMsg(`Invitation email resent to ${customer.email} successfully.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resend invitation email');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 bg-[#F4F5F7] min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Customers</h1>
            <p className="text-sm text-gray-500">Manage client profiles, access credentials, and lifecycle status.</p>
          </div>
          {isStaffAdmin && (
            <button
              onClick={() => handleOpenModal()}
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-[#3F51B5] hover:bg-[#303F9F] text-white px-4 py-2.5 rounded-lg shadow-sm font-medium transition-colors disabled:opacity-50"
            >
              <Plus size={18} />
              Add Customer
            </button>
          )}
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <Check className="text-emerald-600 shrink-0" size={20} />
              <span className="text-sm font-medium">{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
              <X size={18} />
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-red-600 shrink-0" size={20} />
              <span className="text-sm font-medium">{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700">
              <X size={18} />
            </button>
          </div>
        )}

        {/* Filters & Table Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Filtering Header */}
          <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by name, email, company, or phone..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5] transition-all"
              />
            </div>

            <div className="flex w-full md:w-auto items-center gap-3 justify-end">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5] transition-all"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="prospect">Prospect</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Company</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Created At</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      <div className="flex justify-center items-center gap-2">
                        <div className="w-5 h-5 border-2 border-gray-300 border-t-[#3F51B5] rounded-full animate-spin" />
                        <span>Fetching customers...</span>
                      </div>
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No customer profiles matched the filters.
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr
                      key={customer.id}
                      className={`hover:bg-gray-50/50 transition-colors ${deleteId === customer.id ? 'bg-red-50/50' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900">
                            {customer.firstName} {customer.lastName}
                          </span>
                          <span className="text-xs text-gray-500">{customer.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-medium">{customer.phone}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {customer.company ? (
                          <div className="flex items-center gap-1.5">
                            <Building size={14} className="text-gray-400" />
                            <span>{customer.company}</span>
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            customer.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : customer.status === 'inactive'
                              ? 'bg-slate-50 text-slate-500 border-slate-200'
                              : 'bg-amber-50 text-amber-700 border-amber-100'
                          }`}
                        >
                          {customer.status.charAt(0).toUpperCase() + customer.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {deleteId === customer.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-red-600 font-semibold mr-1">Delete profile?</span>
                            <button
                              onClick={() => handleDelete(customer.id)}
                              disabled={isSubmitting}
                              className="text-red-700 hover:bg-red-100 p-1.5 rounded-lg transition-colors"
                              title="Confirm Delete"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteId(null)}
                              className="text-gray-500 hover:bg-gray-100 p-1.5 rounded-lg transition-colors"
                              title="Cancel"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setViewingCustomer(customer)}
                              className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-lg transition-all"
                              title="View details"
                            >
                              <Eye size={18} />
                            </button>

                            {isStaffAdmin && (
                              <>
                                <button
                                  onClick={() => handleOpenModal(customer)}
                                  disabled={isSubmitting}
                                  className="text-gray-400 hover:text-[#3F51B5] hover:bg-[#EEF0FB] p-1.5 rounded-lg transition-all"
                                  title="Edit profile"
                                >
                                  <Pencil size={18} />
                                </button>
                                <button
                                  onClick={() => handleResendInvite(customer)}
                                  disabled={isSubmitting}
                                  className="text-gray-400 hover:text-[#3F51B5] hover:bg-[#EEF0FB] p-1.5 rounded-lg transition-all"
                                  title="Resend invitation email"
                                >
                                  <Mail size={18} />
                                </button>
                                <button
                                  onClick={() => setDeleteId(customer.id)}
                                  disabled={isSubmitting}
                                  className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                                  title="Delete customer"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {!isLoading && customers.length > 0 && (
            <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <span>
                Showing Page {meta.page} of {meta.totalPages} (Total {meta.total} records)
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-3 text-sm font-bold text-gray-700">{page}</span>
                <button
                  onClick={() => setPage((p) => Math.min(p + 1, meta.totalPages))}
                  disabled={page === meta.totalPages}
                  className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail View Modal */}
      {viewingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden transform transition-all scale-100 border border-gray-100 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
              <div className="flex items-center gap-2 text-[#3F51B5]">
                <Info size={20} />
                <h3 className="text-lg font-bold text-gray-800">Customer Details</h3>
              </div>
              <button
                onClick={() => setViewingCustomer(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Header profile */}
              <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                <div className="w-12 h-12 bg-[#3F51B5]/10 text-[#3F51B5] rounded-full flex items-center justify-center font-bold text-lg uppercase">
                  {viewingCustomer.firstName[0]}
                  {viewingCustomer.lastName[0]}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">
                    {viewingCustomer.firstName} {viewingCustomer.lastName}
                  </h4>
                  <span className="text-sm text-gray-500">{viewingCustomer.email}</span>
                </div>
                <div className="ml-auto">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      viewingCustomer.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : viewingCustomer.status === 'inactive'
                        ? 'bg-slate-50 text-slate-500 border-slate-200'
                        : 'bg-amber-50 text-amber-700 border-amber-100'
                    }`}
                  >
                    {viewingCustomer.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Grid details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Phone className="text-gray-400" size={18} />
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Phone</p>
                    <p className="font-medium">{viewingCustomer.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Building className="text-gray-400" size={18} />
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Company</p>
                    <p className="font-medium">{viewingCustomer.company || '—'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <MapPin className="text-gray-400" size={18} />
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Address</p>
                    <p className="font-medium whitespace-pre-wrap">{viewingCustomer.address || '—'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Calendar className="text-gray-400" size={18} />
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Registered</p>
                    <p className="font-medium">
                      {viewingCustomer.createdAt ? new Date(viewingCustomer.createdAt).toLocaleString() : '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="bg-gray-50/75 p-4 rounded-xl border border-gray-100 space-y-1">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Staff Notes</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {viewingCustomer.notes || 'No notes available for this customer.'}
                </p>
              </div>

              {/* Keycloak details */}
              <div className="text-[11px] text-gray-400 space-y-1 border-t border-gray-100 pt-4">
                <p>
                  <span className="font-bold">Keycloak ID:</span> {viewingCustomer.keycloakId}
                </p>
                <p>
                  <span className="font-bold">Created By:</span> {viewingCustomer.createdBy}
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end bg-gray-50/50 shrink-0">
              <button
                onClick={() => setViewingCustomer(null)}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100 border border-gray-100 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
              <h3 className="text-lg font-bold text-gray-800">
                {editingCustomer ? 'Edit Customer Profile' : 'Add New Customer'}
              </h3>
              <button
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isSubmitting}
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5] transition-all disabled:bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isSubmitting}
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5] transition-all disabled:bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  disabled={isSubmitting || !!editingCustomer}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5] transition-all disabled:bg-gray-100 disabled:text-gray-500"
                  placeholder="name@example.com"
                />
                {!editingCustomer && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    An invitation containing a password setup link will be emailed immediately.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    disabled={isSubmitting}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5] transition-all disabled:bg-gray-50"
                    placeholder="+1 234 567 890"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    disabled={isSubmitting}
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5] transition-all disabled:bg-gray-50"
                    placeholder="Acme Corp"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Mailing Address
                </label>
                <textarea
                  rows={2}
                  disabled={isSubmitting}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5] transition-all disabled:bg-gray-50 resize-none"
                  placeholder="Street, City, State, ZIP"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Notes / Description
                </label>
                <textarea
                  rows={2}
                  disabled={isSubmitting}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5] transition-all disabled:bg-gray-50 resize-none"
                  placeholder="Additional context or requirements..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4 items-center pt-2">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Lifecycle Status
                  </label>
                  <select
                    value={formData.status}
                    disabled={isSubmitting}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' | 'prospect' })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5] transition-all disabled:bg-gray-50"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="prospect">Prospect</option>
                  </select>
                </div>
              </div>

              </div>

              <div className="px-6 py-4 flex justify-end gap-3 border-t border-gray-100 bg-gray-50/50 shrink-0">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#3F51B5] rounded-lg hover:bg-[#303F9F] shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {editingCustomer ? 'Update Customer' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}