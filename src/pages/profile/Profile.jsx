import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Camera, Crown, MapPin, Calendar, Heart, Package, Bell, Shield, LogOut, ChevronRight, Pencil, Check, Mail, Megaphone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { usersApi } from '../../services/usersApi';
import { timeAgo, formatRWF } from '../../utils/formatters';

export default function Profile() {
  const { user, logout } = useAuth();
  const { isMobile, showAuth } = useUI();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className={`flex flex-col items-center justify-center text-center ${isMobile ? 'min-h-screen pb-20 px-6' : 'pt-24 min-h-screen px-6'}`}>
        <div className="w-20 h-20 bg-ink-100 rounded-3xl flex items-center justify-center mb-4">
          <Shield size={40} className="text-ink-300" />
        </div>
        <h3 className="text-lg font-bold text-ink-800 mb-2">Sign in to view your profile</h3>
        <p className="text-sm text-ink-500 mb-6">Manage your listings, messages, and account settings.</p>
        <button onClick={() => showAuth()} className="btn btn-primary px-6">Sign In</button>
      </div>
    );
  }

  const planLabel = user.role === 'buyer' ? 'Free' : user.role === 'seller' ? 'Trader' : 'Admin';

  return (
    <div className="bg-ink-50 min-h-full animate-fade-in">
      {/* Header */}
      {isMobile && (
        <div className="bg-white border-b border-ink-100 sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 py-4">
            <h1 className="text-lg font-bold text-ink-950">Profile</h1>
            <button onClick={() => navigate('/profile/edit')} className="flex items-center gap-1.5 text-xs text-brand-600 font-semibold">
              <Pencil size={14} />Edit
            </button>
          </div>
        </div>
      )}

      <div className={`${isMobile ? 'px-4 pt-4' : 'max-w-screen-xl mx-auto px-4 lg:px-8 pt-6 max-w-3xl'}`}>
        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-ink-200 overflow-hidden mb-4">
          <div className="bg-gradient-to-r from-brand-600 to-brand-700 h-20" />
          <div className="px-5 pb-5">
            <div className="flex items-end justify-between -mt-10 mb-3">
              <div className="w-20 h-20 rounded-2xl border-4 border-white overflow-hidden bg-ink-100 shadow-sm">
                <img 
                  src={user.avatar_url || '/images/default-avatar.svg'} 
                  alt={user.name} 
                  className="w-full h-full object-cover" 
                  onError={(e) => { e.target.onerror = null; e.target.src = '/images/default-avatar.svg'; }} 
                />
              </div>
              {!isMobile && (
                <button onClick={() => navigate('/profile/edit')} className="flex items-center gap-1.5 border border-ink-200 text-sm font-semibold text-ink-700 px-3 py-2 rounded-xl hover:border-brand-400 hover:bg-brand-50 transition-all">
                  <Pencil size={14} />Edit profile
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-ink-950">{user.name}</h2>
              {user.role !== 'buyer' && <Crown size={16} className="text-amber-500" />}
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-ink-500 mb-3">
              <span className="flex items-center gap-1"><Mail size={12} />{user.email}</span>
              <span className="flex items-center gap-1"><Calendar size={12} />Joined {new Date(user.created_at).toLocaleDateString()}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                user.role === 'buyer' ? 'bg-ink-50 border-ink-200 text-ink-600' :
                'bg-brand-50 border-brand-200 text-brand-700'
              }`}>
                {planLabel}
              </span>
              <span className="text-xs font-medium text-brand-600 flex items-center gap-0.5">
                <Check size={12} />Email verified
              </span>
            </div>
          </div>
        </div>

        {/* Plan upgrade prompt */}
        {user.role === 'buyer' && (
          <button onClick={() => navigate('/trader-plans')} className="w-full flex items-center gap-3 bg-gradient-to-r from-brand-600 to-brand-700 text-white rounded-2xl p-4 mb-4 text-left hover:from-brand-700 hover:to-brand-800 transition-all">
            <Crown size={24} className="text-white/80 shrink-0" />
            <div>
              <p className="text-sm font-bold">Become a Trader</p>
              <p className="text-xs text-white/70">Post up to 20 listings · Sponsored ads · Free for now</p>
            </div>
            <ChevronRight size={20} className="text-white/60 ml-auto" />
          </button>
        )}

        {/* Menu items */}
        <div className="bg-white rounded-2xl border border-ink-200 overflow-hidden mb-4">
          {[
            { icon: <Package size={16} className="text-brand-600" />, label: 'My Listings', onClick: () => navigate('/my-listings') },
            { icon: <Heart size={16} className="text-brand-600" />, label: 'Saved Listings', onClick: () => navigate('/favorites') },
            { icon: <Bell size={16} className="text-brand-600" />, label: 'Notifications', onClick: () => navigate('/notifications') },
            { icon: <Crown size={16} className="text-amber-500" />, label: 'Trader Plans', onClick: () => navigate('/trader-plans') },
            ...(user.role !== 'buyer' ? [{ icon: <Megaphone size={16} className="text-brand-600" />, label: 'Sponsored Ads', onClick: () => navigate('/sponsored-ad') }] : []),
          ].map((item, i) => (
            <button
              key={i}
              onClick={item.onClick}
              className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-ink-100 last:border-0 hover:bg-ink-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-xl bg-ink-50 flex items-center justify-center">{item.icon}</div>
              <span className="flex-1 text-sm font-medium text-ink-800 text-left">{item.label}</span>
              <ChevronRight size={16} className="text-ink-300" />
            </button>
          ))}
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-500 font-semibold text-sm py-3.5 rounded-xl hover:bg-red-50 transition-colors mb-2"
        >
          <LogOut size={16} />Sign out
        </button>
      </div>
    </div>
  );
}
