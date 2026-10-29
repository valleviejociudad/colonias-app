import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/md3.css';
// Registra todos los Web Components oficiales de Material Design 3 (@material/web)
import './md3-components.js';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
