import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Logout = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Call logout function from auth context
    logout();
    // Redirect to home page
    navigate('/');
  }, [logout, navigate]);
  
  // Display nothing while logging out
  return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      <p className="ml-4 text-lg text-gray-600">Logging out...</p>
    </div>
  );
};

export default Logout; 