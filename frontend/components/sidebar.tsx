'use client';

import { cn } from '@/lib/utils';
import {
  BarChart3,
  Search,
  AlertTriangle,
  Shield,
  Target,
  User,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'search', label: 'Log Search', icon: Search },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
    { id: 'incidents', label: 'Incidents', icon: Shield },
    { id: 'threat-intel', label: 'Threat Intel', icon: Target },
  ];

  return (
    <div className="w-64 bg-background text-foreground flex flex-col">
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold">SecureWatch SIEM</h1>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                  activeTab === item.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <User className="h-8 w-8 bg-muted rounded-full p-1" />
          <div>
            <p className="text-sm font-medium">Admin User</p>
            <p className="text-xs text-muted-foreground">Security Analyst</p>
          </div>
        </div>
      </div>
    </div>
  );
}
