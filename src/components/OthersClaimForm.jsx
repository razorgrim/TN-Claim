import React, { useState } from 'react';
import { Plus, Trash2, Calendar, FileText, Upload, AlertTriangle, CheckCircle, ArrowLeft, Image as ImageIcon } from 'lucide-react';

export default function OthersClaimForm({ profile, draftClaim, role, onSaveDraft, onSubmitClaim, onCancel }) {
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
        description: '',
        amount: 0.00,
        receipt: ''
      }
    ];
  });

  const [validationError, setValidationError] = useState('');
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState(null);

  const handleRowChange = (index, field, value) => {
    const updated = [...items];
    const item = { ...updated[index] };

    if (field === 'amount') {
      item.amount = parseFloat(value) || 0;
    } else {
      item[field] = value;
    }

    updated[index] = item;
    setItems(updated);
    setValidationError('');
  };

  // Handle receipt image/PDF uploading (Base64 conversion)
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
        description: '',
        amount: 0.00,
        receipt: ''
      }
    ]);
  };

  const removeRow = (index) => {
    if (items.length === 1) {
      setItems([{
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: 0.00,
        receipt: ''
      }]);
    } else {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // Totals calculations
  const grandTotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validations:
    // 1. Description is compulsory
    const noDescIndex = items.findIndex(item => !item.description.trim());
    if (noDescIndex !== -1) {
      setValidationError(`Row ${noDescIndex + 1}: Description is compulsory.`);
      return;
    }

    // 2. Amount must be > 0
    const invalidAmtIndex = items.findIndex(item => !(item.amount > 0));
    if (invalidAmtIndex !== -1) {
      setValidationError(`Row ${invalidAmtIndex + 1}: Amount must be greater than RM 0.00.`);
      return;
    }

    // 3. Receipt check: Proof is compulsory
    const noReceiptIndex = items.findIndex(item => !item.receipt);
    if (noReceiptIndex !== -1) {
      setValidationError(`Row ${noReceiptIndex + 1}: Attachment proving the claim is compulsory.`);
      return;
    }

    // Sort items chronologically by date before submitting
    const sortedItems = [...items].sort((a, b) => new Date(a.date) - new Date(b.date));

    const claim = {
      type: 'others',
      items: sortedItems,
      totals: {
        grandTotal: grandTotal
      }
    };
    onSubmitClaim(claim);
  };

  const handleSave = () => {
    // Sort items chronologically by date before saving draft
    const sortedItems = [...items].sort((a, b) => new Date(a.date) - new Date(b.date));

    const claim = {
      type: 'others',
      items: sortedItems,
      totals: {
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
          <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400 flex items-center gap-2">
            <FileText className="w-6 h-6 text-purple-400" />
            {role === 'admin' ? 'Admin Edit Mode — Others Claim' : 'Others Claim Form'}
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {role === 'admin' 
              ? `Reviewing and correcting miscellaneous operational claims for ${draftClaim ? draftClaim.employeeName : 'staff'}.` 
              : 'Total Neutron Solution Sdn Bhd — Enter miscellaneous claims that are not covered under Mileage, Toll, Medical, or OT.'}
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
              <CheckCircle className="w-3.5 h-3.5 text-purple-400" /> IMPORTANT REMARKS:
            </div>
            <div>• COMPULSORY to fill in the Description and Amount for each entry.</div>
            <div>• COMPULSORY to attach proof (image or PDF) validating each claim item.</div>
          </div>
          <div className="bg-slate-900/60 px-4 py-3 rounded-xl border border-slate-800 flex items-center justify-between text-center shrink-0">
            <div className="font-mono">
              <span className="text-slate-400 block text-[10px]">GRAND TOTAL</span>
              <span className="text-purple-400 font-extrabold text-sm">RM {grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Desktop View Table */}
        <div className="hidden lg:block overflow-x-auto mb-6">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-950/50 text-slate-400 text-[10px] font-semibold uppercase tracking-wider border-b border-slate-800">
                <th className="px-3 py-3 w-[150px]">Date</th>
                <th className="px-3 py-3">Description (Compulsory)</th>
                <th className="px-3 py-3 w-[150px]">Amount (RM)</th>
                <th className="px-3 py-3 w-[150px]">Proof</th>
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
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600"
                      style={{ colorScheme: 'light' }}
                    />
                  </td>

                  {/* Description */}
                  <td className="px-2 py-3">
                    <input
                      type="text"
                      placeholder="e.g. postage, refreshments, stationeries"
                      value={item.description}
                      required
                      onChange={(e) => handleRowChange(index, 'description', e.target.value)}
                      className={`w-full bg-slate-950 border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 ${
                        !item.description.trim() ? 'border-amber-500/50' : 'border-slate-700'
                      }`}
                    />
                  </td>

                  {/* Amount */}
                  <td className="px-2 py-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={item.amount || ''}
                      required
                      onChange={(e) => handleRowChange(index, 'amount', e.target.value)}
                      className={`w-full bg-slate-950 border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 font-mono ${
                        !(item.amount > 0) ? 'border-amber-500/50' : 'border-slate-700'
                      }`}
                    />
                  </td>

                  {/* Proof Upload */}
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2">
                      <label className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-semibold cursor-pointer transition-all ${
                        item.receipt 
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                          : 'bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
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
                  <span className="font-mono text-xs font-bold text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded">
                    RM {item.amount.toFixed(2)}
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
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Description (Compulsory)</label>
                <input
                  type="text"
                  placeholder="e.g. postage, refreshments, stationeries"
                  value={item.description}
                  onChange={(e) => handleRowChange(index, 'description', e.target.value)}
                  className={`w-full bg-slate-900 border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 ${
                    !item.description.trim() ? 'border-amber-500/50' : 'border-slate-700'
                  }`}
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Amount (RM)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={item.amount || ''}
                  onChange={(e) => handleRowChange(index, 'amount', e.target.value)}
                  className={`w-full bg-slate-900 border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono ${
                    !(item.amount > 0) ? 'border-amber-500/50' : 'border-slate-700'
                  }`}
                />
              </div>

              <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-xs font-semibold text-slate-400">Claim Proof:</span>
                <div className="flex items-center gap-2">
                  <label className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                    item.receipt 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                      : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
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
            <Plus className="w-4 h-4 text-purple-400" />
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
              className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-purple-500/10 active:scale-95 transition-all cursor-pointer"
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
