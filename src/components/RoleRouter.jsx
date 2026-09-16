import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

// Post-login intelligent routing: read the user's role and redirect to their dashboard.
const HOME = {
  admin: "/admin",
  merchant: "/merchant",
  pending_merchant: "/pending-approval",
  user: "/user",
};

export default function RoleRouter() {
  const { user } = useAuth();
  const dest = HOME[user?.role] || "/user";
  return <Navigate to={dest} replace />;
}