import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import logo from './images/logo.png';

// Change this to your actual backend URL
const API_URL = 'https://openmindsbackend.onrender.com/api';

const NavBar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  
  // Modal state and functions for AdminUserCreation
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '' // Will be set automatically by trimming email
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Check if user is admin
  const isAdmin = user?.role === 'ADMIN';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Admin User Creation Modal handlers
  const openModal = () => {
    setIsOpen(true);
    setError(null);
    setSuccess(false);
  };

  const closeModal = () => {
    setIsOpen(false);
    // Reset form when closing the modal
    setFormData({
      email: '',
      password: '',
      full_name: ''
    });
    setError(null);
    setSuccess(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'email') {
      // Extract full_name from email (everything before @)
      const full_name = value.split('@')[0];
      setFormData(prev => ({ 
        ...prev, 
        [name]: value,
        full_name 
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Use the full URL with the API_URL constant
      const response = await axios.post(`${API_URL}/auth/admin/create-user`, formData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      setSuccess(true);
      setFormData({
        email: '',
        password: '',
        full_name: ''
      });
      
      // Close the modal after successful user creation (optional)
      setTimeout(() => {
        setIsOpen(false);
      }, 2000);
      
    } catch (err) {
      console.error("Error creating user:", err);
      setError(err.response?.data?.detail || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <nav className="bg-indigo-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                {/* Logo Image */}
                <img src={logo} 
                alt="MCQ Platform Logo" 
                className="h-14 w-auto mr-2" 
                />
                
              </div>
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  <Link to="/" className="text-white hover:bg-indigo-500 px-3 py-2 rounded-md text-sm font-medium">
                    Home
                  </Link>
                  
                </div>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="ml-4 flex items-center md:ml-6">
                {isAuthenticated ? (
                  <div className="flex items-center">
                    <span className="text-white mr-4">
                      {user?.email}
                    </span>
                    {/* Add Admin User button - only show for admin users */}
                    {isAdmin && (
                      <button 
                        onClick={openModal}
                        className="text-indigo-100 bg-indigo-700 hover:bg-indigo-800 px-3 py-2 rounded-md text-sm font-medium mr-4"
                      >
                        Add User
                      </button>
                    )}
                    <button 
                      onClick={handleLogout}
                      className="text-indigo-100 bg-indigo-700 hover:bg-indigo-800 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Log out
                    </button>
                  </div>
                ) : (
                  <div className="flex space-x-4">
                    <Link to="/login" className="text-white hover:bg-indigo-500 px-3 py-2 rounded-md text-sm font-medium">
                      Log in
                    </Link>
                    <Link to="/register" className="text-indigo-100 bg-indigo-700 hover:bg-indigo-800 px-3 py-2 rounded-md text-sm font-medium">
                      Register
                    </Link>
                  </div>
                )}
              </div>
            </div>
            
            <div className="-mr-2 flex md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="bg-indigo-700 inline-flex items-center justify-center p-2 rounded-md text-indigo-100 hover:text-white hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-700 focus:ring-white"
              >
                <span className="sr-only">Open main menu</span>
                {!isMobileMenuOpen ? (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                ) : (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link to="/" className="text-white hover:bg-indigo-500 block px-3 py-2 rounded-md text-base font-medium">
                Home
              </Link>
              
            </div>
            <div className="pt-4 pb-3 border-t border-indigo-700">
              {isAuthenticated ? (
                <div className="px-2 space-y-1">
                  <div className="text-white px-3 py-2 text-base">
                    {user?.email}
                  </div>
                  {/* Add Admin User button in mobile menu - only show for admin users */}
                  {isAdmin && (
                    <button 
                      onClick={openModal}
                      className="text-white hover:bg-indigo-500 block w-full text-left px-3 py-2 rounded-md text-base font-medium"
                    >
                      Add User
                    </button>
                  )}
                  <button 
                    onClick={handleLogout}
                    className="text-white hover:bg-indigo-500 block w-full text-left px-3 py-2 rounded-md text-base font-medium"
                  >
                    Log out
                  </button>
                </div>
              ) : (
                <div className="px-2 space-y-1">
                  <Link to="/login" className="text-white hover:bg-indigo-500 block px-3 py-2 rounded-md text-base font-medium">
                    Log in
                  </Link>
                  <Link to="/register" className="text-white hover:bg-indigo-500 block px-3 py-2 rounded-md text-base font-medium">
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Admin User Creation Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          {/* Modal Content */}
          <div className="bg-white rounded-lg p-6 shadow-lg w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add New User</h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="email" className="block text-gray-700 font-medium mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="password" className="block text-gray-700 font-medium mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                  minLength={6}
                />
              </div>

              <div className="mb-4">
                <label htmlFor="full_name" className="block text-gray-700 font-medium mb-2">
                  Full Name (auto-generated)
                </label>
                <input
                  type="text"
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  readOnly
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Name is automatically generated from email
                </p>
              </div>
              
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-md transition-colors duration-300"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-300 disabled:bg-indigo-400"
                >
                  {loading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
            
            {error && (
              <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
                {error}
              </div>
            )}
            
            {success && (
              <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-md">
                User created successfully!
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default NavBar;