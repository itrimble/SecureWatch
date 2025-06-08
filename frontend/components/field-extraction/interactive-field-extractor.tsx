'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Copy, Play, Save, Trash2, Eye, Code, RefreshCw, TestTube, AlertCircle, CheckCircle } from 'lucide-react';

interface ExtractedField {
  name: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'ip' | 'ipv6' | 'email' | 'url' | 'hash' | 'domain' | 'mac' | 'sid' | 'cve' | 'mitre' | 'os_version' | 'cloud_instance' | 'container_id' | 'aws_arn' | 'azure_resource' | 'process_guid' | 'username' | 'firewall_rule' | 'dhcp_lease' | 'vpn_session' | 'ids_alert' | 'dns_block' | 'system_auth' | 'netflow' | 'proxy_report';
  regex: string;
  confidence: number;
  position: { start: number; end: number };
}

interface FieldExtractionRule {
  id: string;
  name: string;
  description: string;
  regex: string;
  fieldName: string;
  fieldType: string;
  enabled: boolean;
  created: Date;
  modified: Date;
}

interface TestResult {
  ruleName: string;
  ruleId: string;
  matchCount: number;
  extractedFields: ExtractedField[];
  success: boolean;
  error?: string;
}

// Test and Preview Component
function TestAndPreviewSection({ 
  rules, 
  onTestResults 
}: { 
  rules: FieldExtractionRule[];
  onTestResults: (results: ExtractedField[]) => void;
}) {
  const [testLogs, setTestLogs] = useState('');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>([]);

  const sampleTestLogs = `127.0.0.1 - - [10/Oct/2000:13:55:36 -0700] "GET /apache_pb.gif HTTP/1.0" 200 2326
Oct 10 13:55:36 server01 sshd[1234]: Failed password for admin from 192.168.1.100 port 22 ssh2
{"timestamp":"2024-01-10T13:55:36Z","level":"ERROR","user":"admin","action":"login_failed","ip":"192.168.1.100"}
2024-01-10T14:22:15Z INFO User john.doe@company.com logged in from 10.0.0.45
[ERROR] 2024-01-10T14:25:30Z Database connection failed: timeout after 30s
POST /api/users HTTP/1.1 401 {"error":"invalid_token","user_id":"usr_12345"}
Security Alert: File hash d41d8cd98f00b204e9800998ecf8427e detected on host evil-domain.com
Windows Event: User S-1-5-21-3623811015-3361044348-30300820-1013 failed logon
Vulnerability CVE-2021-44228 detected with MITRE technique T1059.001
IPv6 connection from 2001:0db8:85a3:0000:0000:8a2e:0370:7334 to internal network
Network device MAC 00-B0-D0-63-C2-26 detected suspicious traffic
AWS Instance i-0a1b2c3d4e5f67890 on Windows Server 2022 detected malware
Azure VM /subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/prod-rg/providers/Microsoft.Compute/virtualMachines/web-vm
Container a1b2c3d4e5f6 process GUID {3D5B3A8B-2E24-4F8A-A2E4-3B9B4B8B9B1D} user j.smith unauthorized access
IAM ARN arn:aws:iam::123456789012:user/alice accessed S3 bucket from Ubuntu 22.04 LTS
pfsense filterlog[12345]: 10,,1000000103,1678886400,em0,match,block,in,4,0,0,64,1234,0,0,tcp,6,512,192.168.1.5,8.8.8.8,54321,53,256
pihole dnsmasq[543]: query[A] example.com from 192.168.1.50
squid/access.log:1678886400.123   45 192.168.1.55 TCP_MISS/200 1234 GET http://example.com/ - HIER_DIRECT/8.8.8.8 text/html`;

  const runTests = async () => {
    if (!testLogs.trim() || selectedRuleIds.length === 0) return;
    
    setIsRunningTests(true);
    const logs = testLogs.split('\n').filter(log => log.trim());
    const results: TestResult[] = [];
    const allExtractedFields: ExtractedField[] = [];

    for (const rule of rules.filter(r => selectedRuleIds.includes(r.id) && r.enabled)) {
      try {
        const regex = new RegExp(rule.regex, 'g');
        const extractedFields: ExtractedField[] = [];
        
        logs.forEach((log, logIndex) => {
          let match;
          const logRegex = new RegExp(rule.regex, 'g');
          
          while ((match = logRegex.exec(log)) !== null) {
            const field: ExtractedField = {
              name: rule.fieldName,
              value: match[1] || match[0],
              type: rule.fieldType as any,
              regex: rule.regex,
              confidence: 0.85,
              position: { start: match.index, end: match.index + match[0].length }
            };
            extractedFields.push(field);
            allExtractedFields.push(field);
          }
        });

        results.push({
          ruleName: rule.name,
          ruleId: rule.id,
          matchCount: extractedFields.length,
          extractedFields,
          success: true
        });
      } catch (error) {
        results.push({
          ruleName: rule.name,
          ruleId: rule.id,
          matchCount: 0,
          extractedFields: [],
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    setTestResults(results);
    onTestResults(allExtractedFields);
    setIsRunningTests(false);
  };

  const toggleRuleSelection = (ruleId: string) => {
    setSelectedRuleIds(prev => 
      prev.includes(ruleId) 
        ? prev.filter(id => id !== ruleId)
        : [...prev, ruleId]
    );
  };

  const selectAllRules = () => {
    setSelectedRuleIds(rules.map(r => r.id));
  };

  const clearSelection = () => {
    setSelectedRuleIds([]);
  };

  return (
    <div className="space-y-4">
      {/* Rule Selection */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="text-sm font-medium">Select Rules to Test</Label>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAllRules}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        </div>
        
        {rules.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No extraction rules available. Create some rules first.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center space-x-2 p-2 border rounded">
                <input
                  type="checkbox"
                  id={`rule-${rule.id}`}
                  checked={selectedRuleIds.includes(rule.id)}
                  onChange={() => toggleRuleSelection(rule.id)}
                  disabled={!rule.enabled}
                />
                <Label 
                  htmlFor={`rule-${rule.id}`} 
                  className={`text-sm flex-1 ${!rule.enabled ? 'text-muted-foreground' : ''}`}
                >
                  {rule.name} ({rule.fieldType})
                </Label>
                {!rule.enabled && (
                  <Badge variant="secondary" className="text-xs">Disabled</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Test Log Input */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-medium">Test Log Data</Label>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setTestLogs(sampleTestLogs)}
          >
            Load Sample Logs
          </Button>
        </div>
        <Textarea
          placeholder="Paste multiple log entries (one per line)..."
          value={testLogs}
          onChange={(e) => setTestLogs(e.target.value)}
          className="min-h-[150px] font-mono text-sm"
        />
      </div>

      {/* Test Controls */}
      <div className="flex gap-2">
        <Button
          onClick={runTests}
          disabled={!testLogs.trim() || selectedRuleIds.length === 0 || isRunningTests}
          className="flex-1"
        >
          {isRunningTests ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <TestTube className="w-4 h-4 mr-2" />
          )}
          Run Tests
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setTestResults([]);
            onTestResults([]);
          }}
          disabled={testResults.length === 0}
        >
          Clear Results
        </Button>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Test Results</Label>
          
          {testResults.map((result) => (
            <div key={result.ruleId} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className="font-medium">{result.ruleName}</span>
                </div>
                <Badge variant={result.success ? "default" : "destructive"}>
                  {result.matchCount} matches
                </Badge>
              </div>
              
              {result.error && (
                <Alert className="mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Error: {result.error}
                  </AlertDescription>
                </Alert>
              )}
              
              {result.extractedFields.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Extracted Values:</Label>
                  <div className="flex flex-wrap gap-1">
                    {result.extractedFields.slice(0, 10).map((field, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {field.value}
                      </Badge>
                    ))}
                    {result.extractedFields.length > 10 && (
                      <Badge variant="outline" className="text-xs">
                        +{result.extractedFields.length - 10} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function InteractiveFieldExtractor() {
  const [sampleLog, setSampleLog] = useState('');
  const [extractedFields, setExtractedFields] = useState<ExtractedField[]>([]);
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState('string');
  const [customRegex, setCustomRegex] = useState('');
  const [autoDetect, setAutoDetect] = useState(true);
  const [rules, setRules] = useState<FieldExtractionRule[]>([]);
  const [activeTab, setActiveTab] = useState('extract');
  const [isLoading, setIsLoading] = useState(false);

  // Sample log data for testing
  const sampleLogs = {
    apache: '127.0.0.1 - - [10/Oct/2000:13:55:36 -0700] "GET /apache_pb.gif HTTP/1.0" 200 2326',
    syslog: 'Oct 10 13:55:36 server01 sshd[1234]: Failed password for admin from 192.168.1.100 port 22 ssh2',
    json: '{"timestamp":"2024-01-10T13:55:36Z","level":"ERROR","user":"admin","action":"login_failed","ip":"192.168.1.100"}',
    csv: 'timestamp,user,action,result,ip\n2024-01-10T13:55:36Z,admin,login,failed,192.168.1.100',
    security: 'Security Alert: File hash d41d8cd98f00b204e9800998ecf8427e detected on host evil-domain.com with CVE-2021-44228',
    windows: 'Windows Event: User S-1-5-21-3623811015-3361044348-30300820-1013 failed logon from MAC 00-B0-D0-63-C2-26',
    cloud: 'AWS Instance i-0a1b2c3d4e5f67890 on Windows Server 2022 ARN arn:aws:ec2:us-west-2:123456789012:instance/i-0a1b2c3d4e5f67890',
    container: 'Container a1b2c3d4e5f67890abcd process GUID {3D5B3A8B-2E24-4F8A-A2E4-3B9B4B8B9B1D} user j.smith on Ubuntu 22.04 LTS',
    firewall: 'pfsense filterlog[12345]: 10,,1000000103,1678886400,em0,match,block,in,4,0,0,64,1234,0,0,tcp,6,512,192.168.1.5,8.8.8.8,54321,53,256',
    network: 'pihole dnsmasq[543]: query[A] example.com from 192.168.1.50',
    proxy: 'squid/access.log:1678886400.123   45 192.168.1.55 TCP_MISS/200 1234 GET http://example.com/ - HIER_DIRECT/8.8.8.8 text/html'
  };

  // Load sample log
  const loadSampleLog = (type: keyof typeof sampleLogs) => {
    setSampleLog(sampleLogs[type]);
    setExtractedFields([]);
    setSelectedText('');
    setSelectionRange(null);
  };

  // Generate regex pattern for selected text
  const generateRegexForSelection = useCallback((selected: string) => {
    let regex = '';
    
    // Escape special regex characters
    const escaped = selected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Create capturing group
    regex = `(${escaped})`;
    
    // If auto-detect is on, make it more flexible
    if (autoDetect) {
      const type = detectFieldType(selected);
      switch (type) {
        case 'hash':
          regex = '\\b([a-f0-9]{32}|[a-f0-9]{40}|[a-f0-9]{64})\\b';
          break;
        case 'sid':
          regex = '(S-1-[0-59]-\\d{2}-\\d{8,10}-\\d{8,10}-\\d{8,10}-\\d{1,5})';
          break;
        case 'cve':
          regex = '(CVE-\\d{4}-\\d{4,7})';
          break;
        case 'mitre':
          regex = '(T\\d{4}(?:\\.\\d{3})?)';
          break;
        case 'mac':
          regex = '(([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2}))';
          break;
        case 'cloud_instance':
          regex = '(i-[a-f0-9]{8,17})';
          break;
        case 'aws_arn':
          regex = '(arn:aws:[a-z0-9\\-]+:[^:]*:\\d{12}:.*)';
          break;
        case 'azure_resource':
          regex = '(\\/subscriptions\\/[^\\/]+\\/resourceGroups\\/[^\\/]+\\/providers\\/.*)';
          break;
        case 'container_id':
          regex = '([a-f0-9]{64}|[a-f0-9]{12})';
          break;
        case 'process_guid':
          regex = '(\\{[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}\\})';
          break;
        case 'os_version':
          regex = '(Windows (?:Server )?(?:\\d{4}|10|11)|Ubuntu \\d{2}\\.\\d{2}|CentOS \\d+\\.\\d+|Red Hat [^\\s]+|Debian \\d+|macOS \\d{2}\\.\\d+)';
          break;
        case 'username':
          regex = '\\b([a-zA-Z][a-zA-Z0-9._-]{1,20})\\b';
          break;
        case 'firewall_rule':
          regex = '(filterlog\\[\\d+\\]:[^\\n]+)';
          break;
        case 'dns_block':
          regex = '(dnsmasq\\[\\d+\\].*query\\[[A-Z]+\\][^\\n]+)';
          break;
        case 'proxy_report':
          regex = '(squid.*access\\.log:[^\\n]+)';
          break;
        case 'dhcp_lease':
          regex = '(dhcp.*lease[^\\n]+)';
          break;
        case 'vpn_session':
          regex = '(vpn.*session[^\\n]+|openvpn.*connected[^\\n]+)';
          break;
        case 'ids_alert':
          regex = '(ids.*alert[^\\n]+|snort.*alert[^\\n]+|suricata.*alert[^\\n]+)';
          break;
        case 'netflow':
          regex = '(netflow[^\\n]+|flow.*record[^\\n]+)';
          break;
        case 'system_auth':
          regex = '(auth.*success[^\\n]+|auth.*failure[^\\n]+|pam_unix[^\\n]+)';
          break;
        case 'ipv6':
          regex = '((?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4})';
          break;
        case 'domain':
          regex = '\\b((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9])\\b';
          break;
        case 'ip':
          regex = '(\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3})';
          break;
        case 'number':
          regex = '(\\d+)';
          break;
        case 'email':
          regex = '([^\\s@]+@[^\\s@]+\\.[^\\s@]+)';
          break;
        case 'url':
          regex = '(https?://[^\\s]+)';
          break;
        case 'date':
          regex = '(\\d{4}-\\d{2}-\\d{2}[T\\s]\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{3})?(?:Z|[+-]\\d{2}:\\d{2})?)';
          break;
        default:
          regex = `([^\\s"',;]+)`;
      }
    }
    
    setCustomRegex(regex);
  }, [autoDetect]);

  // Handle text selection in the log sample
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const selectedText = selection.toString();
      const range = selection.getRangeAt(0);
      const start = range.startOffset;
      const end = range.endOffset;
      
      setSelectedText(selectedText);
      setSelectionRange({ start, end });
      
      // Auto-generate field name from selection
      if (!fieldName) {
        const cleanName = selectedText.toLowerCase()
          .replace(/[^a-z0-9]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '');
        setFieldName(cleanName);
      }
      
      // Auto-detect field type
      if (autoDetect) {
        setFieldType(detectFieldType(selectedText));
      }
      
      // Generate regex for selection
      generateRegexForSelection(selectedText);
    }
  }, [fieldName, autoDetect, generateRegexForSelection]);

  // Detect field type based on content
  const detectFieldType = (value: string): string => {
    // Security-specific field types (highest priority)
    if (/^[a-f0-9]{32}$|^[a-f0-9]{40}$|^[a-f0-9]{64}$/i.test(value)) return 'hash';
    if (/^S-1-[0-59]-\d{2}-\d{8,10}-\d{8,10}-\d{8,10}-\d{1,5}$/.test(value)) return 'sid';
    if (/^CVE-\d{4}-\d{4,7}$/i.test(value)) return 'cve';
    if (/^T\d{4}(\.\d{3})?$/i.test(value)) return 'mitre';
    if (/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(value)) return 'mac';
    
    // Cloud and Infrastructure field types (high priority)
    if (/^i-[a-f0-9]{8,17}$/i.test(value)) return 'cloud_instance';
    if (/^arn:aws:[a-z0-9\-]+:[^:]*:\d{12}:.*$/i.test(value)) return 'aws_arn';
    if (/^\/subscriptions\/[^\/]+\/resourceGroups\/[^\/]+\/providers\/.*$/i.test(value)) return 'azure_resource';
    if (/^[a-f0-9]{64}$|^[a-f0-9]{12}$/i.test(value)) return 'container_id';
    if (/^\{[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}\}$/.test(value)) return 'process_guid';
    
    // OS Version detection
    if (/^(Windows (Server )?(\d{4}|10|11)|Ubuntu \d{2}\.\d{2}|CentOS \d+\.\d+|Red Hat|Debian \d+|macOS \d{2}\.\d+)/i.test(value)) return 'os_version';
    
    // Username detection (simple alphanumeric with dots, dashes, underscores)
    if (/^[a-zA-Z][a-zA-Z0-9._-]{1,20}$/.test(value) && !value.includes('@') && !value.includes('.com') && !value.includes('.net')) return 'username';
    
    // Network Infrastructure field types
    if (/filterlog\[\d+\]/.test(value)) return 'firewall_rule';
    if (/dnsmasq\[\d+\].*query\[A\]/.test(value)) return 'dns_block';
    if (/squid.*access\.log/.test(value)) return 'proxy_report';
    if (/dhcp.*lease/.test(value)) return 'dhcp_lease';
    if (/vpn.*session|openvpn.*connected/.test(value)) return 'vpn_session';
    if (/ids.*alert|snort.*alert|suricata.*alert/.test(value)) return 'ids_alert';
    if (/netflow|flow.*record/.test(value)) return 'netflow';
    if (/auth.*success|auth.*failure|pam_unix/.test(value)) return 'system_auth';
    
    // IPv6 (complex pattern - simplified for common formats)
    if (/^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/.test(value)) return 'ipv6';
    
    // Domain name (separate from URL)
    if (/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i.test(value) && !value.includes('http')) return 'domain';
    
    // Standard field types
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value)) return 'ip';
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'email';
    if (/^https?:\/\//.test(value)) return 'url';
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
    if (/^\d+$/.test(value)) return 'number';
    if (/^(true|false)$/i.test(value)) return 'boolean';
    
    return 'string';
  };

  // Generate regex pattern for selected text
  const generateRegexForSelection = (selected: string) => {
    let regex = '';
    
    // Escape special regex characters
    const escaped = selected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Create capturing group
    regex = `(${escaped})`;
    
    // If auto-detect is on, make it more flexible
    if (autoDetect) {
      const type = detectFieldType(selected);
      switch (type) {
        case 'hash':
          regex = '\\b([a-f0-9]{32}|[a-f0-9]{40}|[a-f0-9]{64})\\b';
          break;
        case 'sid':
          regex = '(S-1-[0-59]-\\d{2}-\\d{8,10}-\\d{8,10}-\\d{8,10}-\\d{1,5})';
          break;
        case 'cve':
          regex = '(CVE-\\d{4}-\\d{4,7})';
          break;
        case 'mitre':
          regex = '(T\\d{4}(?:\\.\\d{3})?)';
          break;
        case 'mac':
          regex = '(([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2}))';
          break;
        case 'cloud_instance':
          regex = '(i-[a-f0-9]{8,17})';
          break;
        case 'aws_arn':
          regex = '(arn:aws:[a-z0-9\\-]+:[^:]*:\\d{12}:.*)';
          break;
        case 'azure_resource':
          regex = '(\\/subscriptions\\/[^\\/]+\\/resourceGroups\\/[^\\/]+\\/providers\\/.*)';
          break;
        case 'container_id':
          regex = '([a-f0-9]{64}|[a-f0-9]{12})';
          break;
        case 'process_guid':
          regex = '(\\{[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}\\})';
          break;
        case 'os_version':
          regex = '(Windows (?:Server )?(?:\\d{4}|10|11)|Ubuntu \\d{2}\\.\\d{2}|CentOS \\d+\\.\\d+|Red Hat [^\\s]+|Debian \\d+|macOS \\d{2}\\.\\d+)';
          break;
        case 'username':
          regex = '\\b([a-zA-Z][a-zA-Z0-9._-]{1,20})\\b';
          break;
        case 'firewall_rule':
          regex = '(filterlog\\[\\d+\\]:[^\\n]+)';
          break;
        case 'dns_block':
          regex = '(dnsmasq\\[\\d+\\].*query\\[[A-Z]+\\][^\\n]+)';
          break;
        case 'proxy_report':
          regex = '(squid.*access\\.log:[^\\n]+)';
          break;
        case 'dhcp_lease':
          regex = '(dhcp.*lease[^\\n]+)';
          break;
        case 'vpn_session':
          regex = '(vpn.*session[^\\n]+|openvpn.*connected[^\\n]+)';
          break;
        case 'ids_alert':
          regex = '(ids.*alert[^\\n]+|snort.*alert[^\\n]+|suricata.*alert[^\\n]+)';
          break;
        case 'netflow':
          regex = '(netflow[^\\n]+|flow.*record[^\\n]+)';
          break;
        case 'system_auth':
          regex = '(auth.*success[^\\n]+|auth.*failure[^\\n]+|pam_unix[^\\n]+)';
          break;
        case 'ipv6':
          regex = '((?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4})';
          break;
        case 'domain':
          regex = '\\b((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9])\\b';
          break;
        case 'ip':
          regex = '(\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3})';
          break;
        case 'number':
          regex = '(\\d+)';
          break;
        case 'email':
          regex = '([^\\s@]+@[^\\s@]+\\.[^\\s@]+)';
          break;
        case 'url':
          regex = '(https?://[^\\s]+)';
          break;
        case 'date':
          regex = '(\\d{4}-\\d{2}-\\d{2}[T\\s]\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{3})?(?:Z|[+-]\\d{2}:\\d{2})?)';
          break;
        default:
          regex = `([^\\s"',;]+)`;
      }
    }
    
    setCustomRegex(regex);
  };

  // Test regex against sample log
  const testRegex = () => {
    if (!customRegex || !sampleLog) return;
    
    try {
      const regex = new RegExp(customRegex, 'g');
      const matches = [];
      let match;
      
      while ((match = regex.exec(sampleLog)) !== null) {
        matches.push({
          name: fieldName || 'extracted_field',
          value: match[1] || match[0],
          type: fieldType as any,
          regex: customRegex,
          confidence: calculateConfidence(match[1] || match[0]),
          position: { start: match.index, end: match.index + match[0].length }
        });
      }
      
      setExtractedFields(matches);
    } catch (error) {
      console.error('Invalid regex:', error);
    }
  };

  // Calculate confidence score for extracted field
  const calculateConfidence = (value: string): number => {
    let confidence = 0.5;
    
    if (value && value.length > 0) confidence += 0.2;
    if (value.length > 1) confidence += 0.1;
    if (detectFieldType(value) !== 'string') confidence += 0.2;
    
    return Math.min(confidence, 1.0);
  };

  // Save field extraction rule
  const saveRule = () => {
    if (!fieldName || !customRegex) return;
    
    const newRule: FieldExtractionRule = {
      id: Date.now().toString(),
      name: fieldName,
      description: `Extract ${fieldName} from logs`,
      regex: customRegex,
      fieldName,
      fieldType,
      enabled: true,
      created: new Date(),
      modified: new Date()
    };
    
    setRules(prev => [...prev, newRule]);
    
    // Reset form
    setFieldName('');
    setCustomRegex('');
    setSelectedText('');
    setSelectionRange(null);
  };

  // Auto-extract fields using built-in patterns
  const autoExtractFields = async () => {
    if (!sampleLog) return;
    
    setIsLoading(true);
    
    try {
      // Simulate API call to field extraction service
      const response = await fetch('/api/search/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: sampleLog,
          options: { autoDetect: true }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setExtractedFields(data.fields || []);
      }
    } catch (error) {
      console.error('Auto-extraction failed:', error);
      // Fallback to client-side extraction
      clientSideAutoExtract();
    } finally {
      setIsLoading(false);
    }
  };

  // Client-side auto extraction
  const clientSideAutoExtract = () => {
    const fields: ExtractedField[] = [];
    let match;
    
    // Security-specific patterns (highest priority)
    
    // File hashes (MD5, SHA1, SHA256)
    const hashRegex = /\b([a-f0-9]{32}|[a-f0-9]{40}|[a-f0-9]{64})\b/gi;
    while ((match = hashRegex.exec(sampleLog)) !== null) {
      fields.push({
        name: 'file_hash',
        value: match[1],
        type: 'hash',
        regex: hashRegex.source,
        confidence: 0.95,
        position: { start: match.index, end: match.index + match[0].length }
      });
    }
    
    // Windows SIDs
    const sidRegex = /(S-1-[0-59]-\d{2}-\d{8,10}-\d{8,10}-\d{8,10}-\d{1,5})/g;
    while ((match = sidRegex.exec(sampleLog)) !== null) {
      fields.push({
        name: 'windows_sid',
        value: match[1],
        type: 'sid',
        regex: sidRegex.source,
        confidence: 0.99,
        position: { start: match.index, end: match.index + match[0].length }
      });
    }
    
    // CVE IDs
    const cveRegex = /(CVE-\d{4}-\d{4,7})/gi;
    while ((match = cveRegex.exec(sampleLog)) !== null) {
      fields.push({
        name: 'cve_id',
        value: match[1],
        type: 'cve',
        regex: cveRegex.source,
        confidence: 1.0,
        position: { start: match.index, end: match.index + match[0].length }
      });
    }
    
    // MITRE ATT&CK Technique IDs
    const mitreRegex = /(T\d{4}(?:\.\d{3})?)/gi;
    while ((match = mitreRegex.exec(sampleLog)) !== null) {
      fields.push({
        name: 'mitre_technique',
        value: match[1],
        type: 'mitre',
        regex: mitreRegex.source,
        confidence: 0.98,
        position: { start: match.index, end: match.index + match[0].length }
      });
    }
    
    // MAC addresses
    const macRegex = /(([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2}))/g;
    while ((match = macRegex.exec(sampleLog)) !== null) {
      fields.push({
        name: 'mac_address',
        value: match[1],
        type: 'mac',
        regex: macRegex.source,
        confidence: 0.98,
        position: { start: match.index, end: match.index + match[0].length }
      });
    }
    
    // IPv6 addresses (simplified pattern for common formats)
    const ipv6Regex = /((?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4})/g;
    while ((match = ipv6Regex.exec(sampleLog)) !== null) {
      fields.push({
        name: 'ipv6_address',
        value: match[1],
        type: 'ipv6',
        regex: ipv6Regex.source,
        confidence: 0.95,
        position: { start: match.index, end: match.index + match[0].length }
      });
    }
    
    // Domain names (exclude URLs)
    const domainRegex = /\b((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9])\b(?![\/\w])/gi;
    while ((match = domainRegex.exec(sampleLog)) !== null) {
      if (!match[1].includes('http') && !match[1].match(/^\d+\.\d+\.\d+\.\d+$/)) {
        fields.push({
          name: 'domain_name',
          value: match[1],
          type: 'domain',
          regex: domainRegex.source,
          confidence: 0.8,
          position: { start: match.index, end: match.index + match[0].length }
        });
      }
    }
    
    // Cloud and Infrastructure patterns
    
    // AWS EC2 Instance IDs
    const awsInstanceRegex = /(i-[a-f0-9]{8,17})/gi;
    while ((match = awsInstanceRegex.exec(sampleLog)) !== null) {
      fields.push({
        name: 'aws_instance_id',
        value: match[1],
        type: 'cloud_instance',
        regex: awsInstanceRegex.source,
        confidence: 0.95,
        position: { start: match.index, end: match.index + match[0].length }
      });
    }
    
    // AWS ARNs
    const awsArnRegex = /(arn:aws:[a-z0-9\-]+:[^:]*:\d{12}:[^\s]+)/gi;
    while ((match = awsArnRegex.exec(sampleLog)) !== null) {
      fields.push({
        name: 'aws_arn',
        value: match[1],
        type: 'aws_arn',
        regex: awsArnRegex.source,
        confidence: 0.98,
        position: { start: match.index, end: match.index + match[0].length }
      });
    }
    
    // Azure Resource IDs
    const azureResourceRegex = /(\/subscriptions\/[^\/]+\/resourceGroups\/[^\/]+\/providers\/[^\s]+)/gi;
    while ((match = azureResourceRegex.exec(sampleLog)) !== null) {
      fields.push({
        name: 'azure_resource_id',
        value: match[1],
        type: 'azure_resource',
        regex: azureResourceRegex.source,
        confidence: 0.98,
        position: { start: match.index, end: match.index + match[0].length }
      });
    }
    
    // Container IDs (Docker format - 64 hex chars or short 12 hex chars)
    const containerRegex = /\b([a-f0-9]{64}|[a-f0-9]{12})\b/gi;
    while ((match = containerRegex.exec(sampleLog)) !== null) {
      // Skip if already matched as hash
      const isAlreadyMatched = fields.some(field => 
        field.position.start <= match!.index && match!.index < field.position.end
      );
      if (!isAlreadyMatched) {
        fields.push({
          name: 'container_id',
          value: match[1],
          type: 'container_id',
          regex: containerRegex.source,
          confidence: 0.85,
          position: { start: match.index, end: match.index + match[0].length }
        });
      }
    }
    
    // Process GUIDs
    const processGuidRegex = /(\{[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}\})/g;
    while ((match = processGuidRegex.exec(sampleLog)) !== null) {
      fields.push({
        name: 'process_guid',
        value: match[1],
        type: 'process_guid',
        regex: processGuidRegex.source,
        confidence: 0.95,
        position: { start: match.index, end: match.index + match[0].length }
      });
    }
    
    // OS Versions
    const osVersionRegex = /(Windows (?:Server )?(?:\d{4}|10|11)|Ubuntu \d{2}\.\d{2}|CentOS \d+\.\d+|Red Hat [^\s]+|Debian \d+|macOS \d{2}\.\d+)/gi;
    while ((match = osVersionRegex.exec(sampleLog)) !== null) {
      fields.push({
        name: 'os_version',
        value: match[1],
        type: 'os_version',
        regex: osVersionRegex.source,
        confidence: 0.8,
        position: { start: match.index, end: match.index + match[0].length }
      });
    }
    
    // Usernames (context-aware)
    const usernameRegex = /\b(user|login|account)\s*[:=]\s*([a-zA-Z][a-zA-Z0-9._-]{1,20})\b/gi;
    while ((match = usernameRegex.exec(sampleLog)) !== null) {
      fields.push({
        name: 'username',
        value: match[2],
        type: 'username',
        regex: usernameRegex.source,
        confidence: 0.7,
        position: { start: match.index, end: match.index + match[0].length }
      });
    }
    
    // Network Infrastructure patterns
    
    // Firewall rules (pfSense filterlog)
    const firewallRegex = /(filterlog\[\d+\]:[^\n]+)/gi;
    while ((match = firewallRegex.exec(sampleLog)) !== null) {
      fields.push({
        name: 'firewall_rule',
        value: match[1],
        type: 'firewall_rule',
        regex: firewallRegex.source,
        confidence: 0.95,
        position: { start: match.index, end: match.index + match[0].length }
      });
    }
    
    // DNS blocks (Pi-hole, dnsmasq)
    const dnsBlockRegex = /(dnsmasq\[\d+\].*query\[[A-Z]+\][^\n]+)/gi;
    while ((match = dnsBlockRegex.exec(sampleLog)) !== null) {
      fields.push({
        name: 'dns_block',
        value: match[1],
        type: 'dns_block',
        regex: dnsBlockRegex.source,
        confidence: 0.9,
        position: { start: match.index, end: match.index + match[0].length }
      });
    }
    
    // Proxy reports (Squid)
    const proxyRegex = /(squid.*access\.log:[^\n]+)/gi;
    while ((match = proxyRegex.exec(sampleLog)) !== null) {
      fields.push({
        name: 'proxy_report',
        value: match[1],
        type: 'proxy_report',
        regex: proxyRegex.source,
        confidence: 0.9,
        position: { start: match.index, end: match.index + match[0].length }
      });
    }
    
    // DHCP leases
    const dhcpRegex = /(dhcp.*lease[^\n]+)/gi;
    while ((match = dhcpRegex.exec(sampleLog)) !== null) {
      fields.push({
        name: 'dhcp_lease',
        value: match[1],
        type: 'dhcp_lease',
        regex: dhcpRegex.source,
        confidence: 0.85,
        position: { start: match.index, end: match.index + match[0].length }
      });
    }
    
    // VPN sessions
    const vpnRegex = /(vpn.*session[^\n]+|openvpn.*connected[^\n]+)/gi;
    while ((match = vpnRegex.exec(sampleLog)) !== null) {
      fields.push({
        name: 'vpn_session',
        value: match[1],
        type: 'vpn_session',
        regex: vpnRegex.source,
        confidence: 0.9,
        position: { start: match.index, end: match.index + match[0].length }
      });
    }
    
    // IDS alerts
    const idsRegex = /(ids.*alert[^\n]+|snort.*alert[^\n]+|suricata.*alert[^\n]+)/gi;
    while ((match = idsRegex.exec(sampleLog)) !== null) {
      fields.push({
        name: 'ids_alert',
        value: match[1],
        type: 'ids_alert',
        regex: idsRegex.source,
        confidence: 0.95,
        position: { start: match.index, end: match.index + match[0].length }
      });
    }
    
    // NetFlow records
    const netflowRegex = /(netflow[^\n]+|flow.*record[^\n]+)/gi;
    while ((match = netflowRegex.exec(sampleLog)) !== null) {
      fields.push({
        name: 'netflow',
        value: match[1],
        type: 'netflow',
        regex: netflowRegex.source,
        confidence: 0.9,
        position: { start: match.index, end: match.index + match[0].length }
      });
    }
    
    // System authentication
    const systemAuthRegex = /(auth.*success[^\n]+|auth.*failure[^\n]+|pam_unix[^\n]+)/gi;
    while ((match = systemAuthRegex.exec(sampleLog)) !== null) {
      fields.push({
        name: 'system_auth',
        value: match[1],
        type: 'system_auth',
        regex: systemAuthRegex.source,
        confidence: 0.85,
        position: { start: match.index, end: match.index + match[0].length }
      });
    }
    
    // Standard patterns
    
    // IPv4 addresses
    const ipRegex = /\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/g;
    while ((match = ipRegex.exec(sampleLog)) !== null) {
      fields.push({
        name: 'ip_address',
        value: match[1],
        type: 'ip',
        regex: ipRegex.source,
        confidence: 0.9,
        position: { start: match.index, end: match.index + match[0].length }
      });
    }
    
    // Email addresses
    const emailRegex = /\b([^\s@]+@[^\s@]+\.[^\s@]+)\b/g;
    while ((match = emailRegex.exec(sampleLog)) !== null) {
      fields.push({
        name: 'email_address',
        value: match[1],
        type: 'email',
        regex: emailRegex.source,
        confidence: 0.9,
        position: { start: match.index, end: match.index + match[0].length }
      });
    }
    
    // URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    while ((match = urlRegex.exec(sampleLog)) !== null) {
      fields.push({
        name: 'url',
        value: match[1],
        type: 'url',
        regex: urlRegex.source,
        confidence: 0.95,
        position: { start: match.index, end: match.index + match[0].length }
      });
    }
    
    // Timestamps
    const timestampRegex = /\b(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?)\b/g;
    while ((match = timestampRegex.exec(sampleLog)) !== null) {
      fields.push({
        name: 'timestamp',
        value: match[1],
        type: 'date',
        regex: timestampRegex.source,
        confidence: 0.95,
        position: { start: match.index, end: match.index + match[0].length }
      });
    }
    
    // Numbers (lower priority to avoid false positives)
    const numberRegex = /\b(\d+)\b/g;
    while ((match = numberRegex.exec(sampleLog)) !== null) {
      // Skip if already matched as part of other patterns
      const isPartOfOtherPattern = fields.some(field => 
        match!.index >= field.position.start && match!.index < field.position.end
      );
      if (!isPartOfOtherPattern) {
        fields.push({
          name: 'number',
          value: match[1],
          type: 'number',
          regex: numberRegex.source,
          confidence: 0.7,
          position: { start: match.index, end: match.index + match[0].length }
        });
      }
    }
    
    setExtractedFields(fields);
  };

  // Apply existing rules to sample log
  const applyRules = () => {
    const fields: ExtractedField[] = [];
    
    rules.filter(rule => rule.enabled).forEach(rule => {
      try {
        const regex = new RegExp(rule.regex, 'g');
        let match;
        
        while ((match = regex.exec(sampleLog)) !== null) {
          fields.push({
            name: rule.fieldName,
            value: match[1] || match[0],
            type: rule.fieldType as any,
            regex: rule.regex,
            confidence: 0.85,
            position: { start: match.index, end: match.index + match[0].length }
          });
        }
      } catch (error) {
        console.error(`Error applying rule ${rule.name}:`, error);
      }
    });
    
    setExtractedFields(fields);
  };

  // Delete rule
  const deleteRule = (ruleId: string) => {
    setRules(prev => prev.filter(rule => rule.id !== ruleId));
  };

  // Toggle rule enabled state
  const toggleRule = (ruleId: string) => {
    setRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    ));
  };

  // Copy regex to clipboard
  const copyRegex = (regex: string) => {
    navigator.clipboard.writeText(regex);
  };

  useEffect(() => {
    if (customRegex && sampleLog) {
      testRegex();
    }
  }, [customRegex, sampleLog, fieldName, fieldType]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Interactive Field Extractor</h2>
          <p className="text-muted-foreground">
            Extract custom fields from log data using regex patterns or visual selection
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="extract">Field Extraction</TabsTrigger>
          <TabsTrigger value="rules">Extraction Rules</TabsTrigger>
          <TabsTrigger value="test">Test & Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="extract" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Log Sample Input */}
            <Card>
              <CardHeader>
                <CardTitle>Log Sample</CardTitle>
                <CardDescription>
                  Paste a sample log entry or load a template
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadSampleLog('apache')}
                  >
                    Apache
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadSampleLog('syslog')}
                  >
                    Syslog
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadSampleLog('json')}
                  >
                    JSON
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadSampleLog('csv')}
                  >
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadSampleLog('security')}
                    className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                  >
                    Security
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadSampleLog('windows')}
                    className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                  >
                    Windows
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadSampleLog('cloud')}
                    className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                  >
                    Cloud
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadSampleLog('container')}
                    className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                  >
                    Container
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadSampleLog('firewall')}
                    className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                  >
                    Firewall
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadSampleLog('network')}
                    className="bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100"
                  >
                    Network
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadSampleLog('proxy')}
                    className="bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100"
                  >
                    Proxy
                  </Button>
                </div>
                
                <Textarea
                  placeholder="Paste your log sample here..."
                  value={sampleLog}
                  onChange={(e) => setSampleLog(e.target.value)}
                  onMouseUp={handleTextSelection}
                  className="min-h-[120px] font-mono text-sm"
                />
                
                <div className="flex gap-2">
                  <Button
                    onClick={autoExtractFields}
                    disabled={!sampleLog || isLoading}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Eye className="w-4 h-4 mr-2" />
                    )}
                    Auto Extract
                  </Button>
                  <Button
                    variant="outline"
                    onClick={applyRules}
                    disabled={!sampleLog || rules.length === 0}
                  >
                    Apply Rules
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Field Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Field Configuration</CardTitle>
                <CardDescription>
                  Configure extraction for selected text
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedText && (
                  <Alert>
                    <AlertDescription>
                      Selected: <code className="bg-muted px-1 rounded">{selectedText}</code>
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fieldName">Field Name</Label>
                    <Input
                      id="fieldName"
                      placeholder="e.g., user_id"
                      value={fieldName}
                      onChange={(e) => setFieldName(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="fieldType">Field Type</Label>
                    <Select value={fieldType} onValueChange={setFieldType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="string">String</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="boolean">Boolean</SelectItem>
                        <SelectItem value="date">Date/Timestamp</SelectItem>
                        <SelectItem value="ip">IPv4 Address</SelectItem>
                        <SelectItem value="ipv6">IPv6 Address</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="url">URL</SelectItem>
                        <SelectItem value="hash">File Hash (MD5/SHA1/SHA256)</SelectItem>
                        <SelectItem value="domain">Domain Name</SelectItem>
                        <SelectItem value="mac">MAC Address</SelectItem>
                        <SelectItem value="sid">Windows SID</SelectItem>
                        <SelectItem value="cve">CVE ID</SelectItem>
                        <SelectItem value="mitre">MITRE ATT&CK Technique</SelectItem>
                        <SelectItem value="os_version">OS Version</SelectItem>
                        <SelectItem value="cloud_instance">Cloud Instance ID</SelectItem>
                        <SelectItem value="container_id">Container ID</SelectItem>
                        <SelectItem value="aws_arn">AWS ARN</SelectItem>
                        <SelectItem value="azure_resource">Azure Resource ID</SelectItem>
                        <SelectItem value="process_guid">Process GUID</SelectItem>
                        <SelectItem value="username">Username</SelectItem>
                        <SelectItem value="firewall_rule">Firewall Rule</SelectItem>
                        <SelectItem value="dhcp_lease">DHCP Lease</SelectItem>
                        <SelectItem value="vpn_session">VPN Session</SelectItem>
                        <SelectItem value="ids_alert">IDS Alert</SelectItem>
                        <SelectItem value="dns_block">DNS Block</SelectItem>
                        <SelectItem value="system_auth">System Auth</SelectItem>
                        <SelectItem value="netflow">NetFlow</SelectItem>
                        <SelectItem value="proxy_report">Proxy Report</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="regex">Regular Expression</Label>
                  <div className="flex gap-2">
                    <Input
                      id="regex"
                      placeholder="e.g., (\\w+)"
                      value={customRegex}
                      onChange={(e) => setCustomRegex(e.target.value)}
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyRegex(customRegex)}
                      disabled={!customRegex}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="autoDetect"
                    checked={autoDetect}
                    onCheckedChange={setAutoDetect}
                  />
                  <Label htmlFor="autoDetect">Auto-detect field type</Label>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={testRegex}
                    disabled={!customRegex || !sampleLog}
                    className="flex-1"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Test Regex
                  </Button>
                  <Button
                    onClick={saveRule}
                    disabled={!fieldName || !customRegex}
                    variant="outline"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Rule
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Extracted Fields Preview */}
          {extractedFields.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Extracted Fields</CardTitle>
                <CardDescription>
                  Preview of fields extracted from the sample log
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {extractedFields.map((field, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{field.type}</Badge>
                        <div>
                          <div className="font-medium">{field.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Value: <code className="bg-muted px-1 rounded">{field.value}</code>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {Math.round(field.confidence * 100)}% confidence
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyRegex(field.regex)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Field Extraction Rules</CardTitle>
              <CardDescription>
                Manage your saved field extraction patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No extraction rules defined yet. Create some in the Field Extraction tab.
                </div>
              ) : (
                <div className="space-y-3">
                  {rules.map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={() => toggleRule(rule.id)}
                        />
                        <div>
                          <div className="font-medium">{rule.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {rule.description}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono mt-1">
                            {rule.regex}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{rule.fieldType}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyRegex(rule.regex)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteRule(rule.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test & Preview</CardTitle>
              <CardDescription>
                Test your extraction rules against multiple log samples
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <TestAndPreviewSection 
                rules={rules}
                onTestResults={(results) => setExtractedFields(results)}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}