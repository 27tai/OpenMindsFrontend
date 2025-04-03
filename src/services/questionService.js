import apiClient from './apiClient';
import axios from 'axios';

// Track retry attempts
const MAX_RETRIES = 2;

// Ensure consistent URL format
const QUESTIONS_URL = 'questions';

const questionService = {
  // Get questions for a specific test paper
  getQuestionsByTestPaper: async (testPaperId, retryCount = 0) => {
    try {
      console.log(`[QUESTION-SVC] Fetching questions for test paper ${testPaperId}`);
      
      // Use query parameter as specified in the API
      const response = await apiClient.get(`${QUESTIONS_URL}?test_paper_id=${testPaperId}`);
      
      // Log the raw response for debugging
      console.log(`[QUESTION-SVC] Raw response:`, response);
      console.log(`[QUESTION-SVC] Questions for test paper ${testPaperId} fetched successfully:`, response.data);
      
      // Add more detailed logging for question structure
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        const sampleQuestion = response.data[0];
        console.log('[QUESTION-SVC] Sample question structure:', sampleQuestion);
        console.log('[QUESTION-SVC] Question properties:', Object.keys(sampleQuestion));
        console.log('[QUESTION-SVC] Options structure:', sampleQuestion.options);
        console.log('[QUESTION-SVC] Options type:', Array.isArray(sampleQuestion.options) ? 'Array' : typeof sampleQuestion.options);
        
        if (sampleQuestion.options && Array.isArray(sampleQuestion.options) && sampleQuestion.options.length > 0) {
          console.log('[QUESTION-SVC] Sample option structure:', sampleQuestion.options[0]);
          console.log('[QUESTION-SVC] Sample option type:', typeof sampleQuestion.options[0]);
        }
        
        console.log('[QUESTION-SVC] Correct answer index name:', 
          sampleQuestion.hasOwnProperty('correct_option_index') ? 'correct_option_index' : 
          (sampleQuestion.hasOwnProperty('correct_answer_index') ? 'correct_answer_index' : 'unknown'));
      }
      
      // Ensure we always return an array, even if the API returns something unexpected
      if (!response.data) {
        console.warn('[QUESTION-SVC] Empty response data received');
        return [];
      }
      
      // If data is not an array, try to extract it from a nested property
      if (!Array.isArray(response.data)) {
        console.warn('[QUESTION-SVC] Response data is not an array:', typeof response.data);
        
        // Common API patterns to check
        if (response.data.questions && Array.isArray(response.data.questions)) {
          return response.data.questions;
        }
        
        if (response.data.data && Array.isArray(response.data.data)) {
          return response.data.data;
        }
        
        if (response.data.results && Array.isArray(response.data.results)) {
          return response.data.results;
        }
        
        // If all else fails, return empty array
        console.error('[QUESTION-SVC] Unable to extract questions from response');
        return [];
      }
      
      return response.data;
    } catch (error) {
      console.error(`[QUESTION-SVC] Error fetching questions for test paper ${testPaperId}:`, error);
      
      if (error.response) {
        console.log('[QUESTION-SVC] Response status:', error.response.status);
        console.log('[QUESTION-SVC] Response data:', error.response.data);
      }
      
      // Add retry logic for 401 errors
      if (error.response?.status === 401 && retryCount < MAX_RETRIES) {
        console.log(`[QUESTION-SVC] Auth failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        
        if (retryCount === MAX_RETRIES - 1) {
          // On last retry, use direct axios call
          console.log('[QUESTION-SVC] Using direct axios as last resort');
          
          const token = localStorage.getItem('token');
          if (!token) {
            throw new Error('Authentication required');
          }
          
          const url = `https://openmindsbackend.onrender.com/api/questions?test_paper_id=${testPaperId}`;
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
        return questionService.getQuestionsByTestPaper(testPaperId, retryCount + 1);
      }
      
      throw error;
    }
  },
  
  // Get a specific question by ID
  getQuestion: async (questionId, retryCount = 0) => {
    try {
      console.log(`[QUESTION-SVC] Fetching question ${questionId}`);
      
      const response = await apiClient.get(`${QUESTIONS_URL}/${questionId}`);
      console.log(`[QUESTION-SVC] Question ${questionId} fetched successfully`);
      return response.data;
    } catch (error) {
      console.error(`[QUESTION-SVC] Error fetching question ${questionId}:`, error);
      
      // Add retry logic for 401 errors
      if (error.response?.status === 401 && retryCount < MAX_RETRIES) {
        console.log(`[QUESTION-SVC] Auth failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
        return questionService.getQuestion(questionId, retryCount + 1);
      }
      
      throw error;
    }
  }
};

export default questionService; 