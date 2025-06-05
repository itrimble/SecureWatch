"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Copy,
  ExternalLink,
  Info,
  Cloud,
  Monitor,
  Server,
  Terminal,
  Window,
  Globe,
  Shield,
  Database,
  Code,
  Network,
  Loader2,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface LogSourceType {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'agent' | 'api' | 'syslog' | 'custom';
  complexity: 'easy' | 'medium' | 'advanced';
  requirements?: string[];
}

interface WizardStep {
  id: string;
  title: string;
  description: string;
}

const LOG_SOURCE_TYPES: LogSourceType[] = [
  {
    id: 'windows-agent',
    name: 'Windows Event Logs',
    description: 'Collect Windows Security, System, and Application logs via agent',
    icon: Window,
    category: 'agent',
    complexity: 'easy',
    requirements: ['Windows 10/Server 2016+', 'Agent installation rights']
  },
  {
    id: 'macos-agent',
    name: 'macOS Unified Logs',
    description: 'Collect macOS system and security events via agent',
    icon: Monitor,
    category: 'agent',
    complexity: 'easy',
    requirements: ['macOS 10.15+', 'Admin privileges']
  },
  {
    id: 'linux-agent',
    name: 'Linux System Logs',
    description: 'Collect syslog, audit logs, and application logs via agent',
    icon: Monitor,
    category: 'agent',
    complexity: 'medium',
    requirements: ['Linux distribution', 'Root access']
  },
  {
    id: 'aws-cloudtrail',
    name: 'AWS CloudTrail',
    description: 'Monitor AWS API calls and account activity',
    icon: Cloud,
    category: 'api',
    complexity: 'medium',
    requirements: ['AWS account', 'IAM permissions', 'CloudTrail enabled']
  },
  {
    id: 'azure-monitor',
    name: 'Azure Monitor',
    description: 'Collect Azure Activity and Diagnostic logs',
    icon: Cloud,
    category: 'api',
    complexity: 'medium',
    requirements: ['Azure subscription', 'Service principal', 'Monitor enabled']
  },
  {
    id: 'office365',
    name: 'Microsoft 365',
    description: 'Collect Office 365 audit and security logs',
    icon: Cloud,
    category: 'api',
    complexity: 'advanced',
    requirements: ['Office 365 license', 'Global admin', 'Audit logging enabled']
  },
  {
    id: 'syslog-generic',
    name: 'Generic Syslog',
    description: 'Collect syslog messages from network devices and servers',
    icon: Server,
    category: 'syslog',
    complexity: 'easy',
    requirements: ['Network connectivity', 'Syslog configuration']
  },
  {
    id: 'cisco-asa',
    name: 'Cisco ASA',
    description: 'Cisco ASA firewall logs via syslog',
    icon: Shield,
    category: 'syslog',
    complexity: 'medium',
    requirements: ['Cisco ASA', 'Syslog configuration']
  },
  {
    id: 'palo-alto',
    name: 'Palo Alto Networks',
    description: 'PAN firewall and threat logs',
    icon: Shield,
    category: 'syslog',
    complexity: 'medium',
    requirements: ['PAN firewall', 'Log forwarding configured']
  },
  {
    id: 'custom-api',
    name: 'Custom API',
    description: 'Custom REST API integration for proprietary systems',
    icon: Code,
    category: 'custom',
    complexity: 'advanced',
    requirements: ['API documentation', 'Authentication details']
  }
];

const WIZARD_STEPS: WizardStep[] = [
  { id: 'select-type', title: 'Select Source Type', description: 'Choose the type of log source to configure' },
  { id: 'configure', title: 'Configuration', description: 'Provide connection and authentication details' },
  { id: 'parser-tags', title: 'Parser & Tags', description: 'Configure parsing and categorization' },
  { id: 'review', title: 'Review & Deploy', description: 'Review configuration and deploy source' },
  { id: 'status', title: 'Deployment Status', description: 'Monitor deployment and initial connection' }
];

interface AddLogSourceWizardProps {
  onClose: () => void;
}

