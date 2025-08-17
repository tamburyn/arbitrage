import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import { Menu, Settings, Home, ChevronLeft, ChevronRight, LogIn, LogOut, UserPlus, Star } from "lucide-react";

interface SimpleSidebarProps {
  children?: React.ReactNode;
  className?: string;
  user?: { id: string; email?: string } | null;
  onFilterChange?: (showFavouritesOnly: boolean) => void;
}

interface SidebarContentProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobile?: boolean;
  user?: { id: string; email?: string } | null;
  onFilterChange?: (showFavouritesOnly: boolean) => void;
}

const navigationItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: Home,
  },
  {
    title: "Preferences",
    href: "/preferences",
    icon: Settings,
  },
];

function SidebarContent({ isCollapsed = false, onToggleCollapse, isMobile = false, user, onFilterChange }: SidebarContentProps) {
  const isAuthenticated = !!user;
  const [showFavouritesOnly, setShowFavouritesOnly] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  
  // Get current path for active state - avoid hydration mismatch
  useEffect(() => {
    setCurrentPath(window.location.pathname);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = "/";
    }
  };

  const handleFilterToggle = (pressed: boolean) => {
    setShowFavouritesOnly(pressed);
    onFilterChange?.(pressed);
    
    // Emit custom event for dashboard to listen to
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('filterChange', {
        detail: { showFavouritesOnly: pressed }
      }));
    }
  };

  return (
    <div className={cn("flex h-full flex-col bg-background border-r", isCollapsed && !isMobile ? "w-16" : "w-[260px]")}>
      {/* Header */}
      <div className="flex h-16 items-center border-b px-4">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Home className="h-4 w-4" />
            </div>
            <span className="font-semibold">CryptoHacks</span>
          </div>
        )}
        
        {!isMobile && (
          <Button variant="ghost" size="icon" className={cn("ml-auto", isCollapsed && "mx-auto")} onClick={onToggleCollapse}>
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2 p-4">
          {/* Navigation */}
          <div className="space-y-1">
            {!isCollapsed && (
              <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Navigation
              </h3>
            )}
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.href;
              return (
                <Button
                  key={item.href}
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn("w-full justify-start gap-2", isCollapsed && "justify-center px-2")}
                  asChild
                >
                  <a href={item.href}>
                    <Icon className="h-4 w-4 shrink-0" />
                    {!isCollapsed && <span>{item.title}</span>}
                  </a>
                </Button>
              );
            })}
          </div>

          {!isCollapsed && (
            <>
              <Separator className="my-4" />
              
              {/* Filter Options */}
              {isAuthenticated && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filters</h3>
                  <div className="space-y-2">
                    <Toggle
                      pressed={showFavouritesOnly}
                      onPressedChange={handleFilterToggle}
                      className="w-full justify-start gap-2 text-sm h-9"
                      variant="outline"
                    >
                      <Star className={cn("h-4 w-4", showFavouritesOnly && "fill-current")} />
                      {showFavouritesOnly ? "Show All" : "Favourites Only"}
                    </Toggle>

                  </div>
                </div>
              )}
              
              {(isAuthenticated && !isCollapsed) && <Separator className="my-4" />}
              
              {/* Quick Stats */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Stats</h3>
                <div className="space-y-2">
                  <div className="text-sm">
                    <div className="text-muted-foreground">Active Exchanges</div>
                    <div className="font-semibold">4</div>
                  </div>
                  <div className="text-sm">
                    <div className="text-muted-foreground">Assets Tracked</div>
                    <div className="font-semibold">50+</div>
                  </div>
                  <div className="text-sm">
                    <div className="text-muted-foreground">Last Update</div>
                    <div className="font-semibold text-green-600">Live</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-4">
        {!isCollapsed ? (
          <div className="space-y-3">
            {isAuthenticated ? (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  <p>Logged in as:</p>
                  <p className="font-medium truncate">{user?.email}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start gap-2">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground mb-2">
                  <p>Sign in to save preferences</p>
                </div>
                <Button variant="outline" size="sm" className="w-full justify-start gap-2" asChild>
                  <a href="/login">
                    <LogIn className="h-4 w-4" />
                    Sign in
                  </a>
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2" asChild>
                  <a href="/register">
                    <UserPlus className="h-4 w-4" />
                    Sign up
                  </a>
                </Button>
              </div>
            )}
            <div className="text-xs text-muted-foreground pt-2 border-t">
              <p>Last update: {new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            {isAuthenticated ? (
              <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8" title="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Sign in" asChild>
                <a href="/login">
                  <LogIn className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function SimpleSidebar({ children, className, user, onFilterChange }: SimpleSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className={cn("flex h-screen", className)}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed top-0 left-0 h-full z-30">
        <SidebarContent 
          isCollapsed={isCollapsed} 
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)} 
          user={user} 
          onFilterChange={onFilterChange}
        />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden fixed top-4 left-4 z-50">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-[260px]">
          <SidebarContent 
            isMobile={true} 
            user={user} 
            onFilterChange={onFilterChange}
          />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className={cn("flex-1 overflow-auto", isCollapsed ? "lg:ml-16" : "lg:ml-[260px]")}>{children}</main>
    </div>
  );
}