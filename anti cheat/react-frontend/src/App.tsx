import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import ExamPage from './pages/ExamPage';
import HomePage from './pages/HomePage';

/**
 * HashRouter so /#/exam?token= works without extra Vite history fallback.
 * Production: you can switch to BrowserRouter + server rewrite rules.
 */
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/exam/:testId" element={<ExamPage />} />
        <Route path="/exam" element={<ExamPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
