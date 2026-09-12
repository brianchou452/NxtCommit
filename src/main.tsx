import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CommoncommitRouter } from './commoncommit/Router.js';
const root=document.getElementById('root');
if(!root) throw new Error('Application root is missing');
createRoot(root).render(<StrictMode><CommoncommitRouter/></StrictMode>);
