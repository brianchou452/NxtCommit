import { useEffect, useRef } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { FoundationPage } from './pages/FoundationPage.js';
import { ApplicationShell } from './components/ApplicationShell.js';

function RouteFocus() {
  const { pathname } = useLocation();
  const previousPath = useRef(pathname);
  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    window.scrollTo(0, 0);
    document.getElementById('main-content')?.focus();
  }, [pathname]);
  return null;
}
/** A owns this registry. Phase 2 owners replace their placeholders. */
export function AppRouter() {
  return <BrowserRouter><ApplicationShell><RouteFocus /><Routes>
    <Route path="/" element={<FoundationPage />} />
    <Route path="/marketplace" element={<FoundationPage />} />
    <Route path="/new" element={<FoundationPage />} />
    <Route path="/missions/:id" element={<FoundationPage />} />
    <Route path="/missions/:id/run" element={<FoundationPage />} />
    <Route path="/missions/:id/review" element={<FoundationPage />} />
    <Route path="/contributors/:id" element={<FoundationPage />} />
    <Route path="/demo" element={<FoundationPage />} />
    <Route path="/concepts/:concept/*" element={<FoundationPage />} />
    <Route path="*" element={<FoundationPage missing />} />
  </Routes></ApplicationShell></BrowserRouter>;
}
