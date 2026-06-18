import React, { useState } from 'react';
import {
  ArrowLeft, Check, X, Printer, Calendar, FileText, CheckCircle2, AlertCircle, XCircle, ImageIcon, Trash2, Archive
} from 'lucide-react';
import { MOCK_RECEIPT_IMAGES } from '../utils/mockData.js';
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const cleanDate = dateStr.split('T')[0].split(' ')[0];
  const parts = cleanDate.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const year = parts[0].slice(-2);
    const month = parts[1];
    const day = parts[2];
    const malayMonths = {
      '01': 'JAN', '02': 'FEB', '03': 'MAC', '04': 'APR',
      '05': 'MEI', '06': 'JUN', '07': 'JUL', '08': 'OGO',
      '09': 'SEP', '10': 'OKT', '11': 'NOV', '12': 'DIS'
    };
    const monthLabel = malayMonths[month] || month;
    return `${day} ${monthLabel} ${year}`;
  }
  return dateStr;
};

export default function ClaimDetailView({ role, claim, onBack, onApprove, onReject, onEditClaim, onDeleteClaim, onArchiveClaim }) {
  const [adminComments, setAdminComments] = useState(claim.admin_comments || claim.adminComments || '');
  const [receiptModalUrl, setReceiptModalUrl] = useState(null);

  const [reviewItems, setReviewItems] = useState(() => {
    return (claim.items || []).map(item => ({
      ...item,
      approved: claim.status === 'Pending' ? false : (item.approved === true)
    }));
  });

  const calculateTotals = (items, type) => {
    const approvedItems = items.filter(item => item.approved === true);
    if (type === 'ot') {
      const totalWeekday = approvedItems.reduce((sum, item) => sum + (item.weekdayHours || 0), 0);
      const totalWeekend = approvedItems.reduce((sum, item) => sum + (item.weekendHours || 0), 0);
      return {
        weekdayHours: Math.round(totalWeekday * 10) / 10,
        weekendHours: Math.round(totalWeekend * 10) / 10
      };
    } else if (type === 'others') {
      const grandTotal = approvedItems.reduce((sum, item) => sum + (item.amount || 0), 0);
      return {
        grandTotal: Math.round(grandTotal * 100) / 100
      };
    } else {
      // general
      const totalDistance = Math.round(approvedItems.reduce((sum, item) => sum + (item.mileageNet !== undefined ? parseFloat(item.mileageNet) : Math.max(0, (item.mileageDistance || 0) - (item.mileageDistance > 0 ? (item.cameBackToOffice === 'no' ? 15 : 30) : 0))), 0) * 100) / 100;
      const totalMileageRM = approvedItems.reduce((sum, item) => sum + (item.mileageAmount || 0), 0);
      const totalToll = approvedItems.reduce((sum, item) => sum + (item.toll || 0), 0);
      const totalMedical = approvedItems.reduce((sum, item) => sum + (item.medical || 0), 0);
      const totalOutstationDays = approvedItems.reduce((sum, item) => {
        return sum + (item.outstationType === 'daily' || item.outstationType === 'sleepover' ? 1 : 0);
      }, 0);
      const totalOutstationAmount = approvedItems.reduce((sum, item) => sum + (item.outstationAmount || 0), 0);
      const grandTotal = approvedItems.reduce((sum, item) => sum + (item.total !== undefined ? item.total : ((item.mileageAmount || 0) + (item.toll || 0) + (item.medical || 0) + (item.outstationAmount || 0))), 0);

      return {
        mileageDistance: totalDistance,
        mileageAmount: totalMileageRM,
        toll: totalToll,
        medical: totalMedical,
        outstationDays: totalOutstationDays,
        outstationAmount: totalOutstationAmount,
        grandTotal: Math.round(grandTotal * 100) / 100
      };
    }
  };

  const toggleRowApproval = (index) => {
    if (claim.status !== 'Pending') return;
    setReviewItems(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, approved: !item.approved };
      }
      return item;
    }));
  };

  const currentTotals = calculateTotals(reviewItems, claim.type);
  const approvedItems = reviewItems.filter(item => item.approved === true);

  const handleApprove = () => {
    const computedTotals = calculateTotals(reviewItems, claim.type);
    onApprove(claim.id, adminComments, reviewItems, computedTotals);
  };

  const handleReject = () => {
    const computedTotals = calculateTotals(reviewItems, claim.type);
    onReject(claim.id, adminComments, reviewItems, computedTotals);
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper to fetch receipt image (mock SVG or user base64)
  const getReceiptImage = (receiptKey) => {
    if (!receiptKey) return null;
    if (receiptKey.startsWith('data:') || receiptKey.startsWith('/uploads/')) return receiptKey;
    return MOCK_RECEIPT_IMAGES[receiptKey] || null;
  };

  const isPdf = (url) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.startsWith('data:application/pdf') || lower.endsWith('.pdf') || lower.includes('.pdf');
  };

  const getItemReceipts = (item) => {
    if (item.receipts && Array.isArray(item.receipts) && item.receipts.length > 0) {
      return item.receipts;
    }
    return item.receipt ? [item.receipt] : [];
  };

  const allRowsApproved = claim.status === 'Approved' && (claim.items || []).every(item => item.approved === true);

  return (
    <div className="space-y-6 max-w-none mx-auto px-2 md:px-6">
      <style dangerouslySetInnerHTML={{
        __html: `
        /* General styling for the print area (both screen preview and print) */
        .print-area {
          font-size: 12px !important;
          line-height: 1.2 !important;
        }
        .print-area table, 
        .print-area table th, 
        .print-area table td,
        .print-area .text-xs,
        .print-area .text-sm,
        .print-area .text-\[11px\],
        .print-area .text-slate-500,
        .print-area .text-slate-800 {
          font-size: 12px !important;
          line-height: 1.2 !important;
        }
        .print-area table th, 
        .print-area table td {
          padding: 3px 5px !important;
        }
        .print-area .mb-6 {
          margin-bottom: 8px !important;
        }
        .print-area .mb-10 {
          margin-bottom: 12px !important;
        }
        .print-area .pb-5 {
          padding-bottom: 4px !important;
        }
        .print-area .pt-8 {
          padding-top: 6px !important;
        }
        .print-area .py-2.5,
        .print-area .py-3 {
          padding-top: 4px !important;
          padding-bottom: 4px !important;
        }
        .print-gallery-page {
          background: white !important;
          color: black !important;
        }
        
        @media print {
          @page {
            size: landscape;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .print-area {
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          .print-gallery-page {
            page-break-before: always !important;
            break-before: page !important;
          }
          .page-break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}} />
      {/* Top Navigation Panel - Hidden during print */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print bg-slate-900/40 p-4 rounded-xl border border-slate-800">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex gap-2">
          {((role === 'admin' && claim.status === 'Pending') || (role === 'staff' && (claim.status === 'Pending' || claim.status === 'Rejected'))) && onEditClaim && (
            <button
              onClick={() => onEditClaim(claim)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold text-sm active:scale-95 transition-all cursor-pointer border border-slate-700"
            >
              <FileText className="w-4 h-4 text-amber-400" />
              Edit Claim Details
            </button>
          )}
          {role === 'staff' && (claim.status === 'Pending' || claim.status === 'Rejected') && onDeleteClaim && (
            <button
              onClick={() => onDeleteClaim(claim.id)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-rose-950/40 hover:bg-rose-900/45 text-rose-200 rounded-xl font-semibold text-sm active:scale-95 transition-all cursor-pointer border border-rose-900/30"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              Delete Claim
            </button>
          )}
          {role === 'staff' && claim.status === 'Approved' && onArchiveClaim && (
            <button
              onClick={() => onArchiveClaim(claim.id, !claim.is_archived)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold text-sm active:scale-95 transition-all cursor-pointer border border-slate-700"
            >
              <Archive className="w-4 h-4 text-cyan-400" />
              {claim.is_archived ? 'Unarchive Claim' : 'Archive Claim'}
            </button>
          )}
          {role === 'staff' && (
            <button
              onClick={handlePrint}
              disabled={!allRowsApproved}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all border ${!allRowsApproved
                ? 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed opacity-50'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 active:scale-95 cursor-pointer'
                }`}
            >
              <Printer className={`w-4 h-4 ${!allRowsApproved ? 'text-slate-500' : 'text-cyan-400'}`} />
              Print / Save PDF
            </button>
          )}
        </div>
      </div>

      {/* Warning Banner for staff if print is locked */}
      {role === 'staff' && !allRowsApproved && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm flex items-center gap-3 no-print">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>
            {claim.status === 'Approved'
              ? 'Printing is locked because one or more items in this claim were rejected by the Admin.'
              : 'Printing is locked. You can only print the claim form once the claim is approved and all items are accepted.'}
          </span>
        </div>
      )}

      {/* Admin Action Panel - Hidden during print */}
      {role === 'admin' && claim.status === 'Pending' && (
        <div className="p-6 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl space-y-4 no-print">
          <h3 className="font-bold text-slate-100 flex items-center gap-2 text-lg">
            <CheckCircle2 className="w-5 h-5 text-amber-500" />
            Admin Review Panel
          </h3>
          <div className="space-y-2">
            <label className="text-sm text-slate-300 font-medium block">Approval / Rejection Comments:</label>
            <textarea
              value={adminComments}
              onChange={(e) => setAdminComments(e.target.value)}
              placeholder="Provide feedback to the employee (optional)..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all text-sm"
              rows={3}
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={handleReject}
              className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-bold rounded-xl text-sm transition-all active:scale-95 cursor-pointer shadow-lg shadow-rose-600/10"
            >
              <X className="w-4 h-4" /> Reject Claim
            </button>
            <button
              onClick={handleApprove}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all active:scale-95 cursor-pointer shadow-lg shadow-emerald-600/10"
            >
              <Check className="w-4 h-4" /> Approve Claim
            </button>
          </div>
        </div>
      )}

      {/* View Review Status (Staff / Completed Review) - Hidden during print */}
      {claim.status !== 'Pending' && (
        <div className={`p-4 rounded-xl border no-print flex items-center justify-between gap-4 ${claim.status === 'Approved'
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}>
          <div className="flex items-center gap-3">
            {claim.status === 'Approved' ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-6 h-6 text-rose-400 shrink-0" />
            )}
            <div>
              <div className="font-bold text-sm">Claim Status: {claim.status}</div>
              {(claim.admin_comments || claim.adminComments) && (
                <div className="text-xs text-slate-300 mt-1">
                  <strong>Admin Feedback:</strong> {claim.admin_comments || claim.adminComments}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONDITIONAL RENDER: Admin view with editable row list VS Staff print-area replica */}
      {role === 'admin' ? (
        <div className="space-y-6">
          {/* Admin Summary Card */}
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-slate-100 text-lg border-b border-slate-800 pb-3 flex justify-between items-center">
              <span> {claim.type === 'ot' ? 'Overtime' : claim.type === 'others' ? 'Others' : 'General'} Claim - Submitted On {formatDate(claim.date)}</span>
              <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase ${claim.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                claim.status === 'Rejected' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                  'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                {claim.status}
              </span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-slate-400 block text-xs">Employee Name</span>
                <span className="text-slate-200 font-semibold">{claim.employeeName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-xs">Claim Month</span>
                <span className="text-slate-200 font-semibold">{claim.month || claim.date.substring(0, 7)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-xs">Submitted On</span>
                <span className="text-slate-200 font-semibold">{formatDate(claim.date)}</span>
              </div>

            </div>
          </div>

          {/* Admin Claims Table */}
          <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-slate-100 flex items-center justify-between">
              <span>Lists of Claim</span>
              <span className="text-xs text-slate-400 font-normal">
                {claim.status === 'Pending' ? 'Uncheck rows to reject specific line items.' : 'Read-only view of processed claim rows.'}
              </span>
            </h3>
            <div className="overflow-x-auto">
              {claim.type === 'ot' ? (
                <table className="w-full text-left border-collapse text-xs text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Check In</th>
                      <th className="px-4 py-3">Check Out</th>
                      <th className="px-4 py-3 text-center">Weekday (hrs)</th>
                      <th className="px-4 py-3 text-center">Weekend/PH (hrs)</th>
                      <th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-4 py-3">Authorization</th>
                      <th className="px-4 py-3 text-center">Proof</th>
                      <th className="px-4 py-3 text-center">Approve Row?</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {reviewItems.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-800/25 transition-colors">
                        <td className="px-4 py-3.5 font-medium text-slate-200">{formatDate(item.date)}</td>
                        <td className="px-4 py-3.5 font-mono">{item.checkIn}</td>
                        <td className="px-4 py-3.5 font-mono">{item.checkOut}</td>
                        <td className="px-4 py-3.5 text-center font-mono text-cyan-400">{item.weekdayHours || 0}</td>
                        <td className="px-4 py-3.5 text-center font-mono text-cyan-400">{item.weekendHours || 0}</td>
                        <td className="px-4 py-3.5">{item.location}</td>
                        <td className="px-4 py-3.5 font-medium">{item.reason}</td>
                        <td className="px-4 py-3.5">{item.authorization}</td>
                        <td className="px-4 py-3.5 text-center">
                          {getItemReceipts(item).length > 0 ? (
                            <div className="flex flex-col gap-1 items-center justify-center">
                              {getItemReceipts(item).map((rcpt, rcptIdx) => (
                                <button
                                  key={rcptIdx}
                                  onClick={() => setReceiptModalUrl(getReceiptImage(rcpt))}
                                  className="text-cyan-400 hover:text-cyan-300 flex items-center justify-center gap-1 mx-auto"
                                >
                                  {isPdf(rcpt) ? (
                                    <FileText className="w-3.5 h-3.5" />
                                  ) : (
                                    <ImageIcon className="w-3.5 h-3.5" />
                                  )}
                                  <span className="text-[10px] font-bold underline">
                                    View {getItemReceipts(item).length > 1 ? `#${rcptIdx + 1}` : ''}
                                  </span>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-500 font-semibold">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={item.approved === true}
                            disabled={claim.status !== 'Pending'}
                            onChange={() => toggleRowApproval(index)}
                            className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500 bg-slate-950 border-slate-700 cursor-pointer disabled:cursor-not-allowed"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-950/40 font-bold border-t border-slate-800">
                      <td className="px-4 py-3 text-slate-400" colSpan={3}>Totals (Approved Rows Only)</td>
                      <td className="px-4 py-3 text-center font-mono text-cyan-400">{currentTotals.weekdayHours} hrs</td>
                      <td className="px-4 py-3 text-center font-mono text-cyan-400">{currentTotals.weekendHours} hrs</td>
                      <td colSpan={5}></td>
                    </tr>
                  </tfoot>
                </table>
              ) : claim.type === 'others' ? (
                <table className="w-full text-left border-collapse text-xs text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3 text-right">Amount (RM)</th>
                      <th className="px-4 py-3 text-center">Proof</th>
                      <th className="px-4 py-3 text-center">Approve Row?</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {reviewItems.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-800/25 transition-colors">
                        <td className="px-4 py-3.5 font-medium text-slate-200">{formatDate(item.date)}</td>
                        <td className="px-4 py-3.5">{item.description}</td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-200">RM {item.amount.toFixed(2)}</td>
                        <td className="px-4 py-3.5 text-center">
                          {getItemReceipts(item).length > 0 ? (
                            <div className="flex flex-col gap-1 items-center justify-center">
                              {getItemReceipts(item).map((rcpt, rcptIdx) => (
                                <button
                                  key={rcptIdx}
                                  onClick={() => setReceiptModalUrl(getReceiptImage(rcpt))}
                                  className="text-cyan-400 hover:text-cyan-300 flex items-center justify-center gap-1 mx-auto"
                                >
                                  {isPdf(rcpt) ? (
                                    <FileText className="w-3.5 h-3.5" />
                                  ) : (
                                    <ImageIcon className="w-3.5 h-3.5" />
                                  )}
                                  <span className="text-[10px] font-bold underline">
                                    View {getItemReceipts(item).length > 1 ? `#${rcptIdx + 1}` : ''}
                                  </span>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-500 font-semibold">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={item.approved === true}
                            disabled={claim.status !== 'Pending'}
                            onChange={() => toggleRowApproval(index)}
                            className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500 bg-slate-950 border-slate-700 cursor-pointer disabled:cursor-not-allowed"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-950/40 font-bold border-t border-slate-800">
                      <td className="px-4 py-3 text-slate-400" colSpan={2}>Total (Approved Rows Only)</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-400 text-sm">RM {currentTotals.grandTotal.toFixed(2)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <table className="w-full text-left border-collapse text-xs text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 border-l-2 border-slate-600/70 pl-4 bg-slate-800/25">Journey/Description</th>
                      <th className="px-4 py-3 text-center bg-slate-800/25 w-[75px]">Total KM</th>
                      <th className="px-4 py-3 text-center bg-slate-800/25 w-[90px]">Return?</th>
                      <th className="px-4 py-3 text-center bg-slate-800/25 w-[75px]">Deducted</th>
                      <th className="px-4 py-3 text-center bg-slate-800/25 w-[75px]">Net KM</th>
                      <th className="px-4 py-3 text-right bg-slate-800/25 w-[80px]">Mil Amount</th>
                      <th className="px-4 py-3 text-center border-l-2 border-slate-600/70 pl-4 bg-cyan-500/[0.06]">Outstation Type</th>
                      <th className="px-4 py-3 text-right bg-cyan-500/[0.06]">Outstation Amount</th>
                      <th className="px-4 py-3 text-right border-l-2 border-slate-600/70 pl-4 bg-blue-500/[0.06]">Toll</th>
                      <th className="px-4 py-3 text-right border-l-2 border-slate-600/70 pl-4 bg-indigo-500/[0.06]">Medical</th>
                      <th className="px-4 py-3 text-right border-l-2 border-slate-600/70 pl-4">Row Total</th>
                      <th className="px-4 py-3 text-center border-l-2 border-slate-600/70 pl-4 bg-violet-500/[0.06]">Proof</th>
                      <th className="px-4 py-3 text-center border-l-2 border-slate-600/70 pl-4">Approve Row?</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {reviewItems.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-800/25 transition-colors">
                        <td className="px-4 py-3.5 font-medium text-slate-200">{formatDate(item.date)}</td>
                        <td className="px-4 py-3.5 border-l-2 border-slate-600/70 pl-3.5 bg-slate-800/[0.04]">{item.journey}</td>
                        <td className="px-4 py-3.5 text-center font-mono bg-slate-800/[0.04]">{item.mileageDistance ? `${item.mileageDistance} (${item.vehicle === 'bike' ? 'Bike' : 'Car'})` : '-'}</td>
                        <td className="px-4 py-3.5 text-center font-medium capitalize bg-slate-800/[0.04]">{item.mileageDistance > 0 ? (item.cameBackToOffice === 'no' ? 'No' : 'Yes') : '-'}</td>
                        <td className="px-4 py-3.5 text-center font-mono text-slate-400 bg-slate-800/[0.04]">{item.mileageDistance > 0 ? `${item.mileageDeduction !== undefined ? item.mileageDeduction : (item.cameBackToOffice === 'no' ? 15 : 30)} km` : '-'}</td>
                        <td className="px-4 py-3.5 text-center font-mono font-bold bg-slate-800/[0.04]">
                          {item.mileageDistance > 0 ? `${(item.mileageNet !== undefined ? parseFloat(item.mileageNet) : Math.max(0, item.mileageDistance - (item.cameBackToOffice === 'no' ? 15 : 30))).toFixed(2)} km` : '-'}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono bg-slate-800/[0.04]">{item.mileageAmount > 0 ? `RM ${item.mileageAmount.toFixed(2)}` : '-'}</td>
                        <td className="px-4 py-3.5 text-center capitalize border-l-2 border-slate-600/70 pl-3.5 bg-cyan-500/[0.02]">{item.outstationType || '-'}</td>
                        <td className="px-4 py-3.5 text-right font-mono bg-cyan-500/[0.02]">{item.outstationAmount > 0 ? `RM ${item.outstationAmount.toFixed(2)}` : '-'}</td>
                        <td className="px-4 py-3.5 text-right font-mono border-l-2 border-slate-600/70 pl-3.5 bg-blue-500/[0.02]">{item.toll > 0 ? `RM ${item.toll.toFixed(2)}` : '-'}</td>
                        <td className="px-4 py-3.5 text-right font-mono border-l-2 border-slate-600/70 pl-3.5 bg-indigo-500/[0.02]">{item.medical > 0 ? `RM ${item.medical.toFixed(2)}` : '-'}</td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-200 border-l-2 border-slate-600/70 pl-3.5">
                          RM {(item.total !== undefined ? item.total : ((item.mileageAmount || 0) + (item.toll || 0) + (item.medical || 0) + (item.outstationAmount || 0))).toFixed(2)}
                        </td>
                        <td className="px-4 py-3.5 text-center border-l-2 border-slate-600/70 pl-3.5 bg-violet-500/[0.02]">
                          {getItemReceipts(item).length > 0 ? (
                            <div className="flex flex-col gap-1 items-center justify-center">
                              {getItemReceipts(item).map((rcpt, rcptIdx) => (
                                <button
                                  key={rcptIdx}
                                  onClick={() => setReceiptModalUrl(getReceiptImage(rcpt))}
                                  className="text-cyan-400 hover:text-cyan-300 flex items-center justify-center gap-1 mx-auto"
                                >
                                  {isPdf(rcpt) ? (
                                    <FileText className="w-3.5 h-3.5" />
                                  ) : (
                                    <ImageIcon className="w-3.5 h-3.5" />
                                  )}
                                  <span className="text-[10px] font-bold underline">
                                    View {getItemReceipts(item).length > 1 ? `#${rcptIdx + 1}` : ''}
                                  </span>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-500 font-semibold">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center border-l-2 border-slate-600/70 pl-3.5">
                          <input
                            type="checkbox"
                            checked={item.approved === true}
                            disabled={claim.status !== 'Pending'}
                            onChange={() => toggleRowApproval(index)}
                            className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500 bg-slate-950 border-slate-700 cursor-pointer disabled:cursor-not-allowed"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-950/40 font-bold border-t border-slate-800">
                      <td className="px-4 py-3 text-slate-400" colSpan={2}>Totals (Approved Rows Only)</td>
                      <td className="px-4 py-3 text-center font-mono">{approvedItems.reduce((sum, item) => sum + (parseFloat(item.mileageDistance) || 0), 0) || '-'}</td>
                      <td className="px-4 py-3 text-center font-mono">-</td>
                      <td className="px-4 py-3 text-center font-mono">{approvedItems.reduce((sum, item) => sum + (parseFloat(item.mileageDeduction || (item.mileageDistance > 0 ? (item.cameBackToOffice === 'no' ? 15 : 30) : 0)) || 0), 0) || '-'}</td>
                      <td className="px-4 py-3 text-center font-mono text-cyan-400">
                        {(() => {
                          const sum = approvedItems.reduce((sum, item) => sum + (parseFloat(item.mileageNet !== undefined ? item.mileageNet : Math.max(0, item.mileageDistance - (item.cameBackToOffice === 'no' ? 15 : 30))) || 0), 0);
                          return sum > 0 ? `${sum.toFixed(2)} km` : '-';
                        })()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">RM {currentTotals.mileageAmount.toFixed(2)}</td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 text-right font-mono">{currentTotals.outstationAmount > 0 ? `RM ${currentTotals.outstationAmount.toFixed(2)}` : '-'}</td>
                      <td className="px-4 py-3 text-right font-mono">{currentTotals.toll > 0 ? `RM ${currentTotals.toll.toFixed(2)}` : '-'}</td>
                      <td className="px-4 py-3 text-right font-mono">{currentTotals.medical > 0 ? `RM ${currentTotals.medical.toFixed(2)}` : '-'}</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-400 text-sm">RM {currentTotals.grandTotal.toFixed(2)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Staff print-area replica view */
        <div className="print-area bg-white text-slate-900 rounded-2xl p-4 md:p-6 border border-slate-200 shadow-xl print:border-none print:shadow-none print:p-0">

          {/* Corporate Header */}
          <div className="flex items-center border-b-2 border-slate-900 pb-3 mb-3 gap-3 print:border-black print-border-dark">
            {/* Logo */}
            <img src="/logo.png" alt="Total Neutron Logo" className="w-12 h-12 object-contain shrink-0" />
            <div className="text-left print-text-dark">
              <h2 className="text-base font-bold tracking-tight text-slate-900">
                TOTAL NEUTRON SOLUTION SDN BHD <span className="text-xs font-normal text-slate-500 print:text-black">(1064906-M)</span>
              </h2>
              <p className="text-[10px] text-slate-500 leading-normal mt-0.5 font-medium print:text-black">
                5-2 PERSIARAN SYED PUTRA 3 TAMAN PERSIARAN DESA 50460 SEPUTEH KUALA LUMPUR
              </p>
              <p className="text-[9px] text-slate-400 mt-0.5 font-bold print:text-black">
                TEL: 603-8320 8306
              </p>
            </div>
          </div>

          {/* Claim Sheet Title banner */}
          <div className="bg-slate-900 text-white font-bold py-1.5 px-4 text-center rounded tracking-wider uppercase mb-3 print:bg-black print:text-white print-text-dark">
            {claim.type === 'ot' ? 'Overtime Claim' : claim.type === 'others' ? 'Others Claim' : 'Staff Claim'}
          </div>

          {/* Employee Info Grid */}
          <div className="grid grid-cols-2 border border-slate-900 rounded overflow-hidden text-xs mb-3 print:border-black print-border-dark">
            <div className="divide-y divide-slate-300 border-r border-slate-900 print:border-black print-border-dark">
              <div className="px-3 py-1 flex justify-between bg-slate-50/50 print:bg-slate-100">
                <span className="font-semibold text-slate-500 print:text-black">Employee Name:</span>
                <span className="font-bold text-slate-800 print:text-black">{claim.employeeName}</span>
              </div>
              <div className="px-3 py-1 flex justify-between">
                <span className="font-semibold text-slate-500 print:text-black">IC:</span>
                <span className="font-bold text-slate-800 print:text-black">{claim.ic}</span>
              </div>
              <div className="px-3 py-1 flex justify-between bg-slate-50/50 print:bg-slate-100">
                <span className="font-semibold text-slate-500 print:text-black">Date:</span>
                <span className="font-bold text-slate-800 print:text-black">{formatDate(claim.date)}</span>
              </div>
            </div>
            <div className="divide-y divide-slate-300">
              <div className="px-3 py-1 flex justify-between bg-slate-50/50 print:bg-slate-100">
                <span className="font-semibold text-slate-500 print:text-black">Contact Numbers:</span>
                <span className="font-bold text-slate-800 print:text-black">{claim.contact}</span>
              </div>
              <div className="px-3 py-1 flex justify-between">
                <span className="font-semibold text-slate-500 print:text-black">Department:</span>
                <span className="font-bold text-slate-800 print:text-black">{claim.department}</span>
              </div>
              <div className="px-3 py-1 flex justify-between bg-slate-50/50 print:bg-slate-100">
                <span className="font-semibold text-slate-500 print:text-black">Claim Month:</span>
                <span className="font-bold text-slate-800 print:text-black">{claim.month || claim.date.substring(0, 7)}</span>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto border border-slate-900 rounded mb-3 print:border-black print-border-dark">
            {claim.type === 'ot' ? (
              /* OT Claim Table Layout */
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-900 print:border-black print-border-dark">
                    <th className="px-2 py-1.5 border-r border-slate-900 w-[100px] print:border-black print-border-dark">Date</th>
                    <th className="px-2 py-1.5 border-r border-slate-900 w-[80px] print:border-black print-border-dark">CHECK IN</th>
                    <th className="px-2 py-1.5 border-r border-slate-900 w-[85px] print:border-black print-border-dark">CHECK OUT</th>
                    <th className="px-2 py-1.5 border-r border-slate-900 text-center w-[120px] print:border-black print-border-dark" colSpan={2}>
                      OVERTIME (hrs)
                      <div className="grid grid-cols-2 border-t border-slate-900 mt-1 pt-1 font-semibold text-[9px] print:border-black print-border-dark">
                        <span className="border-r border-slate-900 print:border-black print-border-dark">Weekday</span>
                        <span>Weekend/PH</span>
                      </div>
                    </th>
                    <th className="px-2 py-1.5 border-r border-slate-900 w-[120px] print:border-black print-border-dark">Location</th>
                    <th className="px-2 py-1.5 border-r border-slate-900 print:border-black print-border-dark">Overtime Reason</th>
                    <th className="px-2 py-1.5 w-[120px]">Authorization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 divide-y-2 border-b border-slate-900 print:border-black print-border-dark">
                  {claim.items.map((item, index) => {
                    const isRejected = item.approved === false;
                    return (
                      <tr key={index} className={`odd:bg-slate-50/40 ${isRejected ? 'bg-rose-100/60 line-through text-rose-800 print:bg-rose-100 print:text-rose-950 font-medium' : ''}`}>
                        <td className="px-2 py-1 border-r border-slate-900 print:border-black print-border-dark font-medium">{formatDate(item.date)}</td>
                        <td className="px-2 py-1 border-r border-slate-900 print:border-black print-border-dark font-mono">{item.checkIn}</td>
                        <td className="px-2 py-1 border-r border-slate-900 print:border-black print-border-dark font-mono">{item.checkOut}</td>
                        <td className="px-2 py-1 border-r border-slate-900 print:border-black print-border-dark text-center font-mono w-[60px]">
                          {item.weekdayHours || 0}
                        </td>
                        <td className="px-2 py-1 border-r border-slate-900 print:border-black print-border-dark text-center font-mono w-[60px]">
                          {item.weekendHours || 0}
                        </td>
                        <td className="px-2 py-1 border-r border-slate-900 print:border-black print-border-dark">{item.location}</td>
                        <td className="px-2 py-1 border-r border-slate-900 print:border-black print-border-dark font-medium">{item.reason}</td>
                        <td className="px-2 py-1 font-medium">{item.authorization}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t border-slate-900 print:border-black print-border-dark">
                    <td className="px-2 py-1.5 border-r border-slate-900 print:border-black print-border-dark uppercase text-center" colSpan={3}>Totals</td>
                    <td className="px-2 py-1.5 border-r border-slate-900 text-center font-mono print:border-black print-border-dark">{claim.totals.weekdayHours}</td>
                    <td className="px-2 py-1.5 border-r border-slate-900 text-center font-mono print:border-black print-border-dark">{claim.totals.weekendHours}</td>
                    <td className="px-2 py-1.5" colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            ) : claim.type === 'others' ? (
              /* Others Claim Table Layout */
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-900 print:border-black print-border-dark">
                    <th className="px-2 py-1.5 border-r border-slate-900 w-[150px] print:border-black print-border-dark">Date</th>
                    <th className="px-2 py-1.5 border-r border-slate-900 print:border-black print-border-dark">Description</th>
                    <th className="px-2 py-1.5 w-[150px] text-right">Amount (RM)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 divide-y-2 border-b border-slate-900 print:border-black print-border-dark">
                  {claim.items.map((item, index) => {
                    const isRejected = item.approved === false;
                    return (
                      <tr key={index} className={`odd:bg-slate-50/40 ${isRejected ? 'bg-rose-100/60 line-through text-rose-800 print:bg-rose-100 print:text-rose-950 font-medium' : ''}`}>
                        <td className="px-2 py-1 border-r border-slate-900 print:border-black print-border-dark font-medium">{formatDate(item.date)}</td>
                        <td className="px-2 py-1 border-r border-slate-900 print:border-black print-border-dark">{item.description}</td>
                        <td className="px-2 py-1 text-right font-mono font-bold text-slate-800">
                          RM {item.amount.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t border-slate-900 print:border-black print-border-dark">
                    <td className="px-2 py-1.5 border-r border-slate-900 uppercase text-center" colSpan={2}>Total</td>
                    <td className="px-2 py-1.5 text-right font-mono font-extrabold text-emerald-700 print:text-black">
                      RM {(claim.totals.grandTotal || 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              /* General Staff Claim Table Layout */
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-900 print:border-black print-border-dark">
                    <th className="px-1.5 py-1.5 border-r border-slate-900 w-[85px] print:border-black print-border-dark" rowSpan={2}>Date</th>
                    <th className="px-1.5 py-1.5 border-r border-slate-900 print:border-black print-border-dark" rowSpan={2}>Journey/Description</th>
                    <th className="px-1.5 py-1 border-r border-slate-900 text-center w-[120px] print:border-black print-border-dark" colSpan={2}>Mileage</th>
                    <th className="px-1.5 py-1.5 border-r border-slate-900 text-center w-[110px] print:border-black print-border-dark" colSpan={2}>Outstation</th>
                    <th className="px-1.5 py-1.5 border-r border-slate-900 w-[65px] print:border-black print-border-dark text-center" rowSpan={2}>Toll</th>
                    <th className="px-1.5 py-1.5 border-r border-slate-900 w-[65px] print:border-black print-border-dark text-center" rowSpan={2}>Medical</th>
                    <th className="px-1.5 py-1.5 text-right w-[90px]" rowSpan={2}>Total (RM)</th>
                  </tr>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-900 print:border-black print-border-dark">
                    <th className="px-1.5 py-1 border-r border-slate-900 text-center font-semibold text-[8px] w-[60px] print:border-black print-border-dark">Net km</th>
                    <th className="px-1.5 py-1 border-r border-slate-900 text-center font-semibold text-[8px] w-[60px] print:border-black print-border-dark">(RM)</th>
                    <th className="px-1.5 py-1 border-r border-slate-900 text-center font-semibold text-[9px] w-[50px] print:border-black print-border-dark">Type</th>
                    <th className="px-1.5 py-1 border-r border-slate-900 text-center font-semibold text-[9px] w-[65px] print:border-black print-border-dark">(RM)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 divide-y-2 border-b border-slate-900 print:border-black print-border-dark">
                  {claim.items.map((item, index) => {
                    const isRejected = item.approved === false;
                    const rawKM = item.mileageDistance || 0;
                    const cameBack = item.cameBackToOffice || 'yes';
                    const deductKM = rawKM > 0 ? (item.mileageDeduction !== undefined ? item.mileageDeduction : (cameBack === 'no' ? 15 : 30)) : 0;
                    const netKM = rawKM > 0 ? (item.mileageNet !== undefined ? parseFloat(item.mileageNet) : Math.round(Math.max(0, rawKM - deductKM) * 100) / 100) : 0;
                    return (
                      <tr key={index} className={`odd:bg-slate-50/40 ${isRejected ? 'bg-rose-100/60 line-through text-rose-800 print:bg-rose-100 print:text-rose-950 font-medium' : ''}`}>
                        <td className="px-1.5 py-1 border-r border-slate-900 print:border-black print-border-dark font-medium">{formatDate(item.date)}</td>
                        <td className="px-1.5 py-1 border-r border-slate-900 print:border-black print-border-dark">{item.journey}</td>
                        {/* Net KM */}
                        <td className="px-1.5 py-1 border-r border-slate-900 print:border-black print-border-dark text-center font-mono text-[9px] font-bold">
                          {rawKM ? `${netKM.toFixed(2)} (${item.vehicle === 'bike' ? 'Bike' : 'Car'})` : '-'}
                        </td>
                        {/* Amount (RM) */}
                        <td className="px-1.5 py-1 border-r border-slate-900 print:border-black print-border-dark text-right font-mono text-[9px]">
                          {item.mileageAmount > 0 ? item.mileageAmount.toFixed(2) : '-'}
                        </td>
                        <td className="px-1.5 py-1 border-r border-slate-900 print:border-black print-border-dark text-center font-medium capitalize text-[10px]">
                          {item.outstationType || (item.outstationDays ? (parseInt(item.outstationDays, 10) === 1 ? 'daily' : 'sleepover') : '-')}
                        </td>
                        <td className="px-1.5 py-1 border-r border-slate-900 print:border-black print-border-dark text-right font-mono">
                          {item.outstationAmount > 0 ? item.outstationAmount.toFixed(2) : '-'}
                        </td>
                        <td className="px-1.5 py-1 border-r border-slate-900 print:border-black print-border-dark text-right font-mono">
                          {item.toll > 0 ? item.toll.toFixed(2) : '-'}
                        </td>
                        <td className="px-1.5 py-1 border-r border-slate-900 print:border-black print-border-dark text-right font-mono">
                          {item.medical > 0 ? item.medical.toFixed(2) : '-'}
                        </td>
                        <td className="px-1.5 py-1 text-right font-mono font-bold text-slate-800">
                          RM {(item.total !== undefined ? item.total : ((item.mileageAmount || 0) + (item.toll || 0) + (item.medical || 0) + (item.outstationAmount || 0))).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t border-slate-900 print:border-black print-border-dark">
                    <td className="px-1.5 py-1.5 border-r border-slate-900 uppercase text-center" colSpan={2}>Totals</td>
                    {/* Net KM total */}
                    <td className="px-1.5 py-1.5 border-r border-slate-900 text-center font-mono text-[9px] font-bold">
                      {(() => {
                        const sum = claim.items.reduce((sum, item) => sum + (parseFloat(item.mileageNet !== undefined ? item.mileageNet : Math.max(0, item.mileageDistance - (item.cameBackToOffice === 'no' ? 15 : 30))) || 0), 0);
                        return sum > 0 ? sum.toFixed(2) : '-';
                      })()}
                    </td>
                    {/* Mileage Amount total */}
                    <td className="px-1.5 py-1.5 border-r border-slate-900 text-right font-mono">RM {claim.totals.mileageAmount.toFixed(2)}</td>
                    <td className="px-1.5 py-1.5 border-r border-slate-900 text-center font-mono">-</td>
                    <td className="px-1.5 py-1.5 border-r border-slate-900 text-right font-mono">
                      {claim.totals.outstationAmount > 0 ? `RM ${claim.totals.outstationAmount.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-1.5 py-1.5 border-r border-slate-900 text-right font-mono">
                      {claim.totals.toll > 0 ? `RM ${claim.totals.toll.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-1.5 py-1.5 border-r border-slate-900 text-right font-mono">
                      {claim.totals.medical > 0 ? `RM ${claim.totals.medical.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-1.5 py-1.5 text-right font-mono font-extrabold text-emerald-700 print:text-black">
                      RM {claim.totals.grandTotal.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* Remarks Footer */}
          <div className="border border-slate-900 rounded p-2 text-[9px] space-y-0.5 mb-4 print:border-black print-border-dark print:mb-3">
            <div className="font-bold uppercase tracking-wider text-slate-700 print:text-black">* Remarks:</div>
            {claim.type === 'ot' ? (
              <>
                <div>- OVERTIME CLAIM <span className="font-bold">MUST</span> CALCULATE AFTER 9 WORKING HOURS</div>
                <div>- <span className="font-bold">COMPULSORY</span> TO FILL IN THE OVERTIME REASON</div>
                <div>- <span className="font-bold">COMPULSORY</span> TO ATTACH PROOF (IMAGE OR PDF) VALIDATING EACH OVERTIME CLAIM ENTRY</div>
                <div>- <span className="font-bold">COMPULSORY</span>: ONSITE OVERTIME ATTENDANCE MUST BE VERIFIED BY SHARING YOUR LIVE LOCATION IN THE "ATTENDANCE OT" WHATSAPP GROUP</div>
              </>
            ) : claim.type === 'others' ? (
              <>
                <div>- OTHER CLAIM <span className="font-bold">MUST</span> BE ATTACHED WITH PROOF</div>
              </>
            ) : (
              <>
                <div>- PROOF / RECEIPTS: ALL claim rows MUST be attached with proof.</div>
              </>
            )}
          </div>

          {/* Signatures Area */}
          <div className="grid grid-cols-3 gap-4 text-center text-[10px] pt-3 border-t border-slate-200">
            <div className="flex flex-col items-center">
              <div className="h-6 w-full border-b border-slate-400 max-w-[120px]" />
              <div className="mt-1 font-semibold text-slate-500 print:text-black">Signed by Employee</div>
            </div>
            <div className="flex flex-col items-center col-span-1">
              <div className="h-6 w-full border-b border-slate-400 max-w-[120px]" />
              <div className="mt-1 font-semibold text-slate-500 print:text-black">Signed by Supervisor</div>
            </div>
            <div className="flex flex-col items-center col-span-1">
              <div className="h-6 w-full border-b border-slate-400 max-w-[120px]" />
              <div className="mt-1 font-semibold text-slate-500 print:text-black">Checked by Finance</div>
            </div>
          </div>

          {/* Print-only Gallery Page */}
          {claim.items.some(i => i.receipt || (i.receipts && i.receipts.length > 0)) && (
            <>
              <div className="no-print border-t border-dashed border-slate-300 my-6 relative">
                <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Page Break (Proofs attached on next page)
                </span>
              </div>
              <div className="print-gallery-page mt-6 print:mt-0">
                <h3 className="text-xs font-bold border-b border-slate-900 pb-1.5 mb-3 uppercase tracking-wider text-slate-800">
                  Attached Proof / Receipts
                </h3>
                <div className="space-y-4">
                  {claim.items.map((item, index) => {
                    const receipts = getItemReceipts(item);
                    if (receipts.length === 0) return null;
                    return receipts.map((rcpt, rcptIdx) => {
                      const imgData = getReceiptImage(rcpt);
                      if (!imgData) return null;
                      return (
                        <div key={`${index}-${rcptIdx}`} className="page-break-inside-avoid border border-slate-300 rounded p-3 flex flex-col gap-1.5 bg-slate-50/50">
                          <div className="text-[11px] font-bold text-slate-800">
                            Row #{index + 1}: {item.journey || item.reason || item.description || 'Expenses'} ({formatDate(item.date)}) {receipts.length > 1 ? `[File ${rcptIdx + 1}]` : ''}
                          </div>
                          <div className="flex justify-center bg-white p-2 border border-slate-200 rounded max-h-[280px] overflow-hidden">
                            {isPdf(imgData) ? (
                              <div className="flex flex-col items-center justify-center gap-1.5 text-slate-500 py-4">
                                <FileText className="w-8 h-8 text-cyan-600" />
                                <span className="text-[9px] font-bold uppercase tracking-wider text-center">PDF Proof Attached (Please refer to electronic submission)</span>
                              </div>
                            ) : (
                              <img
                                src={imgData}
                                alt={`Receipt row ${index + 1} proof ${rcptIdx + 1}`}
                                className="max-h-[260px] w-auto object-contain"
                              />
                            )}
                          </div>
                        </div>
                      );
                    });
                  })}
                </div>
              </div>
            </>
          )}

        </div>
      )}

      {/* ========================================================== */}
      {/* PROOF GALLERY - Hidden during print */}
      {/* ========================================================== */}
      {claim.items.some(i => i.receipt || (i.receipts && i.receipts.length > 0)) && (
        <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4 no-print">
          <h3 className="font-bold text-slate-100 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-blue-400" />
            Uploaded Proof ({claim.items.reduce((acc, i) => acc + getItemReceipts(i).length, 0)})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {claim.items.map((item, index) => {
              const receipts = getItemReceipts(item);
              return receipts.map((rcpt, rcptIdx) => {
                const imgData = getReceiptImage(rcpt);
                if (!imgData) return null;

                return (
                  <div
                    key={`${index}-${rcptIdx}`}
                    className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex flex-col gap-2 group cursor-pointer hover:border-cyan-500/50 transition-colors"
                    onClick={() => setReceiptModalUrl(imgData)}
                  >
                    <div className="aspect-[3/4] bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex items-center justify-center relative p-3">
                      {isPdf(imgData) ? (
                        <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                          <FileText className="w-10 h-10 text-cyan-400" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-center">PDF Proof</span>
                        </div>
                      ) : (
                        <img
                          src={imgData}
                          alt={`Proof row ${index + 1} proof ${rcptIdx + 1}`}
                          className="max-w-full max-h-full object-contain"
                        />
                      )}
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="text-xs bg-slate-900/80 px-2 py-1 rounded border border-slate-700 text-slate-200">Expand</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400 font-semibold truncate px-1">
                      Row #{index + 1}: {item.journey || item.reason || item.description || 'Expenses'} {receipts.length > 1 ? `(#${rcptIdx + 1})` : ''}
                    </div>
                  </div>
                );
              });
            })}
          </div>
        </div>
      )}

      {/* Expanded Proof Modal - Hidden during print */}
      {receiptModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm no-print">
          <div className={`bg-slate-900 rounded-2xl border border-slate-800 w-full p-5 shadow-2xl relative animate-scale-up ${isPdf(receiptModalUrl) ? 'max-w-3xl' : 'max-w-md'
            }`}>
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <h3 className="font-bold text-slate-100 flex items-center gap-1.5">
                <FileText className="w-5 h-5 text-cyan-400" /> Proof Preview
              </h3>
              <button
                onClick={() => setReceiptModalUrl(null)}
                className="text-slate-400 hover:text-slate-200 font-bold px-2 py-1 hover:bg-slate-800 rounded-lg text-sm"
              >
                Close
              </button>
            </div>
            <div className="flex justify-center bg-slate-950 p-2.5 rounded-xl border border-slate-800 max-h-[500px] overflow-auto">
              {isPdf(receiptModalUrl) ? (
                <iframe
                  src={receiptModalUrl}
                  title="Proof PDF"
                  className="w-full h-[400px] rounded-lg border-none bg-white"
                />
              ) : (
                <img
                  src={receiptModalUrl}
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
