import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register, error, isAuthenticated } = useAuth();
  
  // Get state from navigation if coming from login page
  const { fromLogin, email, userId, message, userData } = location.state || {};
  
  // Determine if this is a profile update (from login redirect) or new registration
  const isProfileUpdate = fromLogin === true;
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone_number: '',
    date_of_birth: '',
    adminSecret: ''
  });
  
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const videoRef = useRef(null);
  const [cameraError, setCameraError] = useState(null);
  
  // Initialize form data from userData if coming from login
  useEffect(() => {
    if (isProfileUpdate && userData) {
      console.log("Setting form data from userData:", userData);
      setFormData({
        ...formData,
        email: userData.email || '',
        fullName: userData.full_name || '',
        phone_number: userData.phone_number || '',
        // Format date if it exists
        date_of_birth: userData.date_of_birth ? 
          (typeof userData.date_of_birth === 'string' ? 
            userData.date_of_birth.split('T')[0] : 
            new Date(userData.date_of_birth).toISOString().split('T')[0]) : 
          '',
        // No need for password if updating profile
        password: '',
        confirmPassword: ''
      });
    } else if (email) {
      // If only email is passed
      setFormData({
        ...formData,
        email
      });
    }
  }, [isProfileUpdate, userData, email]);
  
  // Redirect if already authenticated and not updating profile
  useEffect(() => {
    if (isAuthenticated && !isProfileUpdate) {
      navigate('/');
    }
  }, [isAuthenticated, navigate, isProfileUpdate]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const validateForm = () => {
    const errors = {};
    
    // Full name validation
    if (!formData.fullName.trim()) {
      errors.fullName = 'Full name is required';
    } else if (formData.fullName.length < 2) {
      errors.fullName = 'Full name must be at least 2 characters';
    }

    // Phone number validation
    if (!formData.phone_number?.trim()) {
      errors.phone_number = 'Phone number is required';
    } else if (!/^\d{10,15}$/.test(formData.phone_number.replace(/[^0-9]/g, ''))) {
      errors.phone_number = 'Phone number must be 10-15 digits';
    }
    
    // Date of birth validation
    if (!formData.date_of_birth) {
      errors.date_of_birth = 'Date of birth is required';
    }
    
    // Only validate these if not updating profile
    if (!isProfileUpdate) {
      // Email validation
      if (!formData.email.trim()) {
        errors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        errors.email = 'Email is invalid';
      }
      
      // Password validation
      if (!formData.password) {
        errors.password = 'Password is required';
      } else if (formData.password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
      }
      
      // Confirm password validation
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Cleanup effect to stop camera when component unmounts
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const constraints = {
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play(); // Ensure video starts playing
        setShowCamera(true);
        setCameraError(null);
      }
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError('Could not access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => {
        track.stop(); // Stop each track
        stream.removeTrack(track); // Remove track from stream
      });
      videoRef.current.srcObject = null; // Clear video source
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg');
      setCapturedImage(imageData);
      stopCamera();
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      setIsSubmitting(true);
      setRegisterError('');
      
      try {
        if (isProfileUpdate) {
          // If updating profile (from login redirect), use update API
          console.log("Updating user profile for ID:", userId);
          
          // Format date properly for backend
          let formattedDate = formData.date_of_birth;
          if (formData.date_of_birth && typeof formData.date_of_birth === 'string') {
            // Make sure it's in YYYY-MM-DD format
            formattedDate = formData.date_of_birth.split('T')[0];
          }
          
          const updateData = {
            full_name: formData.fullName,
            phone_number: formData.phone_number,
            date_of_birth: formattedDate
          };
          
          console.log('Updating profile with data:', updateData);
          
          // Get token from localStorage
          const token = localStorage.getItem('token');
          
          if (!token) {
            console.error('No authentication token available');
            setRegisterError('Authentication required. Please log in again.');
            setIsSubmitting(false);
            return;
          }
          
          try {
            // First try with axios
            const response = await axios.patch(
              `https://openmindsbackend.onrender.com/api/auth/users/${userId}`, 
              updateData,
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            
            console.log('Profile update response:', response.data);
            setRegisterSuccess(true);
            setSuccessMessage('Profile updated successfully! Redirecting...');
            
            // Navigate to home after successful update
            setTimeout(() => {
              navigate('/');
            }, 2000);
          } catch (axiosError) {
            console.error('Axios update failed:', axiosError);
            
            // Try with fetch as fallback
            try {
              const fetchResponse = await fetch(
                `https://openmindsbackend.onrender.com/api/auth/users/${userId}`,
                {
                  method: 'PATCH',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(updateData)
                }
              );
              
              if (!fetchResponse.ok) {
                throw new Error(`HTTP error! status: ${fetchResponse.status}`);
              }
              
              const responseData = await fetchResponse.json();
              console.log('Profile update response (fetch):', responseData);
              
              setRegisterSuccess(true);
              setSuccessMessage('Profile updated successfully! Redirecting...');
              
              // Navigate to home after successful update
              setTimeout(() => {
                navigate('/');
              }, 2000);
            } catch (fetchError) {
              console.error('Fetch update also failed:', fetchError);
              setRegisterError('Failed to update profile. Please try again.');
            }
          }
        } else {
          // Regular registration
          const { confirmPassword, ...restData } = formData;
          
          // Format data for API
          const registrationData = {
            full_name: restData.fullName,
            email: restData.email,
            password: restData.password,
            phone_number: restData.phone_number,
            date_of_birth: restData.date_of_birth
          };
          
          // Add admin_secret if provided
          if (restData.adminSecret) {
            registrationData.admin_secret = restData.adminSecret;
          }
          
          console.log('Formatted registration data:', registrationData);
          
          try {
            // Try regular registration first
            const response = await register(registrationData);
            
            if (response && response.success) {
              setRegisterSuccess(true);
              setSuccessMessage('Registration successful! Redirecting to login...');
              // Redirect to login after a delay
              setTimeout(() => {
                navigate('/login');
              }, 2000);
            } else {
              console.error('Registration failed:', response?.error);
              
              // Try direct axios call as a fallback
              console.log('Attempting direct backend call as fallback...');
              const directResponse = await axios.post('https://openmindsbackend.onrender.com/api/auth/register', registrationData, {
                headers: {
                  'Content-Type': 'application/json'
                }
              });
              
              console.log('Direct registration succeeded:', directResponse.data);
              setRegisterSuccess(true);
              setSuccessMessage('Registration successful! Redirecting to login...');
              // Redirect to login after a delay
              setTimeout(() => {
                navigate('/login');
              }, 2000);
            }
          } catch (error) {
            console.error('Both registration attempts failed:', error);
            setRegisterError('Registration failed. Please try again.');
          }
        }
      } catch (err) {
        console.error('Registration/update error:', err);
        setRegisterError('An unexpected error occurred. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };
  
  if (registerSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Success</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>{successMessage || 'Operation completed successfully!'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isProfileUpdate ? 'Complete Your Profile' : 'Create a new account'}
          </h2>
          
          {message && (
            <div className="mt-2 text-center text-sm text-indigo-600">
              {message}
            </div>
          )}
          
          {!isProfileUpdate && (
            <p className="mt-2 text-center text-sm text-gray-600">
              Or{' '}
              <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                sign in to your existing account
              </Link>
            </p>
          )}
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Email Field - readonly if profile update */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required={!isProfileUpdate}
              className={`mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border ${
                formErrors.email ? 'border-red-500' : 'border-gray-300'
              } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm ${
                isProfileUpdate ? 'bg-gray-100' : ''
              }`}
              placeholder="Email address"
              value={formData.email}
              onChange={handleChange}
              readOnly={isProfileUpdate}
              disabled={isProfileUpdate}
            />
            {formErrors.email && (
              <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>
            )}
          </div>
          
          {/* Full Name Field */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              required
              className={`mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border ${
                formErrors.fullName ? 'border-red-500' : 'border-gray-300'
              } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
              placeholder="Full name"
              value={formData.fullName}
              onChange={handleChange}
            />
            {formErrors.fullName && (
              <p className="text-red-500 text-xs mt-1">{formErrors.fullName}</p>
            )}
          </div>
          
          {/* Phone Number Field */}
          <div>
            <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700">
              Phone Number
            </label>
            <input
              id="phone_number"
              name="phone_number"
              type="tel"
              autoComplete="tel"
              required
              className={`mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border ${
                formErrors.phone_number ? 'border-red-500' : 'border-gray-300'
              } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
              placeholder="Phone number"
              value={formData.phone_number}
              onChange={handleChange}
            />
            {formErrors.phone_number && (
              <p className="text-red-500 text-xs mt-1">{formErrors.phone_number}</p>
            )}
          </div>
          
          {/* Date of Birth Field */}
          <div>
            <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700">
              Date of Birth
            </label>
            <input
              id="date_of_birth"
              name="date_of_birth"
              type="date"
              required
              className={`mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border ${
                formErrors.date_of_birth ? 'border-red-500' : 'border-gray-300'
              } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
              value={formData.date_of_birth}
              onChange={handleChange}
            />
            {formErrors.date_of_birth && (
              <p className="text-red-500 text-xs mt-1">{formErrors.date_of_birth}</p>
            )}
          </div>

          {/* Camera Section */}
          <div className="space-y-4 mb-6">
            <label className="block text-sm font-medium text-gray-700">
              Profile Photo
            </label>
            
            <div className="flex flex-col items-center space-y-4">
              {showCamera ? (
                <div className="relative w-full max-w-sm">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full rounded-lg border border-gray-300"
                    style={{ 
                      transform: 'scaleX(-1)',
                      maxHeight: '400px',
                      backgroundColor: '#000' // Add background color
                    }}
                  />
                  <div className="mt-2 flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Take Photo
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  {capturedImage ? (
                    <div className="relative inline-block">
                      <img
                        src={capturedImage}
                        alt="Captured"
                        className="w-48 h-48 rounded-full object-cover border-4 border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setCapturedImage(null)}
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={startCamera}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                      Open Camera
                    </button>
                  )}
                  {cameraError && (
                    <p className="mt-2 text-sm text-red-600">{cameraError}</p>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Only show password fields for new registrations */}
          {!isProfileUpdate && (
            <>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required={!isProfileUpdate}
                  className={`mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border ${
                    formErrors.password ? 'border-red-500' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                />
                {formErrors.password && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required={!isProfileUpdate}
                  className={`mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border ${
                    formErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
                {formErrors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.confirmPassword}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="adminSecret" className="block text-sm font-medium text-gray-700">
                  Admin Secret
                </label>
                <input
                  id="adminSecret"
                  name="adminSecret"
                  type="password"
                  autoComplete="off"
                  className={`mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border ${
                    formErrors.adminSecret ? 'border-red-500' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                  placeholder="Admin Secret is required for Registration"
                  value={formData.adminSecret}
                  onChange={handleChange}
                />
                {formErrors.adminSecret && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.adminSecret}</p>
                )}
              </div>
            </>
          )}
          
          {registerError && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Error
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{registerError}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                isSubmitting ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              {isSubmitting ? (
                <>
                  <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                    <svg className="animate-spin h-5 w-5 text-indigo-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </span>
                  Processing...
                </>
              ) : isProfileUpdate ? (
                'Update Profile'
              ) : (
                'Create Account'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;