import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ErrorToast } from './components/ui/ErrorToast';
import { LanguageProvider } from './context/LanguageContext';
import { RoleProvider } from './context/RoleContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <RoleProvider>
          <App />
          <ErrorToast />
        </RoleProvider>
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>,
);
