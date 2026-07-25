import { Routes, Route } from 'react-router';
import ErrorBoundary from '@/components/ErrorBoundary';
import Home from './pages/Home'
import Survey from './pages/Survey'
import Recommendations from './pages/Recommendations'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/survey" element={<Survey />} />
        <Route path="/recommendations" element={<Recommendations />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  )
}
