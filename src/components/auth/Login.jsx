import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { login, error, isAuthenticated } = useAuth();
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);
  
  const validateForm = () => {
    const errors = {};
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Email is invalid';
    }
    
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Function to check if user profile is complete
  const checkProfileCompletion = async (token) => {
    try {
      // Get user profile data
      const userResponse = await axios.get('https://openmindsbackend.onrender.com/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const userData = userResponse.data;
      console.log('[LOGIN]  Profile Check: User profile data:', userData);
      
      // Check if any required fields are missing
      const isProfileIncomplete = !userData.full_name || 
                                userData.full_name === null || 
                                !userData.phone_number || 
                                userData.phone_number === null || 
                                !userData.date_of_birth || 
                                userData.date_of_birth === null;
      
      if (isProfileIncomplete) {
        console.log('User profile is incomplete, redirecting to register page');
        // Navigate to register page with an informative message
        navigate('/register', { 
          state: { 
            fromLogin: true,
            email: userData.email,
            userId: userData.id,
            message: 'Please complete your profile information to continue',
            userData: userData // Pass the entire user data to prepopulate fields
          } 
        });
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking profile completion:', error);
      
      // Try with a direct API call as fallback
      try {
        const directResponse = await axios.get('https://openmindsbackend.onrender.com/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const userData = directResponse.data;
        console.log('Profile Check (fallback): User profile data:', userData);
        
        // Check if any required fields are missing
        const isProfileIncomplete = !userData.full_name || 
                                  userData.full_name === null || 
                                  !userData.phone_number || 
                                  userData.phone_number === null || 
                                  !userData.date_of_birth || 
                                  userData.date_of_birth === null;
        
        if (isProfileIncomplete) {
          console.log('User profile is incomplete, redirecting to register page');
          // Navigate to register page with an informative message
          navigate('/register', { 
            state: { 
              fromLogin: true,
              email: userData.email,
              userId: userData.id,
              message: 'Please complete your profile information to continue',
              userData: userData // Pass the entire user data to prepopulate fields
            } 
          });
          return false;
        }
        
        return true;
      } catch (fallbackError) {
        console.error('Fallback profile check also failed:', fallbackError);
        // Allow login to proceed even if we can't check profile completion
        return true;
      }
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      setIsSubmitting(true);
      try {
        console.log('Attempting login with:', { email });
        
        try {
          // First try the regular login through authService
          const result = await login(email, password);
          
          if (result.success) {
            // Get token from local storage (set by the login function)
            const token = localStorage.getItem('token');
            
            // Check if profile is complete before redirecting
            const isProfileComplete = await checkProfileCompletion(token);
            
            if (isProfileComplete) {
              const from = location.state?.from || '/';
              navigate(from, { replace: true });
            }
            // If profile is incomplete, the checkProfileCompletion function 
            // will handle the redirection to the register page
          } else {
            console.error('Login failed:', result.error);
            
            // Try direct backend call as fallback
            console.log('Attempting direct backend login as fallback...');
            const formData = new FormData();
            formData.append('username', email);
            formData.append('password', password);
            
            const directResponse = await axios.post('https://openmindsbackend.onrender.com/api/auth/login', formData, {
              headers: {
                'Content-Type': 'multipart/form-data'
              }
            });
            
            console.log('Direct login succeeded:', directResponse.data);
            
            if (directResponse.data.access_token) {
              // Store the token
              const token = directResponse.data.access_token;
              localStorage.setItem('token', token);
              
              // Check if profile is complete before redirecting
              const isProfileComplete = await checkProfileCompletion(token);
              
              if (isProfileComplete) {
                // Navigate to home or intended page
                const from = location.state?.from || '/';
                navigate(from, { replace: true });
              }
              // If profile is incomplete, the checkProfileCompletion function
              // will handle the redirection to the register page
            }
          }
        } catch (error) {
          console.error('Both login attempts failed:', error);
        }
      } catch (err) {
        console.error('Login error:', err);
      } finally {
        setIsSubmitting(false);
      }
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
              create a new account
            </Link>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                  formErrors.email ? 'border-red-500' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {formErrors.email && (
                <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                  formErrors.password ? 'border-red-500' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {formErrors.password && (
                <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4 my-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Login failed</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;