/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import SanctuaryLayout from '@/apps/admin/layouts/SanctuaryLayout';
import Login from '@/apps/admin/pages/auth/Login';
import Register from '@/apps/admin/pages/auth/Register';
import Forbidden from '@/apps/admin/pages/auth/Forbidden';
import AgentList from '@/apps/admin/pages/agents/AgentList';
import AgentDetail from '@/apps/admin/pages/agents/AgentDetail';
import ChatAgentList from '@/apps/user/pages/ChatAgentList';

function ProtectedRoute() {
  const { session, loading } = useAuth();

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading Sanctuary...</div>;
  
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [role, setRole] = useState<'admin' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkRole() {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      setRole(data?.role || 'user');
      setLoading(false);
    }
    checkRole();
  }, [user]);

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>;

  if (role !== 'admin') return <Navigate to="/forbidden" replace />;
  return <>{children}</>;
}

function DashboardRedirect() {
  const { user } = useAuth();
  const [role, setRole] = useState<'admin' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkRole() {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      setRole(data?.role || 'user');
      setLoading(false);
    }
    checkRole();
  }, [user]);

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>;

  if (role === 'admin') return <Navigate to="/dashboard" replace />;
  return <Navigate to="/chat" replace />;
}

import UserApp from '@/apps/user/UserApp';

import Economics from '@/apps/admin/pages/economics/Economics';
import Settings from '@/apps/admin/pages/settings/Settings';
import KnowledgeList from '@/apps/admin/pages/knowledge/KnowledgeList';
import Dashboard from '@/apps/admin/pages/dashboard/Dashboard';
import Ledger from '@/apps/admin/pages/ledger/Ledger';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forbidden" element={<Forbidden />} />

          {/* User App Route (Public/Hybrid) */}
          <Route path="/chat/:agentId" element={<UserApp />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/chat" element={<ChatAgentList />} />
            <Route path="/" element={<DashboardRedirect />} />
            
            <Route element={<AdminRoute><SanctuaryLayout /></AdminRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/agents" element={<AgentList />} />
              <Route path="/agents/:id" element={<AgentDetail />} />
              <Route path="/knowledge" element={<KnowledgeList />} />
              <Route path="/economics" element={<Economics />} />
              <Route path="/ledger" element={<Ledger />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

