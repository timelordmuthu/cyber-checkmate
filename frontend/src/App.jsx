import React, { Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ROUTES } from '@/routes.js'
import { getRole } from '@/lib/session.js'

import ErrorBoundary from '@/components/ErrorBoundary.jsx'
import RequireRole from '@/components/RequireRole.jsx'
import RequireAdmin from '@/components/RequireAdmin.jsx'
import RequireResult from '@/components/RequireResult.jsx'
import Layout from '@/components/Layout.jsx'

import { AnalysisProvider } from '@/context/AnalysisContext.jsx'
import { LanguageProvider } from '@/context/LanguageContext.jsx'
import { ServerProvider } from '@/context/ServerContext.jsx'
import { PrivateModeProvider } from '@/context/PrivateModeContext.jsx'
import { ToastProvider } from '@/context/ToastContext.jsx'

// Eagerly loaded pages (FE PRD §3)
import LoginPage from '@/pages/LoginPage.jsx'
import DashboardPage from '@/pages/DashboardPage.jsx'
import CheckPage from '@/pages/CheckPage.jsx'
import ResultPage from '@/pages/ResultPage.jsx'
import ShareLandingPage from '@/pages/ShareLandingPage.jsx'

// Lazy-loaded pages (FE PRD §3)
const GoldenHourPage = React.lazy(() => import('@/pages/GoldenHourPage.jsx'))
const HistoryPage = React.lazy(() => import('@/pages/HistoryPage.jsx'))
const RadarPage = React.lazy(() => import('@/pages/RadarPage.jsx'))
const SettingsPage = React.lazy(() => import('@/pages/SettingsPage.jsx'))
const NotFoundPage = React.lazy(() => import('@/pages/NotFoundPage.jsx'))
const ConsoleLayout = React.lazy(() => import('@/pages/console/ConsoleLayout.jsx'))
const ReportsPage = React.lazy(() => import('@/pages/console/ReportsPage.jsx'))
const RulesPage = React.lazy(() => import('@/pages/console/RulesPage.jsx'))
const ModelsPage = React.lazy(() => import('@/pages/console/ModelsPage.jsx'))
const RetrainPage = React.lazy(() => import('@/pages/console/RetrainPage.jsx'))

function RootRedirect() {
  const role = getRole()
  return <Navigate to={role ? ROUTES.dashboard : ROUTES.login} replace />
}

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <ServerProvider>
          <PrivateModeProvider>
            <ToastProvider>
              <AnalysisProvider>
                <Suspense fallback={<div className="p-6 text-cc-glow font-mono">Loading…</div>}>
                  <Routes>
              {/* Root redirect */}
              <Route path={ROUTES.root} element={<RootRedirect />} />

              {/* Pages without Layout */}
              <Route path={ROUTES.login} element={<LoginPage />} />
              <Route path={ROUTES.share} element={<ShareLandingPage />} />

              {/* Protected App Shell */}
              <Route element={<RequireRole><Layout /></RequireRole>}>
                <Route path={ROUTES.dashboard} element={<DashboardPage />} />
                <Route path={ROUTES.check} element={<CheckPage />} />
                <Route
                  path={ROUTES.result}
                  element={
                    <RequireResult>
                      <ResultPage />
                    </RequireResult>
                  }
                />
                <Route
                  path={ROUTES.goldenHour}
                  element={
                    <RequireResult>
                      <GoldenHourPage />
                    </RequireResult>
                  }
                />
                <Route path={ROUTES.history} element={<HistoryPage />} />
                <Route path={ROUTES.radar} element={<RadarPage />} />
                <Route path={ROUTES.settings} element={<SettingsPage />} />

                {/* Console routes */}
                <Route
                  path={ROUTES.console}
                  element={
                    <RequireAdmin>
                      <ConsoleLayout />
                    </RequireAdmin>
                  }
                >
                  <Route index element={<Navigate to={ROUTES.consoleReports} replace />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="rules" element={<RulesPage />} />
                  <Route path="models" element={<ModelsPage />} />
                  <Route path="retrain" element={<RetrainPage />} />
                </Route>
              </Route>

                  {/* 404 Catch-All without Layout */}
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </AnalysisProvider>
          </ToastProvider>
        </PrivateModeProvider>
      </ServerProvider>
    </LanguageProvider>
  </ErrorBoundary>
  )
}
