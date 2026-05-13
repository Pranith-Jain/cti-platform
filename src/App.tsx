import { useEffect, useRef, useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useTheme } from './hooks';
import { AppShell } from './components/AppShell';

const Home = lazy(() => import('./pages/threatintel/Home'));
const Writeups = lazy(() => import('./pages/threatintel/Writeups'));
const CveList = lazy(() => import('./pages/threatintel/CveList'));
const RansomwareActivityPage = lazy(() => import('./pages/threatintel/RansomwareActivity'));
const CybersecTelegramPage = lazy(() => import('./pages/threatintel/CybersecTelegram'));
const BreachDisclosuresPage = lazy(() => import('./pages/threatintel/BreachDisclosures'));
const RedditFirehosePage = lazy(() => import('./pages/threatintel/RedditFirehose'));
const XFirehosePage = lazy(() => import('./pages/threatintel/XFirehose'));
const FeedStatusPage = lazy(() => import('./pages/threatintel/FeedStatus'));
const MetricsPage = lazy(() => import('./pages/threatintel/Metrics'));
const IocCorrelationPage = lazy(() => import('./pages/threatintel/IocCorrelation'));
const ActorTimelinePage = lazy(() => import('./pages/threatintel/ActorTimeline'));
const VictimReleaksPage = lazy(() => import('./pages/threatintel/VictimReleaks'));
const LiveIocsPage = lazy(() => import('./pages/threatintel/LiveIocs'));
const CyberCrimePage = lazy(() => import('./pages/threatintel/CyberCrime'));
const ThreatPulsePage = lazy(() => import('./pages/threatintel/ThreatPulse'));

function SectionLoader() {
  return (
    <div className="min-h-[200px] flex items-center justify-center" aria-hidden="true">
      <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
    </div>
  );
}

export function AppContent() {
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const prevPath = useRef(location.pathname);
  const [fadeKey, setFadeKey] = useState(0);

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.substring(1);
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location]);

  useEffect(() => {
    if (prevPath.current !== location.pathname) {
      prevPath.current = location.pathname;
      setFadeKey((k) => k + 1);
    }
  }, [location.pathname]);

  const routes = (
    <Routes>
      <Route
        path="/threatintel"
        element={
          <Suspense fallback={<SectionLoader />}>
            <Home />
          </Suspense>
        }
      />
      <Route
        path="/threatintel/writeups"
        element={
          <Suspense fallback={<SectionLoader />}>
            <Writeups />
          </Suspense>
        }
      />
      <Route
        path="/threatintel/cve-list"
        element={
          <Suspense fallback={<SectionLoader />}>
            <CveList />
          </Suspense>
        }
      />
      <Route
        path="/threatintel/ransomware-activity"
        element={
          <Suspense fallback={<SectionLoader />}>
            <RansomwareActivityPage />
          </Suspense>
        }
      />
      <Route
        path="/threatintel/cybersec"
        element={
          <Suspense fallback={<SectionLoader />}>
            <CybersecTelegramPage />
          </Suspense>
        }
      />
      <Route
        path="/threatintel/breach"
        element={
          <Suspense fallback={<SectionLoader />}>
            <BreachDisclosuresPage />
          </Suspense>
        }
      />
      <Route
        path="/threatintel/reddit"
        element={
          <Suspense fallback={<SectionLoader />}>
            <RedditFirehosePage />
          </Suspense>
        }
      />
      <Route
        path="/threatintel/x"
        element={
          <Suspense fallback={<SectionLoader />}>
            <XFirehosePage />
          </Suspense>
        }
      />
      <Route
        path="/threatintel/status"
        element={
          <Suspense fallback={<SectionLoader />}>
            <FeedStatusPage />
          </Suspense>
        }
      />
      <Route
        path="/threatintel/metrics"
        element={
          <Suspense fallback={<SectionLoader />}>
            <MetricsPage />
          </Suspense>
        }
      />
      <Route
        path="/threatintel/correlation"
        element={
          <Suspense fallback={<SectionLoader />}>
            <IocCorrelationPage />
          </Suspense>
        }
      />
      <Route
        path="/threatintel/actor-timeline"
        element={
          <Suspense fallback={<SectionLoader />}>
            <ActorTimelinePage />
          </Suspense>
        }
      />
      <Route
        path="/threatintel/re-leaks"
        element={
          <Suspense fallback={<SectionLoader />}>
            <VictimReleaksPage />
          </Suspense>
        }
      />
      <Route
        path="/threatintel/live-iocs"
        element={
          <Suspense fallback={<SectionLoader />}>
            <LiveIocsPage />
          </Suspense>
        }
      />
      <Route
        path="/threatintel/cyber-crime"
        element={
          <Suspense fallback={<SectionLoader />}>
            <CyberCrimePage />
          </Suspense>
        }
      />
      <Route
        path="/threatintel/pulse"
        element={
          <Suspense fallback={<SectionLoader />}>
            <ThreatPulsePage />
          </Suspense>
        }
      />
      <Route path="/threatintel/urls" element={<Navigate to="/threatintel/live-iocs" replace />} />
      <Route path="/threatintel/domains" element={<Navigate to="/threatintel/live-iocs" replace />} />
      <Route path="/threatintel/hashs" element={<Navigate to="/threatintel/live-iocs" replace />} />
      <Route path="/threatintel/malicious-urls" element={<Navigate to="/threatintel/live-iocs" replace />} />
      <Route path="/threatintel/iocs-by-type" element={<Navigate to="/threatintel/live-iocs" replace />} />
      <Route path="/threatintel/phishing-urls" element={<Navigate to="/threatintel/live-iocs" replace />} />
      <Route path="/threatintel/malware-samples" element={<Navigate to="/threatintel/live-iocs" replace />} />
      <Route path="/threatintel/ransom-library" element={<Navigate to="/threatintel" replace />} />
      <Route path="*" element={<Navigate to="/threatintel" replace />} />
    </Routes>
  );

  return (
    <>
      <AppShell isDark={isDark} onToggleTheme={toggleTheme}>
        <div key={fadeKey} className="animate-fade-in">
          {routes}
        </div>
      </AppShell>
      <div id="aria-live-region" aria-live="polite" aria-atomic="true" className="sr-only" />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
