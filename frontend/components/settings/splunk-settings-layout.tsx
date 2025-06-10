'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  BookOpen,
  Database,
  Router,
  FileSearch,
  Eye,
  Workflow,
  UserCog,
  Lock,
  Network,
  Gauge,
  GitBranch,
  Settings,
  Clock,
  Layers,
  Shield,
  Bell,
  Target,
  Bug,
  HardDrive,
  Users,
  Key,
  Globe,
  Zap,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  items: SettingsItem[];
}

interface SettingsItem {
  id: string;
  title: string;
  description: string;
  href?: string;
  badge?: {
    text: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  isNew?: boolean;
  disabled?: boolean;
}

const settingsSections: SettingsSection[] = [
  {
    id: 'knowledge',
    title: 'Knowledge Objects',
    description: 'Saved searches, event types, lookups, and field extractions',
    icon: BookOpen,
    items: [
      {
        id: 'saved-searches',
        title: 'Saved Searches',
        description: 'Manage saved KQL queries and scheduled searches',
        href: '/settings/knowledge/saved-searches',
      },
      {
        id: 'event-types',
        title: 'Event Types',
        description: 'Define and categorize event types for easier searching',
        href: '/settings/knowledge/event-types',
      },
      {
        id: 'lookups',
        title: 'Lookups',
        description: 'CSV lookup tables and enrichment data',
        href: '/settings/knowledge/lookups',
      },
      {
        id: 'field-extractions',
        title: 'Field Extractions',
        description: 'Configure automatic field extraction rules',
        href: '/settings/knowledge/field-extractions',
      },
      {
        id: 'search-macros',
        title: 'Search Macros',
        description: 'Reusable KQL search components and snippets',
        href: '/settings/knowledge/search-macros',
      },
      {
        id: 'tags',
        title: 'Tags',
        description: 'Organize and categorize knowledge objects',
        href: '/settings/knowledge/tags',
      },
    ],
  },
  {
    id: 'data',
    title: 'Data',
    description: 'Data inputs, indexes, models, and retention policies',
    icon: Database,
    items: [
      {
        id: 'data-inputs',
        title: 'Data Inputs',
        description: 'Configure log sources and data collection',
        href: '/settings/log-sources',
        badge: { text: 'Active', variant: 'default' },
      },
      {
        id: 'indexes',
        title: 'Indexes',
        description: 'Manage TimescaleDB hypertables and data storage',
        href: '/settings/data/indexes',
      },
      {
        id: 'data-models',
        title: 'Data Models',
        description: 'Structured data representations for analytics',
        href: '/settings/data/data-models',
        isNew: true,
      },
      {
        id: 'retention-policies',
        title: 'Data Retention',
        description: 'Configure data lifecycle and retention policies',
        href: '/settings/data/retention',
      },
      {
        id: 'parsing-rules',
        title: 'Parsing & Transformation',
        description: 'Log parsing and data transformation rules',
        href: '/settings/data/parsing',
      },
      {
        id: 'summary-indexing',
        title: 'Summary Indexing',
        description: 'Accelerated data models and report acceleration',
        href: '/settings/data/summary-indexing',
      },
    ],
  },
  {
    id: 'system',
    title: 'System',
    description: 'User management, authentication, and system configuration',
    icon: Settings,
    items: [
      {
        id: 'users-roles',
        title: 'Users & Roles',
        description: 'User accounts and role-based access control',
        href: '/settings/admin-users',
      },
      {
        id: 'authentication',
        title: 'Authentication',
        description: 'SSO, LDAP, and authentication methods',
        href: '/settings/system/authentication',
      },
      {
        id: 'authorization',
        title: 'Authorization',
        description: 'Permissions and capability management',
        href: '/settings/system/authorization',
      },
      {
        id: 'distributed-search',
        title: 'Distributed Environment',
        description: 'Search head clustering and index replication',
        href: '/settings/system/distributed',
      },
      {
        id: 'licensing',
        title: 'Licensing',
        description: 'License usage and quota management',
        href: '/settings/system/licensing',
      },
      {
        id: 'server-settings',
        title: 'Server Settings',
        description: 'General server and platform configuration',
        href: '/settings',
      },
    ],
  },
  {
    id: 'monitoring',
    title: 'Monitoring',
    description: 'System health, performance, and operational monitoring',
    icon: Gauge,
    items: [
      {
        id: 'monitoring-console',
        title: 'Monitoring Console',
        description: 'System health and performance metrics',
        href: '/settings/platform-status',
      },
      {
        id: 'resource-usage',
        title: 'Resource Usage',
        description: 'CPU, memory, and storage utilization',
        href: '/settings/monitoring/resource-usage',
      },
      {
        id: 'search-activity',
        title: 'Search Activity',
        description: 'Search performance and usage analytics',
        href: '/settings/monitoring/search-activity',
      },
      {
        id: 'alerting-health',
        title: 'Alerting Health',
        description: 'Alert processing and delivery monitoring',
        href: '/settings/monitoring/alerting-health',
      },
      {
        id: 'audit-logs',
        title: 'Audit Logs',
        description: 'System access and configuration change logs',
        href: '/settings/monitoring/audit-logs',
      },
    ],
  },
  {
    id: 'security',
    title: 'Security',
    description: 'Security settings, certificates, and access controls',
    icon: Shield,
    items: [
      {
        id: 'access-controls',
        title: 'Access Controls',
        description: 'IP allowlists and network access policies',
        href: '/settings/security/access-controls',
      },
      {
        id: 'certificates',
        title: 'Server Certificates',
        description: 'SSL/TLS certificate management',
        href: '/settings/security/certificates',
      },
      {
        id: 'security-policies',
        title: 'Security Policies',
        description: 'Password policies and security configurations',
        href: '/settings/security/policies',
      },
      {
        id: 'api-tokens',
        title: 'API Tokens',
        description: 'REST API authentication tokens',
        href: '/settings/security/api-tokens',
      },
      {
        id: 'session-management',
        title: 'Session Management',
        description: 'User session timeouts and policies',
        href: '/settings/security/sessions',
      },
    ],
  },
  {
    id: 'integrations',
    title: 'Apps & Add-ons',
    description: 'Third-party integrations and custom applications',
    icon: GitBranch,
    items: [
      {
        id: 'installed-apps',
        title: 'Manage Apps',
        description: 'Installed applications and add-ons',
        href: '/settings/integrations',
      },
      {
        id: 'app-browser',
        title: 'Browse More Apps',
        description: 'Discover and install new applications',
        href: '/settings/apps/browse',
      },
      {
        id: 'custom-apps',
        title: 'Private Apps',
        description: 'Custom and organization-specific applications',
        href: '/settings/apps/custom',
      },
      {
        id: 'webhooks',
        title: 'Webhooks',
        description: 'HTTP webhook configurations for alerts',
        href: '/settings/integrations/webhooks',
      },
      {
        id: 'external-apis',
        title: 'External APIs',
        description: 'Third-party API integrations and credentials',
        href: '/settings/integrations/apis',
      },
    ],
  },
];

interface SplunkSettingsLayoutProps {
  children?: React.ReactNode;
  title?: string;
  description?: string;
}

export function SplunkSettingsLayout({
  children,
  title,
  description,
}: SplunkSettingsLayoutProps) {
  const pathname = usePathname();
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSections, setFilteredSections] = useState(settingsSections);

