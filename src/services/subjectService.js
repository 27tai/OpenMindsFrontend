import apiClient from './apiClient';
import axios from 'axios'; // Direct axios import

// Track retry attempts
const MAX_RETRIES = 2;

// Ensure consistent URL format - no leading slash 
// as it's already included in the base URL
const SUBJECTS_URL = 'subjects';

const subjectService = {
  // Get all subjects
  getAllSubjects: async (retryCount = 0) => {
    try {
      console.log('[SUBJECT-SVC] Fetching all subjects');
      
      // Verify token is present before making request
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('[SUBJECT-SVC] No token available for fetching subjects');
        throw new Error('Authentication required');
      }
      
      console.log('[SUBJECT-SVC] Making request with token:', token.substring(0, 15) + '...');
      
      // Use direct axios instead of apiClient
      console.log('[SUBJECT-SVC] Using direct axios call instead of apiClient');
      
      // IMPORTANT: When using direct axios, we need to specify the full URL
      const url = 'https://openmindsbackend.onrender.com/api/subjects';
      console.log('[SUBJECT-SVC] Direct axios URL:', url);
      
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };
      console.log('[SUBJECT-SVC] Direct axios headers:', config.headers);
      
      // Make direct axios request
      const response = await axios.get(url, config);
      
      console.log('[SUBJECT-SVC] Subjects fetched successfully with direct axios:', response.data);
      return response.data;
    } catch (error) {
      console.error('[SUBJECT-SVC] Error fetching subjects with direct axios:', error);
      
      // More detailed error inspection
      if (error.response) {
        console.log('[SUBJECT-SVC] Response status:', error.response.status);
        console.log('[SUBJECT-SVC] Response headers:', error.response.headers);
        console.log('[SUBJECT-SVC] Response data:', error.response.data);
      }
      
      // Add retry logic for 401 errors that might be due to token race conditions
      if (error.response?.status === 401 && retryCount < MAX_RETRIES) {
        console.log(`[SUBJECT-SVC] Auth failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        
        // Wait longer between retries to allow auth state to stabilize
        console.log('[SUBJECT-SVC] Waiting before retry');
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
        
        // Check token again before retry
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('[SUBJECT-SVC] No token available before retry');
          throw new Error('Authentication required');
        }
        
        return subjectService.getAllSubjects(retryCount + 1);
      }
      
      throw error;
    }
  },

  // Get a specific subject by ID
  getSubject: async (subjectId, retryCount = 0) => {
    try {
      console.log(`[SUBJECT-SVC] Fetching subject ${subjectId}`);
      
      try {
        // First try with apiClient
        // Use consistent URL format
        const response = await apiClient.get(`${SUBJECTS_URL}/${subjectId}`);
        console.log(`[SUBJECT-SVC] Subject ${subjectId} fetched successfully`);
        return response.data;
      } catch (apiError) {
        console.error(`[SUBJECT-SVC] API client error for subject ${subjectId}:`, apiError);
        
        // Try direct axios call as fallback
        console.log(`[SUBJECT-SVC] Trying direct axios call for subject ${subjectId}`);
        
        // Verify token is present before making request
        const token = localStorage.getItem('token');
        if (!token) {
          console.error(`[SUBJECT-SVC] No token available for fetching subject ${subjectId}`);
          throw new Error('Authentication required');
        }
        
        // IMPORTANT: Use full URL for direct axios call
        const url = `https://openmindsbackend.onrender.com/api/subjects/${subjectId}`;
        console.log(`[SUBJECT-SVC] Direct axios URL:`, url);
        
        const config = {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        };
        
        // Make direct axios request
        const directResponse = await axios.get(url, config);
        console.log(`[SUBJECT-SVC] Subject ${subjectId} fetched successfully with direct axios`);
        return directResponse.data;
      }
    } catch (error) {
      console.error(`[SUBJECT-SVC] Error fetching subject ${subjectId}:`, error);
      
      // Add retry logic for 401 errors
      if (error.response?.status === 401 && retryCount < MAX_RETRIES) {
        console.log(`[SUBJECT-SVC] Auth failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
        return subjectService.getSubject(subjectId, retryCount + 1);
      }
      
      throw error;
    }
  },

  // Get tests for a specific subject
  getSubjectTests: async (subjectId, retryCount = 0) => {
    try {
      console.log(`[SUBJECT-SVC] Fetching tests for subject ${subjectId}`);
      
      try {
        // First try with apiClient
        // Use consistent URL format
        const response = await apiClient.get(`${SUBJECTS_URL}/${subjectId}/tests`);
        console.log(`[SUBJECT-SVC] Tests for subject ${subjectId} fetched successfully`);
        return response.data;
      } catch (apiError) {
        console.error(`[SUBJECT-SVC] API client error for tests of subject ${subjectId}:`, apiError);
        
        // Try direct axios call as fallback
        console.log(`[SUBJECT-SVC] Trying direct axios call for tests of subject ${subjectId}`);
        
        // Verify token is present before making request
        const token = localStorage.getItem('token');
        if (!token) {
          console.error(`[SUBJECT-SVC] No token available for fetching tests of subject ${subjectId}`);
          throw new Error('Authentication required');
        }
        
        // IMPORTANT: Use full URL for direct axios call
        const url = `https://openmindsbackend.onrender.com/api/subjects/${subjectId}/tests`;
        console.log(`[SUBJECT-SVC] Direct axios URL:`, url);
        
        const config = {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        };
        
        // Make direct axios request
        const directResponse = await axios.get(url, config);
        console.log(`[SUBJECT-SVC] Tests for subject ${subjectId} fetched successfully with direct axios`);
        return directResponse.data;
      }
    } catch (error) {
      console.error(`[SUBJECT-SVC] Error fetching tests for subject ${subjectId}:`, error);
      
      // Add retry logic for 401 errors
      if (error.response?.status === 401 && retryCount < MAX_RETRIES) {
        console.log(`[SUBJECT-SVC] Auth failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
        return subjectService.getSubjectTests(subjectId, retryCount + 1);
      }
      
      throw error;
    }
  },
  
  // Create subject (admin only)
  createSubject: async (subjectData, retryCount = 0) => {
    try {
      console.log('[SUBJECT-SVC] Creating new subject');
      
      const response = await apiClient.post(SUBJECTS_URL, subjectData);
      console.log('[SUBJECT-SVC] Subject created successfully');
      return response.data;
    } catch (error) {
      console.error('[SUBJECT-SVC] Error creating subject:', error);
      
      // Add retry logic for 401 errors
      if (error.response?.status === 401 && retryCount < MAX_RETRIES) {
        console.log(`[SUBJECT-SVC] Auth failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
        return subjectService.createSubject(subjectData, retryCount + 1);
      }
      
      throw error;
    }
  },
  
  // Update subject (admin only)
  updateSubject: async (subjectId, subjectData, retryCount = 0) => {
    try {
      console.log(`[SUBJECT-SVC] Updating subject ${subjectId}`);
      
      const response = await apiClient.put(`${SUBJECTS_URL}/${subjectId}`, subjectData);
      console.log(`[SUBJECT-SVC] Subject ${subjectId} updated successfully`);
      return response.data;
    } catch (error) {
      console.error(`[SUBJECT-SVC] Error updating subject ${subjectId}:`, error);
      
      // Add retry logic for 401 errors
      if (error.response?.status === 401 && retryCount < MAX_RETRIES) {
        console.log(`[SUBJECT-SVC] Auth failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
        return subjectService.updateSubject(subjectId, subjectData, retryCount + 1);
      }
      
      throw error;
    }
  },
  
  // Delete subject (admin only)
  deleteSubject: async (subjectId, retryCount = 0) => {
    try {
      console.log(`[SUBJECT-SVC] Deleting subject ${subjectId}`);
      
      try {
        // First try with apiClient
        const response = await apiClient.delete(`${SUBJECTS_URL}/${subjectId}`);
        console.log(`[SUBJECT-SVC] Subject ${subjectId} deleted successfully`);
        return response.data;
      } catch (apiError) {
        console.error(`[SUBJECT-SVC] API client error deleting subject ${subjectId}:`, apiError);
        
        // Special handling for 404 errors - if subject ID exists, there's a backend issue
        if (apiError.response?.status === 404) {
          console.log(`[SUBJECT-SVC] Subject ${subjectId} returned 404 from apiClient. Trying direct axios.`);
        }
        
        // Try direct axios call with extended debug info as fallback
        console.log(`[SUBJECT-SVC] Trying direct axios call to delete subject ${subjectId}`);
        
        // Verify token is present before making request
        const token = localStorage.getItem('token');
        if (!token) {
          console.error(`[SUBJECT-SVC] No token available for deleting subject ${subjectId}`);
          throw new Error('Authentication required');
        }
        
        // IMPORTANT: Use full URL for direct axios call
        const url = `https://openmindsbackend.onrender.com/api/subjects/${subjectId}`;
        console.log(`[SUBJECT-SVC] Direct axios URL for delete:`, url);
        
        const config = {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'Access-Control-Allow-Methods': 'DELETE',
            'Access-Control-Allow-Origin': window.location.origin
          },
          withCredentials: false
        };
        
        try {
          // Make direct axios delete request 
          console.log(`[SUBJECT-SVC] Making direct axios DELETE request with config:`, JSON.stringify(config));
          const directResponse = await axios.delete(url, config);
          console.log(`[SUBJECT-SVC] Subject ${subjectId} deleted successfully with direct axios`);
          return directResponse.data;
        } catch (directError) {
          console.error(`[SUBJECT-SVC] Direct axios error:`, directError);
          
          // More detailed error logging
          if (directError.response) {
            console.log(`[SUBJECT-SVC] Direct axios error details:`, {
              status: directError.response.status,
              statusText: directError.response.statusText,
              headers: directError.response.headers,
              data: directError.response.data
            });
          }
          
          // Try one more approach with a different method for problem subjects
          console.log(`[SUBJECT-SVC] Trying emulated DELETE with POST method and _method=DELETE`);
          
          // Some backends support _method param to override the HTTP method
          const formData = new FormData();
          formData.append('_method', 'DELETE');
          
          const patchConfig = {
            ...config,
            headers: {
              ...config.headers,
              'X-HTTP-Method-Override': 'DELETE'
            }
          };
          
          try {
            // POST with _method=DELETE as fallback
            const patchResponse = await axios.post(url, formData, patchConfig);
            console.log(`[SUBJECT-SVC] Emulated DELETE successful:`, patchResponse);
            return patchResponse.data || { success: true };
          } catch (patchError) {
            // If all approaches fail, track the errors
            console.error(`[SUBJECT-SVC] All delete approaches failed for subject ${subjectId}`);
            throw patchError;
          }
        }
      }
    } catch (error) {
      console.error(`[SUBJECT-SVC] Error deleting subject ${subjectId}:`, error);
      
      
      // Add retry logic for 401 errors
      if (error.response?.status === 401 && retryCount < MAX_RETRIES) {
        console.log(`[SUBJECT-SVC] Auth failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
        return subjectService.deleteSubject(subjectId, retryCount + 1);
      }
      
      throw error;
    }
  },

  // Backup method using fetch API if axios methods fail
  getAllSubjectsWithFetch: async () => {
    try {
      console.log('[SUBJECT-SVC] Fetching all subjects with Fetch API');
      
      // Get token
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('[SUBJECT-SVC] No token available for fetching subjects');
        throw new Error('Authentication required');
      }
      
      // IMPORTANT: When using fetch directly, we need to specify the full URL
      const url = 'https://openmindsbackend.onrender.com/api/subjects';
      console.log('[SUBJECT-SVC] Fetch API URL:', url);
      
      // Make fetch request
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log('[SUBJECT-SVC] Fetch response status:', response.status);
      console.log('[SUBJECT-SVC] Fetch response headers:', Object.fromEntries([...response.headers.entries()]));
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[SUBJECT-SVC] Fetch error response:', errorData);
        throw new Error(`Fetch failed with status ${response.status}: ${JSON.stringify(errorData)}`);
      }
      
      const data = await response.json();
      console.log('[SUBJECT-SVC] Subjects fetched successfully with Fetch API:', data);
      return data;
    } catch (error) {
      console.error('[SUBJECT-SVC] Error fetching subjects with Fetch API:', error);
      throw error;
    }
  },

  // Alternative method with additional headers
  getAllSubjectsWithExtras: async () => {
    try {
      console.log('[SUBJECT-SVC] Fetching subjects with additional headers');
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Using a direct URL but with additional headers
      const url = 'https://openmindsbackend.onrender.com/api/subjects';
      
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest', // Sometimes helps with CORS
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        // Explicitly disable withCredentials
        withCredentials: false
      };
      
      console.log('[SUBJECT-SVC] Using enhanced headers:', config.headers);
      
      // Print token format for debugging
      console.log('[SUBJECT-SVC] Authorization header:', `Bearer ${token.substring(0, 15)}...`);
      
      const response = await axios.get(url, config);
      console.log('[SUBJECT-SVC] Enhanced request succeeded:', response.data);
      return response.data;
    } catch (error) {
      console.error('[SUBJECT-SVC] Enhanced request failed:', error);
      
      if (error.response) {
        console.log('[SUBJECT-SVC] Response details:', {
          status: error.response.status,
          headers: error.response.headers,
          data: error.response.data
        });
      }
      
      throw error;
    }
  },

  // Try exactly the same pattern as the working auth/me endpoint
  getAllSubjectsJustLikeAuthMe: async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.log('[SUBJECT-SVC-CLONE] No token available for subjects fetch');
      throw new Error('Authentication required');
    }
    
    try {
      console.log('[SUBJECT-SVC-CLONE] Sending request to subjects endpoint');
      // Using consistent format without leading slash, exactly like auth/me
      const response = await apiClient.get(SUBJECTS_URL);
      console.log('[SUBJECT-SVC-CLONE] Subjects data received:', response.data);
      return response.data;
    } catch (error) {
      console.error('[SUBJECT-SVC-CLONE] Error fetching subjects data:', error.message);
      
      if (error.response?.status === 401) {
        console.log('[SUBJECT-SVC-CLONE] Token seems invalid for subjects endpoint');
      }
      
      throw error;
    }
  }
};

export default subjectService; 