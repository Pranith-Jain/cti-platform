import { useEffect, useRef, useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useTheme } from './hooks';
import { AppShell } from './components/AppShell';
import { ErrorBoundary } from './components/ErrorBoundary';

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
const BriefingsPage = lazy(() => import('./pages/threatintel/Briefings'));
const BriefingDetailPage = lazy(() => import('./pages/threatintel/BriefingDetail'));
const ActorsPage = lazy(() => import('./pages/threatintel/Actors'));
const ActorDetailPage = lazy(() => import('./pages/threatintel/ActorDetail'));
const WikiPage = lazy(() => import('./pages/threatintel/Wiki'));
const WikiArticlePage = lazy(() => import('./pages/threatintel/WikiArticle'));
const ThreatMapPage = lazy(() => import('./pages/threatintel/ThreatMap'));
const RulesPage = lazy(() => import('./pages/threatintel/Rules'));
const DarkWebPage = lazy(() => import('./pages/threatintel/DarkWeb'));
const AtlasMatrixPage = lazy(() => import('./pages/threatintel/AtlasMatrix'));
const MitreMatrixPage = lazy(() => import('./pages/threatintel/MitreMatrix'));
const OnionWatchPage = lazy(() => import('./pages/threatintel/OnionWatch'));
const ScamWatchPage = lazy(() => import('./pages/threatintel/ScamWatch'));
const TechAiNewsPage = lazy(() => import('./pages/threatintel/TechAiNews'));
const TelegramWatchPage = lazy(() => import('./pages/threatintel/TelegramWatch'));
const ThreatFeedsPage = lazy(() => import('./pages/threatintel/ThreatFeeds'));
const CryptoScamFeedPage = lazy(() => import('./pages/threatintel/CryptoScamFeed'));
const ActorUsernamesPage = lazy(() => import('./pages/threatintel/ActorUsernames'));
const PhishingWordlistsPage = lazy(() => import('./pages/threatintel/PhishingWordlists'));
const ProjectDiscoveryPage = lazy(() => import('./pages/threatintel/ProjectDiscovery'));
const RansomPaymentsPage = lazy(() => import('./pages/threatintel/RansomPayments'));

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
          <ErrorBoundary>
            <Suspense fallback={<SectionLoader />}>
              <Home />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/threatintel/writeups"
        element={
          <ErrorBoundary>
            <Suspense fallback={<SectionLoader />}>
              <Writeups />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/threatintel/cve-list"
        element={
          <ErrorBoundary>
            <Suspense fallback={<SectionLoader />}>
              <CveList />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/threatintel/ransomware-activity"
        element={
          <ErrorBoundary>
            <Suspense fallback={<SectionLoader />}>
              <RansomwareActivityPage />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/threatintel/cybersec"
        element={
          <ErrorBoundary>
            <Suspense fallback={<SectionLoader />}>
              <CybersecTelegramPage />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/threatintel/breach"
        element={
          <ErrorBoundary>
            <Suspense fallback={<SectionLoader />}>
              <BreachDisclosuresPage />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/threatintel/reddit"
        element={
          <ErrorBoundary>
            <Suspense fallback={<SectionLoader />}>
              <RedditFirehosePage />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/threatintel/x"
        element={
          <ErrorBoundary>
            <Suspense fallback={<SectionLoader />}>
              <XFirehosePage />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/threatintel/status"
        element={
          <ErrorBoundary>
            <Suspense fallback={<SectionLoader />}>
              <FeedStatusPage />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/threatintel/metrics"
        element={
          <ErrorBoundary>
            <Suspense fallback={<SectionLoader />}>
              <MetricsPage />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/threatintel/correlation"
        element={
          <ErrorBoundary>
            <Suspense fallback={<SectionLoader />}>
              <IocCorrelationPage />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/threatintel/actor-timeline"
        element={
          <ErrorBoundary>
            <Suspense fallback={<SectionLoader />}>
              <ActorTimelinePage />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/threatintel/re-leaks"
        element={
          <ErrorBoundary>
            <Suspense fallback={<SectionLoader />}>
              <VictimReleaksPage />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/threatintel/live-iocs"
        element={
          <ErrorBoundary>
            <Suspense fallback={<SectionLoader />}>
              <LiveIocsPage />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/threatintel/cyber-crime"
        element={
          <ErrorBoundary>
            <Suspense fallback={<SectionLoader />}>
              <CyberCrimePage />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/threatintel/pulse"
        element={
          <ErrorBoundary>
            <Suspense fallback={<SectionLoader />}>
              <ThreatPulsePage />
            </Suspense>
          </ErrorBoundary>
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
      <Route
        path="/threatintel/briefings"
        element={
          <ErrorBoundary>
            <Suspense fallback={<SectionLoader />}>
              <BriefingsPage />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/threatintel/briefings/:slug"
        element={
          <ErrorBoundary>
            <Suspense fallback={<SectionLoader />}>
              <BriefingDetailPage />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/threatintel/actors"
        element={
          <ErrorBoundary>
            <Suspense fallback={<SectionLoader />}>
              <ActorsPage />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/threatintel/actors/:slug"
        element={
          <ErrorBoundary>
            <Suspense fallback={<SectionLoader />}>
              <ActorDetailPage />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/threatintel/wiki"
        element={
          <ErrorBoundary>
            <Suspense fallback={<SectionLoader />}>
              <WikiPage />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/threatintel/wiki/:slug"
        element={
          <ErrorBoundary>
            <Suspense fallback={<SectionLoader />}>
              <WikiArticlePage />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/threatintel/threat-map"
        element={
          <ErrorBoundary>
            <Suspense fallback={<SectionLoader />}>
              <ThreatMapPage />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/threatintel/rules"
        element={
          <ErrorBoundary>
            <Suspense fallback={<SectionLoader />}>
              <RulesPage />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/threatintel/mitre"
        element={
          <ErrorBoundary>
            <Suspense fallback={<SectionLoader />}>
              <MitreMatrixPage />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/threatintel/atlas"
        element={
          <ErrorBoundary>
            <Suspense fallback={<SectionLoader />}>
              <AtlasMatrixPage />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/threatintel/darkweb"
        element={
          <ErrorBoundary>
            <Suspense fallback={<SectionLoader />}>
              <DarkWebPage />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/threatintel/onion-watch"
        element={
          <ErrorBoundary>
            <Suspense fallback={<SectionLoader />}>
              <OnionWatchPage />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/threatintel/scam-watch"
        element={
          <ErrorBoundary>
            <Suspense fallback={<SectionLoader />}>
              <ScamWatchPage />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/threatintel/tech-ai-news"
        element={
          <ErrorBoundary>
            <Suspense fallback={<SectionLoader />}>
              <TechAiNewsPage />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/threatintel/telegram-watch"
        element={
          <ErrorBoundary>
            <Suspense fallback={<SectionLoader />}>
              <TelegramWatchPage />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/threatintel/threat-feeds"
        element={
          <ErrorBoundary>
            <Suspense fallback={<SectionLoader />}>
              <ThreatFeedsPage />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/threatintel/crypto-scams"
        element={
          <ErrorBoundary>
            <Suspense fallback={<SectionLoader />}>
              <CryptoScamFeedPage />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/threatintel/actor-usernames"
        element={
          <ErrorBoundary>
            <Suspense fallback={<SectionLoader />}>
              <ActorUsernamesPage />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/threatintel/phishing-wordlists"
        element={
          <ErrorBoundary>
            <Suspense fallback={<SectionLoader />}>
              <PhishingWordlistsPage />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/threatintel/projectdiscovery"
        element={
          <ErrorBoundary>
            <Suspense fallback={<SectionLoader />}>
              <ProjectDiscoveryPage />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/threatintel/ransom-payments"
        element={
          <ErrorBoundary>
            <Suspense fallback={<SectionLoader />}>
              <RansomPaymentsPage />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route path="*" element={<Navigate to="/threatintel" replace />} />
    </Routes>
  );

  return (
    <>
      <AppShell mode="threatintel" isDark={isDark} onToggleTheme={toggleTheme}>
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
