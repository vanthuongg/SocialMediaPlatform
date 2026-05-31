// [auto] React app root entry point
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App.jsx';
import './styles/index.css';
import { seedMockData } from './shared/api/seedData.js';

async function init() {
  await seedMockData();
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

init();
