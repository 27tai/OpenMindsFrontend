import axios from 'axios';

// Create the Axios instance
const apiClient = axios.create({
  baseURL: 'https://openmindsbackend.onrender.com/api/',
  headers: {
    'Content-Type': 'application/json',
  },
  // Add timeout
  timeout: 10000,
  // Don't send cookies
  withCredentials: false,
});

// Add console debugging when running in development
if (process.env.NODE_ENV !== 'production') {
  // Request interceptor for debugging
  apiClient.interceptors.request.use(request => {
    console.log('✅ API Request:', {
      url: request.baseURL + '/' + request.url.replace(/^\/+/, ''),
      method: request.method?.toUpperCase(),
      headers: request.headers,
      data: request.data
    });
    return request;
  }, error => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  });

  // Response interceptor for debugging
  apiClient.interceptors.response.use(response => {
    console.log('✅ API Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data
    });
    return response;
  }, error => {
    console.error('❌ Response Error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    return Promise.reject(error);
  });
}

// Request interceptor to add the auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    // Get the token from localStorage
    const token = localStorage.getItem('token');
    
    // If token exists, add it to the request headers
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log('[API-CLIENT] Adding token to request:', config.url);
    } else {
      console.log('[API-CLIENT] No token available for request:', config.url);
    }
    
    return config;
  },
  (error) => {
    console.error('[API-CLIENT] Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for handling common response issues
apiClient.interceptors.response.use(
  (response) => {
    // Successful response handling
    return response;
  },
  (error) => {
    // Error handling
    console.error('[API-CLIENT] Response error:', error.message);
    
    if (error.response) {
      // The request was made and the server responded with a status code
      console.error('[API-CLIENT] Response status:', error.response.status);
      console.error('[API-CLIENT] Response data:', error.response.data);
      
      // Handle token expiration or invalid token (401 Unauthorized)
      if (error.response.status === 401) {
        console.log('[API-CLIENT] Authorization failed, token might be expired');
        // You could add logic here to refresh the token or redirect to login
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('[API-CLIENT] No response received:', error.request);
    }
    
    return Promise.reject(error);
  }
);

export default apiClient; 