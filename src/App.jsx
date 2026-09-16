import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Navigate } from 'react-router-dom';
import RoleGuard from '@/components/RoleGuard';
import AppLayout from '@/components/AppLayout';
import PageFallback from '@/components/PageFallback';

// Route-level code splitting: every page chunk loads lazily behind the
// Suspense boundary below, keeping the initial bundle small on mobile.
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const HomeGate = lazy(() => import('@/components/HomeGate'));
const PendingApproval = lazy(() => import('@/pages/PendingApproval'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const MerchantManagement = lazy(() => import('@/pages/admin/MerchantManagement'));
const PlanManagement = lazy(() => import('@/pages/admin/PlanManagement'));
const GamificationControl = lazy(() => import('@/pages/admin/GamificationControl'));
const CommunityGoalControl = lazy(() => import('@/pages/admin/CommunityGoalControl'));
const AdsManagement = lazy(() => import('@/pages/admin/AdsManagement'));
const AdminRevenueDashboard = lazy(() => import('@/pages/admin/AdminRevenueDashboard'));
const MerchantCommissionControl = lazy(() => import('@/pages/admin/MerchantCommissionControl'));
const SettlementManager = lazy(() => import('@/pages/admin/SettlementManager'));
const MerchantDashboard = lazy(() => import('@/pages/merchant/MerchantDashboard'));
const QuestBuilder = lazy(() => import('@/pages/merchant/QuestBuilder'));
const QrScanner = lazy(() => import('@/pages/merchant/QrScanner'));
const LiveQr = lazy(() => import('@/pages/merchant/LiveQr'));
const MerchantInsight = lazy(() => import('@/pages/merchant/MerchantInsight'));
const InfluencerStats = lazy(() => import('@/pages/merchant/InfluencerStats'));
const Finance = lazy(() => import('@/pages/merchant/Finance'));
const Campaigns = lazy(() => import('@/pages/merchant/Campaigns'));
const MerchantProfile = lazy(() => import('@/pages/merchant/MerchantProfile'));
const BannerManager = lazy(() => import('@/pages/merchant/BannerManager'));
// billing & wallet pages merged into /merchant/finance
const MenuManagement = lazy(() => import('@/pages/merchant/MenuManagement'));
const MerchantOrders = lazy(() => import('@/pages/merchant/MerchantOrders'));
const UserDiscovery = lazy(() => import('@/pages/user/UserDiscovery'));
const CheckIn = lazy(() => import('@/pages/user/CheckIn'));
const UserProfile = lazy(() => import('@/pages/user/UserProfile'));
const VirtualPet = lazy(() => import('@/pages/user/VirtualPet'));
const Bag = lazy(() => import('@/pages/user/Bag'));
const Leaderboard = lazy(() => import('@/pages/user/Leaderboard'));
const ConquestMap = lazy(() => import('@/pages/user/ConquestMap'));
// inventory merged into /user/bag
const MerchantDetail = lazy(() => import('@/pages/user/MerchantDetail'));
const SquadLobby = lazy(() => import('@/pages/user/SquadLobby'));
const OrderMenu = lazy(() => import('@/pages/user/OrderMenu'));
const MysteryDrop = lazy(() => import('@/pages/user/MysteryDrop'));

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Suspense fallback={<PageFallback />}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Guest-first public landing: guests see the live quest showcase at "/",
          signed-in users are routed straight to their role dashboard. */}
      <Route path="/" element={<HomeGate />} />

      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/pending-approval" element={<PendingApproval />} />
      </Route>

      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<RoleGuard allow={["admin"]} />}>
        <Route element={<AppLayout persona="admin" />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/merchants" element={<MerchantManagement />} />
          <Route path="/admin/plans" element={<PlanManagement />} />
          <Route path="/admin/gamification" element={<GamificationControl />} />
          <Route path="/admin/community" element={<CommunityGoalControl />} />
          <Route path="/admin/ads" element={<AdsManagement />} />
          <Route path="/admin/revenue" element={<AdminRevenueDashboard />} />
          <Route path="/admin/commission" element={<MerchantCommissionControl />} />
          <Route path="/admin/settlement" element={<SettlementManager />} />
        </Route>
        </Route>
      </Route>

      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<RoleGuard allow={["merchant", "admin"]} />}>
        <Route element={<AppLayout persona="merchant" />}>
          <Route path="/merchant" element={<MerchantDashboard />} />
          <Route path="/merchant/quests" element={<Campaigns />} />
          <Route path="/merchant/campaigns" element={<Navigate to="/merchant/quests" replace />} />
          <Route path="/merchant/banner" element={<Navigate to="/merchant/quests" replace />} />
          <Route path="/merchant/scanner" element={<QrScanner />} />
          <Route path="/merchant/live-qr" element={<LiveQr />} />
          <Route path="/merchant/insight" element={<MerchantInsight />} />
          <Route path="/merchant/influencers" element={<InfluencerStats />} />
          <Route path="/merchant/profile" element={<MerchantProfile />} />
          <Route path="/merchant/menu" element={<MenuManagement />} />
          <Route path="/merchant/orders" element={<MerchantOrders />} />
          <Route path="/merchant/finance" element={<Finance />} />
          <Route path="/merchant/subscription" element={<Navigate to="/merchant/finance" replace />} />
          <Route path="/merchant/billing" element={<Navigate to="/merchant/finance" replace />} />
          <Route path="/merchant/wallet" element={<Navigate to="/merchant/finance" replace />} />
        </Route>
        </Route>
      </Route>

      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<RoleGuard allow={["user", "admin"]} />}>
        <Route element={<AppLayout persona="user" />}>
          <Route path="/user" element={<UserDiscovery />} />
          <Route path="/user/checkin" element={<CheckIn />} />
          <Route path="/user/profile" element={<UserProfile />} />
          <Route path="/user/pet" element={<VirtualPet />} />
          <Route path="/user/bag" element={<Bag />} />
          <Route path="/user/wallet" element={<Navigate to="/user/bag" replace />} />
          <Route path="/user/leaderboard" element={<Leaderboard />} />
          <Route path="/user/map" element={<ConquestMap />} />
          <Route path="/user/inventory" element={<Navigate to="/user/bag" replace />} />
          <Route path="/user/merchant/:id" element={<MerchantDetail />} />
          <Route path="/user/squad/:code" element={<SquadLobby />} />
          <Route path="/user/order/:merchantId" element={<OrderMenu />} />
          <Route path="/user/mystery" element={<MysteryDrop />} />
        </Route>
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </Suspense>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App