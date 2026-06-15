import React, { useState, useEffect } from 'react';
import { User, CreditCard, Phone, Briefcase, Save, CheckCircle } from 'lucide-react';

export default function ProfileSettings({ profile, onUpdateProfile }) {
  const [formData, setFormData] = useState({ ...profile });
  const [showSavedToast, setShowSavedToast] = useState(false);

  useEffect(() => {
    setFormData({ ...profile });
  }, [profile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdateProfile(formData);
    setShowSavedToast(true);
    setTimeout(() => {
      setShowSavedToast(false);
    }, 3000);
  };

  return (
    <div className="max-w-2xl mx-auto bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
      {/* Decorative gradient overlay */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -z-10" />

      <h2 className="text-2xl font-bold text-slate-100 mb-6 flex items-center gap-2">
        <User className="w-6 h-6 text-cyan-400" />
        Employee Profile Settings
      </h2>
      <p className="text-slate-400 text-sm mb-8">
        Your profile details will automatically pre-fill all claim sheets. These details are stored locally on your device.
      </p>

      {showSavedToast && (
        <div className="mb-6 p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-xl flex items-center gap-3 text-emerald-300 animate-fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span>Profile settings successfully saved!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Employee Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-1.5">
              <User className="w-4 h-4 text-slate-400" /> Employee Name
            </label>
            <input
              type="text"
              name="name"
              required
              value={formData.name || ''}
              onChange={handleChange}
              placeholder="e.g. Ahmad Bin Razak"
              className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
            />
          </div>

          {/* IC / Identity Card Number */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-slate-400" /> IC Number
            </label>
            <input
              type="text"
              name="ic"
              required
              value={formData.ic || ''}
              onChange={handleChange}
              placeholder="e.g. 940815-14-5321"
              className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
            />
          </div>

          {/* Contact Numbers */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-slate-400" /> Contact Numbers
            </label>
            <input
              type="text"
              name="contact"
              required
              value={formData.contact || ''}
              onChange={handleChange}
              placeholder="e.g. +60 12-345 6789"
              className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
            />
          </div>

          {/* Department */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-slate-400" /> Department
            </label>
            <select
              name="department"
              value={formData.department || ''}
              onChange={handleChange}
              className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
            >
              <option value="Technical Operations">Technical Operations</option>
              <option value="IT Department">IT Department</option>
              <option value="Sales & Marketing">Sales & Marketing</option>
              <option value="Finance & HR">Finance & HR</option>
              <option value="Management">Management</option>
            </select>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800 flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Save className="w-5 h-5" />
            Save Profile Settings
          </button>
        </div>
      </form>
    </div>
  );
}
