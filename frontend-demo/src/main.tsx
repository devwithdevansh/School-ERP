import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppProvider } from './store';
import { PlanProvider } from './context/PlanContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <AppProvider>
      <PlanProvider>
        <App />
      </PlanProvider>
    </AppProvider>
  </React.StrictMode>
);
