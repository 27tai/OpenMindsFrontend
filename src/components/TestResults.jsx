import React, { useState, useEffect } from 'react';
import { Link,useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import testPaperService from '../services/testPaperService';
import resultService from '../services/resultService';
import userService from '../services/userService';

const TestResults = () => {
  const { testPaperId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [testPaper, setTestPaper] = useState(null);
  const [results, setResults] = useState([]);
  const [userData, setUserData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is admin
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    // Redirect non-admin users
    if (isAuthenticated && !isAdmin) {
      navigate('/');
      return;
    }

    // Fetch test paper and results
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch test paper details
        const testPaperData = await testPaperService.getTestPaper(testPaperId);
        setTestPaper(testPaperData);
        
        // Fetch results for this test paper
        const resultsData = await testPaperService.getTestPaperResults(testPaperId);
        setResults(resultsData || []);
        
        setError(null);
      } catch (err) {
        console.error("Error fetching test results:", err);
        setError("Failed to load test results. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated && isAdmin && testPaperId) {
      fetchData();
    }
  }, [testPaperId, isAuthenticated, isAdmin, navigate]);

  // Fetch user data for each result
  useEffect(() => {
    const fetchUserData = async () => {
      // Get unique user IDs from results
      const userIds = [...new Set(results.map(result => result.user_id).filter(id => id))];
      
      // Create a map to store user data
      const userMap = {};
      
      // Fetch user data for each unique user ID
      for (const userId of userIds) {
        try {
          const userData = await userService.getUserById(userId);
          userMap[userId] = userData;
        } catch (err) {
          console.error(`Error fetching user data for ID ${userId}:`, err);
          // If user data fetch fails, just continue with other users
        }
      }
      
      setUserData(userMap);
    };
    
    if (results.length > 0) {
      fetchUserData();
    }
  }, [results]);

  // Calculate statistics
  const calculateStats = () => {
    if (!results || results.length === 0) return { avg: 0, highest: 0, lowest: 0, attempts: 0 };
    
    // Map scores safely, filtering out undefined values
    const scores = results
      .map(r => r.score_percentage !== undefined ? r.score_percentage : 
           (r.score && r.total_score ? (r.score / r.total_score) * 100 : null))
      .filter(score => score !== null && score !== undefined);
    
    if (scores.length === 0) return { avg: 0, highest: 0, lowest: 0, attempts: results.length };
    
    return {
      avg: scores.reduce((a, b) => a + b, 0) / scores.length,
      highest: Math.max(...scores),
      lowest: Math.min(...scores),
      attempts: results.length
    };
  };

  const stats = calculateStats();

  // Helper function to get user display name
  const getUserDisplayName = (result) => {
    if (result.user_id && userData[result.user_id]) {
      const user = userData[result.user_id];
      return user.name || user.full_name || user.email || 'User';
    }
    return result.user_name || result.user_email || 'Unknown User';
  };

  // Helper function to get user email
  const getUserEmail = (result) => {
    if (result.user_id && userData[result.user_id]) {
      return userData[result.user_id].email;
    }
    return result.user_email || '';
  };

  // Handle back button
  const handleBack = () => {
    navigate('/');
  };

  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <div className="bg-white shadow-md rounded-lg p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold text-center mb-4">Authentication Required</h2>
          <p className="text-gray-600 text-center mb-6">Please login to view this page.</p>
          <div className="flex justify-center">
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect in useEffect
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-600">Loading results...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-medium mb-2">Error</h3>
          <p>{error}</p>
        </div>
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
        >
          Back to Test Papers
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
        >
          Back to Test Papers
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Results for: {testPaper?.name || 'Test Paper'}
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500">Total Attempts</p>
            <p className="text-2xl font-bold text-blue-600">{stats.attempts}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500">Average Score</p>
            <p className="text-2xl font-bold text-green-600">{stats.avg.toFixed(1)}%</p>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500">Highest Score</p>
            <p className="text-2xl font-bold text-indigo-600">{stats.highest.toFixed(1)}%</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500">Lowest Score</p>
            <p className="text-2xl font-bold text-purple-600">{stats.lowest.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800">User Results</h2>
        </div>
        
        {results.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No one has attempted this test paper yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  {/* <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Questions Correct
                  </th> */}
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted At
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    View Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.map((result) => {
                  // Format date
                  const date = new Date(result.created_at);
                  const formattedDate = date.toLocaleString();
                  
                  return (
                    <tr key={result.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {getUserDisplayName(result)}
                        </div>
                        <div className="text-sm text-gray-500">{getUserEmail(result)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          {result.final_score}
                        </div>
                      </td>
                      {/* <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {result.correct_answers || result.score || 0} / {result.total_questions || result.total_score || 0}
                        </div>
                      </td> */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formattedDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          to={`/results/${result.id}`}
                          className="text-indigo-600 hover:text-indigo-900 px-3 py-2 rounded-md hover:bg-indigo-50"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestResults; 