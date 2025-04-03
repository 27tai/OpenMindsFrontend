import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import subjectService from '../services/subjectService';
import { useAuth } from '../context/AuthContext';

const SubjectBlocks = () => {
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fetchAttempts, setFetchAttempts] = useState(0);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { isAuthenticated, token, refreshUser, user } = useAuth();

  // Use a debounced fetch to avoid race conditions with token
  const fetchSubjects = useCallback(async () => {
    // Only proceed if token is available
    if (!token) {
      console.warn('[SUBJECTS] No token available, cannot fetch subjects');
      setError('Authentication required to view subjects');
      setIsLoading(false);
      return;
    }

    try {
      console.log('[SUBJECTS] Starting to fetch subjects, auth status:', isAuthenticated);
      console.log('[SUBJECTS] Token available:', !!token);
      
      setIsLoading(true);
      setError(null);

      let data = null;
      let errorMessage = null;
      let methodsAttempted = [];
      
      // Try each method in sequence until one works
      // Method 1: Using apiClient (original method)
      try {
        console.log('[SUBJECTS] Attempt 1: Using apiClient');
        methodsAttempted.push("apiClient");
        data = await subjectService.getAllSubjects();
        console.log('[SUBJECTS] apiClient method succeeded');
      } catch (error1) {
        console.error('[SUBJECTS] apiClient method failed:', error1.message);
        errorMessage = error1.message;
        
        // Method 2: Try direct Fetch API
        try {
          console.log('[SUBJECTS] Attempt 2: Using Fetch API');
          methodsAttempted.push("Fetch API");
          data = await subjectService.getAllSubjectsWithFetch();
          console.log('[SUBJECTS] Fetch API method succeeded');
          errorMessage = null; // Reset error if successful
        } catch (error2) {
          console.error('[SUBJECTS] Fetch API method failed:', error2.message);
          errorMessage = errorMessage || error2.message;
          
          // Method 3: Try with enhanced headers
          try {
            console.log('[SUBJECTS] Attempt 3: Using enhanced headers');
            methodsAttempted.push("Enhanced Headers");
            data = await subjectService.getAllSubjectsWithExtras();
            console.log('[SUBJECTS] Enhanced headers method succeeded');
            errorMessage = null; // Reset error if successful
          } catch (error3) {
            console.error('[SUBJECTS] Enhanced headers method failed:', error3.message);
            errorMessage = errorMessage || error3.message;
            
            // All methods failed
            throw new Error(`All subject fetching methods failed: ${methodsAttempted.join(", ")}`);
          }
        }
      }
      
      // If we get here, one of the methods succeeded
      console.log('[SUBJECTS] Subjects fetched successfully with method:', methodsAttempted[methodsAttempted.length - 1]);
      console.log('[SUBJECTS] Data:', data);
      setSubjects(Array.isArray(data) ? data : []);
      setError(null);
    } catch (error) {
      console.error('[SUBJECTS] Error fetching subjects (all methods failed):', error);
      
      // Special handling for authentication errors
      if (error.response?.status === 401) {
        console.log('[SUBJECTS] Authentication error (401), refreshing auth state');
        // Wait a moment and try to refresh the user session
        setTimeout(() => {
          refreshUser();
        }, 500);
        
        setError('Authentication error. Please try again.');
      } else {
        setError(
          error.response?.data?.detail || 
          error.message || 
          'Failed to load subjects. Please try again.'
        );
      }
    } finally {
      setIsLoading(false);
      setFetchAttempts(prev => prev + 1);
    }
  }, [token, isAuthenticated, refreshUser]);

  // Main effect to fetch subjects when component mounts and auth state changes
  useEffect(() => {
    // If authenticated and token exists, fetch subjects after a short delay
    // The delay helps ensure any auth state updates have propagated
    if (isAuthenticated && token) {
      console.log('[SUBJECTS] Auth confirmed, fetching subjects after short delay');
      const timeoutId = setTimeout(() => {
        fetchSubjects();
      }, 300);
      
      return () => clearTimeout(timeoutId);
    } else {
      console.log('[SUBJECTS] Waiting for authentication before fetching subjects');
      setIsLoading(false);
    }
  }, [isAuthenticated, token, fetchSubjects]);

  const handleRetry = () => {
    console.log('[SUBJECTS] Retry requested, refreshing auth state first');
    refreshUser();
    
    setTimeout(() => {
      setIsLoading(true);
      setError(null);
      fetchSubjects();
    }, 500);
  };

  // Check if user is admin
  const isAdmin = user?.role === 'ADMIN';

  // Handle delete subject button click
  const handleDeleteClick = (subject) => {
    setSubjectToDelete(subject);
    setShowDeleteConfirmation(true);
  };

  // Handle cancel delete
  const handleCancelDelete = () => {
    setShowDeleteConfirmation(false);
    setSubjectToDelete(null);
  };

  // Handle confirm delete
  const handleConfirmDelete = async () => {
    if (!subjectToDelete) return;
    
    setIsDeleting(true);
    try {
      console.log(`[SUBJECTS] Deleting subject ${subjectToDelete.id}: ${subjectToDelete.title}`);
      await subjectService.deleteSubject(subjectToDelete.id);
      console.log(`[SUBJECTS] Subject ${subjectToDelete.id} deleted successfully`);
      
      // Remove the deleted subject from the list
      setSubjects(subjects.filter(subject => subject.id !== subjectToDelete.id));
      setShowDeleteConfirmation(false);
      setSubjectToDelete(null);
    } catch (error) {
      console.error(`[SUBJECTS] Error deleting subject ${subjectToDelete.id}:`, error);
      setError(
        error.response?.data?.detail || 
        error.message || 
        'Failed to delete subject. Please try again.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // If not authenticated, show login prompt
  if (!isAuthenticated) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-gray-700 mb-4">Authentication Required</h2>
        <p className="text-gray-600 mb-4">Please login to view subjects.</p>
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
        <span className="ml-3 text-gray-600">Loading subjects...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-4 max-w-md">
          <h3 className="text-lg font-medium mb-2">Error Loading Subjects</h3>
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

  // Empty state
  if (subjects.length === 0) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-gray-700 mb-4">No Subjects Available</h2>
        <p className="text-gray-600">There are currently no subjects to display.</p>
      </div>
    );
  }

  // Success state with subjects
  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">Available Subjects</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map((subject) => (
          <div
            key={subject.id}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
          >
            <div className="bg-indigo-600 py-4 px-6">
              <h2 className="text-xl font-bold text-white">{subject.title}</h2>
            </div>
            <div className="p-6 space-y-3">
              <Link
                to={`/subjects/${subject.id}/tests`}
                className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-300"
              >
                View Tests
              </Link>
              
              {isAdmin && (
                <button
                  onClick={() => handleDeleteClick(subject)}
                  className="block w-full text-center bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-300"
                >
                  Delete Subject
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete the subject "{subjectToDelete?.title}"? 
              This will also delete all test papers and questions associated with this subject.
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
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

export default SubjectBlocks; 