import apiClient from './apiClient';
import axios from 'axios';

// Track auth retries to prevent infinite loops
let authRetryCount = 0;
const MAX_RETRIES = 2;

// Ensure consistent URL format - no leading slash as it's already in the baseURL
const AUTH_URL = 'auth';

// Helper function to get current user data
const fetchCurrentUser = async () => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    console.log('[AUTH] No token available for user fetch');
    return null;
  }
  
  try {
    console.log('[AUTH] Sending request to auth/me endpoint');
    // Using consistent format without leading slash
    const response = await apiClient.get(`${AUTH_URL}/me`);
    console.log('[AUTH] User data received:', response.data);
    return response.data;
  } catch (error) {
    console.error('[AUTH] Error fetching user data:', error.message);
    
    if (error.response?.status === 401) {
      console.log('[AUTH] Token invalid according to server, removing');
      localStorage.removeItem('token');
    }
    
    return null;
  }
};

// Helper function to handle login response
const handleLoginResponse = async (response, email) => {
  // FastAPI OAuth2 returns access_token and token_type
  if (response.data && response.data.access_token) {
    console.log('[AUTH] Token found in response');
    const token = response.data.access_token;
    
    // Double-check any existing token before overwriting
    const existingToken = localStorage.getItem('token');
    if (existingToken) {
      console.log('[AUTH] Existing token will be replaced');
    }
    
    // Store token in localStorage
    try {
      localStorage.setItem('token', token);
      
      // Verify token was actually stored
      const storedToken = localStorage.getItem('token');
      
      if (storedToken === token) {
        console.log('[AUTH] Token successfully saved to localStorage');
      } else {
        console.error('[AUTH] Token storage verification failed!');
        console.log('[AUTH] Original:', token.substring(0, 15) + '...');
        console.log('[AUTH] Stored:', storedToken ? storedToken.substring(0, 15) + '...' : 'missing');
      }
    } catch (storageError) {
      console.error('[AUTH] Error saving token to localStorage:', storageError);
    }
    
    // Allow time for token storage
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Fetch user details with the token
    let userData = null;
    try {
      console.log('[AUTH] Fetching user data after login');
      userData = await fetchCurrentUser();
      console.log('[AUTH] User data after login:', userData);
    } catch (userError) {
      console.error('[AUTH] Error fetching user data after login:', userError);
      // We'll still return success, just with limited user data
    }
    
    return {
      success: true,
      token: token,
      user: userData || { email }
    };
  } else {
    console.error('[AUTH] No token in response');
    return {
      success: false,
      error: 'Invalid response from server. No token received.'
    };
  }
};

const authService = {
  // Reset retry counter
  resetRetryCount: () => {
    authRetryCount = 0;
  },
  
  // Login
  login: async (email, password) => {
    console.log('[AUTH] Login attempt for email:', email);
    
    try {
      // Create form data for login (FastAPI OAuth2PasswordRequestForm expects form data)
      const formData = new FormData();
      formData.append('username', email); // FastAPI OAuth2 uses 'username' field
      formData.append('password', password);
      
      console.log('[AUTH] Sending login request with FormData');
      
      try {
        // Use FormData with correct content type and consistent URL format
        const response = await apiClient.post(`${AUTH_URL}/login`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        console.log('[AUTH] Login response received:', response.status);
        console.log('[AUTH] Response data:', JSON.stringify(response.data));
        
        // Process the response
        return handleLoginResponse(response, email);
      } catch (apiError) {
        console.error('[AUTH] API client login error:', apiError);
        
        // Try direct axios call as fallback
        console.log('[AUTH] Trying direct axios call for login');
        const directResponse = await axios.post(`https://openmindsbackend.onrender.com/api/${AUTH_URL}/login`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        console.log('[AUTH] Direct login API call succeeded:', directResponse.data);
        return handleLoginResponse(directResponse, email);
      }
    } catch (error) {
      console.error('[AUTH] Login error:', error);
      
      let errorMessage = 'Authentication failed. Please try again.';
      
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        }
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  },
  
  // Register
  register: async (userData) => {
    try {
      console.log('[AUTH] Sending registration request with data (raw):', userData);
      
      // Ensure we're sending full_name instead of first_name/last_name
      let formattedData = { ...userData };
      
      // If we got first_name and last_name instead of full_name, fix it
      if (formattedData.first_name && !formattedData.full_name) {
        formattedData.full_name = formattedData.first_name;
        if (formattedData.last_name) {
          formattedData.full_name += ' ' + formattedData.last_name;
        }
        // Delete the incorrect field names
        delete formattedData.first_name;
        delete formattedData.last_name;
      }
      
      console.log('[AUTH] Formatted data to send:', formattedData);
      
      // Determine if this is an admin registration
      const isAdminRegistration = formattedData.admin_secret !== undefined;
      
      // Choose the appropriate endpoint
      const endpoint = isAdminRegistration 
        ? `${AUTH_URL}/admin/register`
        : `${AUTH_URL}/register`;
        
      console.log('[AUTH] Sending to endpoint:', endpoint);
      
      // Try direct API call to debug
      try {
        // Use consistent URL format without leading slash
        const response = await apiClient.post(endpoint, formattedData);
        console.log('[AUTH] Registration successful:', response.data);
        
        return {
          success: true,
          data: response.data
        };
      } catch (apiError) {
        console.error('[AUTH] API client error:', apiError);
        
        // Try direct axios call as fallback
        console.log('[AUTH] Trying direct axios call');
        const directResponse = await axios.post(`https://openmindsbackend.onrender.com/api/${endpoint}`, formattedData, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log('[AUTH] Direct axios call succeeded:', directResponse.data);
        return {
          success: true,
          data: directResponse.data
        };
      }
    } catch (error) {
      console.error('[AUTH] Registration error:', error.message);
      
      // Debug the error response in detail
      if (error.response) {
        console.error('[AUTH] Error response status:', error.response.status);
        console.error('[AUTH] Error response data:', error.response.data);
        
        if (error.response.data && error.response.data.detail) {
          console.error('[AUTH] Error detail type:', typeof error.response.data.detail);
          console.error('[AUTH] Error detail value:', error.response.data.detail);
        }
      }
      
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.response?.data) {
        const data = error.response.data;
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (typeof data.detail === 'string') {
          errorMessage = data.detail;
        } else if (Array.isArray(data.detail)) {
          // Format validation errors
          errorMessage = data.detail.map(err => {
            if (typeof err === 'object' && err.msg) {
              return err.msg;
            }
            return String(err);
          }).join(', ');
        } else if (data.detail) {
          // Fallback for any other format
          errorMessage = String(data.detail);
        }
      }
      
      // Log the formatted error message
      console.error('[AUTH] Formatted error message:', errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  },
  
  // Get current user
  getCurrentUser: async () => {
    authRetryCount = 0;
    return fetchCurrentUser();
  },
  
  // Check if admin
  isAdmin: async () => {
    try {
      console.log('[AUTH] Checking if user is admin');
      // Use consistent URL format without leading slash
      const response = await apiClient.get(`${AUTH_URL}/admin/me`);
      return !!response.data;
    } catch (error) {
      console.error('[AUTH] Error checking admin status:', error.message);
      return false;
    }
  },
  
  // Logout (client-side only)
  logout: () => {
    console.log('[AUTH] Logging out user');
    localStorage.removeItem('token');
    return true;
  },
  
  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    console.log('[AUTH] Checking authentication, token:', token ? 'present' : 'missing');
    return !!token;
  }
};

export default authService;