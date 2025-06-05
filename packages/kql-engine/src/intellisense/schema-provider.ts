import { SchemaInfo, TableInfo, ColumnInfo, FunctionInfo, OperatorInfo, KeywordInfo } from './types';

export class SchemaProvider {
  private schema: SchemaInfo;

  constructor() {
    this.schema = this.initializeSchema();
  }

  getSchema(): SchemaInfo {
    return this.schema;
  }

  getTables(): TableInfo[] {
    return this.schema.tables;
  }

  getTable(name: string): TableInfo | undefined {
    return this.schema.tables.find(t => t.name.toLowerCase() === name.toLowerCase());
  }

  getColumns(tableName: string): ColumnInfo[] {
    const table = this.getTable(tableName);
    return table ? table.columns : [];
  }

  getColumn(tableName: string, columnName: string): ColumnInfo | undefined {
    const columns = this.getColumns(tableName);
    return columns.find(c => c.name.toLowerCase() === columnName.toLowerCase());
  }

  getFunctions(): FunctionInfo[] {
    return this.schema.functions;
  }

  getFunction(name: string): FunctionInfo | undefined {
    return this.schema.functions.find(f => f.name.toLowerCase() === name.toLowerCase());
  }

  getOperators(): OperatorInfo[] {
    return this.schema.operators;
  }

  getKeywords(): KeywordInfo[] {
    return this.schema.keywords;
  }

  private initializeSchema(): SchemaInfo {
    return {
      tables: this.initializeTables(),
      functions: this.initializeFunctions(),
      operators: this.initializeOperators(),
      keywords: this.initializeKeywords()
    };
  }

