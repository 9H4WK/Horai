import { Navigate, Outlet, useLocation } from "react-router-dom";

const RequireEmployer = () => {
  const location = useLocation();

  const hasToken = Boolean(localStorage.getItem("token"));
  const isAdmin = localStorage.getItem("isAdmin") === "true";
  const roleValue =
    localStorage.getItem("userType") ||
    localStorage.getItem("role") ||
    "";
  const normalizedRole = String(roleValue).toLowerCase();
  const isEmployer =
    normalizedRole.includes("employer") ||
    normalizedRole.includes("company") ||
    isAdmin;

  if (!hasToken) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!isEmployer) {
    return <Navigate to="/for-employers" replace />;
  }

  return <Outlet />;
};

export default RequireEmployer;