export function AddLogSourceWizard({ onClose }: AddLogSourceWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedType, setSelectedType] = useState<LogSourceType | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle');
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    // Agent-specific
    apiKey: '',
    eventChannels: [] as string[],
    logPaths: '',
    // API-specific
    apiCredentials: {
      accessKey: '',
      secretKey: '',
      tenantId: '',
      clientId: '',
      region: 'us-east-1'
    },
    // Syslog-specific
    protocol: 'udp',
    format: 'rfc3164',
    // Advanced
    parser: '',
    tags: [] as string[],
    sampling: false,
    throttling: false
  });

  const progressPercentage = ((currentStep + 1) / WIZARD_STEPS.length) * 100;

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleTypeSelect = (type: LogSourceType) => {
    setSelectedType(type);
    setFormData(prev => ({
      ...prev,
      name: `${type.name} - ${new Date().toLocaleDateString()}`,
      parser: getDefaultParser(type.id)
    }));
  };

  const getDefaultParser = (typeId: string): string => {
    const parsers: Record<string, string> = {
      'windows-agent': 'windows-event-parser',
      'macos-agent': 'macos-unified-logs',
      'linux-agent': 'linux-syslog',
      'aws-cloudtrail': 'aws-cloudtrail',
      'azure-monitor': 'azure-monitor',
      'office365': 'office365-audit',
      'syslog-generic': 'generic-syslog',
      'cisco-asa': 'cisco-asa-syslog',
      'palo-alto': 'palo-alto-syslog',
      'custom-api': 'custom-json'
    };
    return parsers[typeId] || 'generic-parser';
  };

  const generateApiKey = () => {
    const key = `sk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    setFormData(prev => ({ ...prev, apiKey: key }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const testConnection = async () => {
    toast.info('Testing connection...');
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    toast.success('Connection successful!');
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    setDeploymentStatus('deploying');
    
    try {
      // Simulate deployment
      await new Promise(resolve => setTimeout(resolve, 3000));
      setDeploymentStatus('success');
      toast.success('Log source deployed successfully!');
      setCurrentStep(4); // Move to status step
    } catch (error) {
      setDeploymentStatus('error');
      toast.error('Deployment failed. Please check configuration.');
    } finally {
      setIsDeploying(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Select Type
        return (
          <div className="space-y-6">
            <div className="mb-6">
              <Input
                placeholder="Search log source types..."
                className="max-w-md"
              />
            </div>
            
            {/* Category tabs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {['agent', 'api', 'syslog', 'custom'].map(category => (
                <Button
                  key={category}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2"
                >
                  <span className="font-medium capitalize">{category}</span>
                  <span className="text-xs text-gray-400">
                    {LOG_SOURCE_TYPES.filter(t => t.category === category).length} types
                  </span>
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {LOG_SOURCE_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <Card
                    key={type.id}
                    className={`cursor-pointer transition-all hover:border-blue-500 ${
                      selectedType?.id === type.id ? 'border-blue-500 bg-blue-500/10' : ''
                    }`}
                    onClick={() => handleTypeSelect(type)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Icon className="w-8 h-8 text-blue-500 flex-shrink-0 mt-1" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-100 mb-1">{type.name}</h3>
                          <p className="text-sm text-gray-400 mb-3">{type.description}</p>
                          
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              {type.category}
                            </Badge>
                            <Badge 
                              variant={type.complexity === 'easy' ? 'default' : type.complexity === 'medium' ? 'secondary' : 'destructive'}
                              className="text-xs"
                            >
                              {type.complexity}
                            </Badge>
                          </div>
                          
                          {type.requirements && (
                            <div className="text-xs text-gray-500">
                              <p className="font-medium mb-1">Requirements:</p>
                              <ul className="list-disc list-inside space-y-0.5">
                                {type.requirements.map((req, idx) => (
                                  <li key={idx}>{req}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );

      case 1: // Configuration
        if (!selectedType) return null;
        
        return (
          <div className="space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="source-name">Log Source Name *</Label>
                  <Input
                    id="source-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Primary Domain Controller"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="source-description">Description</Label>
                  <Textarea
                    id="source-description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description for this log source"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Type-specific configuration */}
            {selectedType.category === 'agent' && (
              <Card>
                <CardHeader>
                  <CardTitle>Agent Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <div className="flex gap-2">
                      <Input
                        value={formData.apiKey}
                        onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                        placeholder="Agent authentication key"
                        readOnly
                      />
                      <Button variant="outline" onClick={generateApiKey}>
                        Generate
                      </Button>
                      <Button variant="outline" onClick={() => copyToClipboard(formData.apiKey)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {selectedType.id === 'windows-agent' && (
                    <div className="space-y-2">
                      <Label>Event Channels</Label>
                      <div className="space-y-2">
                        {['Security', 'System', 'Application', 'Windows PowerShell'].map(channel => (
                          <div key={channel} className="flex items-center space-x-2">
                            <Checkbox
                              id={channel}
                              checked={formData.eventChannels.includes(channel)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFormData(prev => ({
                                    ...prev,
                                    eventChannels: [...prev.eventChannels, channel]
                                  }));
                                } else {
                                  setFormData(prev => ({
                                    ...prev,
                                    eventChannels: prev.eventChannels.filter(c => c !== channel)
                                  }));
                                }
                              }}
                            />
                            <Label htmlFor={channel}>{channel}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Accordion type="single" collapsible>
                    <AccordionItem value="installation">
                      <AccordionTrigger>Installation Instructions</AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <div className="bg-gray-800 rounded-lg p-4">
                          <h4 className="font-medium mb-2">1. Download Agent</h4>
                          <code className="text-sm bg-gray-700 px-2 py-1 rounded">
                            curl -O https://securewatch.local/agents/{selectedType.id}-agent
                          </code>
                          <Button variant="outline" size="sm" className="ml-2">
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        
                        <div className="bg-gray-800 rounded-lg p-4">
                          <h4 className="font-medium mb-2">2. Install and Configure</h4>
                          <code className="text-sm bg-gray-700 px-2 py-1 rounded block">
                            {selectedType.id === 'windows-agent' 
                              ? `./${selectedType.id}-agent.exe install --api-key ${formData.apiKey}`
                              : `sudo ./${selectedType.id}-agent install --api-key ${formData.apiKey}`
                            }
                          </code>
                          <Button variant="outline" size="sm" className="ml-2 mt-2">
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            )}

            {selectedType.category === 'api' && (
              <Card>
                <CardHeader>
                  <CardTitle>API Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedType.id === 'aws-cloudtrail' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="access-key">Access Key ID *</Label>
                          <Input
                            id="access-key"
                            type="password"
                            value={formData.apiCredentials.accessKey}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              apiCredentials: { ...prev.apiCredentials, accessKey: e.target.value }
                            }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="secret-key">Secret Access Key *</Label>
                          <Input
                            id="secret-key"
                            type="password"
                            value={formData.apiCredentials.secretKey}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              apiCredentials: { ...prev.apiCredentials, secretKey: e.target.value }
                            }))}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="region">AWS Region</Label>
                        <Select
                          value={formData.apiCredentials.region}
                          onValueChange={(value) => setFormData(prev => ({
                            ...prev,
                            apiCredentials: { ...prev.apiCredentials, region: value }
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                            <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                            <SelectItem value="eu-west-1">Europe (Ireland)</SelectItem>
                            <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={testConnection}>
                      Test Connection
                    </Button>
                    <Button variant="outline">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      IAM Permissions Guide
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedType.category === 'syslog' && (
              <Card>
                <CardHeader>
                  <CardTitle>Syslog Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
                      SecureWatch Syslog Listener
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
                      Configure your devices to send syslog messages to:
                    </p>
                    <div className="font-mono text-sm bg-blue-100 dark:bg-blue-800 px-3 py-2 rounded">
                      <div>Host: securewatch.local</div>
                      <div>Port: 514 (UDP) / 1514 (TCP)</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Protocol</Label>
                    <RadioGroup
                      value={formData.protocol}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, protocol: value }))}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="udp" id="udp" />
                        <Label htmlFor="udp">UDP (Standard)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="tcp" id="tcp" />
                        <Label htmlFor="tcp">TCP (Reliable)</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="syslog-format">Syslog Format</Label>
                    <Select
                      value={formData.format}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, format: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rfc3164">RFC 3164 (Traditional)</SelectItem>
                        <SelectItem value="rfc5424">RFC 5424 (Modern)</SelectItem>
                        <SelectItem value="cisco">Cisco Format</SelectItem>
                        <SelectItem value="paloalto">Palo Alto Format</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 2: // Parser & Tags
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Parser Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="parser">Log Parser</Label>
                  <Select
                    value={formData.parser}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, parser: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="windows-event-parser">Windows Event Parser</SelectItem>
                      <SelectItem value="macos-unified-logs">macOS Unified Logs</SelectItem>
                      <SelectItem value="linux-syslog">Linux Syslog Parser</SelectItem>
                      <SelectItem value="aws-cloudtrail">AWS CloudTrail Parser</SelectItem>
                      <SelectItem value="generic-syslog">Generic Syslog Parser</SelectItem>
                      <SelectItem value="custom-json">Custom JSON Parser</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-400">
                    Recommended: {getDefaultParser(selectedType?.id || '')}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tags & Classification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    placeholder="production, windows, critical (comma-separated)"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        const value = e.currentTarget.value.trim();
                        if (value && !formData.tags.includes(value)) {
                          setFormData(prev => ({
                            ...prev,
                            tags: [...prev.tags, value]
                          }));
                          e.currentTarget.value = '';
                        }
                      }
                    }}
                  />
                  <div className="flex gap-2 flex-wrap mt-2">
                    {formData.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="cursor-pointer"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          tags: prev.tags.filter(t => t !== tag)
                        }))}>
                        {tag} ×
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Advanced Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Log Sampling</Label>
                    <p className="text-sm text-gray-400">
                      Enable sampling for high-volume sources
                    </p>
                  </div>
                  <Checkbox
                    checked={formData.sampling}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sampling: !!checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Rate Throttling</Label>
                    <p className="text-sm text-gray-400">
                      Limit ingestion rate to prevent overload
                    </p>
                  </div>
                  <Checkbox
                    checked={formData.throttling}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, throttling: !!checked }))}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 3: // Review
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuration Review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-400">Source Type</Label>
                    <p className="font-medium">{selectedType?.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-400">Name</Label>
                    <p className="font-medium">{formData.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-400">Parser</Label>
                    <p className="font-medium">{formData.parser}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-400">Tags</Label>
                    <div className="flex gap-1 flex-wrap">
                      {formData.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
                
                {formData.description && (
                  <div>
                    <Label className="text-sm text-gray-400">Description</Label>
                    <p className="text-sm">{formData.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <Button 
                onClick={handleDeploy} 
                disabled={isDeploying}
                className="flex items-center gap-2"
              >
                {isDeploying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {isDeploying ? 'Deploying...' : 'Deploy Log Source'}
              </Button>
            </div>
          </div>
        );

      case 4: // Status
        return (
          <div className="space-y-6 text-center">
            {deploymentStatus === 'success' ? (
              <>
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                <h3 className="text-xl font-medium text-green-500">Deployment Successful!</h3>
                <p className="text-gray-400">
                  Log source "{formData.name}" has been configured and is now collecting data.
                </p>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Initial connection established. First logs should appear within 5-10 minutes.
                  </p>
                </div>
                <Button onClick={onClose}>
                  View in Log Sources
                </Button>
              </>
            ) : (
              <>
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
                <h3 className="text-xl font-medium text-red-500">Deployment Failed</h3>
                <p className="text-gray-400">
                  There was an issue deploying the log source. Please check your configuration.
                </p>
                <Button variant="outline" onClick={() => setCurrentStep(2)}>
                  Back to Configuration
                </Button>
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Step {currentStep + 1} of {WIZARD_STEPS.length}</span>
          <span>{Math.round(progressPercentage)}% Complete</span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>

      {/* Step Info */}
      <div className="text-center">
        <h3 className="text-lg font-medium">{WIZARD_STEPS[currentStep].title}</h3>
        <p className="text-sm text-gray-400">{WIZARD_STEPS[currentStep].description}</p>
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {currentStep < 3 && (
            <Button
              onClick={handleNext}
              disabled={currentStep === 0 && !selectedType}
              className="flex items-center gap-2"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}