import React, { useState } from 'react';
import {
  Plus, Clock, FileText, CheckCircle, AlertCircle, XCircle, Search, Filter, ArrowRight, User, Calendar, ChevronDown, ChevronRight
} from 'lucide-react';

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

const getWelcomeName = (fullName) => {
  if (!fullName) return '';
  // 1. Remove everything from connectors onwards ('bin', 'binti', 'b.', 'bt.', 'a/l', 'a/p')
  const cleanName = fullName.split(/\s+(?:bin|binti|b\.|bt\.|a\/l|a\/p)\s+/i)[0].trim();
  // 2. Split into words
  const words = cleanName.split(/\s+/);
  // 3. Find the first word that is not a common prefix
  const commonPrefixes = ['muhammad', 'mohammad', 'mhd', 'mohd', 'wan', 'nik', 'che', 'megat', 'tengku', 'tuan', 'raja', 'puteri', 'siti', 'nur', 'noor'];
  for (const word of words) {
    if (!commonPrefixes.includes(word.toLowerCase())) {
      return word.toLowerCase();
    }
  }
  return (words[0] || '').toLowerCase();
};

export default function Dashboard({ role, claims, profile, onStartClaim, onViewClaim }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [adminViewMode, setAdminViewMode] = useState('grouped'); // 'grouped' or 'flat'
  const [expandedFEs, setExpandedFEs] = useState({});
  const [showArchived, setShowArchived] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(6);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter, dateFilter, monthFilter, showArchived, adminViewMode]);

  const toggleFE = (feName) => {
    setExpandedFEs(prev => ({
      ...prev,
      [feName]: !prev[feName]
    }));
  };

  // Filter claims based on role and search criteria
  const userClaims = role === 'admin'
    ? claims
    : claims.filter(c => c.employeeName.toLowerCase() === profile.name.toLowerCase());

  const filteredClaims = userClaims.filter(claim => {
    const matchesSearch =
      claim.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (claim.company && claim.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
      claim.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || claim.status === statusFilter;
    const matchesType = typeFilter === 'All' || claim.type === typeFilter;
    const matchesArchived = showArchived || !claim.is_archived || role === 'admin';
    const matchesDate = !dateFilter || claim.date === dateFilter;
    const matchesMonth = !monthFilter || claim.month === monthFilter;

    return matchesSearch && matchesStatus && matchesType && matchesArchived && matchesDate && matchesMonth;
  });

  // Group filtered claims by employee name (for admin grouped view)
  const groupedFEs = {};
  if (role === 'admin') {
    filteredClaims.forEach(claim => {
      const name = claim.employeeName;
      if (!groupedFEs[name]) {
        groupedFEs[name] = {
          employeeName: name,
          department: claim.department,
          company: claim.company,
          ic: claim.ic,
          contact: claim.contact,
          claims: [],
          totalClaims: 0,
          pendingClaims: 0,
          approvedAmount: 0,
          pendingAmount: 0,
          approvedOTHours: 0,
          pendingOTHours: 0
        };
      }
      const fe = groupedFEs[name];
      fe.claims.push(claim);
      fe.totalClaims += 1;
      if (claim.status === 'Pending') {
        fe.pendingClaims += 1;
      }

      const isApproved = claim.status === 'Approved';
      const isPending = claim.status === 'Pending';
      const isOT = claim.type === 'ot';

      if (isOT) {
        const wk = claim.totals.weekdayHours || 0;
        const we = claim.totals.weekendHours || 0;
        const hours = wk + we;
        if (isApproved) fe.approvedOTHours += hours;
        if (isPending) fe.pendingOTHours += hours;
      } else {
        const amt = claim.totals.grandTotal || 0;
        if (isApproved) fe.approvedAmount += amt;
        if (isPending) fe.pendingAmount += amt;
      }
    });
  }
  const groupedFEList = Object.values(groupedFEs);

  const totalItems = role === 'admin' && adminViewMode === 'grouped'
    ? groupedFEList.length
    : filteredClaims.length;

  const actualRowsPerPage = rowsPerPage === 'All' ? totalItems : Number(rowsPerPage);
  const totalPages = Math.ceil(totalItems / actualRowsPerPage) || 1;
  const startIndex = (currentPage - 1) * actualRowsPerPage;

  const paginatedGroupedFEList = role === 'admin' && adminViewMode === 'grouped'
    ? (rowsPerPage === 'All' ? groupedFEList : groupedFEList.slice(startIndex, startIndex + actualRowsPerPage))
    : [];

  const paginatedFilteredClaims = role === 'admin' && adminViewMode === 'grouped'
    ? []
    : (rowsPerPage === 'All' ? filteredClaims : filteredClaims.slice(startIndex, startIndex + actualRowsPerPage));

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push('...');
      }
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      pages.push(totalPages);
    }
    return pages;
  };

  // Calculate statistics
  const pendingClaims = userClaims.filter(c => c.status === 'Pending');
  const approvedClaims = userClaims.filter(c => c.status === 'Approved');

  const getGeneralGrandTotal = (c) => {
    return c.totals.grandTotal || 0;
  };

  const getClaimTotalDisplay = (claim) => {
    if (claim.type === 'ot') {
      const wk = claim.totals.weekdayHours || 0;
      const we = claim.totals.weekendHours || 0;
      return `${wk + we} Hours OT`;
    } else {
      return `RM ${(claim.totals.grandTotal || 0).toFixed(2)}`;
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
            {role === 'admin' ? 'Welcome back, Finance Admin' : `welcome back, ${getWelcomeName(profile.name)}`}
          </h1>
          <p className="text-slate-400 mt-2">
            {role === 'admin'
              ? 'Review and manage employee claim forms for Total Neutron Solution.'
              : `Create and track your claims. Department: ${profile.department}`}
          </p>
        </div>
        {role === 'staff' && (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onStartClaim('general')}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/10 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              General claim
            </button>
            <button
              onClick={() => onStartClaim('ot')}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-cyan-500/10 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              Ot claim
            </button>
            <button
              onClick={() => onStartClaim('others')}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/10 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              Others claim
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Total Claims / Submissions */}
        <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-6 border border-slate-800 flex items-center gap-5 shadow-lg relative overflow-hidden">
          <div className="p-3.5 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
            <FileText className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400">Total Submissions</p>
            <h3 className="text-2xl font-bold text-slate-100 mt-1">{userClaims.length}</h3>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl" />
        </div>

        {/* Card 2: Pending Approval */}
        <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-6 border border-slate-800 flex items-center gap-5 shadow-lg relative overflow-hidden">
          <div className="p-3.5 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
            <Clock className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400">Pending Review</p>
            <h3 className="text-2xl font-bold text-slate-100 mt-1">{pendingClaims.length}</h3>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl" />
        </div>

        {/* Card 3: Approved / Value */}
        <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-6 border border-slate-800 flex items-center gap-5 shadow-lg relative overflow-hidden">
          <div className="p-3.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
            <CheckCircle className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400">
              {role === 'admin' ? 'Total Approved Payout' : 'Approved Claims'}
            </p>
            <h3 className="text-2xl font-bold text-slate-100 mt-1">
              {role === 'admin'
                ? `RM ${approvedClaims.reduce((acc, c) => acc + (c.type !== 'ot' ? getGeneralGrandTotal(c) : 0), 0).toFixed(2)}`
                : approvedClaims.length}
            </h3>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl" />
        </div>
      </div>

      {/* Main List & Filters */}
      <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        {/* Table Filters */}
        <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            Claim Submision
            <span className="text-xs font-semibold px-2.5 py-0.5 bg-slate-800 text-slate-400 rounded-full">
              {filteredClaims.length}
            </span>
          </h2>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Bar */}
            <div className="relative min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={role === 'admin' ? "Search name, ID..." : "Search claim ID..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-700 text-slate-200 placeholder-slate-500 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-cyan-400 transition-all"
              />
            </div>

            {/* Type Filter */}
            <div className="flex items-center bg-slate-950/80 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-400">
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-transparent text-slate-300 font-medium focus:outline-none cursor-pointer"
              >
                <option value="All">All Types</option>
                <option value="ot">Overtime (OT)</option>
                <option value="general">General Claim</option>
                <option value="others">Others Claim</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center bg-slate-950/80 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-400">
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-slate-300 font-medium focus:outline-none cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            {role === 'admin' && (
              <>
                {/* Date Filter */}
                <div className="flex items-center bg-slate-950/80 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-400">
                  <Calendar className="w-3.5 h-3.5 mr-1.5" />
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => {
                      setDateFilter(e.target.value);
                      if (e.target.value) setMonthFilter('');
                    }}
                    style={{ colorScheme: 'dark' }}
                    className="bg-transparent text-slate-300 font-medium focus:outline-none cursor-pointer"
                  />
                  {dateFilter && (
                    <button
                      type="button"
                      onClick={() => setDateFilter('')}
                      className="ml-1 text-slate-500 hover:text-slate-300 font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Month Filter */}
                <div className="flex items-center bg-slate-950/80 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-400">
                  <Calendar className="w-3.5 h-3.5 mr-1.5" />
                  <input
                    type="month"
                    value={monthFilter}
                    onChange={(e) => {
                      setMonthFilter(e.target.value);
                      if (e.target.value) setDateFilter('');
                    }}
                    style={{ colorScheme: 'dark' }}
                    className="bg-transparent text-slate-300 font-medium focus:outline-none cursor-pointer"
                  />
                  {monthFilter && (
                    <button
                      type="button"
                      onClick={() => setMonthFilter('')}
                      className="ml-1 text-slate-500 hover:text-slate-300 font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>
              </>
            )}

            {/* Show Archived (Staff Only) */}
            {role === 'staff' && (
              <label className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300 cursor-pointer select-none hover:border-slate-600 transition-colors h-[34px]">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 focus:ring-opacity-25 bg-slate-950 mr-0.5 cursor-pointer"
                />
                Show Archived
              </label>
            )}

            {/* View Mode Toggle (Admin Only) */}
            {role === 'admin' && (
              <div className="flex items-center bg-slate-950/80 border border-slate-700 rounded-xl p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setAdminViewMode('grouped')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${adminViewMode === 'grouped'
                    ? 'bg-cyan-500 text-slate-950 shadow font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                  Grouped by FE
                </button>
                <button
                  type="button"
                  onClick={() => setAdminViewMode('flat')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${adminViewMode === 'flat'
                    ? 'bg-cyan-500 text-slate-950 shadow font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                  Flat List
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Claims Table / Cards */}
        {filteredClaims.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 stroke-[1.5] text-slate-600" />
            <p className="font-medium text-slate-400">No claims found</p>
            <p className="text-sm text-slate-500 mt-1">Try adjusting your filters or create a new claim.</p>
          </div>
        ) : (
          <div>
            {/* 1. Grouped View (Admins Only) */}
            {role === 'admin' && adminViewMode === 'grouped' ? (
              <>
                {/* Desktop Grouped Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950/50 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-800">
                        <th className="px-6 py-4 w-12 text-center"></th>
                        <th className="px-6 py-4">Field Engineer</th>
                        <th className="px-6 py-4 text-center">Total Claims</th>
                        <th className="px-6 py-4 text-center">Pending Review</th>
                        <th className="px-6 py-4 text-right">Consolidated Claims</th>
                        <th className="px-6 py-4 text-right">Consolidated OT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {paginatedGroupedFEList.map((fe) => {
                        const isExpanded = !!expandedFEs[fe.employeeName];
                        return (
                          <React.Fragment key={fe.employeeName}>
                            <tr
                              className="hover:bg-slate-800/10 transition-colors cursor-pointer group"
                              onClick={() => toggleFE(fe.employeeName)}
                            >
                              <td className="px-6 py-4 text-center">
                                {isExpanded ? (
                                  <ChevronDown className="w-4.5 h-4.5 text-cyan-400 mx-auto" />
                                ) : (
                                  <ChevronRight className="w-4.5 h-4.5 text-slate-450 group-hover:text-cyan-400 mx-auto" />
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="font-bold text-slate-200 flex items-center gap-1.5">
                                  <User className="w-4 h-4 text-cyan-400" />
                                  {fe.employeeName}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5">{fe.company && fe.company.toLowerCase().includes('siqma') ? 'Siqma Group (M) Sdn Bhd' : (fe.company || 'Total Neutron Solution Sdn Bhd')}</div>
                              </td>
                              <td className="px-6 py-4 text-center font-bold text-slate-350">
                                {fe.totalClaims}
                              </td>
                              <td className="px-6 py-4 text-center">
                                {fe.pendingClaims > 0 ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                                    {fe.pendingClaims} Pending
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800/40 text-slate-500 border border-slate-800">
                                    0 Pending
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right text-xs">
                                <div className="text-emerald-400 font-semibold">
                                  Appr: <span className="font-mono font-bold">RM {fe.approvedAmount.toFixed(2)}</span>
                                </div>
                                <div className="text-amber-400/90 mt-0.5">
                                  Pend: <span className="font-mono font-bold">RM {fe.pendingAmount.toFixed(2)}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right text-xs">
                                <div className="text-emerald-400 font-semibold">
                                  Appr: <span className="font-mono font-bold">{fe.approvedOTHours} hrs</span>
                                </div>
                                <div className="text-amber-400/90 mt-0.5">
                                  Pend: <span className="font-mono font-bold">{fe.pendingOTHours} hrs</span>
                                </div>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="bg-slate-950/20">
                                <td colSpan={6} className="px-8 py-5 border-t border-b border-slate-800/80">
                                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                                    <span>Claims list for {fe.employeeName}</span>
                                    <span className="px-2 py-0.5 bg-slate-800 rounded-md text-[10px] text-slate-300 font-semibold">{fe.claims.length} claims</span>
                                  </div>
                                  <div className="border border-slate-800/80 rounded-xl overflow-hidden shadow-inner">
                                    <table className="w-full text-left border-collapse text-xs">
                                      <thead>
                                        <tr className="bg-slate-900/40 text-slate-400 font-semibold border-b border-slate-800">
                                          <th className="px-4 py-3 w-[150px]">Claim ID</th>
                                          <th className="px-4 py-3 w-[120px]">Date</th>
                                          <th className="px-4 py-3 w-[150px]">Type</th>
                                          <th className="px-4 py-3 text-right">Amount / OT Hours</th>
                                          <th className="px-4 py-3 text-center w-[120px]">Status</th>
                                          <th className="px-4 py-3 text-right w-[110px]"></th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-800/40">
                                        {fe.claims.map((claim) => (
                                          <tr
                                            key={claim.id}
                                            className="hover:bg-slate-900/60 transition-colors cursor-pointer group"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onViewClaim(claim);
                                            }}
                                          >
                                            <td className="px-4 py-3 font-bold text-slate-200">{claim.id}</td>
                                            <td className="px-4 py-3 text-slate-400">{formatDate(claim.date)}</td>
                                            <td className="px-4 py-3">
                                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${claim.type === 'ot'
                                                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                                : claim.type === 'others'
                                                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                                }`}>
                                                {claim.type === 'ot' ? 'OT Claim' : claim.type === 'others' ? 'Others' : 'General'}
                                              </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-200">
                                              {getClaimTotalDisplay(claim)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${claim.status === 'Approved'
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                : claim.status === 'Rejected'
                                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                }`}>
                                                {claim.status}
                                              </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                              <span className="text-cyan-400 group-hover:underline text-xs font-bold inline-flex items-center gap-0.5">
                                                {claim.status === 'Pending' ? 'Review' : 'View'}
                                                <ArrowRight className="w-3.5 h-3.5" />
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Grouped Cards */}
                <div className="md:hidden divide-y divide-slate-800/60">
                  {paginatedGroupedFEList.map((fe) => {
                    const isExpanded = !!expandedFEs[fe.employeeName];
                    return (
                      <div key={fe.employeeName} className="flex flex-col">
                        <div
                          onClick={() => toggleFE(fe.employeeName)}
                          className="p-5 hover:bg-slate-800/10 active:bg-slate-800/20 transition-colors flex justify-between items-center cursor-pointer"
                        >
                          <div className="flex-1 min-w-0 pr-3">
                            <div className="font-bold text-slate-200 truncate flex items-center gap-1.5">
                              <User className="w-4 h-4 text-cyan-400 shrink-0" />
                              {fe.employeeName}
                            </div>
                            <div className="text-xs text-slate-500 mt-1 truncate">{fe.company && fe.company.toLowerCase().includes('siqma') ? 'Siqma Group (M) Sdn Bhd' : (fe.company || 'Total Neutron Solution Sdn Bhd')}</div>

                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <span className="px-2 py-0.5 bg-slate-800 text-[10px] text-slate-400 rounded font-bold border border-slate-700">
                                {fe.totalClaims} claims
                              </span>
                              {fe.pendingClaims > 0 && (
                                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded text-[10px] font-bold border border-amber-500/20 animate-pulse">
                                  {fe.pendingClaims} pending
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-2 mt-3 text-[10px] font-mono border-t border-slate-850 pt-2 text-slate-400">
                              <div>
                                <span className="text-slate-500 font-bold">Claims:</span>
                                <div className="text-emerald-400 mt-0.5">App: RM {fe.approvedAmount.toFixed(0)}</div>
                                <div className="text-amber-400">Pen: RM {fe.pendingAmount.toFixed(0)}</div>
                              </div>
                              <div>
                                <span className="text-slate-500 font-bold">OT Hours:</span>
                                <div className="text-emerald-400 mt-0.5">App: {fe.approvedOTHours}h</div>
                                <div className="text-amber-400">Pen: {fe.pendingOTHours}h</div>
                              </div>
                            </div>
                          </div>
                          <div className="shrink-0">
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-cyan-400" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-slate-500" />
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="bg-slate-950/40 p-4 border-t border-b border-slate-800/80 flex flex-col gap-3">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Claims list for {fe.employeeName}
                            </div>
                            <div className="divide-y divide-slate-850 flex flex-col gap-2">
                              {fe.claims.map((claim) => (
                                <div
                                  key={claim.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onViewClaim(claim);
                                  }}
                                  className="pt-2 pb-1 hover:bg-slate-900/40 rounded px-2 transition-colors flex flex-col gap-2 cursor-pointer"
                                >
                                  <div className="flex justify-between items-start text-xs">
                                    <div>
                                      <span className="font-bold text-slate-200">{claim.id}</span>
                                      <span className="text-slate-500 text-[10px] ml-2">{formatDate(claim.date)}</span>
                                    </div>
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold border ${claim.status === 'Approved'
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                      : claim.status === 'Rejected'
                                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                      }`}>
                                      {claim.status}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center text-xs">
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${claim.type === 'ot'
                                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                      : claim.type === 'others'
                                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                      }`}>
                                      {claim.type === 'ot' ? 'OT Claim' : claim.type === 'others' ? 'Others Claim' : 'General'}
                                    </span>
                                    <span className="font-mono font-bold text-slate-350">
                                      {getClaimTotalDisplay(claim)}
                                    </span>
                                  </div>
                                  <div className="text-right text-[10px] text-cyan-400 font-bold flex items-center justify-end gap-0.5">
                                    {claim.status === 'Pending' ? 'Review Claim' : 'View Details'}
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                {/* Desktop View (Table) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950/50 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-800">
                        <th className="px-6 py-4">Claim ID / Date</th>
                        {role === 'admin' && <th className="px-6 py-4">Employee</th>}
                        <th className="px-6 py-4">Type</th>
                        <th className="px-6 py-4 text-right">Total Amount / OT</th>
                        <th className="px-6 py-4 text-center">Status</th>
                        <th className="px-6 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {paginatedFilteredClaims.map((claim) => (
                        <tr
                          key={claim.id}
                          className="hover:bg-slate-800/20 transition-colors cursor-pointer group"
                          onClick={() => onViewClaim(claim)}
                        >
                          <td className="px-6 py-4.5">
                            <div className="font-bold text-slate-200">{claim.id}</div>
                            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatDate(claim.date)}
                            </div>
                          </td>
                          {role === 'admin' && (
                            <td className="px-6 py-4.5">
                              <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-slate-400" />
                                {claim.employeeName}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">{claim.company && claim.company.toLowerCase().includes('siqma') ? 'Siqma Group (M) Sdn Bhd' : (claim.company || 'Total Neutron Solution Sdn Bhd')}</div>
                            </td>
                          )}
                          <td className="px-6 py-4.5">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${claim.type === 'ot'
                              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                              : claim.type === 'others'
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              }`}>
                              {claim.type === 'ot' ? 'Overtime (OT)' : claim.type === 'others' ? 'Others Claim' : 'General Claim'}
                            </span>
                          </td>
                          <td className="px-6 py-4.5 text-right font-mono font-bold text-slate-200">
                            {getClaimTotalDisplay(claim)}
                          </td>
                          <td className="px-6 py-4.5 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${claim.status === 'Approved'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : claim.status === 'Rejected'
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${claim.status === 'Approved'
                                ? 'bg-emerald-400'
                                : claim.status === 'Rejected'
                                  ? 'bg-rose-400'
                                  : 'bg-amber-400 animate-pulse'
                                }`} />
                              {claim.status}
                            </span>
                          </td>
                          <td className="px-6 py-4.5 text-right">
                            <span className="text-slate-400 group-hover:text-cyan-400 group-hover:translate-x-1 inline-flex items-center gap-1 transition-all text-sm font-semibold">
                              {role === 'admin' && claim.status === 'Pending' ? 'Review' : 'View'}
                              <ArrowRight className="w-4 h-4" />
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View (Cards) */}
                <div className="md:hidden divide-y divide-slate-800/60">
                  {paginatedFilteredClaims.map((claim) => (
                    <div
                      key={claim.id}
                      onClick={() => onViewClaim(claim)}
                      className="p-5 hover:bg-slate-800/10 active:bg-slate-800/20 transition-colors flex flex-col gap-4"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-slate-200">{claim.id}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{formatDate(claim.date)}</div>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${claim.status === 'Approved'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : claim.status === 'Rejected'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${claim.status === 'Approved' ? 'bg-emerald-400' : claim.status === 'Rejected' ? 'bg-rose-400' : 'bg-amber-400'
                            }`} />
                          {claim.status}
                        </span>
                      </div>

                      {role === 'admin' && (
                        <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/80 text-xs flex flex-col gap-1">
                          <span className="text-slate-400 font-medium">Employee Details:</span>
                          <span className="text-slate-200 font-bold">{claim.employeeName} ({claim.company && claim.company.toLowerCase().includes('siqma') ? 'Siqma Group (M) Sdn Bhd' : (claim.company || 'Total Neutron Solution Sdn Bhd')})</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-sm">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${claim.type === 'ot'
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                          : claim.type === 'others'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}>
                          {claim.type === 'ot' ? 'OT Claim' : claim.type === 'others' ? 'Others Claim' : 'General Claim'}
                        </span>
                        <span className="font-mono font-bold text-slate-200">
                          {getClaimTotalDisplay(claim)}
                        </span>
                      </div>

                      <div className="text-right text-xs text-cyan-400 font-bold flex items-center justify-end gap-1">
                        {role === 'admin' && claim.status === 'Pending' ? 'Review Claim' : 'View Details'}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Pagination Controls */}
            <div className="bg-slate-900/30 border-t border-slate-800/80 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 mt-2 rounded-b-xl">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span>Rows per page:</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      const val = e.target.value === 'All' ? 'All' : Number(e.target.value);
                      setRowsPerPage(val);
                      setCurrentPage(1);
                    }}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-300 font-semibold focus:outline-none cursor-pointer focus:border-cyan-500 transition-colors"
                  >
                    <option value={6}>6</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value="All">All</option>
                  </select>
                </div>
                <span>
                  Showing {totalItems === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + actualRowsPerPage, totalItems)} of {totalItems} entries
                </span>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className={`px-2.5 py-1.5 rounded-lg border font-semibold transition-all select-none ${currentPage === 1
                      ? 'border-slate-800 text-slate-650 cursor-not-allowed opacity-40'
                      : 'border-slate-700 text-slate-350 hover:bg-slate-800 hover:text-white cursor-pointer'
                      }`}
                  >
                    Prev
                  </button>

                  {getPageNumbers().map((pageNum, idx) => {
                    if (pageNum === '...') {
                      return (
                        <span key={`dots-${idx}`} className="px-2 py-1 text-slate-500 font-bold">
                          ...
                        </span>
                      );
                    }
                    return (
                      <button
                        key={`page-${pageNum}`}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition-all select-none cursor-pointer ${currentPage === pageNum
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                          : 'border border-slate-700 text-slate-350 hover:bg-slate-800 hover:text-white'
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className={`px-2.5 py-1.5 rounded-lg border font-semibold transition-all select-none ${currentPage === totalPages
                      ? 'border-slate-800 text-slate-650 cursor-not-allowed opacity-40'
                      : 'border-slate-700 text-slate-350 hover:bg-slate-800 hover:text-white cursor-pointer'
                      }`}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
