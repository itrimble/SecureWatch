export const PREDEFINED_PROFILES = [
    // Windows Event Log Profile
    {
        id: 'windows-event-log',
        name: 'Windows Event Log',
        description: 'Standard mapping for Windows Event Logs',
        sourceType: 'windows_event',
        mappings: [
            { sourceField: 'eventId', targetField: 'event.id', required: true },
            { sourceField: 'level', targetField: 'event.type', transformation: 'lowercase' },
            { sourceField: 'provider', targetField: 'source.name' },
            { sourceField: 'computer', targetField: 'host.name', required: true },
            { sourceField: 'computer', targetField: 'host.hostname' },
            { sourceField: 'timeCreated', targetField: 'timestamp', required: true },
            { sourceField: 'message', targetField: 'message' },
            { sourceField: 'channel', targetField: 'labels.channel' },
            { sourceField: 'keywords', targetField: 'labels.keywords', transformation: 'joinArray' },
            { sourceField: 'data.SubjectUserName', targetField: 'user.name' },
            { sourceField: 'data.SubjectDomainName', targetField: 'user.domain' },
            { sourceField: 'data.ProcessName', targetField: 'process.executable' },
            { sourceField: 'data.ProcessId', targetField: 'process.pid', transformation: 'parseInt' },
            { sourceField: 'data.SourceIPAddress', targetField: 'source_ip' },
            { sourceField: 'data.TargetUserName', targetField: 'labels.target_user' }
        ],
        transformations: {
            'event.severity': {
                type: 'lookup',
                parameters: {
                    map: {
                        'Critical': 1,
                        'Error': 2,
                        'Warning': 3,
                        'Information': 4,
                        'Verbose': 5
                    },
                    default: 4
                }
            },
            'event.category': {
                type: 'lookup',
                parameters: {
                    map: {
                        '4624': 'authentication',
                        '4625': 'authentication',
                        '4648': 'authentication',
                        '4672': 'iam',
                        '1074': 'host',
                        '7040': 'configuration'
                    },
                    default: 'system'
                }
            }
        },
        validations: [
            { field: 'event.id', type: 'required', condition: true, message: 'Event ID is required' },
            { field: 'timestamp', type: 'required', condition: true, message: 'Timestamp is required' },
            { field: 'host.name', type: 'required', condition: true, message: 'Host name is required' }
        ]
    },
    // Syslog RFC 3164 Profile
    {
        id: 'syslog-rfc3164',
        name: 'Syslog RFC 3164',
        description: 'Standard mapping for RFC 3164 Syslog messages',
        sourceType: 'syslog',
        mappings: [
            { sourceField: 'priority', targetField: 'labels.priority' },
            { sourceField: 'facility', targetField: 'labels.facility' },
            { sourceField: 'severity', targetField: 'event.severity', transformation: 'parseInt' },
            { sourceField: 'timestamp', targetField: 'timestamp' },
            { sourceField: 'hostname', targetField: 'host.name' },
            { sourceField: 'hostname', targetField: 'host.hostname' },
            { sourceField: 'appName', targetField: 'process.name' },
            { sourceField: 'message', targetField: 'message', required: true },
            { sourceField: 'rfc', targetField: 'labels.rfc' }
        ],
        transformations: {
            'event.category': {
                type: 'lookup',
                parameters: {
                    map: {
                        '0': 'system', // kernel messages
                        '1': 'system', // user-level messages
                        '2': 'email', // mail system
                        '3': 'system', // system daemons
                        '4': 'authentication', // security/authorization messages
                        '10': 'authentication', // security/authorization messages
                        '16': 'application', // local use facilities
                        '17': 'application',
                        '18': 'application',
                        '19': 'application',
                        '20': 'application',
                        '21': 'application',
                        '22': 'application',
                        '23': 'application'
                    },
                    default: 'system'
                }
            }
        },
        validations: [
            { field: 'message', type: 'required', condition: true, message: 'Message is required' },
            { field: 'event.severity', type: 'range', condition: { min: 0, max: 7 }, message: 'Severity must be 0-7' }
        ]
    },
    // Syslog RFC 5424 Profile
    {
        id: 'syslog-rfc5424',
        name: 'Syslog RFC 5424',
        description: 'Standard mapping for RFC 5424 Syslog messages',
        sourceType: 'syslog',
        mappings: [
            { sourceField: 'priority', targetField: 'labels.priority' },
            { sourceField: 'version', targetField: 'source.version' },
            { sourceField: 'facility', targetField: 'labels.facility' },
            { sourceField: 'severity', targetField: 'event.severity', transformation: 'parseInt' },
            { sourceField: 'timestamp', targetField: 'timestamp' },
            { sourceField: 'hostname', targetField: 'host.name' },
            { sourceField: 'hostname', targetField: 'host.hostname' },
            { sourceField: 'appName', targetField: 'process.name' },
            { sourceField: 'procId', targetField: 'process.pid', transformation: 'parseInt' },
            { sourceField: 'msgId', targetField: 'event.id' },
            { sourceField: 'message', targetField: 'message', required: true },
            { sourceField: 'structuredData', targetField: 'metadata.parsed.structured_data' },
            { sourceField: 'rfc', targetField: 'labels.rfc' }
        ],
        transformations: {
            'event.category': {
                type: 'lookup',
                parameters: {
                    map: {
                        '0': 'system',
                        '4': 'authentication',
                        '10': 'authentication',
                        '16': 'application',
                        '17': 'application',
                        '18': 'application',
                        '19': 'application',
                        '20': 'application',
                        '21': 'application',
                        '22': 'application',
                        '23': 'application'
                    },
                    default: 'system'
                }
            }
        },
        validations: [
            { field: 'message', type: 'required', condition: true, message: 'Message is required' },
            { field: 'event.severity', type: 'range', condition: { min: 0, max: 7 }, message: 'Severity must be 0-7' }
        ]
    },
    // AWS CloudTrail Profile
    {
        id: 'aws-cloudtrail',
        name: 'AWS CloudTrail',
        description: 'Standard mapping for AWS CloudTrail events',
        sourceType: 'cloud_trail',
        mappings: [
            { sourceField: 'eventId', targetField: 'id', required: true },
            { sourceField: 'eventName', targetField: 'event.action', required: true },
            { sourceField: 'eventSource', targetField: 'source.name' },
            { sourceField: 'eventTime', targetField: 'timestamp', required: true },
            { sourceField: 'userName', targetField: 'user.name' },
            { sourceField: 'userIdentity.principalId', targetField: 'user.id' },
            { sourceField: 'userIdentity.arn', targetField: 'labels.user_arn' },
            { sourceField: 'sourceIPAddress', targetField: 'source_ip' },
            { sourceField: 'userAgent', targetField: 'user_agent' },
            { sourceField: 'requestParameters', targetField: 'metadata.parsed.request_parameters' },
            { sourceField: 'responseElements', targetField: 'metadata.parsed.response_elements' },
            { sourceField: 'errorCode', targetField: 'labels.error_code' },
            { sourceField: 'errorMessage', targetField: 'labels.error_message' },
            { sourceField: 'resources', targetField: 'metadata.parsed.resources' }
        ],
        transformations: {
            'event.outcome': {
                type: 'lookup',
                parameters: {
                    map: {
                        'undefined': 'success',
                        'null': 'success'
                    },
                    default: 'failure'
                }
            },
            'event.category': {
                type: 'lookup',
                parameters: {
                    map: {
                        'ConsoleLogin': 'authentication',
                        'AssumeRole': 'authentication',
                        'CreateUser': 'iam',
                        'DeleteUser': 'iam',
                        'AttachUserPolicy': 'iam',
                        'CreateRole': 'iam',
                        'CreateInstance': 'host',
                        'TerminateInstances': 'host'
                    },
                    default: 'cloud'
                }
            }
        },
        validations: [
            { field: 'id', type: 'required', condition: true, message: 'Event ID is required' },
            { field: 'event.action', type: 'required', condition: true, message: 'Event action is required' },
            { field: 'timestamp', type: 'required', condition: true, message: 'Timestamp is required' }
        ]
    },
    // Network Security Device Profile (Generic)
    {
        id: 'network-security-generic',
        name: 'Network Security Device',
        description: 'Generic mapping for network security devices (firewalls, IDS/IPS)',
        sourceType: 'network_security',
        mappings: [
            { sourceField: 'id', targetField: 'id', required: true },
            { sourceField: 'timestamp', targetField: 'timestamp', required: true },
            { sourceField: 'deviceName', targetField: 'host.name' },
            { sourceField: 'deviceIp', targetField: 'host.ip' },
            { sourceField: 'severity', targetField: 'event.severity' },
            { sourceField: 'action', targetField: 'event.action', required: true },
            { sourceField: 'sourceIp', targetField: 'source_ip', required: true },
            { sourceField: 'sourcePort', targetField: 'labels.source_port' },
            { sourceField: 'destIp', targetField: 'destination.ip', required: true },
            { sourceField: 'destPort', targetField: 'destination.port' },
            { sourceField: 'protocol', targetField: 'network.protocol', transformation: 'lowercase' },
            { sourceField: 'bytes', targetField: 'network.bytes', transformation: 'parseInt' },
            { sourceField: 'packets', targetField: 'network.packets', transformation: 'parseInt' },
            { sourceField: 'duration', targetField: 'network.duration', transformation: 'parseInt' },
            { sourceField: 'rule', targetField: 'labels.rule' },
            { sourceField: 'signature', targetField: 'labels.signature' },
            { sourceField: 'threat.name', targetField: 'threat.technique.name' },
            { sourceField: 'threat.category', targetField: 'threat.framework' },
            { sourceField: 'threat.confidence', targetField: 'labels.threat_confidence' },
            { sourceField: 'application', targetField: 'labels.application' },
            { sourceField: 'user', targetField: 'user.name' },
            { sourceField: 'geo.sourceCountry', targetField: 'labels.source_country' },
            { sourceField: 'geo.destCountry', targetField: 'labels.dest_country' }
        ],
        transformations: {
            'event.severity': {
                type: 'lookup',
                parameters: {
                    map: {
                        'Low': 4,
                        'Medium': 3,
                        'High': 2,
                        'Critical': 1
                    },
                    default: 3
                }
            },
            'event.category': {
                type: 'lookup',
                parameters: {
                    map: {
                        'allow': 'network',
                        'deny': 'network',
                        'drop': 'network',
                        'alert': 'intrusion_detection',
                        'block': 'intrusion_detection'
                    },
                    default: 'network'
                }
            },
            'event.outcome': {
                type: 'lookup',
                parameters: {
                    map: {
                        'allow': 'success',
                        'deny': 'failure',
                        'drop': 'failure',
                        'alert': 'unknown',
                        'block': 'failure'
                    },
                    default: 'unknown'
                }
            }
        },
        validations: [
            { field: 'source_ip', type: 'format', condition: '^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$', message: 'Invalid source IP format' },
            { field: 'destination.ip', type: 'format', condition: '^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$', message: 'Invalid destination IP format' },
            { field: 'event.action', type: 'enum', condition: ['allow', 'deny', 'drop', 'alert', 'block', 'monitor'], message: 'Invalid action' }
        ]
    },
    // Common Web Server Log Profile (Apache/Nginx)
    {
        id: 'web-server-access',
        name: 'Web Server Access Log',
        description: 'Standard mapping for web server access logs',
        sourceType: 'application_web',
        mappings: [
            { sourceField: 'client_ip', targetField: 'source_ip', required: true },
            { sourceField: 'timestamp', targetField: 'timestamp', required: true },
            { sourceField: 'method', targetField: 'labels.http_method', required: true },
            { sourceField: 'url', targetField: 'labels.url', required: true },
            { sourceField: 'status_code', targetField: 'labels.status_code', transformation: 'parseInt', required: true },
            { sourceField: 'response_size', targetField: 'network.bytes', transformation: 'parseInt' },
            { sourceField: 'referer', targetField: 'labels.referer' },
            { sourceField: 'user_agent', targetField: 'user_agent' },
            { sourceField: 'response_time', targetField: 'labels.response_time', transformation: 'parseFloat' },
            { sourceField: 'server_name', targetField: 'host.name' },
            { sourceField: 'user', targetField: 'user.name' }
        ],
        transformations: {
            'event.action': {
                type: 'lookup',
                parameters: {
                    map: {
                        'GET': 'http-get',
                        'POST': 'http-post',
                        'PUT': 'http-put',
                        'DELETE': 'http-delete',
                        'HEAD': 'http-head',
                        'OPTIONS': 'http-options'
                    },
                    default: 'http-request'
                }
            },
            'event.outcome': {
                type: 'custom',
                parameters: {
                    function: 'status_code_to_outcome'
                }
            },
            'event.category': {
                type: 'lookup',
                parameters: {
                    map: {},
                    default: 'web'
                }
            }
        },
        validations: [
            { field: 'source_ip', type: 'format', condition: '^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$', message: 'Invalid IP format' },
            { field: 'labels.status_code', type: 'range', condition: { min: 100, max: 599 }, message: 'Invalid HTTP status code' },
            { field: 'labels.http_method', type: 'enum', condition: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH'], message: 'Invalid HTTP method' }
        ]
    }
];
export default PREDEFINED_PROFILES;
//# sourceMappingURL=predefined-profiles.js.map