  private initializeTables(): TableInfo[] {
    return [
      {
        name: 'logs',
        description: 'Main table containing all normalized log events',
        columns: [
          { name: 'id', type: 'string', description: 'Unique event identifier', nullable: false },
          { name: 'timestamp', type: 'datetime', description: 'Event timestamp', nullable: false, examples: ['2024-01-01T12:00:00Z'] },
          { name: 'organization_id', type: 'string', description: 'Organization identifier', nullable: false },
          { name: 'source_identifier', type: 'string', description: 'Log source identifier', nullable: false, examples: ['macos_auth_events', 'windows_security', 'syslog'] },
          { name: 'source_type', type: 'string', description: 'Log source type', nullable: false, examples: ['macos-agent', 'windows', 'syslog'] },
          { name: 'log_level', type: 'string', description: 'Log level', nullable: true, examples: ['INFO', 'WARN', 'ERROR', 'DEBUG'] },
          { name: 'message', type: 'string', description: 'Event message or description', nullable: true },
          { name: 'facility', type: 'string', description: 'Syslog facility', nullable: true },
          { name: 'severity', type: 'int', description: 'Syslog severity level', nullable: true },
          { name: 'hostname', type: 'string', description: 'Source hostname', nullable: true },
          { name: 'process_name', type: 'string', description: 'Process name', nullable: true },
          { name: 'process_id', type: 'int', description: 'Process ID', nullable: true },
          { name: 'user_name', type: 'string', description: 'Associated username', nullable: true },
          { name: 'event_id', type: 'string', description: 'Event ID', nullable: true },
          { name: 'event_category', type: 'string', description: 'Event category', nullable: true, examples: ['authentication', 'network', 'process', 'file'] },
          { name: 'event_subcategory', type: 'string', description: 'Event subcategory', nullable: true },
          { name: 'source_ip', type: 'string', description: 'Source IP address', nullable: true },
          { name: 'destination_ip', type: 'string', description: 'Destination IP address', nullable: true },
          { name: 'source_port', type: 'int', description: 'Source port', nullable: true },
          { name: 'destination_port', type: 'int', description: 'Destination port', nullable: true },
          { name: 'protocol', type: 'string', description: 'Network protocol', nullable: true },
          { name: 'file_path', type: 'string', description: 'File path', nullable: true },
          { name: 'file_hash', type: 'string', description: 'File hash', nullable: true },
          { name: 'auth_user', type: 'string', description: 'Authentication user', nullable: true },
          { name: 'auth_domain', type: 'string', description: 'Authentication domain', nullable: true },
          { name: 'auth_method', type: 'string', description: 'Authentication method', nullable: true },
          { name: 'auth_result', type: 'string', description: 'Authentication result', nullable: true },
          { name: 'attributes', type: 'dynamic', description: 'Additional event attributes as JSON', nullable: true },
          { name: 'ingested_at', type: 'datetime', description: 'Ingestion timestamp', nullable: true },
          { name: 'processed_at', type: 'datetime', description: 'Processing timestamp', nullable: true },
          { name: 'normalized', type: 'bool', description: 'Whether the log is normalized', nullable: true },
          { name: 'enriched', type: 'bool', description: 'Whether the log is enriched', nullable: true },
          { name: 'search_vector', type: 'string', description: 'Full-text search vector', nullable: true }
        ],
        sampleQueries: [
          'logs | where log_level == "ERROR"',
          'logs | where timestamp > ago(1h)',
          'logs | summarize count() by source_type',
          'logs | where user_name contains "admin"',
          'logs | where hostname contains "server"',
          'logs | where source_identifier == "macos_auth_events"'
        ]
      },
      {
        name: 'log_events_warm',
        description: 'Warm tier storage for older log events (8-30 days)',
        columns: [
          { name: 'id', type: 'string', description: 'Unique event identifier', nullable: false },
          { name: 'timestamp', type: 'datetime', description: 'Event timestamp', nullable: false },
          { name: 'organization_id', type: 'string', description: 'Organization identifier', nullable: false },
          { name: 'source', type: 'string', description: 'Log source system', nullable: false },
          { name: 'severity', type: 'string', description: 'Event severity level', nullable: false },
          { name: 'category', type: 'string', description: 'Event category', nullable: false },
          { name: 'message', type: 'string', description: 'Event message or description', nullable: true },
          { name: 'event_data', type: 'dynamic', description: 'Additional event data as JSON', nullable: true },
          { name: 'risk_score', type: 'int', description: 'Risk score (0-100)', nullable: true }
        ]
      },
      {
        name: 'log_events_cold',
        description: 'Cold tier storage for archived log events (31-90 days)',
        columns: [
          { name: 'id', type: 'string', description: 'Unique event identifier', nullable: false },
          { name: 'timestamp', type: 'datetime', description: 'Event timestamp', nullable: false },
          { name: 'organization_id', type: 'string', description: 'Organization identifier', nullable: false },
          { name: 'source', type: 'string', description: 'Log source system', nullable: false },
          { name: 'severity', type: 'string', description: 'Event severity level', nullable: false },
          { name: 'category', type: 'string', description: 'Event category', nullable: false },
          { name: 'message', type: 'string', description: 'Event message or description', nullable: true },
          { name: 'event_data', type: 'dynamic', description: 'Additional event data as JSON', nullable: true },
          { name: 'risk_score', type: 'int', description: 'Risk score (0-100)', nullable: true }
        ]
      },
      {
        name: 'log_events_hourly',
        description: 'Hourly aggregated view of log events',
        columns: [
          { name: 'hour', type: 'datetime', description: 'Hour bucket', nullable: false },
          { name: 'organization_id', type: 'string', description: 'Organization identifier', nullable: false },
          { name: 'source', type: 'string', description: 'Log source system', nullable: false },
          { name: 'severity', type: 'string', description: 'Event severity level', nullable: false },
          { name: 'category', type: 'string', description: 'Event category', nullable: false },
          { name: 'event_count', type: 'long', description: 'Number of events in the hour', nullable: false },
          { name: 'avg_risk_score', type: 'real', description: 'Average risk score', nullable: true },
          { name: 'max_risk_score', type: 'int', description: 'Maximum risk score', nullable: true },
          { name: 'unique_hosts', type: 'long', description: 'Number of unique hosts', nullable: false },
          { name: 'unique_users', type: 'long', description: 'Number of unique users', nullable: false }
        ]
      },
      {
        name: 'log_events_daily',
        description: 'Daily aggregated view of log events',
        columns: [
          { name: 'day', type: 'datetime', description: 'Day bucket', nullable: false },
          { name: 'organization_id', type: 'string', description: 'Organization identifier', nullable: false },
          { name: 'source', type: 'string', description: 'Log source system', nullable: false },
          { name: 'severity', type: 'string', description: 'Event severity level', nullable: false },
          { name: 'category', type: 'string', description: 'Event category', nullable: false },
          { name: 'event_count', type: 'long', description: 'Number of events in the day', nullable: false },
          { name: 'avg_risk_score', type: 'real', description: 'Average risk score', nullable: true },
          { name: 'max_risk_score', type: 'int', description: 'Maximum risk score', nullable: true },
          { name: 'unique_hosts', type: 'long', description: 'Number of unique hosts', nullable: false },
          { name: 'unique_users', type: 'long', description: 'Number of unique users', nullable: false },
          { name: 'severity_breakdown', type: 'dynamic', description: 'Breakdown by severity', nullable: true }
        ]
      }
    ];
  }

