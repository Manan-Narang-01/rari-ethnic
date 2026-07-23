import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

// Nest this around a route element inside AdminLayout when a page needs a
// tighter check than the baseline admin-or-super-admin gate AdminLayout
// already applies -- e.g. <RequireRole roles={["super_admin"]}><Page/></RequireRole>.
// The corresponding backend router should use the matching dependency
// (dependencies=[Depends(require_super_admin)]) -- this component only
// stops navigation, it isn't what actually secures the API.
export const RequireRole = ({ roles, children, fallback = "/admin" }) => {
  const { user } = useAuth();
  if (!roles.includes(user?.role)) return <Navigate to={fallback} replace />;
  return children;
};

export default RequireRole;
