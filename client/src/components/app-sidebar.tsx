import { Home, FileText, Terminal, BarChart3, LogOut, GraduationCap, Shield, Users, Heart } from "lucide-react";
import { useLocation, Link } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import logoImg from "@assets/BrightCare-Daycare-logo_1771012586178.png";

const publicItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Our Programs", url: "/#programs", icon: GraduationCap },
  { title: "Safety & Care", url: "/#safety", icon: Shield },
  { title: "Community", url: "/#community", icon: Heart },
  { title: "About Us", url: "/#about", icon: Users },
];

const operatorItems = [
  { title: "Documents", url: "/admin/documents", icon: FileText },
  { title: "Prompts", url: "/admin/prompts", icon: Terminal },
  { title: "Monitoring", url: "/admin/monitoring", icon: BarChart3 },
];

interface AppSidebarProps {
  isAdmin: boolean;
  onLogout: () => void;
}

export function AppSidebar({ isAdmin, onLogout }: AppSidebarProps) {
  const [location, setLocation] = useLocation();

  const handleLogout = () => {
    onLogout();
    setLocation("/");
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img src={logoImg} alt="BrightCare Daycare" className="h-10 w-10 rounded-md object-contain" />
          <div>
            <h2 className="text-sm font-bold leading-none">BrightCare</h2>
            <p className="text-xs text-muted-foreground">Pre-K Childcare</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>BrightCare Daycare</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {publicItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url || (item.url === "/" && location === "/")}
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2 flex-wrap">
              Operator Dashboard
              <Badge variant="secondary" className="text-xs" data-testid="badge-admin-status">Logged In</Badge>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {operatorItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url || (item.url !== "/" && location.startsWith(item.url))}
                      data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="p-4 space-y-2">
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        )}
        <p className="text-xs text-muted-foreground text-center">
          BrightCare Daycare v1.0
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
