import apiClient from './apiClient';
import axios from 'axios';

// Track retry attempts
const MAX_RETRIES = 2;

// Ensure consistent URL format
const RESULTS_URL = 'results';
const RESULTS_SUBMIT_URL = 'results/submit';

const resultService = {
  // Save a new result
  saveResult: async (resultData, retryCount = 0) => {
    try {
      console.log('[RESULT-SVC] Saving test result:', resultData);
      
      // Get user ID from localStorage if not provided in resultData
      const userId = localStorage.getItem('userId');
      if (!userId && !resultData.user_id) {
        console.error('[RESULT-SVC] No user ID available for submission');
      }
      
      // Ensure the data is properly formatted
      const formattedData = {
        user_id: resultData.user_id || userId,
        test_paper_id: resultData.test_paper_id,
        final_score: resultData.final_score,
        user_answers: resultData.user_answers
      };
      
      console.log('[RESULT-SVC] Formatted data for submission:', formattedData);
      
      // Ensure the token is included
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Make the POST request with explicit headers
      const response = await apiClient.post(RESULTS_SUBMIT_URL, formattedData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('[RESULT-SVC] Test result saved successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('[RESULT-SVC] Error saving test result:', error);
      
      if (error.response) {
        console.log('[RESULT-SVC] Response status:', error.response.status);
        console.log('[RESULT-SVC] Response data:', error.response.data);
      }
      
      // Add retry logic for 401 errors
      if (error.response?.status === 401 && retryCount < MAX_RETRIES) {
        console.log(`[RESULT-SVC] Auth failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        
        if (retryCount === MAX_RETRIES - 1) {
          // On last retry, use direct axios call
          console.log('[RESULT-SVC] Using direct axios as last resort');
          
          const token = localStorage.getItem('token');
          if (!token) {
            throw new Error('Authentication required');
          }
          
          // Ensure userId is included in direct API call
          const userId = localStorage.getItem('userId');
          const directSubmitData = {
            ...resultData,
            user_id: resultData.user_id || userId
          };
          
          console.log('[RESULT-SVC] Direct API submission data:', directSubmitData);
          
          const url = `https://openmindsbackend.onrender.com/api/results/submit`;
          const config = {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          };
          
          const directResponse = await axios.post(url, directSubmitData, config);
          return directResponse.data;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
        return resultService.saveResult(resultData, retryCount + 1);
      }
      
      throw error;
    }
  },
  
  // Get results for the current user
  getUserResults: async (retryCount = 0) => {
    try {
      console.log('[RESULT-SVC] Fetching user results');
      
      // Ensure the token is included
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await apiClient.get(`${RESULTS_URL}/my-results`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('[RESULT-SVC] User results fetched successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('[RESULT-SVC] Error fetching user results:', error);
      
      if (error.response) {
        console.log('[RESULT-SVC] Response status:', error.response.status);
        console.log('[RESULT-SVC] Response data:', error.response.data);
      }
      
      // Add retry logic for 401 errors
      if (error.response?.status === 401 && retryCount < MAX_RETRIES) {
        console.log(`[RESULT-SVC] Auth failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        
        if (retryCount === MAX_RETRIES - 1) {
          // On last retry, use direct axios call
          console.log('[RESULT-SVC] Using direct axios as last resort');
          
          const token = localStorage.getItem('token');
          if (!token) {
            throw new Error('Authentication required');
          }
          
          const url = `https://openmindsbackend.onrender.com/api/results/my-results`;
          const config = {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          };
          
          const directResponse = await axios.get(url, config);
          return directResponse.data;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
        return resultService.getUserResults(retryCount + 1);
      }
      
      throw error;
    }
  },
  
  // Get a specific result by ID
  getResult: async (resultId, retryCount = 0) => {
    try {
      console.log(`[RESULT-SVC] Fetching result ${resultId}`);
      
      // Ensure the token is included
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await apiClient.get(`${RESULTS_URL}/${resultId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`[RESULT-SVC] Result ${resultId} fetched successfully:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`[RESULT-SVC] Error fetching result ${resultId}:`, error);
      
      // Add retry logic for 401 errors
      if (error.response?.status === 401 && retryCount < MAX_RETRIES) {
        console.log(`[RESULT-SVC] Auth failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
        return resultService.getResult(resultId, retryCount + 1);
      }
      
      throw error;
    }
  }
};

export default resultService; 