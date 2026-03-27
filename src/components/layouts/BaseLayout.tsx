import React from 'react';
import { Outlet } from 'react-router-dom';

export default function BaseLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white font-sans selection:bg-white/20">
      <main className="relative z-10 min-h-screen p-8 md:p-12 lg:p-16">
        <Outlet />
      </main>
    </div>
  );
}
