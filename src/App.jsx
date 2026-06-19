import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, UserSquare, LogOut, ShieldAlert, Loader, Users, FileText
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import ProfileSettings from './components/ProfileSettings';
import OTClaimForm from './components/OTClaimForm';
import StaffClaimForm from './components/StaffClaimForm';
import OthersClaimForm from './components/OthersClaimForm';
import ClaimDetailView from './components/ClaimDetailView';
import Login from './components/Login';
import ManageStaff from './components/ManageStaff';

export default function App() {
  const [user, setUser] = useState(null); // stores authenticated user info
  const [claims, setClaims] = useState([]);
  const [currentTab, setCurrentTab] = useState('dashboard'); // 'dashboard', 'profile', 'new-ot', 'new-general', 'new-others', 'view'
  const [activeClaim, setActiveClaim] = useState(null);

  const [loading, setLoading] = useState(true); // app loading session check
  const [claimsLoading, setClaimsLoading] = useState(false);

  // 1. Validate session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (err) {
        console.error('Session check failed:', err);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  // 2. Fetch claims whenever user state changes or tab returns to dashboard
  const fetchClaims = async (silent = false) => {
    if (!user) return;
    if (!silent) setClaimsLoading(true);
    try {
      const res = await fetch('/api/claims');
      if (res.ok) {
        const data = await res.json();
        setClaims(data);

        // Sync active claim details in real-time if currently viewing it
        setActiveClaim(prevActive => {
          if (!prevActive) return null;
          const updated = data.find(c => c.id === prevActive.id);
          if (updated) {
            if (
              updated.status !== prevActive.status ||
              updated.admin_comments !== prevActive.admin_comments ||
              JSON.stringify(updated.items) !== JSON.stringify(prevActive.items)
            ) {
              return updated;
            }
          }
          return prevActive;
        });
      }
    } catch (err) {
      console.error('Error fetching claims:', err);
    } finally {
      if (!silent) setClaimsLoading(false);
    }
  };

  // Live updates polling (runs globally when user is logged in)
  useEffect(() => {
    if (!user) return;

    // Fetch immediately
    fetchClaims();

    // Set up polling every 3 seconds for fast, real-time live updates
    const intervalId = setInterval(() => {
      fetchClaims(true);
    }, 3000);

    return () => clearInterval(intervalId);
  }, [user]);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setCurrentTab('dashboard');
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setClaims([]);
      setActiveClaim(null);
      setCurrentTab('dashboard');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleUpdateProfile = async (updatedProfile) => {
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProfile)
      });
      if (res.ok) {
        setUser(prev => ({
          ...prev,
          name: updatedProfile.name,
          ic: updatedProfile.ic,
          contact: updatedProfile.contact,
          email: updatedProfile.email,
          department: updatedProfile.department
        }));
        return true;
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update profile.');
        return false;
      }
    } catch (err) {
      console.error('Profile update error:', err);
      return false;
    }
  };

  const handleStartClaim = (type) => {
    if (type === 'ot') {
      setCurrentTab('new-ot');
    } else if (type === 'others') {
      setCurrentTab('new-others');
    } else {
      setCurrentTab('new-general');
    }
  };

  const handleViewClaim = async (claim) => {
    // Fetch fresh claim details from API (specifically for receipt data)
    try {
      const res = await fetch(`/api/claims/${claim.id}`);
      if (res.ok) {
        const freshClaim = await res.json();
        setActiveClaim(freshClaim);

        if (freshClaim.status === 'Draft' && user.role === 'staff') {
          if (freshClaim.type === 'ot') {
            setCurrentTab('new-ot');
          } else if (freshClaim.type === 'others') {
            setCurrentTab('new-others');
          } else {
            setCurrentTab('new-general');
          }
        } else {
          setCurrentTab('view');
        }
      }
    } catch (err) {
      console.error('Error fetching claim details:', err);
    }
  };

  const handleSubmitClaim = async (claimDetails) => {
    try {
      let res;
      if (activeClaim) {
        if (user.role === 'admin') {
          // Admin saves and approves edited claim
          res = await fetch(`/api/claims/${activeClaim.id}/admin-edit`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: claimDetails.items,
              totals: claimDetails.totals,
              status: 'Approved'
            })
          });
        } else if (activeClaim.status === 'Draft' || activeClaim.status === 'Pending' || activeClaim.status === 'Rejected') {
          // Staff submits existing draft, pending, or rejected claim
          const resetItems = (claimDetails.items || []).map(item => ({
            ...item,
            approved: item.approved === true
          }));
          res = await fetch(`/api/claims/${activeClaim.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: resetItems,
              totals: claimDetails.totals,
              status: 'Pending'
            })
          });
        }
      } else {
        // Create new claim
        res = await fetch('/api/claims', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...claimDetails,
            status: 'Pending'
          })
        });
      }

      if (res && !res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to submit claim.');
        return;
      }

      setActiveClaim(null);
      setCurrentTab('dashboard');
    } catch (err) {
      console.error('Submit claim error:', err);
      alert('Network error. Failed to submit claim.');
    }
  };

  const handleSaveDraft = async (claimDetails) => {
    try {
      let res;
      if (activeClaim) {
        if (user.role === 'admin') {
          // Admin saves corrections but keeps pending
          res = await fetch(`/api/claims/${activeClaim.id}/admin-edit`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: claimDetails.items,
              totals: claimDetails.totals,
              status: 'Pending'
            })
          });
        } else if (activeClaim.status === 'Draft' || activeClaim.status === 'Pending' || activeClaim.status === 'Rejected') {
          // Staff updates existing draft, pending, or rejected claim
          const resetItems = (claimDetails.items || []).map(item => ({
            ...item,
            approved: item.approved === true
          }));
          res = await fetch(`/api/claims/${activeClaim.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: resetItems,
              totals: claimDetails.totals,
              status: 'Draft'
            })
          });
        }
      } else {
        // Create new draft
        res = await fetch('/api/claims', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...claimDetails,
            status: 'Draft'
          })
        });
      }

      if (res && !res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to save draft.');
        return;
      }

      setActiveClaim(null);
      setCurrentTab('dashboard');
    } catch (err) {
      console.error('Save draft error:', err);
      alert('Network error. Failed to save draft.');
    }
  };

  const handleApproveClaim = async (claimId, comments, items, totals) => {
    try {
      const res = await fetch(`/api/claims/${claimId}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Approved', adminComments: comments, items, totals })
      });
      if (res.ok) {
        setCurrentTab('dashboard');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to approve claim.');
      }
    } catch (err) {
      console.error('Approve claim error:', err);
      alert('Network error. Failed to approve claim.');
    }
  };

  const handleRejectClaim = async (claimId, comments, items, totals) => {
    try {
      const res = await fetch(`/api/claims/${claimId}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Rejected', adminComments: comments, items, totals })
      });
      if (res.ok) {
        setCurrentTab('dashboard');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to reject claim.');
      }
    } catch (err) {
      console.error('Reject claim error:', err);
      alert('Network error. Failed to reject claim.');
    }
  };

  const handleDeleteClaim = async (claimId) => {
    if (!window.confirm('Are you sure you want to delete/remove this claim?')) {
      return;
    }
    try {
      const res = await fetch(`/api/claims/${claimId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setActiveClaim(null);
        setCurrentTab('dashboard');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete claim.');
      }
    } catch (err) {
      console.error('Delete claim error:', err);
      alert('Server error deleting claim.');
    }
  };

  const handleArchiveClaim = async (claimId, isArchived) => {
    try {
      const res = await fetch(`/api/claims/${claimId}/archive`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_archived: isArchived })
      });
      if (res.ok) {
        setActiveClaim(null);
        setCurrentTab('dashboard');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to archive claim.');
      }
    } catch (err) {
      console.error('Archive claim error:', err);
      alert('Server error archiving claim.');
    }
  };

  // 3. Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#080d1a] flex flex-col items-center justify-center text-slate-100">
        <Loader className="w-10 h-10 text-cyan-400 animate-spin" />
        <p className="text-xs text-slate-400 mt-4 tracking-widest uppercase font-bold">Initializing Claims Portal...</p>
      </div>
    );
  }

  // 4. Auth route guarding
  if (!user) {
    return (
      <div className="min-h-screen bg-[#080d1a] text-slate-100 flex flex-col">
        <header className="bg-slate-900/40 border-b border-slate-800/80">
          <div className="max-w-none mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
            <span className="font-display font-extrabold text-sm tracking-wider">
              TOTAL NEUTRON SOLUTIONS
            </span>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <Login onLoginSuccess={handleLoginSuccess} />
        </main>
      </div>
    );
  }

  // 5. Authenticated App Layout
  return (
    <div className="min-h-screen bg-[#080d1a] text-slate-100 flex flex-col antialiased">
      {/* Decorative blurred backgrounds */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Header Panel - Hidden during print */}
      <header className="no-print bg-slate-900/80 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-none mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between">
          {/* Logo / Corporate Identity */}
          <div className="flex items-center gap-3">
            <img 
              src={user.company && user.company.toLowerCase().includes('siqma') ? '/siqma_logo.png' : '/logo.png'} 
              alt="Logo" 
              className="w-8 h-8 object-contain" 
            />
            <span className="font-display font-extrabold text-xs sm:text-sm tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-300">
              {user.company && user.company.toLowerCase().includes('siqma') ? 'SIQMA GROUP (M) SDN BHD' : 'TOTAL NEUTRON SOLUTION SDN BHD'}
            </span>
          </div>

          {/* User Details & Logout */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-200">{user.name}</span>
              <span className={`text-[10px] font-extrabold uppercase tracking-widest mt-0.5 ${user.role === 'admin' ? 'text-amber-400' : 'text-cyan-400'
                }`}>
                {user.role === 'admin' ? 'Finance Admin' : 'Staff Account'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold rounded-xl text-slate-400 hover:text-rose-400 active:scale-95 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-none w-full mx-auto px-4 sm:px-6 lg:px-10 py-8">

        {/* Navigation Tabs - Hidden during print */}
        {currentTab !== 'new-ot' && currentTab !== 'new-general' && currentTab !== 'new-others' && currentTab !== 'view' && (
          <div className="no-print flex border-b border-slate-800 mb-8 gap-1.5">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-semibold text-sm transition-all cursor-pointer ${currentTab === 'dashboard'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-400/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>

            {user.role === 'staff' && (
              <button
                onClick={() => setCurrentTab('profile')}
                className={`flex items-center gap-2 px-5 py-3 border-b-2 font-semibold text-sm transition-all cursor-pointer ${currentTab === 'profile'
                  ? 'border-cyan-400 text-cyan-400 bg-cyan-400/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
              >
                <UserSquare className="w-4 h-4" />
                Profile Settings
              </button>
            )}

            {user.role === 'admin' && (
              <button
                onClick={() => setCurrentTab('manage-staff')}
                className={`flex items-center gap-2 px-5 py-3 border-b-2 font-semibold text-sm transition-all cursor-pointer ${currentTab === 'manage-staff'
                  ? 'border-cyan-400 text-cyan-400 bg-cyan-400/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
              >
                <Users className="w-4 h-4" />
                Manage Staff
              </button>
            )}
          </div>
        )}

        {/* View Routing */}
        <div>
          {currentTab === 'dashboard' && (
            <Dashboard
              role={user.role}
              claims={claims}
              profile={user}
              onStartClaim={handleStartClaim}
              onViewClaim={handleViewClaim}
            />
          )}

          {currentTab === 'profile' && user.role === 'staff' && (
            <ProfileSettings
              profile={user}
              onUpdateProfile={handleUpdateProfile}
            />
          )}

          {currentTab === 'manage-staff' && user.role === 'admin' && (
            <ManageStaff currentUser={user} />
          )}

          {currentTab === 'new-ot' && (
            <OTClaimForm
              profile={user}
              draftClaim={activeClaim}
              role={user.role}
              onSaveDraft={handleSaveDraft}
              onSubmitClaim={handleSubmitClaim}
              onDeleteClaim={handleDeleteClaim}
              onCancel={() => {
                setActiveClaim(null);
                setCurrentTab('dashboard');
              }}
            />
          )}

          {currentTab === 'new-general' && (
            <StaffClaimForm
              profile={user}
              draftClaim={activeClaim}
              role={user.role}
              onSaveDraft={handleSaveDraft}
              onSubmitClaim={handleSubmitClaim}
              onDeleteClaim={handleDeleteClaim}
              onCancel={() => {
                setActiveClaim(null);
                setCurrentTab('dashboard');
              }}
            />
          )}

          {currentTab === 'new-others' && (
            <OthersClaimForm
              profile={user}
              draftClaim={activeClaim}
              role={user.role}
              onSaveDraft={handleSaveDraft}
              onSubmitClaim={handleSubmitClaim}
              onDeleteClaim={handleDeleteClaim}
              onCancel={() => {
                setActiveClaim(null);
                setCurrentTab('dashboard');
              }}
            />
          )}

          {currentTab === 'view' && activeClaim && (
            <ClaimDetailView
              role={user.role}
              claim={activeClaim}
              onBack={() => {
                setActiveClaim(null);
                setCurrentTab('dashboard');
              }}
              onApprove={handleApproveClaim}
              onReject={handleRejectClaim}
              onEditClaim={(claim) => {
                setActiveClaim(claim);
                if (claim.type === 'ot') {
                  setCurrentTab('new-ot');
                } else if (claim.type === 'others') {
                  setCurrentTab('new-others');
                } else {
                  setCurrentTab('new-general');
                }
              }}
              onDeleteClaim={handleDeleteClaim}
              onArchiveClaim={handleArchiveClaim}
            />
          )}
        </div>
      </main>

      {/* Footer - Hidden during print */}
      <footer className="no-print bg-slate-950/40 border-t border-slate-900/60 py-6 text-center text-xs text-slate-500">
        <div className="max-w-none mx-auto px-4 sm:px-6 lg:px-10">
          <p>© {new Date().getFullYear()} Total Neutron Solution Sdn Bhd. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
