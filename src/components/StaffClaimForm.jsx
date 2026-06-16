import React, { useState } from 'react';
import { 
  Plus, Trash2, Calendar, FileText, Upload, Eye, EyeOff, AlertTriangle, CheckCircle, ArrowLeft, Image as ImageIcon 
} from 'lucide-react';

export default function StaffClaimForm({ profile, draftClaim, role, onSaveDraft, onSubmitClaim, onCancel }) {
  const [items, setItems] = useState(() => {
    if (draftClaim && draftClaim.items && draftClaim.items.length > 0) {
      return draftClaim.items.map(item => ({
        ...item,
        vehicle: item.vehicle || 'bike',
        outstationType: item.outstationType || (item.outstationDays ? (parseInt(item.outstationDays, 10) === 1 ? 'daily' : 'sleepover') : 'none'),
        outstationAmount: item.outstationAmount || 0
      }));
    }
    return [
      {
        date: new Date().toISOString().split('T')[0],
        journey: '',
        vehicle: 'bike',
        outstationType: 'none',
        outstationAmount: 0.00,
        mileageDistance: 0,
        mileageAmount: 0.00,
        toll: 0.00,
        medical: 0.00,
        receipt: '', // Base64 receipt image
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
    const milAmount = (item.mileageDistance || 0) * rate;
    const toll = parseFloat(item.toll) || 0;
    const medical = parseFloat(item.medical) || 0;
    
    let outAmount = 0;
    if (item.outstationType === 'daily') {
      outAmount = 15;
    } else if (item.outstationType === 'sleepover') {
      outAmount = 30;
    }
    
    return {
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
    item.mileageAmount = calculated.mileageAmount;
    item.outstationAmount = calculated.outstationAmount;
    item.total = calculated.total;

    updated[index] = item;
    setItems(updated);
    setValidationError('');
  };

  // Handle receipt image uploading (Base64 conversion)
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
        journey: '',
        vehicle: lastItem.vehicle || 'bike',
        outstationType: 'none',
        outstationAmount: 0.00,
        mileageDistance: 0,
        mileageAmount: 0.00,
        toll: 0.00,
        medical: 0.00,
        receipt: '',
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
        outstationType: 'none',
        outstationAmount: 0.00,
        mileageDistance: 0,
        mileageAmount: 0.00,
        toll: 0.00,
        medical: 0.00,
        receipt: '',
        total: 0.00
      }]);
    } else {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // Totals calculations
  const totalDistance = items.reduce((sum, item) => sum + (item.mileageDistance || 0), 0);
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

    // 2. Receipt check: Toll claim must be attached with proof
    const noTollReceiptIndex = items.findIndex(item => item.toll > 0 && !item.receipt);
    if (noTollReceiptIndex !== -1) {
      setValidationError(`Row ${noTollReceiptIndex + 1}: Toll claim must be attached with proof.`);
      return;
    }

    // 3. Receipt check: Medical claim must be attached with proof
    const noMedicalReceiptIndex = items.findIndex(item => item.medical > 0 && !item.receipt);
    if (noMedicalReceiptIndex !== -1) {
      setValidationError(`Row ${noMedicalReceiptIndex + 1}: Medical claim must be attached with proof.`);
      return;
    }

    // 4. Mileage check: mileage distance should exceed 15km (warning already shown, but let's enforce if there's distance but it's small without confirmation)
    const lowMileageIndex = items.findIndex(item => item.mileageDistance > 0 && item.mileageDistance < 15);
    if (lowMileageIndex !== -1) {
      // Just a warning in form, but let's block or ask to confirm. Let's allow them to submit but warn in UI.
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
            <div>• **Mileage Claim** (Car: **RM 0.50/KM**, Bike: **RM 0.40/KM**) must exceed minimum radius of **15KM** from office.</div>
            <div>• **Outstation Claim**: **Daily** = **RM 15.00** | **Sleepover** = **RM 30.00**.</div>
            <div>• **Toll and Medical Claims** MUST be attached with proof.</div>
          </div>
          <div className="bg-slate-900/60 px-4 py-3 rounded-xl border border-slate-800 flex flex-wrap gap-4 items-center justify-between text-center grow md:grow-0">
            <div className="font-mono text-left">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Mileage Rates</span>
              <span className="text-cyan-400 font-bold text-xs block">Car: RM 0.50/KM</span>
              <span className="text-cyan-400 font-bold text-xs block">Bike: RM 0.40/KM</span>
            </div>
            <div className="border-l border-slate-800 h-8 hidden sm:block" />
            <div className="font-mono">
              <span className="text-slate-400 block text-[10px]">GRAND TOTAL</span>
              <span className="text-emerald-400 font-extrabold text-sm">RM {grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Desktop View Table */}
        <div className="hidden lg:block overflow-x-auto mb-6">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-slate-950/50 text-slate-400 text-[10px] font-semibold uppercase tracking-wider border-b border-slate-800">
                <th className="px-3 py-3 w-[140px]">Date</th>
                <th className="px-3 py-3">Journey / Description</th>
                <th className="px-3 py-3 w-[100px]">Vehicle</th>
                <th className="px-3 py-3 w-[120px]">Outstation Type</th>
                <th className="px-3 py-3 w-[95px]">Outstation (RM)</th>
                <th className="px-3 py-3 w-[90px]">Mil (KM)</th>
                <th className="px-3 py-3 w-[90px]">Mil (RM)</th>
                <th className="px-3 py-3 w-[90px]">Toll (RM)</th>
                <th className="px-3 py-3 w-[90px]">Medical (RM)</th>
                <th className="px-3 py-3 w-[120px]">Proof</th>
                <th className="px-3 py-3 w-[90px] text-right">Total (RM)</th>
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
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                    />
                  </td>

                  {/* Journey */}
                  <td className="px-2 py-3">
                    <input
                      type="text"
                      placeholder="Journey/Description"
                      value={item.journey}
                      onChange={(e) => handleRowChange(index, 'journey', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                    />
                  </td>

                  {/* Vehicle Selector */}
                  <td className="px-2 py-3">
                    <select
                      value={item.vehicle || 'bike'}
                      onChange={(e) => handleRowChange(index, 'vehicle', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
                    >
                      <option value="car">Car</option>
                      <option value="bike">Bike</option>
                    </select>
                  </td>

                  {/* Outstation Type */}
                  <td className="px-2 py-3">
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
                  <td className="px-2 py-3 text-slate-400 font-mono text-xs">
                    RM {item.outstationAmount.toFixed(2)}
                  </td>

                  {/* Mileage (Distance) */}
                  <td className="px-2 py-3">
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={item.mileageDistance || ''}
                        onChange={(e) => handleRowChange(index, 'mileageDistance', e.target.value)}
                        className={`w-full bg-slate-950 border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 ${
                          item.mileageDistance > 0 && item.mileageDistance < 15 ? 'border-amber-500/50' : 'border-slate-700'
                        }`}
                      />
                      {item.mileageDistance > 0 && item.mileageDistance < 15 && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-amber-500" title="Must exceed 15km radius">
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Mileage (Calculated RM) */}
                  <td className="px-2 py-3 text-slate-400 font-mono text-xs">
                    RM {item.mileageAmount.toFixed(2)}
                  </td>

                  {/* Toll */}
                  <td className="px-2 py-3">
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
                  <td className="px-2 py-3">
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
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2">
                      <label className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-semibold cursor-pointer transition-all ${
                        item.receipt 
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                          : (item.toll > 0 || item.medical > 0) 
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

                  {/* Row Total */}
                  <td className="px-2 py-3 text-right font-mono font-bold text-slate-200 text-xs">
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
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
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
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Mileage (KM)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Distance"
                    value={item.mileageDistance || ''}
                    onChange={(e) => handleRowChange(index, 'mileageDistance', e.target.value)}
                    className={`w-full bg-slate-900 border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 ${
                      item.mileageDistance > 0 && item.mileageDistance < 15 ? 'border-amber-500' : 'border-slate-700'
                    }`}
                  />
                  {item.mileageDistance > 0 && item.mileageDistance < 15 && (
                    <span className="text-[9px] text-amber-500 mt-1 block">Min radius is 15KM</span>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Mileage RM</label>
                  <div className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 font-mono">
                    RM {item.mileageAmount.toFixed(2)}
                  </div>
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

              <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-xs font-semibold text-slate-400">Toll/Med Proof:</span>
                <div className="flex items-center gap-2">
                  <label className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                    item.receipt 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                      : (item.toll > 0 || item.medical > 0)
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
