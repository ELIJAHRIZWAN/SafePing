import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { EmergencyProvider } from './context/EmergencyContext';
import EmergencyErrorBoundary from './components/EmergencyErrorBoundary';

// Synchronous application launch baseline reset
try {
  // Clear guest mode session on app launch so guests always boot fresh to welcome
  localStorage.removeItem('safeping_is_guest');
  localStorage.removeItem('safeping_user');
  localStorage.removeItem('safeping_walk_active');
  
  // Clear all emergency/SOS tracking variables to prevent persistent escalation screens
  localStorage.setItem('safeping_emergency_state', 'idle');
  localStorage.setItem('safeping_emergency_active', 'false');
  localStorage.setItem('safeping_guardian_alert', 'false');
  localStorage.setItem('safeping_is_escalated', 'false');
  localStorage.setItem('safeping_is_user_safe', 'true');
  localStorage.setItem('safeping_is_fully_dispatched', 'false');
  localStorage.removeItem('safeping_session_start_time');
  localStorage.setItem('safeping_escalation_count', '0');
  localStorage.setItem('safeping_deviation_count', '0');
  localStorage.removeItem('safeping_current_incident_logs');
} catch (e) {
  console.warn("[SafePing Initialization] Storage boot-clear failed:", e);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EmergencyErrorBoundary>
      <EmergencyProvider>
        <App />
      </EmergencyProvider>
    </EmergencyErrorBoundary>
  </StrictMode>
);