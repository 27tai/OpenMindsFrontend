import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import testPaperService from '../services/testPaperService';
import { useAuth } from '../context/AuthContext';

const ManageQuestions = () => {
  const { testPaperId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, token, refreshUser, user } = useAuth();
  
  const [testPaper, setTestPaper] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    text: '',
    test_paper_id: parseInt(testPaperId),
    options: [
      { text: '', is_correct: true },
      { text: '', is_correct: false },
      { text: '', is_correct: false },
      { text: '', is_correct: false }
    ],
    max_score: 1.0
  });

  // Fetch test paper details
  const fetchTestPaper = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await testPaperService.getTestPaper(testPaperId);
      setTestPaper(data);
    } catch (error) {
      console.error('Error fetching test paper:', error);
      setError('Failed to load test paper details.');
    } finally {
      setIsLoading(false);
    }
  }, [testPaperId]);

  // Fetch questions for the test paper
  const fetchQuestions = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await testPaperService.getQuestionsForTestPaper(testPaperId);
      setQuestions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching questions:', error);
      setError('Failed to load questions for this test paper.');
    } finally {
      setIsLoading(false);
    }
  }, [testPaperId]);

  // Initial load of test paper and questions
  useEffect(() => {
    if (isAuthenticated && token) {
      fetchTestPaper();
      fetchQuestions();
    }
  }, [isAuthenticated, token, fetchTestPaper, fetchQuestions]);

  // Check if user is admin, if not redirect to home
  useEffect(() => {
    if (isAuthenticated && user && user.role !== 'ADMIN') {
      navigate('/');
    }
  }, [isAuthenticated, user, navigate]);

  // Handle showing delete confirmation modal
  const handleDeleteClick = (question) => {
    setQuestionToDelete(question);
    setShowDeleteConfirmation(true);
  };

  // Handle cancellation of delete
  const handleCancelDelete = () => {
    setShowDeleteConfirmation(false);
    setQuestionToDelete(null);
  };

  // Handle confirmation of delete
  const handleConfirmDelete = async () => {
    if (!questionToDelete) return;
    
    setIsDeleting(true);
    try {
      await testPaperService.deleteQuestion(questionToDelete.id);
      
      // Update questions list after successful deletion
      setQuestions(prev => prev.filter(q => q.id !== questionToDelete.id));
      
      // Clean up state
      setShowDeleteConfirmation(false);
      setQuestionToDelete(null);
    } catch (error) {
      console.error('Error deleting question:', error);
      setError('Failed to delete question. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle input change for new question form
  const handleQuestionInputChange = (e) => {
    const { name, value } = e.target;
    setNewQuestion(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle option text change
  const handleOptionTextChange = (index, value) => {
    const updatedOptions = [...newQuestion.options];
    updatedOptions[index] = {
      ...updatedOptions[index],
      text: value
    };
    
    setNewQuestion(prev => ({
      ...prev,
      options: updatedOptions
    }));
  };

  // Handle correct option selection
  const handleCorrectOptionChange = (index) => {
    const updatedOptions = newQuestion.options.map((option, i) => ({
      ...option,
      is_correct: i === index
    }));
    
    setNewQuestion(prev => ({
      ...prev,
      options: updatedOptions
    }));
  };

  // Handle submitting new question
  const handleSubmitQuestion = async (e) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      
      // Find the index of the correct option for the API
      const correctOptionIndex = newQuestion.options.findIndex(option => option.is_correct);
      
      // Create question with API
      const questionData = {
        ...newQuestion,
        correct_option_index: correctOptionIndex
      };
      
      const result = await testPaperService.createQuestion(questionData);
      
      // Add the new question to the list
      setQuestions(prev => [...prev, result]);
      
      // Reset form
      setNewQuestion({
        text: '',
        test_paper_id: parseInt(testPaperId),
        options: [
          { text: '', is_correct: true },
          { text: '', is_correct: false },
          { text: '', is_correct: false },
          { text: '', is_correct: false }
        ],
        max_score: 1.0
      });
      
      // Hide the form
      setShowAddForm(false);
    } catch (error) {
      console.error('Error creating question:', error);
      setError('Failed to create question. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isLoading && !testPaper) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-600">Loading test paper...</span>
      </div>
    );
  }

  // Error state
  if (error && !testPaper) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-4 max-w-md">
          <h3 className="text-lg font-medium mb-2">Error</h3>
          <p className="text-sm">{error}</p>
        </div>
        <button 
          onClick={() => navigate('/test-papers')}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Back to Test Papers
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Manage Questions</h1>
          {testPaper && (
            <h2 className="text-xl text-gray-600 mt-2">Test Paper: {testPaper.name}</h2>
          )}
        </div>
        <div>
          <button
            onClick={() => navigate('/test-papers')}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 mr-2"
          >
            Back to Test Papers
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Add New Question
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-medium mb-2">Error</h3>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Questions List */}
      {questions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-600">No questions found for this test paper.</p>
          <p className="text-gray-600 mt-2">Click "Add New Question" to create the first question.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Question
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Options
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {questions.map((question) => (
                <tr key={question.id}>
                  <td className="px-6 py-4 whitespace-normal">
                    <div className="text-sm text-gray-900">{question.text}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-normal">
                    <ul className="list-disc pl-5">
                      {question.options.map((option, index) => (
                        <li 
                          key={index}
                          className={`text-sm ${index === question.correct_option_index ? 'font-bold text-green-600' : 'text-gray-900'}`}
                        >
                          {option.text || 'No text provided'} 
                          {index === question.correct_option_index && ' (Correct)'}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{question.max_score}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDeleteClick(question)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Question Form */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Add New Question</h3>
            <form onSubmit={handleSubmitQuestion}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="text">
                  Question Text
                </label>
                <textarea
                  id="text"
                  name="text"
                  value={newQuestion.text}
                  onChange={handleQuestionInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  rows="3"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Options (select one as correct)
                </label>
                {newQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center mb-2">
                    <input
                      type="radio"
                      name="correctOption"
                      checked={option.is_correct}
                      onChange={() => handleCorrectOptionChange(index)}
                      className="mr-2"
                      required
                    />
                    <input
                      type="text"
                      value={option.text}
                      onChange={(e) => handleOptionTextChange(index, e.target.value)}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      placeholder={`Option ${index + 1}`}
                      required
                    />
                  </div>
                ))}
              </div>
              
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="max_score">
                  Max Score
                </label>
                <input
                  id="max_score"
                  name="max_score"
                  type="number"
                  step="0.1"
                  min="0"
                  value={newQuestion.max_score}
                  onChange={handleQuestionInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-md transition-colors duration-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors duration-300"
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && questionToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Confirm Delete</h3>
            <p className="mb-6">
              Are you sure you want to delete this question? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-md transition-colors duration-300"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors duration-300"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageQuestions; 