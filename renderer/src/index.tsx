import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';




// Mount React App
const container = document.getElementById('root')!;
createRoot(container).render(<App />);
