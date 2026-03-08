import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import { DashboardPage } from './DashboardPage';

export function App() {
  const [token, setToken] = useState<string | null>(null);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage onLogin={setToken} />} />
      <Route
        path="/"
        element={token ? <DashboardPage token={token} /> : <Navigate to="/login" replace />}
      />
    </Routes>
  );
}
