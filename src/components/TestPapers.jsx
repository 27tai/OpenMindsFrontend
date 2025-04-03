import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import testPaperService from '../services/testPaperService';
import subjectService from '../services/subjectService';

const TestPapers = () => {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, refreshUser } = useAuth();
  
  const [testPapers, setTestPapers] = useState([]);
  const [subject, setSubject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fetchAttempts, setFetchAttempts] = useState(0);

  // Function to fetch the subject and its test papers
  const fetchData = useCallback(async () => {
    if (!subjectId) {
      setError('Subject ID is missing');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch subject details first
      console.log(`[TEST-PAPERS] Fetching subject ${subjectId} details`);
      const subjectData = await subjectService.getSubject(subjectId);
      setSubject(subjectData);
      
      // Then fetch test papers for this subject
      console.log(`[TEST-PAPERS] Fetching test papers for subject ${subjectId}`);
      const testPapersData = await testPaperService.getTestPapersBySubject(subjectId);
      console.log('[TEST-PAPERS] Test papers fetched:', testPapersData);
      
      // Ensure we have an array of test papers
      setTestPapers(Array.isArray(testPapersData) ? testPapersData : []);
    } catch (error) {
      console.error('[TEST-PAPERS] Error fetching data:', error);
      
      if (error.response?.status === 401) {
        console.log('[TEST-PAPERS] Authentication error (401), refreshing auth state');
        setTimeout(() => {
          refreshUser();
        }, 500);
        
        setError('Authentication error. Please try again.');
      } else {
        setError(
          error.response?.data?.detail || 
          error.message || 
          'Failed to load test papers. Please try again.'
        );
      }
    } finally {
      setIsLoading(false);
      setFetchAttempts(prev => prev + 1);
    }
  }, [subjectId, refreshUser]);

  // Fetch data when component mounts or subjectId changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    } else {
      navigate('/login', { state: { from: `/subjects/${subjectId}/tests` } });
    }
  }, [subjectId, isAuthenticated, fetchData, navigate]);

  const handleRetry = () => {
    console.log('[TEST-PAPERS] Retry requested, refreshing auth state first');
    refreshUser();
    
    setTimeout(() => {
      setIsLoading(true);
      setError(null);
      fetchData();
    }, 500);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-600">Loading test papers...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-4 max-w-md">
          <h3 className="text-lg font-medium mb-2">Error Loading Test Papers</h3>
          <p className="text-sm">{error}</p>
          {fetchAttempts > 0 && (
            <p className="text-sm mt-2">Attempts: {fetchAttempts}</p>
          )}
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

  // Empty state
  if (testPapers.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Link 
            to="/subjects"
            className="mr-4 text-indigo-600 hover:text-indigo-800"
          >
            &larr; Back to Subjects
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">
            {subject?.name || 'Subject'} - Test Papers
          </h1>
        </div>
        
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold text-gray-700 mb-4">No Test Papers Available</h2>
          <p className="text-gray-600 mb-6">There are currently no test papers for this subject.</p>
          <Link 
            to="/subjects"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Back to Subjects
          </Link>
        </div>
      </div>
    );
  }

  // Success state with test papers
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Link 
          to="/subjects"
          className="mr-4 text-indigo-600 hover:text-indigo-800"
        >
          &larr; Back to Subjects
        </Link>
        <h1 className="text-3xl font-bold text-gray-800">
          {subject?.name || 'Subject'} - Test Papers
        </h1>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {testPapers.map((testPaper) => (
          <div
            key={testPaper.id}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
          >
            <div className="bg-indigo-600 py-4 px-6">
              <h2 className="text-xl font-bold text-white">{testPaper.name}</h2>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <p className="text-gray-600">{testPaper.description || 'No description available.'}</p>
                <div className="mt-3 text-sm text-gray-500">
                
                  <div>Duration: {testPaper.duration_minutes || 'Not specified'} minutes</div>
                  <div>Passing Percentage: {testPaper.passing_percentage || 'Not specified'}</div>
                </div>
              </div>
              <Link
                to={`/question/${testPaper.id}`}
                className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-300"
              >
                Start Test
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TestPapers; 