  private initializeFunctions(): FunctionInfo[] {
    return [
      // Aggregation functions
      {
        name: 'count',
        description: 'Returns the number of records in the group',
        parameters: [
          { name: 'expression', type: 'any', optional: true, description: 'Expression to count (optional)' }
        ],
        returnType: 'long',
        category: 'aggregation',
        examples: ['count()', 'count(user_name)']
      },
      {
        name: 'sum',
        description: 'Returns the sum of the expression across the group',
        parameters: [
          { name: 'expression', type: 'numeric', optional: false, description: 'Numeric expression to sum' }
        ],
        returnType: 'numeric',
        category: 'aggregation',
        examples: ['sum(risk_score)', 'sum(event_data.bytes)']
      },
      {
        name: 'avg',
        description: 'Returns the average value of the expression across the group',
        parameters: [
          { name: 'expression', type: 'numeric', optional: false, description: 'Numeric expression to average' }
        ],
        returnType: 'real',
        category: 'aggregation',
        examples: ['avg(risk_score)', 'avg(event_data.duration)']
      },
      {
        name: 'min',
        description: 'Returns the minimum value of the expression across the group',
        parameters: [
          { name: 'expression', type: 'any', optional: false, description: 'Expression to find minimum' }
        ],
        returnType: 'any',
        category: 'aggregation',
        examples: ['min(timestamp)', 'min(risk_score)']
      },
      {
        name: 'max',
        description: 'Returns the maximum value of the expression across the group',
        parameters: [
          { name: 'expression', type: 'any', optional: false, description: 'Expression to find maximum' }
        ],
        returnType: 'any',
        category: 'aggregation',
        examples: ['max(timestamp)', 'max(risk_score)']
      },
      {
        name: 'dcount',
        description: 'Returns the number of distinct values of the expression',
        parameters: [
          { name: 'expression', type: 'any', optional: false, description: 'Expression to count distinct values' }
        ],
        returnType: 'long',
        category: 'aggregation',
        examples: ['dcount(user_name)', 'dcount(host_ip)']
      },
      
      // Scalar functions
      {
        name: 'ago',
        description: 'Returns the time duration before the current UTC time',
        parameters: [
          { name: 'timespan', type: 'timespan', optional: false, description: 'Time duration to subtract' }
        ],
        returnType: 'datetime',
        category: 'scalar',
        examples: ['ago(1h)', 'ago(7d)', 'ago(30m)']
      },
      {
        name: 'now',
        description: 'Returns the current UTC time',
        parameters: [],
        returnType: 'datetime',
        category: 'scalar',
        examples: ['now()']
      },
      {
        name: 'strlen',
        description: 'Returns the length of the string',
        parameters: [
          { name: 'string', type: 'string', optional: false, description: 'Input string' }
        ],
        returnType: 'int',
        category: 'scalar',
        examples: ['strlen(message)', 'strlen(user_name)']
      },
      {
        name: 'substring',
        description: 'Returns a substring starting at the specified index',
        parameters: [
          { name: 'string', type: 'string', optional: false, description: 'Input string' },
          { name: 'start', type: 'int', optional: false, description: 'Start index (0-based)' },
          { name: 'length', type: 'int', optional: true, description: 'Length of substring' }
        ],
        returnType: 'string',
        category: 'scalar',
        examples: ['substring(message, 0, 10)', 'substring(host_name, 3)']
      },
      {
        name: 'toupper',
        description: 'Converts string to uppercase',
        parameters: [
          { name: 'string', type: 'string', optional: false, description: 'Input string' }
        ],
        returnType: 'string',
        category: 'scalar',
        examples: ['toupper(user_name)', 'toupper(source)']
      },
      {
        name: 'tolower',
        description: 'Converts string to lowercase',
        parameters: [
          { name: 'string', type: 'string', optional: false, description: 'Input string' }
        ],
        returnType: 'string',
        category: 'scalar',
        examples: ['tolower(user_name)', 'tolower(message)']
      },
      {
        name: 'replace',
        description: 'Replaces all occurrences of a substring with another string',
        parameters: [
          { name: 'string', type: 'string', optional: false, description: 'Input string' },
          { name: 'pattern', type: 'string', optional: false, description: 'Pattern to replace' },
          { name: 'replacement', type: 'string', optional: false, description: 'Replacement string' }
        ],
        returnType: 'string',
        category: 'scalar',
        examples: ['replace(message, "error", "ERROR")', 'replace(host_name, ".local", "")']
      },
      {
        name: 'split',
        description: 'Splits a string by a delimiter and returns an array',
        parameters: [
          { name: 'string', type: 'string', optional: false, description: 'Input string' },
          { name: 'delimiter', type: 'string', optional: false, description: 'Delimiter string' }
        ],
        returnType: 'dynamic',
        category: 'scalar',
        examples: ['split(host_name, ".")', 'split(message, " ")']
      },
      {
        name: 'trim',
        description: 'Removes leading and trailing whitespace',
        parameters: [
          { name: 'string', type: 'string', optional: false, description: 'Input string' }
        ],
        returnType: 'string',
        category: 'scalar',
        examples: ['trim(message)', 'trim(user_name)']
      },
      {
        name: 'isempty',
        description: 'Returns true if the string is empty or null',
        parameters: [
          { name: 'string', type: 'string', optional: false, description: 'Input string' }
        ],
        returnType: 'bool',
        category: 'scalar',
        examples: ['isempty(user_name)', 'isempty(message)']
      },
      {
        name: 'isnull',
        description: 'Returns true if the expression is null',
        parameters: [
          { name: 'expression', type: 'any', optional: false, description: 'Expression to check' }
        ],
        returnType: 'bool',
        category: 'scalar',
        examples: ['isnull(user_name)', 'isnull(event_data.field)']
      },
      {
        name: 'coalesce',
        description: 'Returns the first non-null expression',
        parameters: [
          { name: 'expression1', type: 'any', optional: false, description: 'First expression' },
          { name: 'expression2', type: 'any', optional: false, description: 'Second expression' }
        ],
        returnType: 'any',
        category: 'scalar',
        examples: ['coalesce(user_name, "unknown")', 'coalesce(event_data.user, user_name)']
      }
    ];
  }

