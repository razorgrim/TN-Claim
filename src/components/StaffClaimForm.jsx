import React, { useState } from 'react';
import {
  Plus, Trash2, Calendar, FileText, Upload, Eye, EyeOff, AlertTriangle, CheckCircle, ArrowLeft, Image as ImageIcon, X
} from 'lucide-react';

export default function StaffClaimForm({ profile, draftClaim, role, onSaveDraft, onSubmitClaim, onCancel }) {
  const [items, setItems] = useState(() => {
    if (draftClaim && draftClaim.items && draftClaim.items.length > 0) {
      return draftClaim.items.map(item => {
        const receipts = item.receipts || (item.receipt ? [item.receipt] : []);
        const distance = item.mileageDistance || 0;
        const cameBack = item.cameBackToOffice || 'no';
        const deduction = distance > 0 ? (cameBack === 'no' ? 15 : 30) : 0;
        const netMil = Math.round(Math.max(0, distance - deduction) * 100) / 100;
        return {
          ...item,
          vehicle: item.vehicle || 'bike',
          cameBackToOffice: cameBack,
          mileageDeduction: item.mileageDeduction !== undefined ? item.mileageDeduction : deduction,
          mileageNet: item.mileageNet !== undefined ? Math.round(parseFloat(item.mileageNet) * 100) / 100 : netMil,
          outstationType: item.outstationType || (item.outstationDays ? (parseInt(item.outstationDays, 10) === 1 ? 'daily' : 'sleepover') : 'none'),
          outstationAmount: item.outstationAmount || 0,
          receipts: receipts,
          receipt: receipts[0] || ''
        };
      });
    }
    return [
      {
        date: new Date().toISOString().split('T')[0],
        journey: '',
        vehicle: 'bike',
        cameBackToOffice: 'no',
        mileageDistance: 0,
        mileageDeduction: 0,
        mileageNet: 0,
        mileageAmount: 0.00,
        outstationType: 'none',
        outstationAmount: 0.00,
        toll: 0.00,
        medical: 0.00,
        receipt: '',
        receipts: [],
        total: 0.00
      }
    ];
  });

  const [validationError, setValidationError] = useState('');
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState(null);

  const mileageRate = profile.mileageRate || 0.60;

  // Calculate totals for a row
  const calculateRowTotal = (item) => {
    const rate = item.vehicle === 'bike' ? 0.40 : 0.50;
    const distance = parseFloat(item.mileageDistance) || 0;
    const deduction = distance > 0 ? (item.cameBackToOffice === 'no' ? 15 : 30) : 0;
    const netMil = Math.round(Math.max(0, distance - deduction) * 100) / 100;
    const milAmount = netMil * rate;
    const toll = parseFloat(item.toll) || 0;
    const medical = parseFloat(item.medical) || 0;

    let outAmount = 0;
    if (item.outstationType === 'daily') {
      outAmount = 15;
    } else if (item.outstationType === 'sleepover') {
      outAmount = 30;
    }

    return {
      mileageDeduction: deduction,
      mileageNet: netMil,
      mileageAmount: Math.round(milAmount * 100) / 100,
      outstationAmount: outAmount,
      total: Math.round((milAmount + toll + medical + outAmount) * 100) / 100
    };
  };

  const handleRowChange = (index, field, value) => {
    const updated = [...items];
    const item = { ...updated[index] };

    if (field === 'mileageDistance') {
      item.mileageDistance = parseFloat(value) || 0;
    } else if (field === 'outstationType') {
      item.outstationType = value;
    } else if (field === 'toll' || field === 'medical') {
      item[field] = parseFloat(value) || 0;
    } else {
      item[field] = value;
    }

    const calculated = calculateRowTotal(item);
    item.mileageDeduction = calculated.mileageDeduction;
    item.mileageNet = calculated.mileageNet;
    item.mileageAmount = calculated.mileageAmount;
    item.outstationAmount = calculated.outstationAmount;
    item.total = calculated.total;

    updated[index] = item;
    setItems(updated);
    setValidationError('');
  };

  // Handle multiple receipt files uploading (Base64 conversion)
  const handleReceiptsUpload = (index, files) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const loadedReceipts = [];

    let loadedCount = 0;
    fileArray.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        loadedReceipts.push(e.target.result);
        loadedCount++;
        if (loadedCount === fileArray.length) {
          const updated = [...items];
          updated[index].receipts = [...(updated[index].receipts || []), ...loadedReceipts];
          updated[index].receipt = updated[index].receipts[0] || '';
          setItems(updated);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveReceipt = (index, receiptIndex) => {
    const updated = [...items];
    const itemReceipts = updated[index].receipts || [];
    const newReceipts = itemReceipts.filter((_, i) => i !== receiptIndex);
    updated[index].receipts = newReceipts;
    updated[index].receipt = newReceipts[0] || '';
    setItems(updated);
  };

  const addRow = () => {
    const lastItem = items[items.length - 1] || {};
    setItems([
      ...items,
      {
        date: lastItem.date || new Date().toISOString().split('T')[0],
        journey: '',
        vehicle: lastItem.vehicle || 'bike',
        cameBackToOffice: lastItem.cameBackToOffice || 'no',
        mileageDistance: 0,
        mileageDeduction: 0,
        mileageNet: 0,
        mileageAmount: 0.00,
        outstationType: 'none',
        outstationAmount: 0.00,
        toll: 0.00,
        medical: 0.00,
        receipt: '',
        receipts: [],
        total: 0.00
      }
    ]);
  };

  const removeRow = (index) => {
    if (items.length === 1) {
      setItems([{
        date: new Date().toISOString().split('T')[0],
        journey: '',
        vehicle: 'bike',
        cameBackToOffice: 'no',
        mileageDistance: 0,
        mileageDeduction: 0,
        mileageNet: 0,
        mileageAmount: 0.00,
        outstationType: 'none',
        outstationAmount: 0.00,
        toll: 0.00,
        medical: 0.00,
        receipt: '',
        receipts: [],
        total: 0.00
      }]);
    } else {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // Totals calculations
  const totalDistance = items.reduce((sum, item) => sum + (item.mileageNet || 0), 0);
  const totalRawDistance = items.reduce((sum, item) => sum + (item.mileageDistance || 0), 0);
  const totalDeductedDistance = items.reduce((sum, item) => sum + (item.mileageDeduction || 0), 0);
  const totalMileageRM = items.reduce((sum, item) => sum + (item.mileageAmount || 0), 0);
  const totalToll = items.reduce((sum, item) => sum + (item.toll || 0), 0);
  const totalMedical = items.reduce((sum, item) => sum + (item.medical || 0), 0);
  const totalOutstationDays = items.reduce((sum, item) => sum + (item.outstationType === 'daily' ? 1 : item.outstationType === 'sleepover' ? 1 : 0), 0);
  const totalOutstationAmount = items.reduce((sum, item) => sum + (item.outstationAmount || 0), 0);
  const grandTotal = items.reduce((sum, item) => sum + (item.total || 0), 0);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validations:
    // 1. Journey/Description is required if there is any claim amount
    const noDescIndex = items.findIndex(item => item.total > 0 && !item.journey.trim());
    if (noDescIndex !== -1) {
      setValidationError(`Row ${noDescIndex + 1}: Journey / Description is required for items with claim value.`);
      return;
    }

    // 2. Receipt check: Every row must have at least one proof/receipt attached
    const noReceiptIndex = items.findIndex(item => !item.receipts || item.receipts.length === 0);
    if (noReceiptIndex !== -1) {
      setValidationError(`Row ${noReceiptIndex + 1}: Proof/receipt attachment is compulsory.`);
      return;
    }

    // Sort items chronologically by date before submitting
    const sortedItems = [...items].sort((a, b) => new Date(a.date) - new Date(b.date));

    const claim = {
      type: 'general',
      items: sortedItems,
      totals: {
        mileageDistance: totalDistance,
        mileageAmount: totalMileageRM,
        toll: totalToll,
        medical: totalMedical,
        outstationDays: totalOutstationDays,
        outstationAmount: totalOutstationAmount,
        grandTotal: grandTotal
      }
    };
    onSubmitClaim(claim);
  };

  const handleSave = () => {
    // Sort items chronologically by date before saving draft
    const sortedItems = [...items].sort((a, b) => new Date(a.date) - new Date(b.date));

    const claim = {
      type: 'general',
      items: sortedItems,
      totals: {
        mileageDistance: totalDistance,
        mileageAmount: totalMileageRM,
        toll: totalToll,
        medical: totalMedical,
        outstationDays: totalOutstationDays,
        outstationAmount: totalOutstationAmount,
        grandTotal: grandTotal
      }
    };
    onSaveDraft(claim);
  };

  return (
    <div className="space-y-6 max-w-none mx-auto">
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
          <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-400" />
            {role === 'admin' ? 'Admin Edit Mode — General Staff Claim' : 'General Staff Claim Form'}
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {role === 'admin'
              ? `Reviewing and correcting mileage, toll, medical, or other claims for ${draftClaim ? draftClaim.employeeName : 'staff'}.`
              : 'Total Neutron Solution Sdn Bhd — Enter travel mileage, toll, medical, or other operational claims.'}
          </p>
        </div>

        {/* Display Validation Error */}
        {validationError && (
          <div className="mb-6 p-4 bg-rose-500/20 border border-rose-500/50 rounded-xl flex items-center gap-3 text-rose-300">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}
        {/* Rules Banner */}
        <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 mb-6 flex flex-col md:flex-row gap-6 justify-between text-xs">
          <div className="space-y-1 text-slate-400">
            <div className="font-bold text-slate-300 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> IMPORTANT REMARKS:
            </div>
            <div>• **Mileage Claim**: Enter total travel distance. The system automatically deducts 15km (1-way) or 30km (returned to office).</div>
            <div>• **Proof / Receipts**: ALL claim rows MUST be attached with proof (multiple files supported).</div>
          </div>
          <div className="flex flex-wrap gap-4 items-center justify-end grow md:grow-0">
            <div className="bg-slate-900/60 px-4 py-2 rounded-xl border border-slate-800/80 text-center font-mono">
              <span className="text-slate-500 block text-[9px] uppercase font-bold">Mileage Summary</span>
              <span className="text-slate-300 text-xs">
                Total: <span className="font-bold">{totalRawDistance} km</span> |
                Deducted: <span className="text-slate-400 font-bold">-{totalDeductedDistance} km</span> |
                Net: <span className="text-cyan-400 font-bold">{totalDistance.toFixed(2)} km</span>
              </span>
            </div>
            <div className="bg-slate-900/60 px-6 py-3 rounded-xl border border-slate-800 flex items-center justify-center text-center">
              <div className="font-mono">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">GRAND TOTAL</span>
                <span className="text-emerald-400 font-extrabold text-sm">RM {grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop View Table */}
        <div className="hidden lg:block overflow-x-auto mb-6">
          <table className="w-full text-left border-collapse min-w-[1250px]">
            <thead>
              <tr className="bg-slate-950/50 text-slate-400 text-[10px] font-semibold uppercase tracking-wider border-b border-slate-800">
                <th className="px-3 py-3 w-[140px]">Date</th>
                <th className="px-3 py-3 border-l-2 border-slate-600/70 pl-3 bg-slate-800/25">Journey / Description</th>
                <th className="px-3 py-3 w-[80px] bg-slate-800/25">Vehicle</th>
                <th className="px-3 py-3 w-[85px] bg-slate-800/25 text-center">Total Mil (KM)</th>
                <th className="px-3 py-3 w-[120px] bg-slate-800/25 text-center">Return to Office?</th>
                <th className="px-3 py-3 w-[80px] bg-slate-800/25 text-center">Deducted (KM)</th>
                <th className="px-3 py-3 w-[80px] bg-slate-800/25 text-center">Net Mil (KM)</th>
                <th className="px-3 py-3 w-[85px] bg-slate-800/25">Mil (RM)</th>
                <th className="px-3 py-3 w-[120px] border-l-2 border-slate-600/70 pl-3 bg-cyan-500/[0.06]">Outstation Type</th>
                <th className="px-3 py-3 w-[95px] bg-cyan-500/[0.06]">Outstation (RM)</th>
                <th className="px-3 py-3 w-[90px] border-l-2 border-slate-600/70 pl-3 bg-blue-500/[0.06]">Toll (RM)</th>
                <th className="px-3 py-3 w-[90px] border-l-2 border-slate-600/70 pl-3 bg-indigo-500/[0.06]">Medical (RM)</th>
                <th className="px-3 py-3 w-[120px] border-l-2 border-slate-600/70 pl-3 bg-violet-500/[0.06]">Proof</th>
                <th className="px-3 py-3 w-[90px] text-right border-l-2 border-slate-600/70 pl-3">Total (RM)</th>
                <th className="px-3 py-3 w-[50px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {items.map((item, index) => (
                <tr key={index} className="hover:bg-slate-800/10">
                  {/* Date */}
                  <td className="px-2 py-3 text-slate-300">
                    <input
                      type="date"
                      value={item.date}
                      required
                      onChange={(e) => handleRowChange(index, 'date', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600"
                      style={{ colorScheme: 'light' }}
                    />
                  </td>

                  {/* Journey */}
                  <td className="px-2 py-3 border-l-2 border-slate-600/70 pl-2.5 bg-slate-800/[0.04]">
                    <input
                      type="text"
                      placeholder="Journey/Description"
                      value={item.journey}
                      onChange={(e) => handleRowChange(index, 'journey', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                    />
                  </td>

                  {/* Vehicle Selector */}
                  <td className="px-2 py-3 bg-slate-800/[0.04]">
                    <select
                      value={item.vehicle || 'bike'}
                      onChange={(e) => handleRowChange(index, 'vehicle', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
                    >
                      <option value="car">Car</option>
                      <option value="bike">Bike</option>
                    </select>
                  </td>

                  {/* Total Mileage (Distance) */}
                  <td className="px-2 py-3 bg-slate-800/[0.04]">
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={item.mileageDistance || ''}
                        onChange={(e) => handleRowChange(index, 'mileageDistance', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </td>

                  {/* Return to Office Dropdown */}
                  <td className="px-2 py-3 bg-slate-800/[0.04]">
                    <select
                      value={item.cameBackToOffice || 'no'}
                      onChange={(e) => handleRowChange(index, 'cameBackToOffice', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </td>

                  {/* Deducted Mileage (KM) */}
                  <td className="px-2 py-3 text-center text-slate-400 font-mono text-xs bg-slate-800/[0.04]">
                    {item.mileageDeduction || 0} km
                  </td>

                  {/* Net Mileage (KM) */}
                  <td className="px-2 py-3 text-center text-slate-200 font-mono text-xs font-bold bg-slate-800/[0.04]">
                    {(item.mileageNet || 0).toFixed(2)} km
                  </td>

                  {/* Mileage (Calculated RM) */}
                  <td className="px-2 py-3 text-slate-400 font-mono text-xs bg-slate-800/[0.04]">
                    RM {(item.mileageAmount || 0).toFixed(2)}
                  </td>

                  {/* Outstation Type */}
                  <td className="px-2 py-3 border-l-2 border-slate-600/70 pl-2.5 bg-cyan-500/[0.02]">
                    <select
                      value={item.outstationType || 'none'}
                      onChange={(e) => handleRowChange(index, 'outstationType', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
                    >
                      <option value="none">None</option>
                      <option value="daily">Daily</option>
                      <option value="sleepover">Sleepover</option>
                    </select>
                  </td>

                  {/* Outstation (Calculated RM) */}
                  <td className="px-2 py-3 text-slate-400 font-mono text-xs bg-cyan-500/[0.02]">
                    RM {item.outstationAmount.toFixed(2)}
                  </td>

                  {/* Toll */}
                  <td className="px-2 py-3 border-l-2 border-slate-600/70 pl-2.5 bg-blue-500/[0.02]">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={item.toll || ''}
                      onChange={(e) => handleRowChange(index, 'toll', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 font-mono"
                    />
                  </td>

                  {/* Medical */}
                  <td className="px-2 py-3 border-l-2 border-slate-600/70 pl-2.5 bg-indigo-500/[0.02]">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={item.medical || ''}
                      onChange={(e) => handleRowChange(index, 'medical', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 font-mono"
                    />
                  </td>

                  {/* Proof Upload */}
                  <td className="px-2 py-3 border-l-2 border-slate-600/70 pl-2.5 bg-violet-500/[0.02]">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <label className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-semibold cursor-pointer transition-all ${item.receipts && item.receipts.length > 0
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                          }`}>
                          <Upload className="w-3.5 h-3.5 shrink-0" />
                          <span>{item.receipts && item.receipts.length > 0 ? `Attached (${item.receipts.length})` : 'Upload'}</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            multiple
                            onChange={(e) => handleReceiptsUpload(index, e.target.files)}
                          />
                        </label>
                      </div>

                      {/* Uploaded files listing */}
                      {item.receipts && item.receipts.length > 0 && (
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {item.receipts.map((rcpt, rIdx) => (
                            <div key={rIdx} className="relative group/thumb">
                              <button
                                type="button"
                                onClick={() => setReceiptPreviewUrl(rcpt)}
                                className="p-1 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded border border-slate-700 transition-colors"
                                title={`Preview proof ${rIdx + 1}`}
                              >
                                {rcpt.startsWith('data:application/pdf') ? (
                                  <FileText className="w-3 h-3 text-cyan-400" />
                                ) : (
                                  <ImageIcon className="w-3 h-3 text-slate-400" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveReceipt(index, rIdx)}
                                className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full p-0.5 hover:bg-rose-500 shadow-md transition-colors"
                                title="Remove proof"
                              >
                                <X className="w-2 h-2" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Row Total */}
                  <td className="px-2 py-3 text-right font-mono font-bold text-slate-200 text-xs border-l-2 border-slate-600/70 pl-2.5">
                    RM {item.total.toFixed(2)}
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

        {/* Mobile / Card View */}
        <div className="lg:hidden space-y-4 mb-6">
          {items.map((item, index) => (
            <div key={index} className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
                <span className="text-xs font-bold text-slate-400">Row #{index + 1}</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                    Total: RM {item.total.toFixed(2)}
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
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600"
                    style={{ colorScheme: 'light' }}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Vehicle Type</label>
                  <select
                    value={item.vehicle || 'bike'}
                    onChange={(e) => handleRowChange(index, 'vehicle', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="car">Car</option>
                    <option value="bike">Bike</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Total Mileage (KM)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Distance"
                    value={item.mileageDistance || ''}
                    onChange={(e) => handleRowChange(index, 'mileageDistance', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Return to Office?</label>
                  <select
                    value={item.cameBackToOffice || 'no'}
                    onChange={(e) => handleRowChange(index, 'cameBackToOffice', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-900/40 p-2 rounded border border-slate-800">
                  <span className="text-[8px] text-slate-500 uppercase block">Deducted</span>
                  <span className="text-xs font-mono font-bold text-slate-400">{item.mileageDeduction || 0} km</span>
                </div>
                <div className="bg-slate-900/40 p-2 rounded border border-slate-800">
                  <span className="text-[8px] text-slate-500 uppercase block">Net KM</span>
                  <span className="text-xs font-mono font-bold text-cyan-400">{(item.mileageNet || 0).toFixed(2)} km</span>
                </div>
                <div className="bg-slate-900/40 p-2 rounded border border-slate-800">
                  <span className="text-[8px] text-slate-500 uppercase block">Mileage RM</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">RM {(item.mileageAmount || 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Toll (RM)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={item.toll || ''}
                    onChange={(e) => handleRowChange(index, 'toll', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Medical (RM)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={item.medical || ''}
                    onChange={(e) => handleRowChange(index, 'medical', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Journey / Description</label>
                <input
                  type="text"
                  placeholder="Where and why did you travel?"
                  value={item.journey}
                  onChange={(e) => handleRowChange(index, 'journey', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Outstation Type</label>
                  <select
                    value={item.outstationType || 'none'}
                    onChange={(e) => handleRowChange(index, 'outstationType', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="none">None</option>
                    <option value="daily">Daily</option>
                    <option value="sleepover">Sleepover</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Outstation RM</label>
                  <div className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 font-mono">
                    RM {item.outstationAmount.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Proof/Receipts:</span>
                  <div className="flex items-center gap-2">
                    <label className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${item.receipts && item.receipts.length > 0
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                      }`}>
                      <Upload className="w-3.5 h-3.5" />
                      <span>{item.receipts && item.receipts.length > 0 ? `Attached (${item.receipts.length})` : 'Capture Proof'}</span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        multiple
                        onChange={(e) => handleReceiptsUpload(index, e.target.files)}
                      />
                    </label>
                  </div>
                </div>

                {/* Mobile receipts list */}
                {item.receipts && item.receipts.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-slate-800">
                    {item.receipts.map((rcpt, rIdx) => (
                      <div key={rIdx} className="relative group/thumb">
                        <button
                          type="button"
                          onClick={() => setReceiptPreviewUrl(rcpt)}
                          className="p-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded border border-slate-700 transition-colors flex items-center justify-center"
                          title={`Preview proof ${rIdx + 1}`}
                        >
                          {rcpt.startsWith('data:application/pdf') ? (
                            <FileText className="w-3.5 h-3.5 text-cyan-400" />
                          ) : (
                            <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveReceipt(index, rIdx)}
                          className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full p-0.5 hover:bg-rose-500 shadow-md transition-colors"
                          title="Remove proof"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
            <Plus className="w-4 h-4 text-blue-400" />
            Add Claim Item
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
              className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-blue-500/10 active:scale-95 transition-all cursor-pointer"
            >
              {role === 'admin' ? 'Save & Approve Claim' : 'Submit Claim Report'}
            </button>
          </div>
        </div>
      </div>

      {/* Receipt Modal Preview */}
      {receiptPreviewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className={`bg-slate-900 rounded-2xl border border-slate-800 w-full p-5 shadow-2xl relative ${receiptPreviewUrl.startsWith('data:application/pdf') ? 'max-w-3xl' : 'max-w-md'
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
