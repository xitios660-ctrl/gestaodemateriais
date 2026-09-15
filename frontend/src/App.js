import "@/App.css";
import { lazy, Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { Toaster } from "sonner";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import ConnectionStatus from "@/components/ConnectionStatus";
import {
  ExperienceProvider,
  PageLoading,
  RoutePosition,
} from "@/components/Experience";
const Portal = lazy(() => import("@/pages/Portal"));
const TicketForm = lazy(() => import("@/pages/TicketForm"));
const Tracker = lazy(() => import("@/pages/Tracker"));
const AdminLogin = lazy(() => import("@/pages/AdminLogin"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));

function AppLoader() {
  return <PageLoading />;
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading || user === null) return <AppLoader />;
  if (!user) return <Navigate to="/admin/login" replace />;
  return children;
}

function Page({ children }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
      transition={{
        duration: reduceMotion ? 0 : 0.24,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <RoutePosition />
      {children}
    </motion.div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <Page>
              <Portal />
            </Page>
          }
        />
        <Route
          path="/abrir/:categoryId"
          element={
            <Page>
              <TicketForm />
            </Page>
          }
        />
        <Route
          path="/acompanhar"
          element={
            <Page>
              <Tracker />
            </Page>
          }
        />
        <Route
          path="/admin/login"
          element={
            <Page>
              <AdminLogin />
            </Page>
          }
        />
        <Route
          path="/admin/forgot"
          element={
            <Page>
              <ForgotPassword />
            </Page>
          }
        />
        <Route
          path="/reset-password"
          element={
            <Page>
              <ResetPassword />
            </Page>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Page>
                <AdminDashboard />
              </Page>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ExperienceProvider>
      <div className="App">
        <BrowserRouter>
          <AuthProvider>
            <Toaster
              position="top-right"
              theme="dark"
              richColors
              closeButton
              toastOptions={{ duration: 3500 }}
            />
            <ConnectionStatus />
            <AppErrorBoundary>
              <Suspense fallback={<AppLoader />}>
                <AnimatedRoutes />
              </Suspense>
            </AppErrorBoundary>
          </AuthProvider>
        </BrowserRouter>
      </div>
    </ExperienceProvider>
  );
}

export default App;
