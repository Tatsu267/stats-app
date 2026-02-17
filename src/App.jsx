import React from 'react';
import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import CloudSyncManager from './components/sync/CloudSyncManager';
import Dashboard from './pages/Dashboard';
import Analysis from './pages/Analysis';
import Statistics from './pages/Statistics';
import Quiz from './pages/Quiz';
import Result from './pages/Result';
import Review from './pages/Review';
import Settings from './pages/Settings';
import Curriculum from './pages/Curriculum';

function App() {
  const Router = window?.desktopApp?.isElectron ? HashRouter : BrowserRouter;

  return (
    <>
      <CloudSyncManager />
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="curriculum" element={<Curriculum />} />
            <Route path="analysis" element={<Analysis />} />
            <Route path="statistics" element={<Statistics />} />
            <Route path="quiz" element={<Quiz />} />
            <Route path="result" element={<Result />} />
            <Route path="review" element={<Review />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Dashboard />} />
          </Route>
        </Routes>
      </Router>
    </>
  );
}

export default App;
