import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useUI } from './context/UIContext';
import Header from './components/navigation/Header';
import BottomNav from './components/navigation/BottomNav';
import AuthModal from './components/auth/AuthModal';
import './App.css';

import Home from './pages/home/Home';
import Browse from './pages/home/Browse';
import ListingDetail from './pages/listings/ListingDetail';
import CreateListing from './pages/listings/CreateListing';
import Favorites from './pages/listings/Favorites';
import MyListings from './pages/listings/MyListings';
import EditListing from './pages/listings/EditListing';
import Messages from './pages/communication/Messages';
import Notifications from './pages/communication/Notifications';
import Profile from './pages/profile/Profile';
import ProfileEdit from './pages/profile/ProfileEdit';
import TraderPlans from './pages/profile/TraderPlans';
import SponsoredAd from './pages/profile/SponsoredAd';
import SellerProfile from './pages/profile/SellerProfile';
import NotFound from './pages/NotFound';

// We will import pages here later

const AppShell = () => {
  const { isLoading } = useAuth();
  const { isMobile, isAuthOpen, hideAuth, authReason } = useUI();



  return (
    <div className="app-container">
      <Header />
      
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/listing/:id" element={<ListingDetail />} />
          <Route path="/create-listing" element={<CreateListing />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/my-listings" element={<MyListings />} />
          <Route path="/edit-listing/:id" element={<EditListing />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/:id" element={<Messages />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/edit" element={<ProfileEdit />} />
          <Route path="/trader-plans" element={<TraderPlans />} />
          <Route path="/sponsored-ad" element={<SponsoredAd />} />
          <Route path="/seller/:id" element={<SellerProfile />} />
          {/* Add more routes here */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {isMobile && <BottomNav />}

      {isAuthOpen && (
        isMobile ? (
          <div className="auth-modal-mobile-wrapper">
            <AuthModal onClose={hideAuth} reason={authReason} />
          </div>
        ) : (
          <div className="auth-modal-overlay" onClick={e => { if (e.target === e.currentTarget) hideAuth(); }}>
            <div className="auth-modal-wrapper auth-modal-wrapper--entering">
              <AuthModal onClose={hideAuth} reason={authReason} />
            </div>
          </div>
        )
      )}
    </div>
  );
};

function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  );
}

export default App;
