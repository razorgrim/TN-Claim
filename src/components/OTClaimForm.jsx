import React, { useState } from 'react';
import { Plus, Trash2, Calendar, Clock, MapPin, CheckCircle, AlertTriangle, FileText, ArrowLeft, Upload, Image as ImageIcon } from 'lucide-react';

export default function OTClaimForm({ profile, draftClaim, role, onSaveDraft, onSubmitClaim, onCancel }) {
  const [items, setItems] = useState(() => {
    if (draftClaim && draftClaim.items && draftClaim.items.length > 0) {
      return draftClaim.items.map(item => ({
        ...item,
        receipt: item.receipt || ''
      }));
    }
    return [
      {
        date: new Date().toISOString().split('T')[0],
        checkIn: '09:00',
        checkOut: '19:00',
        isWeekend: false,
        location: 'Kuala Lumpur Office',
        reason: '',
        authorization: '',
        weekdayHours: 1, // (10 total hrs - 9 standard hrs = 1 OT hr)
        weekendHours: 0,
        receipt: ''
      }
    ];
  });

  const [validationError, setValidationError] = useState('');
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState(null);

  // Calculate OT hours for a specific row
  const calculateOT = (checkIn, checkOut, isWeekend) => {
    if (!checkIn || !checkOut) return { weekday: 0, weekend: 0 };

    const [inH, inM] = checkIn.split(':').map(Number);
    let [outH, outM] = checkOut.split(':').map(Number);

    // If check out is earlier than check in, assume it went past midnight (next day)
    if (outH < inH || (outH === inH && outM < inM)) {
      outH += 24;
    }

    const totalHours = (outH * 60 + outM - (inH * 60 + inM)) / 60;
    
    // Rule:
    // Weekday: OT calculated after 9 working hours (Total Hours - 9)
    // Weekend: OT claimed fully (all hours worked count as OT)
    const otHours = isWeekend ? totalHours : Math.max(0, totalHours - 9);

    // Round to 1 decimal place or keep as float
    const roundedOt = Math.round(otHours * 10) / 10;

    if (isWeekend) {
      return { weekday: 0, weekend: roundedOt };
    } else {
      return { weekday: roundedOt, weekend: 0 };
    }
  };

  const handleRowChange = (index, field, value) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };

    // Re-calculate OT hours if checkIn, checkOut, or isWeekend changes
    if (field === 'checkIn' || field === 'checkOut' || field === 'isWeekend') {
      const ot = calculateOT(item.checkIn, item.checkOut, item.isWeekend);
      item.weekdayHours = ot.weekday;
      item.weekendHours = ot.weekend;
    }

    updated[index] = item;
    setItems(updated);
    setValidationError('');
  };

  // Handle receipt/proof uploading (Base64 conversion)
  const handleReceiptUpload = (index, file) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const updated = [...items];
      updated[index].receipt = e.target.result;
      setItems(updated);
    };
    reader.readAsDataURL(file);
  };

  const addRow = () => {
    const lastItem = items[items.length - 1] || {};
    setItems([
      ...items,
      {
        date: lastItem.date || new Date().toISOString().split('T')[0],
        checkIn: lastItem.checkIn || '09:00',
        checkOut: lastItem.checkOut || '19:00',
        isWeekend: lastItem.isWeekend || false,
        location: lastItem.location || 'Kuala Lumpur Office',
        reason: '',
        authorization: lastItem.authorization || '',
        weekdayHours: lastItem.weekdayHours || 1,
        weekendHours: lastItem.weekendHours || 0,
        receipt: ''
      }
    ]);
  };

  const removeRow = (index) => {
    if (items.length === 1) {
      setItems([{
        date: new Date().toISOString().split('T')[0],
        checkIn: '09:00',
        checkOut: '19:00',
        isWeekend: false,
        location: '',
        reason: '',
        authorization: '',
        weekdayHours: 1,
        weekendHours: 0,
        receipt: ''
      }]);
    } else {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // Totals calculations
  const totalWeekday = items.reduce((sum, item) => sum + (item.weekdayHours || 0), 0);
  const totalWeekend = items.reduce((sum, item) => sum + (item.weekendHours || 0), 0);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Check validation: OT Reason is COMPULSORY
    const incompleteIndex = items.findIndex(item => !item.reason.trim());
    if (incompleteIndex !== -1) {
      setValidationError(`Row ${incompleteIndex + 1}: Overtime Reason is compulsory.`);
      return;
    }

    // Check validation: Attachment proving the OT is compulsory
    const noReceiptIndex = items.findIndex(item => (item.weekdayHours > 0 || item.weekendHours > 0) && !item.receipt);
    if (noReceiptIndex !== -1) {
      setValidationError(`Row ${noReceiptIndex + 1}: Attachment proving the Overtime is compulsory.`);
      return;
    }

    // Sort items chronologically by date before submitting
    const sortedItems = [...items].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Submit
    const claim = {
      type: 'ot',
      items: sortedItems,
      totals: {
        weekdayHours: totalWeekday,
        weekendHours: totalWeekend
      }
    };
    onSubmitClaim(claim);
  };

  const handleSave = () => {
    // Sort items chronologically by date before saving draft
    const sortedItems = [...items].sort((a, b) => new Date(a.date) - new Date(b.date));

    const claim = {
      type: 'ot',
      items: sortedItems,
      totals: {
        weekdayHours: totalWeekday,
        weekendHours: totalWeekend
      }
    };
    onSaveDraft(claim);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Panel */}
      <div className="flex items-center justify-between">
        <button
          onClick={onCancel}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Dashboard</span>
        </button>
        <div className="text-sm text-slate-500 font-mono">
          Employee: <span className="text-slate-300 font-bold">{role === 'admin' ? (draftClaim ? draftClaim.employeeName : 'Employee') : profile.name}</span>
        </div>
      </div>

      <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl overflow-hidden p-6">
        <div className="border-b border-slate-800 pb-5 mb-6">
          <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 flex items-center gap-2">
            <Clock className="w-6 h-6 text-cyan-400" />
            {role === 'admin' ? 'Admin Edit Mode — Overtime Claim' : 'Overtime (OT) Claim Form'}
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {role === 'admin' 
              ? `Reviewing and correcting overtime hours for ${draftClaim ? draftClaim.employeeName : 'staff'}.` 
              : 'Total Neutron Solution Sdn Bhd — Fill in the hours worked. Calculations are made automatically.'}
          </p>
        </div>

        {/* Display Validation Error */}
        {validationError && (
          <div className="mb-6 p-4 bg-rose-500/20 border border-rose-500/50 rounded-xl flex items-center gap-3 text-rose-300">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Quick Rules Banner */}
        <div className="bg-cyan-950/20 border border-cyan-500/30 rounded-xl p-4 mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start text-xs text-cyan-400">
          <div className="space-y-1">
            <div className="font-bold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> OVERTIME RULES:
            </div>
            <div>• Overtime hours MUST calculate after 9 working hours (e.g. Check Out - Check In - 9 hrs).</div>
            <div>• COMPULSORY to fill in the Overtime Reason for each entry.</div>
            <div>• COMPULSORY to attach proof (image or PDF) validating each Overtime claim entry.</div>
            <div>• COMPULSORY: Onsite Overtime attendance must be verified by sharing your live location in the "Attendance OT" WhatsApp group.</div>
          </div>
          <div className="bg-slate-950/50 px-3 py-2 rounded-lg border border-slate-800/80 font-mono font-bold text-center self-stretch sm:self-center shrink-0">
            Current Weekday OT: <span className="text-slate-100 font-extrabold">{totalWeekday}h</span> | Weekend OT: <span className="text-slate-100 font-extrabold">{totalWeekend}h</span>
          </div>
        </div>

        {/* Desktop View Table */}
        <div className="hidden lg:block overflow-x-auto mb-6">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-950/50 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-800">
                <th className="px-3 py-3 w-[130px]">Date</th>
                <th className="px-3 py-3 w-[95px]">Check In</th>
                <th className="px-3 py-3 w-[95px]">Check Out</th>
                <th className="px-3 py-3 w-[120px]">Day Type</th>
                <th className="px-3 py-3 w-[140px]">Location</th>
                <th className="px-3 py-3">OT Reason (Compulsory)</th>
                <th className="px-3 py-3 w-[150px]">Authorized By</th>
                <th className="px-3 py-3 w-[120px]">Proof</th>
                <th className="px-3 py-3 w-[70px] text-center">OT (Hr)</th>
                <th className="px-3 py-3 w-[50px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {items.map((item, index) => (
                <tr key={index} className="hover:bg-slate-800/10">
                  {/* Date */}
                  <td className="px-2 py-3">
                    <input
                      type="date"
                      value={item.date}
                      required
                      onChange={(e) => handleRowChange(index, 'date', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                    />
                  </td>

                  {/* Check In */}
                  <td className="px-2 py-3">
                    <input
                      type="time"
                      value={item.checkIn}
                      required
                      onChange={(e) => handleRowChange(index, 'checkIn', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                    />
                  </td>

                  {/* Check Out */}
                  <td className="px-2 py-3">
                    <input
                      type="time"
                      value={item.checkOut}
                      required
                      onChange={(e) => handleRowChange(index, 'checkOut', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                    />
                  </td>

                  {/* Weekend/PH Choice */}
                  <td className="px-2 py-3">
                    <select
                      value={item.isWeekend ? 'weekend' : 'weekday'}
                      onChange={(e) => handleRowChange(index, 'isWeekend', e.target.value === 'weekend')}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                    >
                      <option value="weekday">Weekday</option>
                      <option value="weekend">Weekend / PH</option>
                    </select>
                  </td>

                  {/* Location */}
                  <td className="px-2 py-3">
                    <input
                      type="text"
                      placeholder="e.g. KL Office"
                      value={item.location}
                      onChange={(e) => handleRowChange(index, 'location', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                    />
                  </td>

                  {/* OT Reason */}
                  <td className="px-2 py-3">
                    <input
                      type="text"
                      placeholder="Reason (Compulsory)"
                      value={item.reason}
                      required
                      onChange={(e) => handleRowChange(index, 'reason', e.target.value)}
                      className={`w-full bg-slate-950 border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 ${
                        !item.reason.trim() ? 'border-amber-500/50' : 'border-slate-700'
                      }`}
                    />
                  </td>

                  {/* Authorized By */}
                  <td className="px-2 py-3">
                    <select
                      value={item.authorization || ''}
                      onChange={(e) => handleRowChange(index, 'authorization', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
                    >
                      <option value="">Select Supervisor</option>
                      <option value="razman">Razman</option>
                      <option value="syahin">Syahin</option>
                      <option value="rafie">Rafie</option>
                      <option value="Titan Chai">Titan Chai</option>
                    </select>
                  </td>

                  {/* Proof Upload */}
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2">
                      <label className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-semibold cursor-pointer transition-all ${
                        item.receipt 
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                          : (item.weekdayHours > 0 || item.weekendHours > 0) 
                          ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/20' 
                          : 'bg-slate-950 border-slate-700 text-slate-400 hover:bg-slate-800'
                      }`}>
                        <Upload className="w-3.5 h-3.5 shrink-0" />
                        <span>{item.receipt ? 'Attached' : 'Upload'}</span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          onChange={(e) => handleReceiptUpload(index, e.target.files[0])}
                        />
                      </label>
                      {item.receipt && (
                        <button
                          type="button"
                          onClick={() => setReceiptPreviewUrl(item.receipt)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg border border-slate-700 transition-colors"
                          title="Preview proof"
                        >
                          {item.receipt.startsWith('data:application/pdf') ? (
                            <FileText className="w-3.5 h-3.5 text-cyan-400" />
                          ) : (
                            <ImageIcon className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Calculated OT */}
                  <td className="px-2 py-3 text-center font-mono font-bold text-slate-200 text-xs">
                    {item.isWeekend ? item.weekendHours : item.weekdayHours}h
                  </td>

                  {/* Delete */}
                  <td className="px-2 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile / Card-based View */}
        <div className="lg:hidden space-y-4 mb-6">
          {items.map((item, index) => (
            <div key={index} className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <span className="text-xs font-bold text-slate-400">Row #{index + 1}</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded">
                    OT: {item.isWeekend ? item.weekendHours : item.weekdayHours}h
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Date</label>
                  <input
                    type="date"
                    value={item.date}
                    onChange={(e) => handleRowChange(index, 'date', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Day Type</label>
                  <select
                    value={item.isWeekend ? 'weekend' : 'weekday'}
                    onChange={(e) => handleRowChange(index, 'isWeekend', e.target.value === 'weekend')}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="weekday">Weekday</option>
                    <option value="weekend">Weekend / PH</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Check In</label>
                  <input
                    type="time"
                    value={item.checkIn}
                    onChange={(e) => handleRowChange(index, 'checkIn', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Check Out</label>
                  <input
                    type="time"
                    value={item.checkOut}
                    onChange={(e) => handleRowChange(index, 'checkOut', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Location</label>
                <input
                  type="text"
                  placeholder="e.g. KL Office"
                  value={item.location}
                  onChange={(e) => handleRowChange(index, 'location', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">OT Reason (Compulsory)</label>
                <input
                  type="text"
                  placeholder="Compulsory reason for overtime"
                  value={item.reason}
                  onChange={(e) => handleRowChange(index, 'reason', e.target.value)}
                  className={`w-full bg-slate-900 border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 ${
                    !item.reason.trim() ? 'border-amber-500/50' : 'border-slate-700'
                  }`}
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Authorized By</label>
                <select
                  value={item.authorization || ''}
                  onChange={(e) => handleRowChange(index, 'authorization', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value="">Select Supervisor</option>
                  <option value="razman">Razman</option>
                  <option value="syahin">Syahin</option>
                  <option value="rafie">Rafie</option>
                  <option value="Titan Chai">Titan Chai</option>
                </select>
              </div>

              {/* Mobile Proof Upload Block */}
              <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-xs font-semibold text-slate-400">Overtime Proof:</span>
                <div className="flex items-center gap-2">
                  <label className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                    item.receipt 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                      : (item.weekdayHours > 0 || item.weekendHours > 0)
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                      : 'bg-slate-950 border-slate-700 text-slate-400'
                  }`}>
                    <Upload className="w-3.5 h-3.5" />
                    <span>{item.receipt ? 'Attached' : 'Capture Proof'}</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => handleReceiptUpload(index, e.target.files[0])}
                    />
                  </label>
                  {item.receipt && (
                    <button
                      type="button"
                      onClick={() => setReceiptPreviewUrl(item.receipt)}
                      className="p-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-700 transition-colors"
                    >
                      {item.receipt.startsWith('data:application/pdf') ? (
                        <FileText className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <ImageIcon className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row sm:justify-between items-stretch sm:items-center gap-4 pt-6 border-t border-slate-800">
          <button
            type="button"
            onClick={addRow}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold rounded-xl active:scale-95 transition-all cursor-pointer text-sm"
          >
            <Plus className="w-4 h-4 text-cyan-400" />
            Add Day Entry
          </button>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 font-semibold rounded-xl text-sm transition-all cursor-pointer"
            >
              {role === 'admin' ? 'Save (Keep Pending)' : 'Save Draft'}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-cyan-500/10 active:scale-95 transition-all cursor-pointer"
            >
              {role === 'admin' ? 'Save & Approve Claim' : 'Submit Claim Report'}
            </button>
          </div>
        </div>
      </div>

      {/* Receipt Modal Preview */}
      {receiptPreviewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className={`bg-slate-900 rounded-2xl border border-slate-800 w-full p-5 shadow-2xl relative ${
            receiptPreviewUrl.startsWith('data:application/pdf') ? 'max-w-3xl' : 'max-w-md'
          }`}>
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <h3 className="font-bold text-slate-100 flex items-center gap-1.5">
                <FileText className="w-5 h-5 text-cyan-400" /> Proof Preview
              </h3>
              <button
                onClick={() => setReceiptPreviewUrl(null)}
                className="text-slate-400 hover:text-slate-200 font-bold px-2 py-1 hover:bg-slate-800 rounded-lg text-sm"
              >
                Close
              </button>
            </div>
            <div className="flex justify-center bg-slate-950 p-2.5 rounded-xl border border-slate-800 max-h-[500px] overflow-auto">
              {receiptPreviewUrl.startsWith('data:application/pdf') ? (
                <iframe
                  src={receiptPreviewUrl}
                  title="Proof PDF"
                  className="w-full h-[400px] rounded-lg border-none bg-white"
                />
              ) : (
                <img 
                  src={receiptPreviewUrl} 
                  alt="Proof attachment" 
                  className="max-w-full h-auto object-contain rounded-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
