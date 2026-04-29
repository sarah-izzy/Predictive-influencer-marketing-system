import { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Common
import ProtectedRoute from './components/common/ProtectedRoute';

// Sidebars
import BrandSidebar from './components/brand/BrandSidebar';
import InfluencerSidebar from './components/influencer/InfluencerSidebar';

// Public
import Login from './pages/Login';
import Home from './pages/Home';

// Brand pages
import BrandOverview from './pages/brand/BrandOverview';
import CampaignCreate from './pages/brand/CampaignCreate';
import Recommendations from './pages/brand/Recommendations';
import BrandAnalytics from './pages/brand/BrandAnalytics';
import About from './pages/About';

// Influencer pages
import InfluencerOverview from './pages/influencer/InfluencerOverview';
import InfluencerProfile from './pages/influencer/InfluencerProfile';
import InfluencerPerformance from './pages/influencer/InfluencerPerformance';
import Invitations from './pages/influencer/Invitations';
import Earnings from './pages/influencer/Earnings';

import './App.css';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  const isLoginPage = location.pathname === '/login';
  const isHomePage = location.pathname === '/';
  const isBrand = user?.role === 'brand';
  const isInfluencer = user?.role === 'influencer';

  return (
    <div className={`app-layout ${(isLoginPage || isHomePage) ? 'no-sidebar' : ''}`}>
      {/* Sidebar overlay for mobile */}
      {!isLoginPage && !isHomePage && isAuthenticated && (
        <div
          className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Conditional Sidebar */}
      {!isLoginPage && !isHomePage && isAuthenticated && isBrand && (
        <BrandSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}
      {!isLoginPage && !isHomePage && isAuthenticated && isInfluencer && (
        <InfluencerSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <main className={`main-content ${(isLoginPage || isHomePage) ? 'main-content-full' : ''}`}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />

          {/* Brand routes */}
          <Route path="/brand/overview" element={
            <ProtectedRoute allowedRole="brand"><BrandOverview /></ProtectedRoute>
          } />
          <Route path="/brand/campaigns/create" element={
            <ProtectedRoute allowedRole="brand"><CampaignCreate /></ProtectedRoute>
          } />
          <Route path="/brand/recommendations" element={
            <ProtectedRoute allowedRole="brand"><Recommendations /></ProtectedRoute>
          } />
          <Route path="/brand/analytics" element={
            <ProtectedRoute allowedRole="brand"><BrandAnalytics /></ProtectedRoute>
          } />
          <Route path="/brand/about" element={
            <ProtectedRoute allowedRole="brand"><About /></ProtectedRoute>
          } />

          {/* Influencer routes */}
          <Route path="/influencer/overview" element={
            <ProtectedRoute allowedRole="influencer"><InfluencerOverview /></ProtectedRoute>
          } />
          <Route path="/influencer/profile" element={
            <ProtectedRoute allowedRole="influencer"><InfluencerProfile /></ProtectedRoute>
          } />
          <Route path="/influencer/performance" element={
            <ProtectedRoute allowedRole="influencer"><InfluencerPerformance /></ProtectedRoute>
          } />
          <Route path="/influencer/invitations" element={
            <ProtectedRoute allowedRole="influencer"><Invitations /></ProtectedRoute>
          } />
          <Route path="/influencer/earnings" element={
            <ProtectedRoute allowedRole="influencer"><Earnings /></ProtectedRoute>
          } />

          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
