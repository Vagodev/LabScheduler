import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { trpc } from "./lib/trpc";
import { Loader2, FlaskConical } from "lucide-react";
import Login from "./pages/Login";

// Pages
import Dashboard from "./pages/Dashboard";
import CalendarPage from "./pages/CalendarPage";
import MyBookings from "./pages/MyBookings";
import EquipmentList from "./pages/EquipmentList";
import SupervisorApprovals from "./pages/supervisor/Approvals";
import SupervisorOverview from "./pages/supervisor/Overview";
import AdminUsers from "./pages/admin/Users";
import AdminEquipment from "./pages/admin/Equipment";
import AdminAccess from "./pages/admin/Access";
import AdminReports from "./pages/admin/Reports";
import AdminSettings from "./pages/admin/Settings";
import AppLayout from "./components/AppLayout";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = trpc.auth.me.useQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <FlaskConical className="w-6 h-6 text-primary" />
          </div>
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/my-bookings" component={MyBookings} />
      <Route path="/equipment" component={EquipmentList} />
      <Route path="/supervisor/approvals" component={SupervisorApprovals} />
      <Route path="/supervisor/overview" component={SupervisorOverview} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/equipment" component={AdminEquipment} />
      <Route path="/admin/access" component={AdminAccess} />
      <Route path="/admin/reports" component={AdminReports} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <AuthGuard>
            <AppLayout>
              <Router />
            </AppLayout>
          </AuthGuard>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
