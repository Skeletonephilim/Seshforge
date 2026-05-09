import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Terminal,
  BookOpen,
  FlaskConical,
  Calendar,
  TrendingUp,
  Menu,
  X,
  LogOut,
  User,
  Home,
  Skull,
  FileText,
  Zap,
  Flag,
  Map,
  Brain,
  AlertTriangle,
  Trophy,
  Target,
  Wifi,
  FolderOpen,
  Heart,
} from 'lucide-react';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', icon: Home, path: '/' },
    { name: 'PT1 Micro-Sims', icon: Target, path: '/pt1-micro-sims' },
    { name: 'Decision Engine', icon: Brain, path: '/decision-engine' },
    { name: 'Box Mode', icon: Terminal, path: '/box-mode' },
    { name: 'Casefile Mode', icon: FolderOpen, path: '/casefile-mode' },
    { name: 'Wireless', icon: Wifi, path: '/wireless-pentest' },
    { name: 'PT1 Exam', icon: Flag, path: '/pt1-exam' },
    { name: 'SEC1 Exam', icon: BookOpen, path: '/sec1-exam' },
    { name: 'Web Black-Box', icon: Trophy, path: '/pt1-web-exam' },
    { name: 'AD + Lateral', icon: Trophy, path: '/pt1-ad-exam' },
    { name: 'Live Analysis', icon: TrendingUp, path: '/live-analysis' },
    { name: 'PTES Methodology', icon: Map, path: '/ptes-methodology' },
    { name: 'Training Plan', icon: Calendar, path: '/training-plan' },
    { name: 'Profile', icon: User, path: '/profile' },
    { name: 'Analytics', icon: TrendingUp, path: '/analytics' },
    { name: 'Support 💝', icon: Heart, path: '/support' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex h-16 items-center px-4 gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Skull className="w-6 h-6 text-destructive" />
            <span className="font-bold text-xl text-gradient-primary hidden sm:inline">
              SeshForge
            </span>
          </div>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2 flex-1">
            {navigation.map((item) => (
              <Button
                key={item.path}
                variant={isActive(item.path) ? 'default' : 'ghost'}
                size="sm"
                className={isActive(item.path) ? 'neon-glow' : ''}
                onClick={() => navigate(item.path)}
              >
                <item.icon className="w-4 h-4 mr-2" />
                {item.name}
              </Button>
            ))}
          </nav>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="ml-auto">
                <User className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-mono text-xs">
                {user?.email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="w-4 h-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-16 bottom-0 w-64 bg-card border-r border-border p-4">
            <nav className="space-y-2">
              {navigation.map((item) => (
                <Button
                  key={item.path}
                  variant={isActive(item.path) ? 'default' : 'ghost'}
                  className={`w-full justify-start ${isActive(item.path) ? 'neon-glow' : ''}`}
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                >
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.name}
                </Button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="relative">
        <Outlet />
      </main>
    </div>
  );
}
