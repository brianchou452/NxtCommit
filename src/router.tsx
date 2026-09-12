import { useEffect, useRef } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { FoundationPage } from './pages/FoundationPage.js';
import { ApplicationShell } from './components/ApplicationShell.js';
import { NewMission } from './pages/NewMission.js';
import { Review } from './pages/Review.js';
import { DesignConcepts } from './pages/DesignConcepts.js';
import { AuthoredMission } from './pages/AuthoredMission.js';

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
  return <BrowserRouter><RouteFocus /><Routes><Route path="/concepts/:concept/*" element={<DesignConcepts />} /><Route path="*" element={<ApplicationShell><Routes>
    <Route path="/" element={<FoundationPage />} />
    <Route path="/marketplace" element={<FoundationPage />} />
    <Route path="/new" element={<NewMission />} />
    <Route path="/missions/:id" element={<AuthoredMission />} />
    <Route path="/missions/:id/run" element={<FoundationPage />} />
    <Route path="/missions/:id/review" element={<Review />} />
    <Route path="/contributors/:id" element={<FoundationPage />} />
    <Route path="/demo" element={<FoundationPage />} />
    <Route path="*" element={<FoundationPage missing />} />
  </Routes></ApplicationShell>} /></Routes></BrowserRouter>;
}
