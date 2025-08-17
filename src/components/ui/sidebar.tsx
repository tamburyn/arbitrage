import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useFilters } from '../dashboard/FilterContext';
import { 
  Menu, 
  X, 
  BarChart3, 
  Settings, 
  Bell, 
  Home,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search
} from 'lucide-react';

interface SidebarProps {
  children?: React.ReactNode;
  className?: string;
}

interface SidebarContentProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobile?: boolean;
  onClose?: () => void;
}

const navigationItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    active: true
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    active: false
  },
  {
    title: 'Alerts',
    href: '/alerts',
    icon: Bell,
    active: false
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    active: false
  }
];

function SidebarContent({ isCollapsed = false, onToggleCollapse, isMobile = false, onClose }: SidebarContentProps) {
  const { filters, updateFilter, resetFilters } = useFilters();
  return (
    <div className={cn(
      "flex h-full flex-col bg-background border-r",
      isCollapsed && !isMobile ? "w-16" : "w-[260px]"
    )}>
      {/* Header */}
      <div className="flex h-16 items-center border-b px-4">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BarChart3 className="h-4 w-4" />
            </div>
            <span className="font-semibold">CryptoHacks</span>
          </div>
        )}
        
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className={cn("ml-auto", isCollapsed && "mx-auto")}
            onClick={onToggleCollapse}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        )}
        
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
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
              return (
                <Button
                  key={item.href}
                  variant={item.active ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-2",
                    isCollapsed && "justify-center px-2"
                  )}
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
              
              {/* Filters Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Filters
                  </h3>
                </div>
                
                {/* Search */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Search Assets</label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="BTC, ETH..."
                      value={filters.searchAssets}
                      onChange={(e) => updateFilter('searchAssets', e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-sm bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Exchange Filter */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Exchange</label>
                  <select 
                    value={filters.exchange}
                    onChange={(e) => updateFilter('exchange', e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">All Exchanges</option>
                    <option value="Binance">Binance</option>
                    <option value="Kraken">Kraken</option>
                    <option value="Bybit">Bybit</option>
                    <option value="OKX">OKX</option>
                  </select>
                </div>

                {/* Spread Range */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Min Spread %</label>
                  <input
                    type="number"
                    placeholder="0.5"
                    step="0.1"
                    min="0"
                    max="10"
                    value={filters.minSpread || ''}
                    onChange={(e) => updateFilter('minSpread', e.target.value ? parseFloat(e.target.value) : null)}
                    className="w-full px-3 py-2 text-sm bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                {/* Quick Filters */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Quick Filters</label>
                  <div className="space-y-1">
                    <label className="flex items-center space-x-2 text-sm">
                      <input 
                        type="checkbox" 
                        checked={filters.highVolumeOnly}
                        onChange={(e) => updateFilter('highVolumeOnly', e.target.checked)}
                        className="rounded border-gray-300" 
                      />
                      <span>High Volume Only</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm">
                      <input 
                        type="checkbox" 
                        checked={filters.majorPairsOnly}
                        onChange={(e) => updateFilter('majorPairsOnly', e.target.checked)}
                        className="rounded border-gray-300" 
                      />
                      <span>Major Pairs Only</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm">
                      <input 
                        type="checkbox" 
                        checked={filters.activeOpportunitiesOnly}
                        onChange={(e) => updateFilter('activeOpportunitiesOnly', e.target.checked)}
                        className="rounded border-gray-300" 
                      />
                      <span>Active Opportunities</span>
                    </label>
                  </div>
                </div>

                <Button variant="outline" size="sm" className="w-full" onClick={resetFilters}>
                  Reset Filters
                </Button>
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-4">
        {!isCollapsed ? (
          <div className="text-xs text-muted-foreground">
            <p>Last update: {new Date().toLocaleTimeString()}</p>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="h-2 w-2 rounded-full bg-green-500" />
          </div>
        )}
      </div>
    </div>
  );
}

export function Sidebar({ children, className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className={cn("flex h-screen", className)}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed top-0 left-0 h-full z-30">
        <SidebarContent 
          isCollapsed={isCollapsed} 
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)} 
        />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden fixed top-4 left-4 z-50"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-[260px]">
          <SidebarContent 
            isMobile={true} 
            onClose={() => setIsMobileOpen(false)} 
          />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className={cn(
        "flex-1 overflow-hidden",
        isCollapsed ? "lg:ml-16" : "lg:ml-[260px]" // Use margin instead of padding
      )}>
        {children}
      </main>
    </div>
  );
}
