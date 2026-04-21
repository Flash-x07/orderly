import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.9rem',
              background: '#1C1917',
              color: '#FDF8F4',
              borderRadius: '12px',
              padding: '12px 18px',
            },
            success: { iconTheme: { primary: '#22C55E', secondary: '#FDF8F4' } },
            error:   { iconTheme: { primary: '#EF4444', secondary: '#FDF8F4' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
