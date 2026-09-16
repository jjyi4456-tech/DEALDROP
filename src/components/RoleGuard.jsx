import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

// Frontend route guard (Lock layer 1). Allow only the listed roles; bounce
// everyone else to their own dashboard. Admin is a super-user who may preview
// any persona's screens, so include it in the allow list where needed.
const HOME = {
  admin: "/admin",
  merchant: "/merchant",
  pending_merchant: "/pending-approval",
  user: "/user",
};

export default function RoleGuard({ allow = [] }) {
  const { user } = useAuth();
  const role = user?.role || "user";
  if (allow.includes(role)) return <Outlet />;
  return <Navigate to={HOME[role] || "/user"} replace />;
}