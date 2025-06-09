import { Navigate } from 'react-router-dom';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export default function PrivateRoute({ children }: PrivateRouteProps) {
  const isAuthenticated = localStorage.getItem('auth') === 'true';
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
} 