  private initializeOperators(): OperatorInfo[] {
    return [
      {
        operator: '==',
        description: 'Equals comparison',
        leftType: 'any',
        rightType: 'any',
        returnType: 'bool',
        examples: ['severity == "critical"', 'risk_score == 100']
      },
      {
        operator: '!=',
        description: 'Not equals comparison',
        leftType: 'any',
        rightType: 'any',
        returnType: 'bool',
        examples: ['severity != "info"', 'user_name != ""']
      },
      {
        operator: '<',
        description: 'Less than comparison',
        leftType: 'numeric',
        rightType: 'numeric',
        returnType: 'bool',
        examples: ['risk_score < 50', 'timestamp < ago(1h)']
      },
      {
        operator: '<=',
        description: 'Less than or equal comparison',
        leftType: 'numeric',
        rightType: 'numeric',
        returnType: 'bool',
        examples: ['risk_score <= 75', 'timestamp <= now()']
      },
      {
        operator: '>',
        description: 'Greater than comparison',
        leftType: 'numeric',
        rightType: 'numeric',
        returnType: 'bool',
        examples: ['risk_score > 80', 'timestamp > ago(24h)']
      },
      {
        operator: '>=',
        description: 'Greater than or equal comparison',
        leftType: 'numeric',
        rightType: 'numeric',
        returnType: 'bool',
        examples: ['risk_score >= 90', 'timestamp >= ago(1d)']
      },
      {
        operator: 'contains',
        description: 'String contains substring (case-insensitive)',
        leftType: 'string',
        rightType: 'string',
        returnType: 'bool',
        examples: ['message contains "error"', 'user_name contains "admin"']
      },
      {
        operator: '!contains',
        description: 'String does not contain substring (case-insensitive)',
        leftType: 'string',
        rightType: 'string',
        returnType: 'bool',
        examples: ['message !contains "debug"', 'host_name !contains "test"']
      },
      {
        operator: 'startswith',
        description: 'String starts with substring (case-insensitive)',
        leftType: 'string',
        rightType: 'string',
        returnType: 'bool',
        examples: ['user_name startswith "admin"', 'host_name startswith "web"']
      },
      {
        operator: 'endswith',
        description: 'String ends with substring (case-insensitive)',
        leftType: 'string',
        rightType: 'string',
        returnType: 'bool',
        examples: ['host_name endswith ".com"', 'message endswith "failed"']
      },
      {
        operator: 'matches',
        description: 'String matches regular expression',
        leftType: 'string',
        rightType: 'string',
        returnType: 'bool',
        examples: ['host_ip matches @"\\d+\\.\\d+\\.\\d+\\.\\d+"', 'user_name matches @"[a-zA-Z]+"']
      },
      {
        operator: 'in',
        description: 'Value is in a list of values',
        leftType: 'any',
        rightType: 'array',
        returnType: 'bool',
        examples: ['severity in ("critical", "high")', 'source in ("Windows", "Linux")']
      },
      {
        operator: '!in',
        description: 'Value is not in a list of values',
        leftType: 'any',
        rightType: 'array',
        returnType: 'bool',
        examples: ['severity !in ("info", "debug")', 'user_name !in ("guest", "anonymous")']
      },
      {
        operator: 'between',
        description: 'Value is between two values (inclusive)',
        leftType: 'numeric',
        rightType: 'numeric',
        returnType: 'bool',
        examples: ['risk_score between (50 .. 90)', 'timestamp between (ago(2h) .. ago(1h))']
      },
      {
        operator: 'and',
        description: 'Logical AND operation',
        leftType: 'bool',
        rightType: 'bool',
        returnType: 'bool',
        examples: ['severity == "critical" and risk_score > 80', 'timestamp > ago(1h) and user_name != ""']
      },
      {
        operator: 'or',
        description: 'Logical OR operation',
        leftType: 'bool',
        rightType: 'bool',
        returnType: 'bool',
        examples: ['severity == "critical" or risk_score > 90', 'source == "Windows" or source == "Linux"']
      },
      {
        operator: 'not',
        description: 'Logical NOT operation',
        leftType: 'bool',
        rightType: '',
        returnType: 'bool',
        examples: ['not (severity == "info")', 'not isempty(user_name)']
      }
    ];
  }

