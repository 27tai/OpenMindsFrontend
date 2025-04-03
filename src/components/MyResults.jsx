import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import resultService from '../services/resultService';
import axios from 'axios';

const MyResults = () => {
  const { isAuthenticated, refreshUser } = useAuth();
  const navigate = useNavigate();
  
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Function to fetch user's results
  const fetchResults = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('[MY-RESULTS] Fetching user results');
      
      // Try both the service method and a direct API call
      let userResults = [];
      let fetchSuccessful = false;
      
      try {
        // First try using the service
        userResults = await resultService.getUserResults();
        console.log('[MY-RESULTS] User results fetched via service:', userResults);
        fetchSuccessful = true;
      } catch (serviceError) {
        console.error('[MY-RESULTS] Error fetching results via service:', serviceError);
        
        // If service fails, try direct API call
        try {
          const token = localStorage.getItem('token');
          if (token) {
            console.log('[MY-RESULTS] Attempting direct API call as fallback');
            const response = await axios.get('https://openmindsbackend.onrender.com/api/results/my-results', {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            userResults = response.data;
            console.log('[MY-RESULTS] User results fetched via direct API call:', userResults);
            fetchSuccessful = true;
          } else {
            throw new Error('No authentication token available');
          }
        } catch (directApiError) {
          console.error('[MY-RESULTS] Direct API call also failed:', directApiError);
          // Propagate the original error
          throw serviceError;
        }
      }
      
      // Sort results by date, most recent first
      const sortedResults = Array.isArray(userResults) 
        ? userResults.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        : [];
      
      setResults(sortedResults);
      
      // Debugging
      console.log('[MY-RESULTS] Results count:', sortedResults.length);
      if (sortedResults.length > 0) {
        console.log('[MY-RESULTS] Most recent result:', sortedResults[0]);
      } else {
        console.log('[MY-RESULTS] No results found');
      }
    } catch (error) {
      console.error('[MY-RESULTS] Error fetching results:', error);
      
      if (error.response?.status === 401) {
        console.log('[MY-RESULTS] Authentication error (401), refreshing auth state');
        setTimeout(() => {
          refreshUser();
        }, 500);
        
        setError('Authentication error. Please try again.');
      } else {
        setError(
          error.response?.data?.detail || 
          error.message || 
          'Failed to load your results. Please try again.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [refreshUser]);
  
  // Fetch results when component mounts
  useEffect(() => {
    if (isAuthenticated) {
      fetchResults();
    } else {
      navigate('/login', { state: { from: '/my-results' } });
    }
  }, [isAuthenticated, fetchResults, navigate]);
  
  const handleRetry = () => {
    console.log('[MY-RESULTS] Retry requested, refreshing auth state first');
    refreshUser();
    
    setTimeout(() => {
      setIsLoading(true);
      setError(null);
      fetchResults();
    }, 500);
  };
  
  // Format date to a readable string
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-600">Loading your results...</span>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-4 max-w-md">
          <h3 className="text-lg font-medium mb-2">Error Loading Results</h3>
          <p className="text-sm">{error}</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handleRetry}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Retry
          </button>
          <Link 
            to="/subjects"
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Back to Subjects
          </Link>
        </div>
      </div>
    );
  }
  
  // Empty state - no results
  if (results.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">My Results</h1>
        
        <div className="text-center py-10 bg-white rounded-lg shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-700 mb-4">No Results Found</h2>
          <p className="text-gray-600 mb-6">You haven't taken any tests yet.</p>
          <Link 
            to="/subjects"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Browse Subjects
          </Link>
        </div>
      </div>
    );
  }
  
  // Success state - display results
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">My Results</h1>
      
      <div className="grid gap-6">
        {results.map((result) => {
          // Calculate percentage score
          const percentageScore = result.final_score / 10 * 100; // Assuming total score is 10, adjust if needed
          const isPassed = percentageScore >= (result.test_paper?.passing_percentage || 60);
          
          return (
            <div key={result.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className={`px-6 py-4 ${isPassed ? 'bg-green-100' : 'bg-red-100'} border-b`}>
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-800">
                    {result.test_paper?.name || 'Unknown Test'}
                  </h2>
                  <div className={`text-sm font-semibold px-3 py-1 rounded-full ${isPassed ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                    {isPassed ? 'Passed' : 'Failed'}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Subject: {result.test_subject_id?.title || 'Unknown Subject'}
                </p>
              </div>
              
              <div className="p-6">
                <div className="flex justify-between mb-4">
                  <div>
                    <p className="text-gray-600 text-sm">Date Completed:</p>
                    <p className="font-medium">{formatDate(result.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Score:</p>
                    <p className="font-medium text-lg">
                      {result.final_score.toFixed(1)} / 10 
                      <span className="text-sm ml-1">({percentageScore.toFixed(1)}%)</span>
                    </p>
                  </div>
                </div>
                
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-600 bg-indigo-200">
                        Score
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-indigo-600">
                        {percentageScore.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-indigo-200">
                    <div 
                      style={{ width: `${percentageScore}%` }} 
                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${isPassed ? 'bg-green-500' : 'bg-red-500'}`}
                    ></div>
                  </div>
                </div>
                
                <div className="mt-4 flex justify-between">
                  <Link
                    to={`/subjects/${result.test_subject_id}/tests`}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    Back to Test Papers
                  </Link>
                  
                  {/* Optional: Add a link to view detailed result */}
                  <Link
                    to={`/results/${result.id}`}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MyResults; 