  // Filter settings based on search query
  useEffect(() => {
    if (!searchQuery) {
      setFilteredSections(settingsSections);
      return;
    }

    const filtered = settingsSections
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      }))
      .filter(
        (section) =>
          section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          section.description
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          section.items.length > 0
      );

    setFilteredSections(filtered);
  }, [searchQuery]);

  // If we're showing content for a specific section, render that
  if (children) {
    return (
      <div className="min-h-screen bg-background">
        {/* Breadcrumb Header */}
        <div className="border-b border-border bg-card">
          <div className="px-6 py-4">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Link href="/settings" className="hover:text-foreground">
                Settings
              </Link>
              <span>/</span>
              {title && (
                <span className="text-foreground font-medium">{title}</span>
              )}
            </div>
            {title && (
              <div className="mt-2">
                <h1 className="splunk-heading-lg">{title}</h1>
                {description && (
                  <p className="splunk-body text-muted-foreground mt-1">
                    {description}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">{children}</div>
      </div>
    );
  }

  // Main settings page - show all sections
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="px-6 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="splunk-heading-xl">Settings</h1>
              <p className="splunk-body text-muted-foreground mt-2">
                Configure SecureWatch platform settings, data inputs, users, and
                system preferences
              </p>
            </div>
            <div className="w-80">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search settings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {searchQuery && (
                <div className="flex items-center space-x-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {filteredSections.reduce(
                      (total, section) => total + section.items.length,
                      0
                    )}{' '}
                    results
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                    className="h-6 px-2 text-xs"
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Settings Sections Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredSections.map((section) => (
            <Card key={section.id} className="siem-card">
              <CardHeader className="siem-card-header">
                <CardTitle className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <section.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="splunk-heading-sm">{section.title}</h3>
                    <p className="splunk-caption text-muted-foreground font-normal">
                      {section.description}
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {section.items.map((item, index) => (
                  <div key={item.id}>
                    {index > 0 && <Separator className="my-2" />}
                    <div className="group">
                      {item.href ? (
                        <Link
                          href={item.href}
                          className={cn(
                            'block p-3 rounded-lg transition-colors',
                            'hover:bg-accent',
                            pathname === item.href &&
                              'bg-primary/5 border border-primary/20'
                          )}
                        >
                          <SettingsItemContent item={item} />
                        </Link>
                      ) : (
                        <div
                          className={cn(
                            'p-3 rounded-lg cursor-not-allowed opacity-50',
                            item.disabled && 'opacity-40'
                          )}
                        >
                          <SettingsItemContent item={item} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsItemContent({ item }: { item: SettingsItem }) {
  return (
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center space-x-2">
          <h4 className="splunk-body font-medium">{item.title}</h4>
          {item.isNew && (
            <Badge
              variant="secondary"
              className="bg-blue-600 text-white text-xs"
            >
              New
            </Badge>
          )}
          {item.badge && (
            <Badge variant={item.badge.variant} className="text-xs">
              {item.badge.text}
            </Badge>
          )}
        </div>
        <p className="splunk-caption text-muted-foreground mt-1">
          {item.description}
        </p>
      </div>
    </div>
  );
}
