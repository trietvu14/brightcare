import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import DocumentsPage from "@/pages/admin/documents";
import PromptsPage from "@/pages/admin/prompts";
import MonitoringPage from "@/pages/admin/monitoring";
import AdminLogin from "@/pages/admin/login";
import logoImg from "@assets/BrightCare-Daycare-logo_1771012586178.png";

function AdminGuard({
  isAdmin,
  onLogin,
  children,
}: {
  isAdmin: boolean;
  onLogin: () => void;
  children: React.ReactNode;
}) {
  if (!isAdmin) {
    return <AdminLogin onLogin={onLogin} />;
  }
  return <>{children}</>;
}

function Router({
  isAdmin,
  onLogin,
}: {
  isAdmin: boolean;
  onLogin: () => void;
}) {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/admin/login">
        {isAdmin ? <HomePage /> : <AdminLogin onLogin={onLogin} />}
      </Route>
      <Route path="/admin/documents">
        <AdminGuard isAdmin={isAdmin} onLogin={onLogin}>
          <DocumentsPage />
        </AdminGuard>
      </Route>
      <Route path="/admin/prompts">
        <AdminGuard isAdmin={isAdmin} onLogin={onLogin}>
          <PromptsPage />
        </AdminGuard>
      </Route>
      <Route path="/admin/monitoring">
        <AdminGuard isAdmin={isAdmin} onLogin={onLogin}>
          <MonitoringPage />
        </AdminGuard>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkedSession, setCheckedSession] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    fetch("/api/admin/session")
      .then((r) => r.json())
      .then((data) => {
        setIsAdmin(data.isAdmin);
        setCheckedSession(true);
      })
      .catch(() => setCheckedSession(true));
  }, []);

  const handleLogin = () => {
    setIsAdmin(true);
    setLocation("/admin/documents");
  };
  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setIsAdmin(false);
  };

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  if (!checkedSession) return null;

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar isAdmin={isAdmin} onLogout={handleLogout} />
              <div className="flex flex-col flex-1 min-w-0">
                <header className="flex items-center justify-between gap-2 px-3 py-2 border-b sticky top-0 z-50 bg-background">
                  <div className="flex items-center gap-2">
                    <SidebarTrigger data-testid="button-sidebar-toggle" />
                    <img
                      src={logoImg}
                      alt="BrightCare"
                      className="h-8 w-8 object-contain"
                    />
                    <span className="font-bold text-sm hidden sm:inline">
                      BrightCare Daycare
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLocation("/admin/login")}
                        data-testid="button-header-login"
                      >
                        <LogIn className="h-4 w-4 mr-2" />
                        Login
                      </Button>
                    )}
                    <ThemeToggle />
                  </div>
                </header>
                <main className="flex-1 overflow-auto">
                  <Router isAdmin={isAdmin} onLogin={handleLogin} />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
