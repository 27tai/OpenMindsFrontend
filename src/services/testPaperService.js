import apiClient from './apiClient';
import axios from 'axios';

// Track retry attempts
const MAX_RETRIES = 2;

// Ensure consistent URL format
const TEST_PAPERS_URL = 'test-papers';
const QUESTIONS_URL = 'questions/';  // Add trailing slash
const RESULTS_URL = 'results/';

const testPaperService = {
  // Get all test papers
  getAllTestPapers: async (retryCount = 0) => {
    try {
      console.log('[TEST-PAPERS-SVC] Fetching all test papers');
      
      const response = await apiClient.get(`${TEST_PAPERS_URL}/`);
      console.log('[TEST-PAPERS-SVC] Test papers fetched successfully');
      return response.data;
    } catch (error) {
      console.error('[TEST-PAPERS-SVC] Error fetching test papers:', error);
      
      // Add retry logic for 401 errors
      if (error.response?.status === 401 && retryCount < MAX_RETRIES) {
        console.log(`[TEST-PAPERS-SVC] Auth failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
        return testPaperService.getAllTestPapers(retryCount + 1);
      }

      throw error;
    }
  },

  // Create a new test paper
  createTestPaper: async (testPaperData, retryCount = 0) => {
    try {
      console.log('[TEST-PAPERS-SVC] Creating new test paper:', testPaperData);
      
      const response = await apiClient.post(`${TEST_PAPERS_URL}/`, testPaperData);
      console.log('[TEST-PAPERS-SVC] Test paper created successfully');
      return response.data;
    } catch (error) {
      console.error('[TEST-PAPERS-SVC] Error creating test paper:', error);
      
      // Add retry logic for 401 errors
      if (error.response?.status === 401 && retryCount < MAX_RETRIES) {
        console.log(`[TEST-PAPERS-SVC] Auth failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
        return testPaperService.createTestPaper(testPaperData, retryCount + 1);
      }

      // Direct axios fallback for last retry attempt
      if (retryCount === MAX_RETRIES - 1) {
        console.log('[TEST-PAPERS-SVC] Using direct axios as last resort');
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication required');
        }

        const url = `https://openmindsbackend.onrender.com/api/test-papers/`;
        const config = {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        };

        const directResponse = await axios.post(url, testPaperData, config);
        return directResponse.data;
      }

      throw error;
    }
  },

  // Get a specific test paper by ID
  getTestPaper: async (testPaperId, retryCount = 0) => {
    try {
      console.log(`[TEST-PAPERS-SVC] Fetching test paper ${testPaperId}`);

      const response = await apiClient.get(`${TEST_PAPERS_URL}/${testPaperId}`);
      console.log(`[TEST-PAPERS-SVC] Test paper ${testPaperId} fetched successfully`);
      return response.data;
    } catch (error) {
      console.error(`[TEST-PAPERS-SVC] Error fetching test paper ${testPaperId}:`, error);

      // Add retry logic for 401 errors
      if (error.response?.status === 401 && retryCount < MAX_RETRIES) {
        console.log(`[TEST-PAPERS-SVC] Auth failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
        return testPaperService.getTestPaper(testPaperId, retryCount + 1);
      }

      throw error;
    }
  },

  // Get all results for a specific test paper
  getTestPaperResults: async (testPaperId, retryCount = 0) => {
    try {
      console.log(`[TEST-PAPERS-SVC] Fetching results for test paper ${testPaperId}`);

      const response = await apiClient.get(`${RESULTS_URL}test-papers/${testPaperId}`);
      console.log(`[TEST-PAPERS-SVC] Results for test paper ${testPaperId} fetched successfully`);
      return response.data;
    } catch (error) {
      console.error(`[TEST-PAPERS-SVC] Error fetching results for test paper ${testPaperId}:`, error);

      // Add retry logic for 401 errors
      if (error.response?.status === 401 && retryCount < MAX_RETRIES) {
        console.log(`[TEST-PAPERS-SVC] Auth failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
        return testPaperService.getTestPaperResults(testPaperId, retryCount + 1);
      }

      // Direct axios fallback for last retry attempt
      if (retryCount === MAX_RETRIES - 1) {
        console.log('[TEST-PAPERS-SVC] Using direct axios as last resort');
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication required');
        }

        const url = `https://openmindsbackend.onrender.com/api/results/test-papers/${testPaperId}`;
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
  },

  // Delete a test paper by ID
  deleteTestPaper: async (testPaperId, retryCount = 0) => {
    try {
      console.log(`[TEST-PAPERS-SVC] Deleting test paper ${testPaperId}`);

      const response = await apiClient.delete(`${TEST_PAPERS_URL}/${testPaperId}`);
      console.log(`[TEST-PAPERS-SVC] Test paper ${testPaperId} deleted successfully`);
      return true;
    } catch (error) {
      console.error(`[TEST-PAPERS-SVC] Error deleting test paper ${testPaperId}:`, error);

      // Add retry logic for 401 errors
      if (error.response?.status === 401 && retryCount < MAX_RETRIES) {
        console.log(`[TEST-PAPERS-SVC] Auth failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
        return testPaperService.deleteTestPaper(testPaperId, retryCount + 1);
      }

      throw error;
    }
  },

  // Get all questions for a test paper
  getQuestionsForTestPaper: async (testPaperId, retryCount = 0) => {
    try {
      console.log(`[TEST-PAPERS-SVC] Fetching questions for test paper ${testPaperId}`);

      const response = await apiClient.get(`${QUESTIONS_URL}?test_paper_id=${testPaperId}`);
      console.log(`[TEST-PAPERS-SVC] Questions for test paper ${testPaperId} fetched successfully`);
      return response.data;
    } catch (error) {
      console.error(`[TEST-PAPERS-SVC] Error fetching questions for test paper ${testPaperId}:`, error);

      // Add retry logic for 401 errors
      if (error.response?.status === 401 && retryCount < MAX_RETRIES) {
        console.log(`[TEST-PAPERS-SVC] Auth failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
        return testPaperService.getQuestionsForTestPaper(testPaperId, retryCount + 1);
      }

      // Direct axios fallback for last retry attempt
      if (retryCount === MAX_RETRIES - 1) {
        console.log('[TEST-PAPERS-SVC] Using direct axios as last resort');
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication required');
        }

        const url = `https://openmindsbackend.onrender.com/api/questions/?test_paper_id=${testPaperId}`;
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
  },

  // Delete a question by ID
  deleteQuestion: async (questionId, retryCount = 0) => {
    try {
      console.log(`[TEST-PAPERS-SVC] Deleting question ${questionId}`);

      const response = await apiClient.delete(`${QUESTIONS_URL}${questionId}`);
      console.log(`[TEST-PAPERS-SVC] Question ${questionId} deleted successfully`);
      return true;
    } catch (error) {
      console.error(`[TEST-PAPERS-SVC] Error deleting question ${questionId}:`, error);

      // Add retry logic for 401 errors
      if (error.response?.status === 401 && retryCount < MAX_RETRIES) {
        console.log(`[TEST-PAPERS-SVC] Auth failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
        return testPaperService.deleteQuestion(questionId, retryCount + 1);
      }

      // Direct axios fallback for last retry attempt
      if (retryCount === MAX_RETRIES - 1) {
        console.log('[TEST-PAPERS-SVC] Using direct axios as last resort');
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication required');
        }

        const url = `https://openmindsbackend.onrender.com/api/questions/${questionId}/`;
        const config = {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        };

        const directResponse = await axios.delete(url, config);
        return directResponse.status === 204;
      }

      throw error;
    }
  },

  // Create a new question for a test paper
  createQuestion: async (questionData, retryCount = 0) => {
    try {
      console.log(`[TEST-PAPERS-SVC] Creating new question for test paper ${questionData.test_paper_id}`);

      const response = await apiClient.post(QUESTIONS_URL, questionData);
      console.log(`[TEST-PAPERS-SVC] Question created successfully`);
      return response.data;
    } catch (error) {
      console.error(`[TEST-PAPERS-SVC] Error creating question:`, error);

      // Add retry logic for 401 errors
      if (error.response?.status === 401 && retryCount < MAX_RETRIES) {
        console.log(`[TEST-PAPERS-SVC] Auth failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
        return testPaperService.createQuestion(questionData, retryCount + 1);
      }

      // Direct axios fallback for last retry attempt
      if (retryCount === MAX_RETRIES - 1) {
        console.log('[TEST-PAPERS-SVC] Using direct axios as last resort');
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication required');
        }

        const url = `https://openmindsbackend.onrender.com/api/questions/`;
        const config = {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        };

        const directResponse = await axios.post(url, questionData, config);
        return directResponse.data;
      }

      throw error;
    }
  }
};

export default testPaperService;