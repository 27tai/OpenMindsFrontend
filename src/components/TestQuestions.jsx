import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import questionService from '../services/questionService';
import testPaperService from '../services/testPaperService';
import resultService from '../services/resultService';
import axios from 'axios';

const TestQuestions = () => {
  const { testPaperId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, refreshUser } = useAuth();
  
  const [questions, setQuestions] = useState([]);
  const [testPaper, setTestPaper] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(null);
  
  // Using useRef to store the timer ID for cleanup
  const timerRef = useRef(null);
  // Using ref to track if submission is in progress to avoid duplicate submissions
  const isSubmittingRef = useRef(false);
  // Store selected answers in ref to access in beforeunload handler
  const selectedAnswersRef = useRef({});
  
  // Update the ref whenever the state changes
  useEffect(() => {
    selectedAnswersRef.current = selectedAnswers;
    
    // Save answers to localStorage whenever they change
    if (Object.keys(selectedAnswers).length > 0 && testPaper) {
      try {
        localStorage.setItem(`test_answers_${testPaperId}`, JSON.stringify({
          answers: selectedAnswers,
          timestamp: new Date().toISOString()
        }));
        console.log('[TEST-QUESTIONS] Saved answers to localStorage');
      } catch (err) {
        console.error('[TEST-QUESTIONS] Failed to save answers to localStorage:', err);
      }
    }
  }, [selectedAnswers, testPaperId, testPaper]);
  
  // Function to fetch the test paper and its questions
  const fetchData = useCallback(async () => {
    if (!testPaperId) {
      setError('Test paper ID is missing');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch test paper details first
      console.log(`[TEST-QUESTIONS] Fetching test paper ${testPaperId} details`);
      const testPaperData = await testPaperService.getTestPaper(testPaperId);
      setTestPaper(testPaperData);
      
      // Set initial time remaining based on test duration
      if (testPaperData && testPaperData.duration_minutes) {
        const durationInSeconds = testPaperData.duration_minutes * 60;
        setTimeRemaining(durationInSeconds);
      }
      
      // Then fetch questions for this test paper
      console.log(`[TEST-QUESTIONS] Fetching questions for test paper ${testPaperId}`);
      const questionsData = await questionService.getQuestionsByTestPaper(testPaperId);
      console.log('[TEST-QUESTIONS] Questions fetched:', questionsData);
      
      // Debug logging
      if (questionsData && questionsData.length > 0) {
        const sampleQuestion = questionsData[0];
        console.log('[TEST-QUESTIONS] Sample question structure:', sampleQuestion);
        console.log('[TEST-QUESTIONS] Options structure:', sampleQuestion.options);
        if (sampleQuestion.options && sampleQuestion.options.length > 0) {
          console.log('[TEST-QUESTIONS] Sample option structure:', sampleQuestion.options[0]);
        }
        console.log('[TEST-QUESTIONS] Correct answer index:', sampleQuestion.correct_answer_index);
      }
      
      // Normalize the data to handle different API formats
      const normalizedQuestions = questionsData.map(question => {
        // Create a standardized question object
        return {
          id: question.id,
          text: question.text || question.question_text || question.question || '',
          options: Array.isArray(question.options) 
            ? question.options 
            : (question.answers || []),
          correct_answer_index: question.correct_answer_index !== undefined 
            ? question.correct_answer_index 
            : (question.correct_option_index !== undefined 
              ? question.correct_option_index 
              : 0),
          max_score: question.max_score || question.score || 1
        };
      });
      
      // Ensure we have an array of questions
      setQuestions(normalizedQuestions);
      
      // Try to restore answers from localStorage
      try {
        const savedData = localStorage.getItem(`test_answers_${testPaperId}`);
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          const timestamp = new Date(parsedData.timestamp).getTime();
          const now = new Date().getTime();
          const isRecent = (now - timestamp) < 24 * 60 * 60 * 1000; // 24 hours
          
          if (parsedData.answers && Object.keys(parsedData.answers).length > 0 && isRecent) {
            console.log('[TEST-QUESTIONS] Restoring saved answers:', parsedData.answers);
            setSelectedAnswers(parsedData.answers);
          } else {
            // Initialize with empty answers if no saved data or data is too old
            const initialAnswers = {};
            normalizedQuestions.forEach(question => {
              initialAnswers[question.id] = null;
            });
            setSelectedAnswers(initialAnswers);
          }
        } else {
          // Initialize with empty answers if no saved data
          const initialAnswers = {};
          normalizedQuestions.forEach(question => {
            initialAnswers[question.id] = null;
          });
          setSelectedAnswers(initialAnswers);
        }
      } catch (err) {
        console.error('[TEST-QUESTIONS] Error restoring answers:', err);
        // Initialize with empty answers if error
        const initialAnswers = {};
        normalizedQuestions.forEach(question => {
          initialAnswers[question.id] = null;
        });
        setSelectedAnswers(initialAnswers);
      }
      
    } catch (error) {
      console.error('[TEST-QUESTIONS] Error fetching data:', error);
      
      if (error.response?.status === 401) {
        console.log('[TEST-QUESTIONS] Authentication error (401), refreshing auth state');
        setTimeout(() => {
          refreshUser();
        }, 500);
        
        setError('Authentication error. Please try again.');
      } else {
        setError(
          error.response?.data?.detail || 
          error.message || 
          'Failed to load test questions. Please try again.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [testPaperId, refreshUser]);

  // Start timer when test is loaded
  useEffect(() => {
    if (timeRemaining !== null && !submitted) {
      console.log(`[TEST-QUESTIONS] Starting timer with ${timeRemaining} seconds`);
      
      timerRef.current = setInterval(() => {
        setTimeRemaining(prevTime => {
          if (prevTime <= 1) {
            // Time's up - clear interval and trigger submission
            clearInterval(timerRef.current);
            console.log('[TEST-QUESTIONS] Time is up! Auto-submitting test...');
            // Use setTimeout to ensure state updates before submission
            setTimeout(() => {
              if (!isSubmittingRef.current && !submitted) {
                handleSubmit();
              }
            }, 0);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
      
      // Cleanup function
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [timeRemaining, submitted]);

  // Add beforeunload event listener to warn user before refreshing
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      // If test is ongoing (not submitted), show a warning
      if (!submitted && !isSubmittingRef.current && questions.length > 0) {
        const message = "WARNING: Refreshing or leaving this page will reset your test progress. Your answers will be saved, but any unsaved work might be lost. Are you sure you want to continue?";
        event.preventDefault();
        event.returnValue = message; // Standard for most browsers
        
        // Set a flag indicating a refresh/navigation is happening
        localStorage.setItem('test_page_refreshed', JSON.stringify({
          test_paper_id: testPaperId,
          timestamp: new Date().toISOString()
        }));
        
        return message;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [submitted, questions, testPaperId]);
  
  // Check if we need to auto-submit after a refresh
  useEffect(() => {
    const checkForRefresh = () => {
      try {
        const refreshData = localStorage.getItem('test_page_refreshed');
        if (refreshData) {
          const parsedData = JSON.parse(refreshData);
          const isCurrentTest = parsedData.test_paper_id === testPaperId;
          const timestamp = new Date(parsedData.timestamp).getTime();
          const now = new Date().getTime();
          const isRecent = (now - timestamp) < 5 * 60 * 1000; // 5 minutes
          
          if (isCurrentTest && isRecent && !submitted && !isLoading && questions.length > 0) {
            // Display an alert to the user
            setTimeout(() => {
              const shouldSubmit = window.confirm("Your test was interrupted. Do you want to submit your saved answers now?");
              if (shouldSubmit) {
                handleSubmit();
              }
            }, 1000);
          }
          
          // Clean up the flag
          localStorage.removeItem('test_page_refreshed');
        }
      } catch (err) {
        console.error('[TEST-QUESTIONS] Error checking refresh status:', err);
        localStorage.removeItem('test_page_refreshed');
      }
    };
    
    if (!isLoading && testPaper && questions.length > 0) {
      checkForRefresh();
    }
  }, [testPaperId, isLoading, testPaper, questions, submitted]);

  // Fetch data when component mounts or testPaperId changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    } else {
      navigate('/login', { state: { from: `/question/${testPaperId}` } });
    }
    
    // Cleanup function to clear the timer when component unmounts
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [testPaperId, isAuthenticated, fetchData, navigate]);

  const handleAnswerSelect = (questionId, optionIndex) => {
    console.log(`[TEST-QUESTIONS] Selected option ${optionIndex} for question ${questionId}`);
    setSelectedAnswers(prev => {
      const updated = {
        ...prev,
        [questionId]: prev[questionId] === optionIndex ? null : optionIndex
      };
      console.log('[TEST-QUESTIONS] Updated selected answers:', updated);
      return updated;
    });
  };

  const handleSubmit = async () => {
    // Prevent duplicate submissions
    if (isSubmittingRef.current || submitted) {
      console.log('[TEST-QUESTIONS] Submission already in progress, ignoring duplicate call');
      return;
    }
    
    // Set flag to indicate submission is in progress
    isSubmittingRef.current = true;
    
    // Stop the timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // If we don't have questions loaded yet, try to restore from localStorage
    let answersToSubmit = selectedAnswers;
    if (Object.keys(selectedAnswers).length === 0) {
      try {
        const savedData = localStorage.getItem(`test_answers_${testPaperId}`);
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          if (parsedData.answers && Object.keys(parsedData.answers).length > 0) {
            console.log('[TEST-QUESTIONS] Using saved answers for submission:', parsedData.answers);
            answersToSubmit = parsedData.answers;
          }
        }
      } catch (err) {
        console.error('[TEST-QUESTIONS] Error restoring answers for submission:', err);
      }
    }
    
    // Calculate score
    let totalScore = 0;
    let maxPossibleScore = 0;
    
    // Collect the question scores in a format that matches the database model
    const userAnswersForStorage = {};
    
    questions.forEach(question => {
      const userSelectedOption = answersToSubmit[question.id];
      userAnswersForStorage[question.id] = userSelectedOption;
      
      // Get question max score, default to 1 if not specified
      const questionMaxScore = Number(question.max_score) || 1;
      maxPossibleScore += questionMaxScore;
      
      console.log(`[TEST-QUESTIONS] Question ${question.id}:`);
      console.log(`- User selected: ${userSelectedOption}`);
      console.log(`- Correct answer: ${question.correct_answer_index}`);
      console.log(`- Max score: ${questionMaxScore}`);
      
      // Award score if answer is correct
      if (userSelectedOption === question.correct_answer_index) {
        totalScore += questionMaxScore;
        console.log(`- Points awarded: ${questionMaxScore}`);
      } else {
        console.log('- No points awarded');
      }
    });
    
    setScore(totalScore);
    console.log(`[TEST-QUESTIONS] Total score: ${totalScore}/${maxPossibleScore}`);
    
    try {
      // Prepare the result data with properly formatted user_answers
      const resultData = {
        user_id: localStorage.getItem('userId'),
        test_paper_id: testPaper.id,
        final_score: totalScore,
        user_answers: userAnswersForStorage
      };
      
      console.log('[TEST-QUESTIONS] Saving test result:', resultData);
      
      // Save the result to the backend - with more robust error handling
      try {
        const savedResult = await resultService.saveResult(resultData);
        console.log('[TEST-QUESTIONS] Test result saved:', savedResult);
        
        // Clean up localStorage after successful submission
        localStorage.removeItem(`test_answers_${testPaperId}`);
        
        // Set submitted state to show the results view
        setSubmitted(true);
        
        // Use a shorter timeout and force navigate
        setTimeout(() => {
          console.log('[TEST-QUESTIONS] Redirecting to /my-results now');
          // Force a hard navigation to ensure redirect happens
          window.location.href = '/';
        }, 2000);
      } catch (saveError) {
        console.error('[TEST-QUESTIONS] Error saving result to backend:', saveError);
        
        // Try direct axios call as a fallback
        try {
          const token = localStorage.getItem('token');
          const userId = localStorage.getItem('userId');
          if (token) {
            console.log('[TEST-QUESTIONS] Attempting direct API call as fallback');
            
            // Ensure user_id is included in the data
            const fallbackData = {
              ...resultData,
              user_id: userId || resultData.user_id // Use from localStorage or previous data
            };
            
            console.log('[TEST-QUESTIONS] Fallback API data:', fallbackData);
            
            const response = await axios.post('https://openmindsbackend.onrender.com/api/results/submit', fallbackData, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            console.log('[TEST-QUESTIONS] Direct API call successful:', response.data);
            
            // Clean up localStorage after successful submission
            localStorage.removeItem(`test_answers_${testPaperId}`);
            
            // Still set submitted to true to show the results view
            setSubmitted(true);
            
            // Use a shorter timeout and force navigate
            setTimeout(() => {
              console.log('[TEST-QUESTIONS] Redirecting to /my-results now (after fallback)');
              window.location.href = '/';
            }, 2000);
          } else {
            throw new Error('No authentication token available');
          }
        } catch (fallbackError) {
          console.error('[TEST-QUESTIONS] Fallback API call also failed:', fallbackError);
          // Still set submitted to true to show the results view
          setSubmitted(true);
          alert('Could not save your results to the server. Please try again or contact support.');
        }
      }
    } catch (error) {
      console.error('[TEST-QUESTIONS] Error in submission process:', error);
      // Still set submitted to true to show the results view
      setSubmitted(true);
      alert('An error occurred while processing your submission. Please try again.');
    } finally {
      // Reset submission flag regardless of outcome
      isSubmittingRef.current = false;
    }
  };

  const isTestCompleted = () => {
    return true;
  };

  const handleRetry = () => {
    console.log('[TEST-QUESTIONS] Retry requested, refreshing auth state first');
    refreshUser();
    
    setTimeout(() => {
      setIsLoading(true);
      setError(null);
      fetchData();
    }, 500);
  };

  // Format time remaining as MM:SS
  const formatTimeRemaining = () => {
    if (timeRemaining === null) return "00:00";
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-600">Loading questions...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-4 max-w-md">
          <h3 className="text-lg font-medium mb-2">Error Loading Questions</h3>
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

  // Empty state
  if (questions.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Link 
            to={`/subjects/${testPaper?.subject_id}/tests`}
            className="mr-4 text-indigo-600 hover:text-indigo-800"
          >
            &larr; Back to Test Papers
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">
            {testPaper?.name || 'Test Paper'} - Questions
          </h1>
        </div>
        
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold text-gray-700 mb-4">No Questions Available</h2>
          <p className="text-gray-600 mb-6">There are currently no questions for this test paper.</p>
          <Link 
            to={`/subjects/${testPaper?.subject_id}/tests`}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Back to Test Papers
          </Link>
        </div>
      </div>
    );
  }

  // Test submitted view
  if (submitted) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto text-center">
          <div className="mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="text-2xl font-bold text-gray-800 mt-4">
              Test Submitted Successfully
            </h1>
          </div>
          
          <p className="text-gray-600 mb-4">Your test has been submitted successfully. You will be redirected shortly.</p>
          
          <div className="animate-pulse">
            <p className="text-gray-500">Redirecting...</p>
          </div>
        </div>
      </div>
    );
  }

  // Success state with questions - Test Taking View
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            {testPaper?.name || 'Test Paper'}
          </h1>
          <div className="flex flex-col items-end text-sm">
            <div className={`text-lg font-bold ${timeRemaining < 60 ? 'text-red-600 animate-pulse' : timeRemaining < 300 ? 'text-orange-500' : 'text-gray-600'}`}>
              Time Remaining: {formatTimeRemaining()}
            </div>
            <div className="text-gray-600">
              Duration: {testPaper?.duration_minutes || 'N/A'} minutes
            </div>
          </div>
        </div>
        
        {/* Warning about refreshing */}
        <div className="mb-6 bg-yellow-50 border border-yellow-200 p-4 rounded-md">
          <div className="flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Important Notice</h3>
              <p className="text-xs text-yellow-700 mt-1">Your answers are automatically saved. However, please avoid refreshing or navigating away from this page during the test as it may interrupt your session.</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-6 mb-8">
          {questions.map((question, index) => (
            <div key={question.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start flex-1">
                  <span className="bg-gray-200 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">
                    {index + 1}
                  </span>
                  <p className="font-medium">{question.text}</p>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-md text-sm font-medium">
                    {question.max_score} {question.max_score === 1 ? 'point' : 'points'}
                  </span>
                </div>
              </div>
              
              <div className="ml-8 space-y-2">
                {Array.isArray(question.options) ? 
                  question.options.map((option, optionIndex) => {
                    // Handle different option formats
                    const optionText = typeof option === 'object' && option !== null 
                      ? (option.text || JSON.stringify(option)) 
                      : String(option);
                    
                    return (
                      <div 
                        key={optionIndex} 
                        className={`p-2 rounded cursor-pointer hover:bg-indigo-200 active:bg-indigo-300 transition-colors duration-200 flex items-center justify-between ${
                          selectedAnswers[question.id] === optionIndex ? 'bg-indigo-100 border border-indigo-300' : 'bg-gray-50'
                        }`}
                        onClick={() => {
                          console.log(`Clicked option ${optionIndex} for question ${question.id}`);
                          handleAnswerSelect(question.id, optionIndex);
                        }}
                        role="button"
                        tabIndex={0}
                        style={{ cursor: 'pointer' }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            handleAnswerSelect(question.id, optionIndex);
                          }
                        }}
                      >
                        <div className="flex items-center">
                          <span className="mr-2 font-medium">{String.fromCharCode(65 + optionIndex)}.</span>
                          <span>{optionText}</span>
                        </div>
                        <span className={`text-xs ${selectedAnswers[question.id] === optionIndex ? 'text-indigo-600 font-semibold' : 'text-gray-400'}`}>
                          {selectedAnswers[question.id] === optionIndex ? '✓ Selected' : 'Click to select'}
                        </span>
                      </div>
                    );
                  })
                : <p className="text-red-500">Options not available</p>}
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-between items-center">
          <Link 
            to={`/subjects/${testPaper?.subject_id}/tests`}
            className="px-4 py-2 text-indigo-600 hover:text-indigo-800 border border-indigo-600 rounded-md"
            onClick={(e) => {
              if (!confirm("Are you sure you want to cancel the test? All your progress will be lost.")) {
                e.preventDefault();
              }
            }}
          >
            Cancel Test
          </Link>
          
          <button
            onClick={handleSubmit}
            disabled={!isTestCompleted()}
            className={`px-6 py-2 rounded-md transition-colors duration-300 ${
              isTestCompleted()
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Submit Test
          </button>
        </div>
        
        {timeRemaining < 60 && (
          <p className="text-red-600 text-center mt-4 text-sm font-bold animate-pulse">
            Less than 1 minute remaining! Test will auto-submit when time expires.
          </p>
        )}
      </div>
    </div>
  );
};

export default TestQuestions;