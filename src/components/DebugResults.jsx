import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DebugResults = () => {
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState(null);

  const fetchResults = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      // Make direct axios call to ensure we're getting the most current data
      const response = await axios.get('https://openmindsbackend.onrender.com/api/results/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Debug API response:', response);
      setResults(response.data);
      setLastFetched(new Date().toLocaleTimeString());
      setError(null);
    } catch (err) {
      console.error('Debug API error:', err);
      setError(`Error: ${err.message}`);
      if (err.response) {
        console.log('Response data:', err.response.data);
        console.log('Response status:', err.response.status);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">API Debug: Results</h1>
        <div className="space-x-2">
          <button 
            onClick={fetchResults}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh
          </button>
        </div>
      </div>
      
      {lastFetched && (
        <p className="text-sm text-gray-500 mb-2">Last fetched: {lastFetched}</p>
      )}
      
      {loading && <p>Loading...</p>}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Auth Token</h2>
        <div className="bg-gray-100 p-2 rounded overflow-auto">
          <pre className="text-xs">{localStorage.getItem('token') || 'No token'}</pre>
        </div>
      </div>
      
      <div>
        <h2 className="text-lg font-semibold mb-2">Results Data</h2>
        <div className="bg-gray-100 p-2 rounded overflow-auto max-h-96">
          <pre className="text-xs">{JSON.stringify(results, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
};

export default DebugResults; 