  private initializeKeywords(): KeywordInfo[] {
    return [
      {
        keyword: 'where',
        description: 'Filters rows based on a predicate',
        category: 'command',
        examples: ['| where severity == "critical"', '| where timestamp > ago(1h)']
      },
      {
        keyword: 'project',
        description: 'Selects specific columns to include in the output',
        category: 'command',
        examples: ['| project timestamp, severity, message', '| project user_name, risk_score']
      },
      {
        keyword: 'extend',
        description: 'Adds computed columns to the result set',
        category: 'command',
        examples: ['| extend hour = bin(timestamp, 1h)', '| extend is_admin = user_name contains "admin"']
      },
      {
        keyword: 'summarize',
        description: 'Aggregates data by grouping and applying aggregation functions',
        category: 'command',
        examples: ['| summarize count() by severity', '| summarize avg(risk_score) by source']
      },
      {
        keyword: 'order',
        description: 'Sorts the result set by one or more columns',
        category: 'command',
        examples: ['| order by timestamp desc', '| order by risk_score desc, timestamp asc']
      },
      {
        keyword: 'top',
        description: 'Returns the top N rows, optionally ordered by specific columns',
        category: 'command',
        examples: ['| top 10 by risk_score desc', '| top 100 by timestamp desc']
      },
      {
        keyword: 'limit',
        description: 'Limits the number of rows returned',
        category: 'command',
        examples: ['| limit 1000', '| limit 50']
      },
      {
        keyword: 'distinct',
        description: 'Returns unique rows or unique values for specified columns',
        category: 'command',
        examples: ['| distinct user_name', '| distinct source, severity']
      },
      {
        keyword: 'join',
        description: 'Joins two tables based on matching columns',
        category: 'command',
        examples: ['| join kind=inner other_table on user_name', '| join kind=left users on $left.user_name == $right.name']
      },
      {
        keyword: 'union',
        description: 'Combines the results of multiple tables',
        category: 'command',
        examples: ['| union log_events_warm, log_events_cold', '| union table1, table2']
      },
      {
        keyword: 'let',
        description: 'Binds a name to an expression for reuse in the query',
        category: 'command',
        examples: ['let timeRange = ago(1h);', 'let criticalEvents = log_events | where severity == "critical";']
      },
      {
        keyword: 'by',
        description: 'Specifies grouping columns in summarize operations',
        category: 'function',
        examples: ['summarize count() by source', 'summarize avg(risk_score) by severity, source']
      },
      {
        keyword: 'asc',
        description: 'Ascending sort order',
        category: 'function',
        examples: ['order by timestamp asc', 'top 10 by risk_score asc']
      },
      {
        keyword: 'desc',
        description: 'Descending sort order',
        category: 'function',
        examples: ['order by timestamp desc', 'top 10 by risk_score desc']
      }
    ];
  }
}