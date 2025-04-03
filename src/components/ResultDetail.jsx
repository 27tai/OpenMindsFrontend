import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import resultService from '../services/resultService';
import questionService from '../services/questionService';

const ResultDetail = () => {
  const { resultId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, refreshUser } = useAuth();
  
  const [result, setResult] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Function to fetch result and questions
  const fetchData = useCallback(async () => {
    if (!resultId) {
      setError('Result ID is missing');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch result details
      console.log(`[RESULT-DETAIL] Fetching result ${resultId}`);
      const resultData = await resultService.getResult(resultId);
      console.log('[RESULT-DETAIL] Result fetched:', resultData);
      setResult(resultData);
      
      // Fetch questions for this test paper
      console.log(`[RESULT-DETAIL] Fetching questions for test paper ${resultData.test_paper_id}`);
      const questionsData = await questionService.getQuestionsByTestPaper(resultData.test_paper_id);
      console.log('[RESULT-DETAIL] Questions fetched:', questionsData);
      console.log('[RESULT-DETAIL] User Answers:', resultData.user_answers);
      
      // Normalize the data to handle different API formats
      const normalizedQuestions = questionsData.map(question => {
        // Get the correct option (could be an index or an object ID)
        let correctOptionId = null;
        
        // Determine the correct option ID based on available properties
        if (question.correct_option_id !== undefined) {
          correctOptionId = question.correct_option_id;
        } else if (question.correct_answer_id !== undefined) {
          correctOptionId = question.correct_answer_id;
        }
        
        // Create a standardized question object
        return {
          id: question.id,
          max_score: question.max_score,
          text: question.text,
          options: Array.isArray(question.options) 
            ? question.options 
            : (question.answers || []),
          correct_option_id: correctOptionId
        };
      });
      
      setQuestions(normalizedQuestions);
    } catch (error) {
      console.error('[RESULT-DETAIL] Error fetching data:', error);
      
      if (error.response?.status === 401) {
        console.log('[RESULT-DETAIL] Authentication error (401), refreshing auth state');
        setTimeout(() => {
          refreshUser();
        }, 500);
        
        setError('Authentication error. Please try again.');
      } else {
        setError(
          error.response?.data?.detail || 
          error.message || 
          'Failed to load result details. Please try again.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [resultId, refreshUser]);

  // Fetch data when component mounts
  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    } else {
      navigate('/login', { state: { from: `/results/${resultId}` } });
    }
  }, [resultId, isAuthenticated, fetchData, navigate]);
  
  const handleRetry = () => {
    console.log('[RESULT-DETAIL] Retry requested, refreshing auth state first');
    refreshUser();
    
    setTimeout(() => {
      setIsLoading(true);
      setError(null);
      fetchData();
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
        <span className="ml-3 text-gray-600">Loading result details...</span>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-4 max-w-md">
          <h3 className="text-lg font-medium mb-2">Error Loading Result</h3>
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
            to="/results"
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Back to Results
          </Link>
        </div>
      </div>
    );
  }
  
  // No result found
  if (!result) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Link 
            to="/results"
            className="mr-4 text-indigo-600 hover:text-indigo-800"
          >
            &larr; Back to Results
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">
            Result Not Found
          </h1>
        </div>
        
        <div className="text-center py-8 bg-white rounded-lg shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-700 mb-4">Result Not Found</h2>
          <p className="text-gray-600 mb-6">The result you're looking for doesn't exist or you don't have permission to view it.</p>
          <Link 
            to="/results"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Back to Results
          </Link>
        </div>
      </div>
    );
  }
  
  // Calculate percentage score
  const totalPossibleScore = questions.reduce((sum, q) => sum + (q.max_score), 0);
  const percentageScore = totalPossibleScore > 0 
    ? (result.final_score / totalPossibleScore) * 100 
    : 0;
  const isPassed = percentageScore >= (result.test_paper?.passing_percentage || 60);
  
  // Success state - display result detail
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Link 
          to={`/test-results/${result.test_paper_id}`}
          className="mr-4 text-indigo-600 hover:text-indigo-800"
        >
          &larr; Back to Results
        </Link>
        <h1 className="text-3xl font-bold text-gray-800">
          Result Details
        </h1>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-6 mb-4">
            <div>
              <p className="text-gray-600 text-sm">Date Completed:</p>
              <p className="font-medium">{formatDate(result.created_at)}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Score:</p>
              <p className="font-medium text-lg">
                {result.final_score.toFixed(1)} / {totalPossibleScore.toFixed(1)} 
                <span className="text-sm ml-1">({percentageScore.toFixed(1)}%)</span>
              </p>
            </div>
          </div>
          
          <div className="relative pt-1 mb-6">
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
        </div>
      </div>
      
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Questions & Answers</h2>
      
      <div className="space-y-6 mb-8">
        {questions.map((question, index) => {
          // User's answer is stored in result.user_answers as a map of question ID -> letter code (0=A, 1=B, 2=C, 3=D)
          // Convert from letter code to numeric index if needed
          const userAnswer = result.user_answers && result.user_answers[question.id] !== undefined 
            ? result.user_answers[question.id] 
            : null;
          
          console.log(`Question ${question.id}: user answer = ${userAnswer}, correct = ${question.correct_option_id}`);
          
          return (
            <div key={question.id} className="border rounded-lg p-4 bg-white shadow-sm">
              <div className="flex items-start mb-3">
                <span className="bg-gray-200 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">
                  {index+1}
                </span>
                <p className="font-medium">{question.text}</p>
              </div>
              
              <div className="ml-8 space-y-2">
                {question.options && question.options.map((option, optionIndex) => {
                  // Handle different option formats
                  const optionText = typeof option === 'object' && option !== null 
                    ? (option.text || JSON.stringify(option)) 
                    : String(option);
                  
                  // Get the option ID (could be index or option.id)
                  const optionId = typeof option === 'object' && option !== null && option.id !== undefined
                    ? option.id
                    : optionIndex;
                  
                  // Determine if this is the user's answer (comparing by index)
                  const isUserAnswer = userAnswer === optionIndex;
                  
                  // Determine if this is the correct answer
                  const isCorrectAnswer = question.correct_option_id === optionId;
                  
                  // Determine background color class and status text
                  let bgColorClass = 'bg-gray-50';
                  let statusText = null;
                  
                  if (isUserAnswer && isCorrectAnswer) {
                    // User selected the correct answer
                    bgColorClass = 'bg-green-100 border border-green-500';
                    statusText = <span className="ml-auto text-green-600">✓ Your Answer (Correct)</span>;
                  } else if (isUserAnswer && !isCorrectAnswer) {
                    // User selected wrong answer
                    bgColorClass = 'bg-red-100 border border-red-500';
                    statusText = <span className="ml-auto text-red-600">✗ Your Answer</span>;
                  } else if (isCorrectAnswer) {
                    // This is the correct answer (but not selected by user)
                    bgColorClass = 'bg-green-100 border border-green-500';
                    statusText = <span className="ml-auto text-green-600">✓ Correct Answer</span>;
                  }
                  
                  return (
                    <div 
                      key={optionIndex} 
                      className={`p-2 rounded flex items-center ${bgColorClass}`}
                    >
                      <span className="mr-2 font-medium">{String.fromCharCode(65 + optionIndex)}.</span>
                      <span>{optionText}</span>
                      {statusText}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ResultDetail;