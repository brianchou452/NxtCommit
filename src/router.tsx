import { AssurancePage } from './pages/AssurancePage.js';
import { useEffect, useRef } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { GuidedDemo } from './components/GuidedDemo.js';
import { HomePage, MarketplacePage, ProfilePage, DemoPage, RecoveryPage, RouteErrorBoundary } from './pages/HomePages.js';
import { ApplicationShell } from './components/ApplicationShell.js';
import { MissionDetailPage } from './pages/MissionDetailPage.js';
import { ExecutionRoomPage } from './pages/ExecutionRoomPage.js';
import { GithubWorkspacePage } from './pages/GithubWorkspace.js';
import { NewMission } from './pages/NewMission.js';
import { Review } from './pages/Review.js';
import { DesignConcepts } from './pages/DesignConcepts.js';

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
/** A owns the integrated route registry for the three vertical slices. */
export function AppRouter() {
  return <BrowserRouter><RouteFocus /><Routes><Route path="/concepts/:concept/*" element={<DesignConcepts />} /><Route path="*" element={<ApplicationShell><RouteErrorBoundary><Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/marketplace" element={<MarketplacePage />} />
    <Route path="/assurance" element={<AssurancePage />} />

    <Route path="/github" element={<GithubWorkspacePage />} />
    <Route path="/new" element={<NewMission />} />
    <Route path="/missions/:id" element={<MissionDetailPage />} />
    <Route path="/missions/:id/run" element={<ExecutionRoomPage />} />
    <Route path="/missions/:id/review" element={<Review />} />
    <Route path="/contributors/:id" element={<ProfilePage />} />
    <Route path="/demo" element={<DemoPage />} />
    <Route path="*" element={<RecoveryPage />} />
  </Routes></RouteErrorBoundary><GuidedDemo /></ApplicationShell>} /></Routes></BrowserRouter>;
}
