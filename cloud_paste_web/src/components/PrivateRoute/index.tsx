/**
 * 路由守卫 - 需要登录才能访问
 */
import { Navigate } from "react-router-dom";
import { useSnapshot } from "valtio";
import { authStore } from "@/stores/auth";

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const { isAuthenticated } = useSnapshot(authStore);

  if (!isAuthenticated) {
    return <Navigate replace to="/login" />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
