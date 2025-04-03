import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import testPaperService from '../services/testPaperService';
import { useAuth } from '../context/AuthContext';

const TestPaperBlocks = () => {
  const [testPapers, setTestPapers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fetchAttempts, setFetchAttempts] = useState(0);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [testPaperToDelete, setTestPaperToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTestPaper, setNewTestPaper] = useState({
    name: '',
    duration_minutes: 60,
    is_active: true
  });
  const [isCreating, setIsCreating] = useState(false);
  const { isAuthenticated, token, refreshUser, user } = useAuth();
  const navigate = useNavigate();

  // Fetch test papers
  const fetchTestPapers = useCallback(async () => {
    // Only proceed if token is available
    if (!token) {
      console.warn('[TEST-PAPERS] No token available, cannot fetch test papers');
      setError('Authentication required to view test papers');
      setIsLoading(false);
      return;
    }

    try {
      console.log('[TEST-PAPERS] Starting to fetch test papers, auth status:', isAuthenticated);
      console.log('[TEST-PAPERS] Token available:', !!token);
      
      setIsLoading(true);
      setError(null);
      
      console.log('[TEST-PAPERS] Fetching all test papers');
      const data = await testPaperService.getAllTestPapers();
      
      console.log('[TEST-PAPERS] Test papers fetched successfully:', data);
      setTestPapers(Array.isArray(data) ? data : []);
      setError(null);
    } catch (error) {
      console.error('[TEST-PAPERS] Error fetching test papers:', error);
      
      // Special handling for authentication errors
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
  }, [token, isAuthenticated, refreshUser]);

  // Main effect to fetch test papers when component mounts
  useEffect(() => {
    if (isAuthenticated && token) {
      console.log('[TEST-PAPERS] Auth confirmed, fetching data after short delay');
      const timeoutId = setTimeout(() => {
        fetchTestPapers();
      }, 300);
      
      return () => clearTimeout(timeoutId);
    } else {
      console.log('[TEST-PAPERS] Waiting for authentication before fetching data');
      setIsLoading(false);
    }
  }, [isAuthenticated, token, fetchTestPapers]);

  const handleRetry = () => {
    console.log('[TEST-PAPERS] Retry requested, refreshing auth state first');
    refreshUser();
    
    setTimeout(() => {
      setIsLoading(true);
      setError(null);
      fetchTestPapers();
    }, 500);
  };

  // Handle confirmation for deleting a test paper
  const handleDeleteClick = (testPaper) => {
    setTestPaperToDelete(testPaper);
    setShowDeleteConfirmation(true);
  };

  // Handle canceling deletion
  const handleCancelDelete = () => {
    setShowDeleteConfirmation(false);
    setTestPaperToDelete(null);
  };

  // Handle confirming deletion
  const handleConfirmDelete = async () => {
    if (!testPaperToDelete) return;
    
    setIsDeleting(true);
    try {
      await testPaperService.deleteTestPaper(testPaperToDelete.id);
      
      // Update the test papers list after successful deletion
      setTestPapers(prev => prev.filter(tp => tp.id !== testPaperToDelete.id));
      
      // Clean up state
      setShowDeleteConfirmation(false);
      setTestPaperToDelete(null);
    } catch (error) {
      console.error('[TEST-PAPERS] Error deleting test paper:', error);
      setError('Failed to delete test paper. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle navigating to manage questions
  const handleManageQuestions = (testPaperId) => {
    navigate(`/manage-questions/${testPaperId}`);
  };

  // Handle navigating to view results
  const handleViewResults = (testPaperId) => {
    navigate(`/test-results/${testPaperId}`);
  };

  // Handle showing the add test paper form
  const handleAddTestPaperClick = () => {
    setShowAddForm(true);
  };

  // Handle canceling the add test paper form
  const handleCancelAdd = () => {
    setShowAddForm(false);
    setNewTestPaper({
      name: '',
      duration_minutes: 60,
      is_active: true
    });
  };

  // Handle input change for new test paper form
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewTestPaper(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle creating a new test paper
  const handleCreateTestPaper = async (e) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      // Create new test paper via API
      const createdTestPaper = await testPaperService.createTestPaper(newTestPaper);
      
      // Add the new test paper to the list
      setTestPapers(prev => [...prev, createdTestPaper]);
      
      // Reset form and close modal
      setNewTestPaper({
        name: '',
        duration_minutes: 60,
        is_active: true
      });
      setShowAddForm(false);
    } catch (error) {
      console.error('[TEST-PAPERS] Error creating test paper:', error);
      setError('Failed to create test paper. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  // Check if user is admin
  const isAdmin = user?.role === 'ADMIN';

  // If not authenticated, show login prompt
  if (!isAuthenticated) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-gray-700 mb-4">Authentication Required</h2>
        <p className="text-gray-600 mb-4">Please login to view test papers.</p>
        <Link 
          to="/login"
          className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Go to Login
        </Link>
      </div>
    );
  }

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
        <button 
          onClick={handleRetry}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          Retry
        </button>
      </div>
    );
  }

  // Success state with test papers
  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Give Test</h1>
        {isAdmin && (
          <button
            onClick={handleAddTestPaperClick}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors duration-300"
          >
            Add New Test Paper
          </button>
        )}
      </div>
      
      {testPapers.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-xl text-gray-600 mb-4">No test papers available</p>
          {isAdmin && (
            <button
              onClick={handleAddTestPaperClick}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors duration-300"
            >
              Create Your First Test Paper
            </button>
          )}
        </div>
      ) : (
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
                <div className="flex justify-between text-sm text-gray-600 mb-4">
                  <span>Duration: {testPaper.duration_minutes} minutes</span>
                </div>
                
                <div className="flex flex-col space-y-2">
                  <Link
                    to={`/test-papers/${testPaper.id}`}
                    className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-300"
                  >
                    Take Test
                  </Link>
                  
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => handleManageQuestions(testPaper.id)}
                        className="w-full text-center bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-300"
                      >
                        Manage Questions
                      </button>
                      <button
                        onClick={() => handleViewResults(testPaper.id)}
                        className="w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-300"
                      >
                        View Results
                      </button>
                      <button
                        onClick={() => handleDeleteClick(testPaper)}
                        className="w-full text-center bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-300"
                      >
                        Delete Test Paper
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Test Paper Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Add New Test Paper</h3>
            <form onSubmit={handleCreateTestPaper}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                  Test Paper Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={newTestPaper.name}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="Enter test paper name"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="duration_minutes">
                  Duration (minutes)
                </label>
                <input
                  id="duration_minutes"
                  name="duration_minutes"
                  type="number"
                  min="1"
                  value={newTestPaper.duration_minutes}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              
              <div className="mb-6 flex items-center">
                <input
                  id="is_active"
                  name="is_active"
                  type="checkbox"
                  checked={newTestPaper.is_active}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-gray-700 text-sm font-bold" htmlFor="is_active">
                  Active (available to users)
                </label>
              </div>
              
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={handleCancelAdd}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-md transition-colors duration-300"
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors duration-300"
                  disabled={isCreating}
                >
                  {isCreating ? 'Creating...' : 'Create Test Paper'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && testPaperToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Confirm Delete</h3>
            <p className="mb-6">
              Are you sure you want to delete the test paper "{testPaperToDelete.name}"? 
              This will also delete all questions and results associated with this test paper.
              This action cannot be undone.
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

export default TestPaperBlocks; 