'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Search, 
  Eye, 
  UserCheck,
  Shield,
  Calendar,
  User
} from 'lucide-react';

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  assignee: string;
  reporter: string;
  createdAt: string;
  updatedAt: string;
  ruleId?: string;
  ruleName?: string;
  affectedAssets: string[];
  tags: string[];
}

export function IncidentsList() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [filteredIncidents, setFilteredIncidents] = useState<Incident[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Mock data for development
  const mockIncidents: Incident[] = [
    {
      id: 'INC-001',
      title: 'Multiple Failed Login Attempts from 192.168.1.100',
      description: 'Detected 15 failed login attempts within 5 minutes from IP address 192.168.1.100',
      severity: 'high',
      status: 'investigating',
      assignee: 'Sarah Johnson',
      reporter: 'Correlation Engine',
      createdAt: '2024-01-20 14:30:00',
      updatedAt: '2024-01-20 15:15:00',
      ruleId: '1',
      ruleName: 'Multiple Failed Logins',
      affectedAssets: ['AD-SERVER-01', 'LOGIN-PORTAL'],
      tags: ['authentication', 'brute-force']
    },
    {
      id: 'INC-002',
      title: 'Suspicious PowerShell Activity on WORKSTATION-05',
      description: 'Encoded PowerShell command executed attempting to download external payload',
      severity: 'critical',
      status: 'open',
      assignee: 'Mike Chen',
      reporter: 'EDR System',
      createdAt: '2024-01-20 13:45:00',
      updatedAt: '2024-01-20 13:45:00',
      ruleId: '2',
      ruleName: 'Suspicious PowerShell Execution',
      affectedAssets: ['WORKSTATION-05'],
      tags: ['malware', 'powershell', 'download']
    },
    {
      id: 'INC-003',
      title: 'Potential Data Exfiltration to External IP',
      description: 'Large volume data transfer (2.3GB) to unknown external IP 203.45.67.89',
      severity: 'critical',
      status: 'resolved',
      assignee: 'Alex Rodriguez',
      reporter: 'Network Monitor',
      createdAt: '2024-01-19 22:15:00',
      updatedAt: '2024-01-20 09:30:00',
      ruleId: '3',
      ruleName: 'Data Exfiltration Pattern',
      affectedAssets: ['FILE-SERVER-02', 'FIREWALL-01'],
      tags: ['data-loss', 'exfiltration', 'network']
    },
    {
      id: 'INC-004',
      title: 'Privilege Escalation Attempt on WEB-SERVER-01',
      description: 'User account attempted to gain administrator privileges using known exploit',
      severity: 'high',
      status: 'investigating',
      assignee: 'Lisa Wang',
      reporter: 'Security Monitor',
      createdAt: '2024-01-20 11:20:00',
      updatedAt: '2024-01-20 12:45:00',
      ruleId: '4',
      ruleName: 'Privilege Escalation Attempt',
      affectedAssets: ['WEB-SERVER-01'],
      tags: ['privilege-escalation', 'exploit']
    },
    {
      id: 'INC-005',
      title: 'Malware Detected on LAPTOP-USER-42',
      description: 'Trojan.GenKD detected and quarantined by endpoint protection',
      severity: 'medium',
      status: 'closed',
      assignee: 'David Kim',
      reporter: 'Antivirus System',
      createdAt: '2024-01-19 16:30:00',
      updatedAt: '2024-01-19 18:00:00',
      affectedAssets: ['LAPTOP-USER-42'],
      tags: ['malware', 'trojan', 'quarantined']
    }
  ];

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setIncidents(mockIncidents);
      setFilteredIncidents(mockIncidents);
      setLoading(false);
    }, 1000);
  }, []);

  useEffect(() => {
    let filtered = incidents;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(incident =>
        incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(incident => incident.status === filterStatus);
    }

    // Filter by severity
    if (filterSeverity !== 'all') {
      filtered = filtered.filter(incident => incident.severity === filterSeverity);
    }

    setFilteredIncidents(filtered);
  }, [incidents, searchTerm, filterStatus, filterSeverity]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'investigating': return <Search className="h-4 w-4 text-orange-500" />;
      case 'resolved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'closed': return <Shield className="h-4 w-4 text-gray-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-red-600 bg-red-50 border-red-200';
      case 'investigating': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'resolved': return 'text-green-600 bg-green-50 border-green-200';
      case 'closed': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const updateIncidentStatus = (incidentId: string, newStatus: string) => {
    setIncidents(prevIncidents =>
      prevIncidents.map(incident =>
        incident.id === incidentId
          ? { 
              ...incident, 
              status: newStatus as any,
              updatedAt: new Date().toISOString()
            }
          : incident
      )
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security Incidents</CardTitle>
        <CardDescription>
          Track and manage security incidents detected by correlation rules
        </CardDescription>
        
        {/* Search and Filter Controls */}
        <div className="flex gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search incidents..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-2 border rounded-md bg-background"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            className="px-3 py-2 border rounded-md bg-background"
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
          >
            <option value="all">All Severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </CardHeader>

      <CardContent>
        {filteredIncidents.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Incidents Found</h3>
            <p className="text-muted-foreground">
              {searchTerm || filterStatus !== 'all' || filterSeverity !== 'all'
                ? 'No incidents match your current filters.'
                : 'No security incidents detected. Great job!'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Incident ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIncidents.map((incident) => (
                <TableRow key={incident.id}>
                  <TableCell>
                    <div className="font-mono text-sm">{incident.id}</div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{incident.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {incident.description.substring(0, 80)}...
                      </div>
                      <div className="flex gap-1 mt-1">
                        {incident.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {incident.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{incident.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getSeverityColor(incident.severity)} text-white`}>
                      {incident.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(incident.status)}
                      <Badge variant="outline" className={getStatusColor(incident.status)}>
                        {incident.status}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{incident.assignee}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{formatDate(incident.createdAt)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {incident.status === 'open' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateIncidentStatus(incident.id, 'investigating')}
                          title="Start Investigation"
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>
                      )}
                      {incident.status === 'investigating' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateIncidentStatus(incident.id, 'resolved')}
                          title="Mark Resolved"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}