import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Components
import Home from './components/Home';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import TestPaperBlocks from './components/TestPaperBlocks';
import TestQuestions from './components/TestQuestions';
import MyResults from './components/MyResults';
import ResultDetail from './components/ResultDetail';
import DebugResults from './components/DebugResults';
import ManageQuestions from './components/ManageQuestions';
import TestResults from './components/TestResults';
import NavBar from './components/NavBar';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-100">
          <NavBar />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected Routes */}
              <Route 
                path="/test-papers" 
                element={
                  <ProtectedRoute>
                    <TestPaperBlocks />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/test-papers/:testPaperId" 
                element={
                  <ProtectedRoute>
                    <TestQuestions />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/my-results" 
                element={
                  <ProtectedRoute>
                    <MyResults />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/results/:resultId" 
                element={
                  <ProtectedRoute>
                    <ResultDetail />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/debug-results" 
                element={
                  <ProtectedRoute>
                    <DebugResults />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/manage-questions/:testPaperId" 
                element={
                  <ProtectedRoute>
                    <ManageQuestions />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/test-results/:testPaperId" 
                element={
                  <ProtectedRoute>
                    <TestResults />
                  </ProtectedRoute>
                } 
              />
              
              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App; 