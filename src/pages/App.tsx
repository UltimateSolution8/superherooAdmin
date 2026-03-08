import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import { DashboardPage } from './DashboardPage';

export function App() {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('adminToken')
  );

  const handleLogin = (nextToken: string) => {
    localStorage.setItem('adminToken', nextToken);
    setToken(nextToken);
  };

  return (
    <Routes>
      <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
      <Route
        path="/"
        element={token ? <DashboardPage token={token} /> : <Navigate to="/login" replace />}
      />
    </Routes>
  );
}
