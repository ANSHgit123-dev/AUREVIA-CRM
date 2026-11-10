import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ProjectInventoryProvider } from './context/ProjectInventoryContext';
import { LeadProvider } from './context/LeadContext';
import { SalesOperationsProvider } from './context/SalesOperationsContext';
import { AppRoutes } from './routes/AppRoutes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ProjectInventoryProvider>
            <LeadProvider>
              <SalesOperationsProvider>
                <AppRoutes />
              </SalesOperationsProvider>
            </LeadProvider>
          </ProjectInventoryProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
