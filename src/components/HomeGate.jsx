import { useAuth } from "@/lib/AuthContext";
import RoleRouter from "@/components/RoleRouter";
import PageFallback from "@/components/PageFallback";
import { lazy } from "react";

// Auth-aware home: logged-in users continue straight to their role dashboard
// (admin → /admin, merchant → /merchant, user → /user), while guests see the
// public landing & live quest showcase — no login wall at "/".
const LandingPage = lazy(() => import("@/pages/LandingPage"));

export default function HomeGate() {
  const { isAuthenticated, isLoadingAuth, user } = useAuth();

  if (isLoadingAuth) {
    return <PageFallback />;
  }

  if (isAuthenticated && user) {
    return <RoleRouter />;
  }

  return <LandingPage />;
}