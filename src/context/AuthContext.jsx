import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import authService from '../services/authService';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Helper function to safely get token from storage
const getTokenFromStorage = () => {
  try {
    // Try localStorage first
    const token = localStorage.getItem('token');
    if (token) {
      console.log('[AUTH-HELPER] Found token in localStorage');
      return token;
    }
    
    // Fall back to sessionStorage if available
    const backupToken = sessionStorage.getItem('token_backup');
    if (backupToken) {
      console.log('[AUTH-HELPER] Found token in sessionStorage backup, restoring to localStorage');
      localStorage.setItem('token', backupToken);
      return backupToken;
    }
    
    console.log('[AUTH-HELPER] No token found in any storage');
    return null;
  } catch (e) {
    console.error('[AUTH-HELPER] Error accessing storage:', e);
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  // Initialize token directly from localStorage with safety check
  const [token, setToken] = useState(() => {
    const initialToken = getTokenFromStorage();
    console.log('[AUTH-INIT] Initial token from storage:', initialToken ? 'present' : 'missing');
    return initialToken;
  });
  
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useRef(true);
  const initialCheckDone = useRef(false);
  const [loginAttempts, setLoginAttempts] = useState(0);

  // Debug tokens
  useEffect(() => {
    const storedToken = getTokenFromStorage();
    console.log('[AUTH] Initializing with token:', storedToken ? `${storedToken.substring(0, 15)}...` : 'none');
  }, []);

  // Setup axios interceptors for global auth handling
  useEffect(() => {
    console.log('[AUTH] Setting up axios interceptors');
    
    // Request interceptor to add token to every request
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const currentToken = getTokenFromStorage();
        if (currentToken) {
          config.headers.Authorization = `Bearer ${currentToken}`;
        }
        return config;
      },
      (error) => {
        console.error('[AUTH-AXIOS] Request interceptor error:', error);
        return Promise.reject(error);
      }
    );
    
    // Response interceptor to handle auth errors
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        // Check for auth errors
        if (error.response && error.response.status === 401) {
          console.log('[AUTH-AXIOS] 401 Unauthorized response detected');
          
          // Don't remove token for login/register operations
          const isAuthOperation = error.config.url.includes('/login') || 
                               error.config.url.includes('/register');
                               
          if (!isAuthOperation) {
            console.log('[AUTH-AXIOS] Auth error on protected endpoint, checking token');
            
            // Check if token has expired
            const currentToken = getTokenFromStorage();
            if (currentToken) {
              try {
                const decoded = jwtDecode(currentToken);
                if (decoded.exp < Date.now() / 1000) {
                  console.log('[AUTH-AXIOS] Token has expired, clearing auth state');
                  // Clear token and user to force re-login
                  localStorage.removeItem('token');
                  sessionStorage.removeItem('token_backup');
                  delete axios.defaults.headers.common['Authorization'];
                  setToken(null);
                  setUser(null);
                }
              } catch (e) {
                console.error('[AUTH-AXIOS] Error decoding token:', e);
              }
            }
          }
        }
        return Promise.reject(error);
      }
    );
    
    // Cleanup interceptors when component unmounts
    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  // Define logout function first so it can be used in initializeUserFromToken
  const logout = useCallback(() => {
    console.log('[AUTH] Logging out user');
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    sessionStorage.removeItem('token_backup');
    // Also clear axios headers
    delete axios.defaults.headers.common['Authorization'];
  }, []);

  // Set global axios auth header when token changes
  useEffect(() => {
    if (token) {
      console.log('[AUTH] Setting global axios auth header');
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else if (initialCheckDone.current) {
      console.log('[AUTH] Removing global axios auth header');
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Sync token with localStorage
  useEffect(() => {
    // Only update localStorage if token state changes to a non-null value
    // Do NOT remove the token from localStorage if token state is null during initialization
    if (token) {
      try {
        localStorage.setItem('token', token);
        console.log('[AUTH] Token updated in localStorage:', token.substring(0, 15) + '...');
        
        // Also keep a backup in sessionStorage to help with token recovery
        sessionStorage.setItem('token_backup', token);
      } catch (e) {
        console.error('[AUTH] Error saving token to localStorage:', e);
      }
    } else if (initialCheckDone.current) {
      // Only remove token if this is not the initial render and token is explicitly set to null
      // This prevents token removal during component initialization
      console.log('[AUTH] Token removed from state and localStorage');
      localStorage.removeItem('token');
    } else {
      console.log('[AUTH] Token is null but skipping localStorage removal during initialization');
    }
  }, [token]);

  // Create initializeUserFromToken as a named function within the component
  const initializeUserFromToken = useCallback(async () => {
    console.log('[AUTH] Running user initialization from token');
    const currentToken = getTokenFromStorage();
    
    if (!currentToken) {
      console.log('[AUTH] No token found during initialization');
      setUser(null);
      setIsLoading(false);
      initialCheckDone.current = true;
      return;
    }
    
    try {
      // Set token in state and validate
      const decoded = jwtDecode(currentToken);
      const currentTime = Date.now() / 1000;
      
      if (!decoded.exp || decoded.exp < currentTime) {
        console.log('[AUTH] Token is expired, clearing state');
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        setIsLoading(false);
        initialCheckDone.current = true;
        return;
      }
      
      console.log('[AUTH] Token is valid, setting in state');
      setToken(currentToken);
      
      // Set global axios header
      axios.defaults.headers.common['Authorization'] = `Bearer ${currentToken}`;
      
      // Fetch user data
      console.log('[AUTH] Fetching user data');
      const userData = await authService.getCurrentUser();
      
      if (userData) {
        console.log('[AUTH] User data retrieved:', userData);
        setUser(userData);
        
        // Store the user ID in localStorage
        if (userData.id) {
          localStorage.setItem('userId', userData.id.toString());
          console.log('[AUTH] User ID stored in localStorage:', userData.id);
        }
        
        // Backup to sessionStorage
        sessionStorage.setItem('lastAuthUser', JSON.stringify(userData));
        sessionStorage.setItem('lastAuthTime', Date.now().toString());
      } else {
        console.log('[AUTH] No user data retrieved');
        // Try to recover from backup
        try {
          const backupUser = sessionStorage.getItem('lastAuthUser');
          if (backupUser) {
            console.log('[AUTH] Recovering user from backup');
            setUser(JSON.parse(backupUser));
          } else {
            setUser(null);
          }
        } catch (e) {
          console.error('[AUTH] Error recovering user data:', e);
          setUser(null);
        }
      }
    } catch (error) {
      console.error('[AUTH] Error during initialization:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
      initialCheckDone.current = true;
    }
  }, []);

  // Validate token whenever it changes or periodically
  useEffect(() => {
    const validateToken = () => {
      if (!isMounted.current) return;

      // Skip validation during initialization
      if (!initialCheckDone.current) {
        console.log('[AUTH] Skipping token validation during initialization');
        return;
      }

      const storedToken = getTokenFromStorage();
      if (!storedToken) {
        if (token) {
          console.log('[AUTH] Token missing from storage but present in state, clearing state');
          setToken(null);
        }
        if (user) setUser(null);
        return;
      }

      try {
        const decoded = jwtDecode(storedToken);
        const currentTime = Date.now() / 1000;

        if (decoded.exp < currentTime) {
          console.log('[AUTH] Token expired, logging out');
          logout();
        } else {
          console.log('[AUTH] Token validated successfully, expires:', new Date(decoded.exp * 1000).toISOString());
          
          // IMPORTANT: Fix for page refresh - ensure user state is set if token is valid
          // but user state is null (which can happen after a page refresh)
          if (!user && initialCheckDone.current) {
            console.log('[AUTH] Valid token found after page refresh but user state is null, restoring user');
            initializeUserFromToken();
          }
        }
      } catch (error) {
        console.error('[AUTH] Token validation error:', error);
        // Only logout if we're sure token is invalid - don't remove on parse errors
        if (error.name === 'InvalidTokenError') {
          logout();
        } else {
          console.warn('[AUTH] Token validation error but not clearing token');
        }
      }
    };

    // Only run validation after initialization is complete
    if (initialCheckDone.current) {
      validateToken();
      const interval = setInterval(validateToken, 5 * 60 * 1000); // Check every 5 minutes
      return () => clearInterval(interval);
    }
  }, [token, user, logout, initializeUserFromToken]);

  // Add a new effect specifically to handle page refreshes
  useEffect(() => {
    // This effect runs on first render and after page refresh
    console.log('[AUTH] Page load effect running, checking authentication state');
    
    // If we have a token but no user after the initial check, try to recover the user state
    if (token && !user && initialCheckDone.current) {
      console.log('[AUTH] Token exists but user is null after initialization, attempting recovery');
      // Slight delay to ensure other initialization has completed
      const timerId = setTimeout(() => {
        initializeUserFromToken();
      }, 300);
      
      return () => clearTimeout(timerId);
    }
  }, [token, user, initializeUserFromToken]);

  // Initialize user from token if it exists - run only once on mount
  useEffect(() => {
    console.log('[AUTH] Running initialization effect');
    initializeUserFromToken();
    
    return () => {
      isMounted.current = false;
    };
  }, []); // Only run once at mount

  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    setLoginAttempts(prev => prev + 1);
    try {
      console.log('[AUTH] Attempting login for:', email);
      const response = await authService.login(email, password);

      // Check if we have a token in the response
      if (response && response.success && response.token) {
        console.log('[AUTH] Login successful, setting token:', response.token.substring(0, 15) + '...'); 
        
        // Store token in localStorage
        try {
          localStorage.setItem('token', response.token);
          // Also back up in sessionStorage
          sessionStorage.setItem('token_backup', response.token);
          console.log('[AUTH] Token saved to both localStorage and sessionStorage');
        } catch (storageError) {
          console.error('[AUTH] Error saving token to storage:', storageError);
        }
        
        // Set global axios header immediately
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.token}`;
        console.log('[AUTH] Set global axios auth header');
        
        // Then update the state
        setToken(response.token);

        // If we have user data, set it
        if (response.user) {
          console.log('[AUTH] Setting user data from login response');
          setUser(response.user);
          
          // Store the user ID in localStorage
          if (response.user.id) {
            localStorage.setItem('userId', response.user.id.toString());
            console.log('[AUTH] User ID stored in localStorage:', response.user.id);
          }
          
          // Store user backup
          try {
            sessionStorage.setItem('lastAuthUser', JSON.stringify(response.user));
            sessionStorage.setItem('lastAuthTime', Date.now().toString());
          } catch (e) {
            console.error('[AUTH] Failed to store user backup:', e);
          }
        } else {
          // If no user data in response, try to fetch it
          console.log('[AUTH] No user data in response, fetching separately');
          try {
            // Short delay to ensure token is set
            await new Promise(resolve => setTimeout(resolve, 100));
            const userData = await authService.getCurrentUser();
            if (userData) {
              console.log('[AUTH] User data fetched successfully');
              setUser(userData);
              
              // Store the user ID in localStorage
              if (userData.id) {
                localStorage.setItem('userId', userData.id.toString());
                console.log('[AUTH] User ID stored in localStorage:', userData.id);
              }
              
              // Store user backup
              try {
                sessionStorage.setItem('lastAuthUser', JSON.stringify(userData));
                sessionStorage.setItem('lastAuthTime', Date.now().toString());
              } catch (e) {
                console.error('[AUTH] Failed to store user backup:', e);
              }
            }
          } catch (userError) {
            console.error('[AUTH] Failed to fetch user data after login:', userError);
          }
        }

        // Double-check token was stored
        const storedToken = getTokenFromStorage();
        console.log('[AUTH] Verification - Token in storage after login:', storedToken ? 'present' : 'missing');

        return { success: true };
      } else {
        console.error('[AUTH] Login failed:', response.error || 'Unknown error');
        return {
          success: false,
          error: response.error || 'Invalid credentials or server error'
        };
      }
    } catch (error) {
      console.error('[AUTH] Login error:', error);

      // Extract error message from the response
      let errorMessage = 'Failed to login. Please try again.';

      if (error.response?.data) {
        const data = error.response.data;
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (typeof data === 'object') {
          errorMessage = data.detail || data.message || JSON.stringify(data);
        }
      }

      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (userData) => {
    setIsLoading(true);
    try {
      console.log('[AUTH] Attempting registration for:', userData.email);
      const response = await authService.register(userData);

      if (response.success) {
        console.log('[AUTH] Registration successful');
        
        // If we get a token back, it's auto-login
        if (response.data && response.data.token) {
          console.log('[AUTH] Registration with auto-login successful');
          
          // Store token in localStorage
          localStorage.setItem('token', response.data.token);
          sessionStorage.setItem('token_backup', response.data.token);
          
          // Set global axios header
          axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
          console.log('[AUTH] Set global axios auth header');
          
          // Update state
          setToken(response.data.token);

          // If we have user data, set it
          if (response.data.user) {
            setUser(response.data.user);
            
            // Store the user ID in localStorage
            if (response.data.user.id) {
              localStorage.setItem('userId', response.data.user.id.toString());
            }
            
            // Store backup
            sessionStorage.setItem('lastAuthUser', JSON.stringify(response.data.user));
            sessionStorage.setItem('lastAuthTime', Date.now().toString());
          }
        }

        return { success: true };
      } else {
        // Registration failed with an error
        const errorMsg = typeof response.error === 'string' 
          ? response.error 
          : 'Registration failed. Please try again.';
        
        console.error('[AUTH] Registration failed:', errorMsg);
        return {
          success: false,
          error: errorMsg
        };
      }
    } catch (error) {
      console.error('[AUTH] Registration error:', error);

      // Extract error message from the response
      let errorMessage = 'Failed to register. Please try again.';

      if (error.response?.data) {
        const data = error.response.data;
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (typeof data === 'object') {
          if (data.detail) {
            if (Array.isArray(data.detail)) {
              // Handle validation errors array
              errorMessage = data.detail.map(err => err.msg || String(err)).join(', ');
            } else {
              errorMessage = String(data.detail);
            }
          } else if (data.message) {
            errorMessage = data.message;
          } else {
            errorMessage = 'Invalid registration data';
          }
        }
      }

      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = {
    token,
    user,
    isLoading,
    loginAttempts,
    login,
    register,
    logout,
    isAuthenticated: !!token && !!user,
    refreshUser: initializeUserFromToken
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext; 