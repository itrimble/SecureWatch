'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
  BarChart3,
  Filter,
  Eye,
  EyeOff,
  Hash,
  Clock,
  Database,
  User,
  Globe,
  Shield,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FieldInfo {
  name: string;
  type: 'string' | 'number' | 'timestamp' | 'ip' | 'boolean';
  coverage: number; // percentage of events that have this field
  distinctValues: number;
  topValues: Array<{ value: string; count: number; percentage: number }>;
  description?: string;
  isSelected: boolean;
  isInteresting: boolean;
}

interface FieldSidebarProps {
  fields: FieldInfo[];
  onFieldSelect: (
    fieldName: string,
    action: 'add' | 'remove' | 'filter' | 'stats'
  ) => void;
  onFieldValueFilter: (fieldName: string, value: string) => void;
  searchResults?: any[];
  className?: string;
}

export function FieldSidebar({
  fields,
  onFieldSelect,
  onFieldValueFilter,
  searchResults = [],
  className,
}: FieldSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

  // Filter fields based on search term
  const filteredFields = fields.filter((field) =>
    field.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Separate selected and interesting fields
  const selectedFieldsList = filteredFields.filter((f) => f.isSelected);
  const interestingFieldsList = filteredFields.filter(
    (f) => f.isInteresting && !f.isSelected
  );
  const allFieldsList = filteredFields.filter(
    (f) => !f.isSelected && !f.isInteresting
  );

  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'timestamp':
        return <Clock className="w-3 h-3 text-blue-400" />;
      case 'ip':
        return <Globe className="w-3 h-3 text-green-400" />;
      case 'number':
        return <Hash className="w-3 h-3 text-purple-400" />;
      case 'boolean':
        return <Shield className="w-3 h-3 text-orange-400" />;
      default:
        return <Database className="w-3 h-3 text-gray-400" />;
    }
  };

  const handleFieldAction = (
    field: FieldInfo,
    action: 'add' | 'remove' | 'filter' | 'stats'
  ) => {
    if (action === 'add' || action === 'remove') {
      const newSelected = new Set(selectedFields);
      if (action === 'add') {
        newSelected.add(field.name);
      } else {
        newSelected.delete(field.name);
      }
      setSelectedFields(newSelected);
    }
    onFieldSelect(field.name, action);
  };

  const toggleFieldExpansion = (fieldName: string) => {
    const newExpanded = new Set(expandedFields);
    if (newExpanded.has(fieldName)) {
      newExpanded.delete(fieldName);
    } else {
      newExpanded.add(fieldName);
    }
    setExpandedFields(newExpanded);
  };

  const FieldComponent = ({ field }: { field: FieldInfo }) => {
    const isExpanded = expandedFields.has(field.name);

    return (
      <div className="border-b border-border last:border-b-0">
        <div className="flex items-center justify-between p-2 hover:bg-accent group">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => toggleFieldExpansion(field.name)}
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </Button>

            {getFieldIcon(field.type)}

            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">
                {field.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {field.coverage.toFixed(0)}% ({field.distinctValues} values)
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
              onClick={() =>
                handleFieldAction(field, field.isSelected ? 'remove' : 'add')
              }
              title={field.isSelected ? 'Remove from search' : 'Add to search'}
            >
              {field.isSelected ? (
                <EyeOff className="w-3 h-3" />
              ) : (
                <Eye className="w-3 h-3" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
              onClick={() => handleFieldAction(field, 'stats')}
              title="Show statistics"
            >
              <BarChart3 className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {isExpanded && (
          <div className="px-4 pb-3 space-y-2">
            {field.description && (
              <p className="text-xs text-muted-foreground">
                {field.description}
              </p>
            )}

            <div className="space-y-1">
              <h5 className="text-xs font-medium text-foreground">
                Top Values
              </h5>
              {field.topValues.map((value, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-xs hover:bg-accent p-1 rounded cursor-pointer"
                  onClick={() => onFieldValueFilter(field.name, value.value)}
                >
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <span className="text-primary truncate font-mono">
                      {value.value}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <span>{value.count}</span>
                    <span>({value.percentage.toFixed(1)}%)</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFieldValueFilter(field.name, value.value);
                      }}
                    >
                      <Filter className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn(
        'w-full h-full bg-card border-r border-border flex flex-col',
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground mb-3">Fields</h3>

        {/* Search Fields */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3 h-3" />
          <Input
            type="text"
            placeholder="Filter fields..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-7 h-8 text-xs bg-background border-border text-foreground"
          />
        </div>

        {/* Field Count Summary */}
        <div className="mt-2 text-xs text-muted-foreground">
          {selectedFieldsList.length} selected, {interestingFieldsList.length}{' '}
          interesting, {allFieldsList.length} total
        </div>
      </div>

      {/* Fields List */}
      <ScrollArea className="flex-1">
        <div className="space-y-2 p-2">
          {/* Selected Fields */}
          {selectedFieldsList.length > 0 && (
            <Collapsible defaultOpen>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between h-8 text-xs font-medium text-foreground"
                >
                  <div className="flex items-center space-x-2">
                    <Eye className="w-3 h-3" />
                    <span>Selected Fields</span>
                    <Badge
                      variant="secondary"
                      className="bg-primary text-primary-foreground text-xs"
                    >
                      {selectedFieldsList.length}
                    </Badge>
                  </div>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="bg-muted rounded border border-border mt-1">
                  {selectedFieldsList.map((field) => (
                    <FieldComponent key={field.name} field={field} />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Interesting Fields */}
          {interestingFieldsList.length > 0 && (
            <Collapsible defaultOpen>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between h-8 text-xs font-medium text-foreground"
                >
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-3 h-3" />
                    <span>Interesting Fields</span>
                    <Badge
                      variant="secondary"
                      className="bg-primary text-primary-foreground text-xs"
                    >
                      {interestingFieldsList.length}
                    </Badge>
                  </div>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="bg-muted rounded border border-border mt-1">
                  {interestingFieldsList.map((field) => (
                    <FieldComponent key={field.name} field={field} />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* All Fields */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between h-8 text-xs font-medium text-foreground"
              >
                <div className="flex items-center space-x-2">
                  <Database className="w-3 h-3" />
                  <span>All Fields</span>
                  <Badge
                    variant="secondary"
                    className="bg-secondary text-secondary-foreground text-xs"
                  >
                    {allFieldsList.length}
                  </Badge>
                </div>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="bg-gray-750 rounded border border-gray-600 mt-1 max-h-96 overflow-y-auto">
                {allFieldsList.map((field) => (
                  <FieldComponent key={field.name} field={field} />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="p-3 border-t border-border">
        <div className="space-y-2">
          <Button variant="outline" size="sm" className="w-full text-xs">
            <Plus className="w-3 h-3 mr-2" />
            Extract New Field
          </Button>

          <div className="text-xs text-muted-foreground text-center">
            {searchResults.length} events
          </div>
        </div>
      </div>
    </div>
  );
}
