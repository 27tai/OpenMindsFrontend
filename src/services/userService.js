import apiClient from './apiClient';
import axios from 'axios';

// Track retry attempts
const MAX_RETRIES = 2;

// Ensure consistent URL format
const USERS_URL = 'users';

const userService = {
  // Get user by ID
  getUserById: async (userId, retryCount = 0) => {
    try {
      console.log(`[USER-SVC] Fetching user ${userId}`);
      
      const response = await apiClient.get(`auth/${USERS_URL}/${userId}`);
      console.log(`[USER-SVC] User ${userId} fetched successfully`);
      return response.data;
    } catch (error) {
      console.error(`[USER-SVC] Error fetching user ${userId}:`, error);
      
      // Add retry logic for 401 errors
      if (error.response?.status === 401 && retryCount < MAX_RETRIES) {
        console.log(`[USER-SVC] Auth failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
        return userService.getUserById(userId, retryCount + 1);
      }

      // Direct axios fallback for last retry attempt
      if (retryCount === MAX_RETRIES - 1) {
        console.log('[USER-SVC] Using direct axios as last resort');
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication required');
        }

        const url = `https://openmindsbackend.onrender.com/api/auth/users/${userId}`;
        const config = {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        };

        const directResponse = await axios.get(url, config);
        return directResponse.data;
      }

      throw error;
    }
  }
};

export default userService; 