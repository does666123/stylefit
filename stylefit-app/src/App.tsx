import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router';
import ErrorBoundary from '@/components/ErrorBoundary';
import LoadingScreen from '@/components/LoadingScreen';
import SiteFooter from '@/components/SiteFooter';

// Lazy load pages for code splitting / faster initial load
const Home = lazy(() => import('./pages/Home'));
const Survey = lazy(() => import('./pages/Survey'));
const Recommendations = lazy(() => import('./pages/Recommendations'));
const Favorites = lazy(() => import('./pages/Favorites'));
const NotFound = lazy(() => import('./pages/NotFound'));

export default function App() {
  return (
    <ErrorBoundary>
      <div className="app-shell">
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/survey" element={<Survey />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <SiteFooter />
      </div>
    </ErrorBoundary>
  )
}
