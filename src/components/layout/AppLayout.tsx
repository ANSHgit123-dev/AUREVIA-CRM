import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';

export const AppLayout: React.FC = () => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-app-bg font-sans text-[#1C2024]">
      {/* Deep Charcoal Enterprise Sidebar */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top Header */}
        <TopHeader />

        {/* Content Canvas */}
        <main className="flex-1 overflow-y-auto px-6 py-5 lg:px-8">
          <div className="max-w-7xl mx-auto space-y-5">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

