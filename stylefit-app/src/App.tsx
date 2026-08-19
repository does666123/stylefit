import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router';
import ErrorBoundary from '@/components/ErrorBoundary';
import Header from '@/components/Header';
import LoadingScreen from '@/components/LoadingScreen';
import SiteFooter from '@/components/SiteFooter';

// Lazy load pages for code splitting / faster initial load
const Home = lazy(() => import('./pages/Home'));
const Survey = lazy(() => import('./pages/Survey'));
const Recommendations = lazy(() => import('./pages/Recommendations'));
const Discover = lazy(() => import('./pages/Discover'));
const Favorites = lazy(() => import('./pages/Favorites'));
const Privacy = lazy(() => import('./pages/Legal').then(({ PrivacyPage }) => ({ default: PrivacyPage })));
const Terms = lazy(() => import('./pages/Legal').then(({ TermsPage }) => ({ default: TermsPage })));
const NotFound = lazy(() => import('./pages/NotFound'));

export default function App() {
  const location = useLocation();
  return (
    <ErrorBoundary>
      <div className="app-shell">
        {location.pathname === '/' && <Header />}
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/survey" element={<Survey />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <SiteFooter />
      </div>
    </ErrorBoundary>
  )
}
