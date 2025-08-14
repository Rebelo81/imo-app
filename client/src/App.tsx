import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "./components/AuthProvider";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Projections from "@/pages/projections";
import CreateProjection from "@/pages/projections/create";
import ReportProjection from "@/pages/projections/report";
import PublicReport from "@/pages/public/PublicReport";
import PlanilhaPrintPage from "@/pages/public/PlanilhaPrint";
import Clients from "@/pages/clients";
import Properties from "@/pages/properties";
import Settings from "@/pages/settings";
import Admin from "@/pages/admin";
import Planilha from "@/pages/planilha";
import Profile from "@/pages/profile";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import PaymentSuccess from "@/pages/auth/success";
import ForgotPassword from "@/pages/auth/forgot-password";
import LandingPage from "@/pages/landing";
import Tutorials from "@/pages/tutorials";

function AppRouter() {
  const [location] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  // Public routes (no authentication required)
  if (location.startsWith('/public/')) {
    return (
      <Switch>
        <Route path="/public/report/:publicId" component={PublicReport} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // Public report routes (no authentication required for PDF generation)
  if (location.startsWith('/public-report/')) {
    return (
      <Switch>
        <Route path="/public-report/planilha/:id" component={PlanilhaPrintPage} />
        <Route path="/public-report/planilha" component={PlanilhaPrintPage} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // Public print routes (no authentication required for PDF generation)
  if (location.startsWith('/public-print/')) {
    return (
      <Switch>
        <Route path="/public-print/planilha/:id" component={PlanilhaPrintPage} />
        <Route path="/public-print/planilha" component={PlanilhaPrintPage} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // Show landing page and auth routes if not authenticated
  if (!isLoading && !isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/auth/login" component={Login} />
        <Route path="/auth/register" component={Register} />
        <Route path="/auth/success" component={PaymentSuccess} />
        <Route path="/auth/forgot-password" component={ForgotPassword} />
        <Route path="*" component={LandingPage} />
      </Switch>
    );
  }

  // Show auth pages even when authenticated (for direct access)
  if (location.startsWith('/auth')) {
    return (
      <Switch>
        <Route path="/auth/login" component={Login} />
        <Route path="/auth/register" component={Register} />
        <Route path="/auth/success" component={PaymentSuccess} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // Internal print routes (no authentication required for PDF generation)
  if (location.startsWith('/print/')) {
    return (
      <Switch>
        <Route path="/print/planilha/:id" component={Planilha} />
        <Route path="/print/planilha" component={Planilha} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // Protected routes
  return (
    <ProtectedRoute>
      <Layout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/projections" component={Projections} />
          <Route path="/projections/create" component={CreateProjection} />
          <Route path="/projections/:id" component={ReportProjection} />
          <Route path="/clients" component={Clients} />
          <Route path="/properties" component={Properties} />
          <Route path="/planilha" component={Planilha} />
          <Route path="/planilha/:id" component={Planilha} />
          <Route path="/tutorials" component={Tutorials} />
          <Route path="/profile" component={Profile} />
          <Route path="/settings" component={Settings} />
          <Route path="/admin" component={Admin} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRouter />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;