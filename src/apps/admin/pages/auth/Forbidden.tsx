import React from 'react';
import { Link } from 'react-router-dom';

export default function Forbidden() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-4">403 - Forbidden</h1>
      <p className="text-gray-400 mb-8">You do not have permission to access this page.</p>
      <Link to="/chat" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
        Return to Chat
      </Link>
    </div>
  );
}
