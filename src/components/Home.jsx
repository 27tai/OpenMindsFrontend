import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TestPaperBlocks from './TestPaperBlocks';
import AdminUserCreation from './AdminUserCreation';

function Home() {
  const { user, isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        {/* Admin specific section */}
        {user && user.role === 'ADMIN' && (
          <div className="mb-8">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold mb-4">Admin Actions</h2>
                <div className="flex flex-col gap-3">
                  <Link 
                    to="/admin/manage-tests" 
                    className="bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition duration-300 text-center"
                  >
                    Manage Test Papers
                  </Link>
                  <Link 
                    to="/admin/manage-users" 
                    className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-300 text-center"
                  >
                    Manage Users
                  </Link>
                  <Link 
                    to="/admin/results" 
                    className="bg-teal-600 text-white py-2 px-4 rounded-md hover:bg-teal-700 transition duration-300 text-center"
                  >
                    View All Results
                  </Link>
                </div>
              </div> */}
            </div>
          </div>
        )}
        
        {/* Regular user section - shows test papers */}
        <TestPaperBlocks />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
      <h1 className="text-4xl font-bold mb-6">Welcome to MCQ Testing Platform</h1>
      <p className="text-xl mb-8 max-w-2xl">
        Test your knowledge with our extensive collection of multiple-choice questions across various categories.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          to="/login"
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-300"
        >
          Login
        </Link>
        <Link
          to="/register"
          className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-300"
        >
          Register
        </Link>
      </div>
    </div>
  );
}

export default Home;