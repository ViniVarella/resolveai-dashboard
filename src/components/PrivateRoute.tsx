import { Navigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

interface PrivateRouteProps {
  children: React.ReactNode;
}
 
export default function PrivateRoute({ children }: PrivateRouteProps) {
  const { isAuthenticated } = useUser();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
} 