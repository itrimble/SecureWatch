// src/lib/kql_to_sql.ts
import {
  QueryNode, OperationNode, WhereNode, ProjectNode, TakeNode, ConditionNode,
  SummarizeNode, Aggregation, AggFunctionType, GroupByItem, GroupByExpression,
  SortNode, SortClause,
  EqualityConditionNode, ComparisonConditionNode, ComparisonOperator,
  StringOperationConditionNode, StringOperationType,
  LogicalConditionNode, LogicalOperator,
  // New AST Node types
  SearchNode, ExtendNode, DistinctNode, TopNode, ExtendedColumn, KqlExpressionValue,
  InConditionNode, MatchesRegexConditionNode
} from './kql_ast';

// --- Helper Functions ---
function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''");
}

function formatSqlValue(value: string | number | boolean | null): string {
  if (typeof value === 'string') return `'${escapeSqlString(value)}'`;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null) return 'NULL';
  return `'${escapeSqlString(String(value))}'`;
}

// Manages the set of available column names/aliases at each stage of query processing
// This is crucial for `sort by`, `project` after `extend` or `summarize`.
let currentKnownColumns: Set<string> = new Set();

// Helper to format field names for SQL.
// `context` can be 'SELECT', 'WHERE', 'GROUP_BY', 'ORDER_BY', 'AGG_ARG'
function getFieldSqlRepresentation(field: GroupByItem, context: 'SELECT' | 'WHERE' | 'GROUP_BY' | 'ORDER_BY' | 'AGG_ARG'): string {
  if (typeof field === 'string') {
    const isParsedField = field.startsWith('parsed_fields.');
    if (isParsedField) {
      const actualField = field.substring('parsed_fields.'.length);
      const accessor = `parsed_fields->>'${actualField}'`;
      if (context === 'SELECT') return `${accessor} AS "${field}"`; // Alias for select
      if (context === 'AGG_ARG' && (field.toLowerCase().includes('size') || field.toLowerCase().includes('count') || field.toLowerCase().includes('score'))) { // Heuristic
        return `(${accessor})::numeric`; // Cast for aggregation if seems numeric
      }
      return accessor; // Raw accessor for WHERE, GROUP_BY, ORDER_BY
    }
    // Direct column name, quote for safety
    return `"${field}"`;
  } else if (field.type === 'FunctionCall' && field.functionName === 'date_trunc') {
    const funcName = field.functionName.toUpperCase();
    const arg1 = formatSqlValue(field.arguments[0]);
    const arg2 = getFieldSqlRepresentation(field.arguments[1], 'AGG_ARG'); // Argument to date_trunc is like an agg arg
    const sqlFunc = `${funcName}(${arg1}, ${arg2})`;
    if (context === 'SELECT') return `${sqlFunc} AS "${field.alias}"`;
    return sqlFunc; // Raw function for GROUP_BY, ORDER_BY (if sorting by expression)
  }
  throw new Error(`Unsupported field type in getFieldSqlRepresentation: ${JSON.stringify(field)}`);
}

function sqlExpressionForKqlExpressionValue(expr: KqlExpressionValue): string {
  switch (expr.type) {
    case 'ColumnReference':
      return getFieldSqlRepresentation(expr.columnName, 'SELECT'); // Or 'WHERE' depending on context, but usually for extend's SELECT part
    case 'Literal':
      return formatSqlValue(expr.value);
    case 'RawSqlExpression': // Already pre-formatted SQL snippet
      return expr.expressionString;
    // Future: Handle 'FunctionCall', 'ArithmeticExpression' from KqlExpressionValue by generating SQL
    default:
      console.warn(`[Transpiler] Unsupported KqlExpressionValue type: ${JSON.stringify(expr)}`);
      // @ts-ignore
      throw new Error(`Unsupported KqlExpressionValue type: ${expr.type}`);
  }
}


function transpileConditionNode(condition: ConditionNode): string {
  let fieldSql: string;
  let valueSql: string;

  switch (condition.type) {
    case 'Equals':
      const eqNode = condition as EqualityConditionNode;
      fieldSql = getFieldSqlRepresentation(eqNode.field, 'WHERE');
      if (eqNode.value === null) return `${fieldSql} IS NULL`;

      if (eqNode.field.startsWith('parsed_fields.')) {
        valueSql = formatSqlValue(String(eqNode.value));
      } else {
        valueSql = formatSqlValue(eqNode.value);
      }
      return `${fieldSql} = ${valueSql}`;

    case 'Compare':
      const compNode = condition as ComparisonConditionNode;
      fieldSql = getFieldSqlRepresentation(compNode.field, 'WHERE');

      if (compNode.field.startsWith('parsed_fields.')) {
        if (typeof compNode.value === 'number') {
          fieldSql = `(${fieldSql})::numeric`; // Cast field to numeric for comparison
          valueSql = formatSqlValue(compNode.value);
        } else {
          valueSql = formatSqlValue(compNode.value); // String comparison
        }
      } else {
        valueSql = formatSqlValue(compNode.value);
      }
      return `${fieldSql} ${compNode.operator} ${valueSql}`;

    case 'StringOperation':
      const strOpNode = condition as StringOperationConditionNode;
      fieldSql = getFieldSqlRepresentation(strOpNode.field, 'WHERE');
      const likeValue = strOpNode.value;
      const likeOp = strOpNode.caseSensitive === true ? 'LIKE' : 'ILIKE';

      switch (strOpNode.operator) {
        case 'contains': return `${fieldSql} ${likeOp} '%${escapeSqlString(likeValue)}%'`;
        case 'startswith': return `${fieldSql} ${likeOp} '${escapeSqlString(likeValue)}%'`;
        case 'endswith': return `${fieldSql} ${likeOp} '%${escapeSqlString(likeValue)}%'`;
        default: throw new Error(`Unsupported string operator: ${strOpNode.operator}`);
      }

    case 'Logical':
      const logNode = condition as LogicalConditionNode;
      const conditionsSql = logNode.conditions.map(c => `(${transpileConditionNode(c)})`).join(` ${logNode.operator.toUpperCase()} `);
      return conditionsSql;

    case 'In': // New
      const inNode = condition as InConditionNode;
      fieldSql = getFieldSqlRepresentation(inNode.field, 'WHERE');
      const valuesSql = inNode.values.map(v => formatSqlValue(v)).join(', ');
      // TODO: Handle inNode.caseSensitive for string values if needed (would require ILIKE ANY(ARRAY[...]))
      // For now, direct IN comparison.
      return `${fieldSql} IN (${valuesSql})`;

    case 'MatchesRegex': // New
      const regexNode = condition as MatchesRegexConditionNode;
      fieldSql = getFieldSqlRepresentation(regexNode.field, 'WHERE');
      // PostgreSQL regex match operator is '~' (case-sensitive) or '~*' (case-insensitive)
      // KQL `matches regex` is typically case-sensitive.
      return `${fieldSql} ~ ${formatSqlValue(regexNode.regex)}`;

    default:
      // @ts-ignore
      throw new Error(`Unsupported condition node type: ${condition.type}`);
  }
}

function transpileSearchOperator(searchNode: SearchNode, defaultSearchableColumns: string[]): string {
    const term = searchNode.searchTerm;
    if (!term || typeof term !== 'string' || term.trim() === '') return "";

    const searchTermSql = `'%${escapeSqlString(term)}%'`;
    let columnsToSearch = defaultSearchableColumns;

    if (searchNode.columns && searchNode.columns.length > 0) {
        columnsToSearch = searchNode.columns.map(col => getFieldSqlRepresentation(col, 'WHERE'));
    }

    if (columnsToSearch.length === 0) return ""; // Or search all text/varchar columns (more complex)

    return columnsToSearch.map(col => `${col} ILIKE ${searchTermSql}`).join(' OR ');
}


export function transpileAstToSql(ast: QueryNode): string {
  if (ast.type !== 'Query' || !ast.source) {
    throw new Error('Invalid AST: Must be a QueryNode with a source table.');
  }
  currentKnownColumns = new Set(); // Reset for each query

  let selectParts: string[] = ['*'];
  let whereConditions: string[] = [];
  let groupByParts: string[] = [];
  let orderByParts: string[] = [];
  let limitClause: string | null = null;

  let isDistinct = false;
  let hasSummarize = false;
  let finalProjectFields: string[] | null = null; // Store fields from the last project operator

  // Default columns to search if `search` operator doesn't specify columns
  const defaultSearchableColumnsForEvents = [
      getFieldSqlRepresentation("message_short", "WHERE"),
      getFieldSqlRepresentation("message_full", "WHERE"),
      getFieldSqlRepresentation("user_id", "WHERE"),
      getFieldSqlRepresentation("hostname", "WHERE"),
      getFieldSqlRepresentation("process_name", "WHERE"),
      getFieldSqlRepresentation("parsed_fields.CommandLine", "WHERE"), // Example parsed field
  ];

  // First pass to gather all column definitions (from source, extend, summarize)
  // This is a simplified approach. A more robust way involves tracking available columns at each step.
  // For now, assume all original columns are available, plus what extend/summarize adds.
  // This doesn't perfectly model KQL's column scoping if project is used mid-pipeline.

  // Initial population of known columns (conceptual - all columns from ast.source)
  // In a real scenario with schema introspection: currentKnownColumns = new Set(getColumnsForTable(ast.source));
  // For PoC: if no project/summarize, we use '*', extend adds to this.

  let processedOperations: OperationNode[] = []; // For multi-stage SELECT construction

  for (const operation of ast.operations) {
    switch (operation.type) {
      case 'Search': // New
        const searchCondition = transpileSearchOperator(operation as SearchNode, defaultSearchableColumnsForEvents);
        if (searchCondition) whereConditions.push(`(${searchCondition})`);
        break;
      case 'Where':
        whereConditions.push(`(${transpileConditionNode((operation as WhereNode).condition)})`);
        break;
      case 'Extend': // New
        const extendNode = operation as ExtendNode;
        if (selectParts.length === 1 && selectParts[0] === '*') {
            selectParts = []; // Will be populated by extend or default to source.* + extended
        }
        extendNode.newColumns.forEach(ec => {
            const exprSql = sqlExpressionForKqlExpressionValue(ec.expression);
            selectParts.push(`${exprSql} AS "${escapeSqlString(ec.name)}"`);
            currentKnownColumns.add(ec.name);
        });
        break;
      case 'Summarize':
        hasSummarize = true;
        const summarizeNode = operation as SummarizeNode;
        selectParts = []; // Summarize dictates the SELECT fields
        groupByParts = [];

        summarizeNode.groupByFields.forEach(gf => {
          selectParts.push(getFieldSqlRepresentation(gf, 'SELECT'));
          groupByParts.push(getFieldSqlRepresentation(gf, 'GROUP_BY'));
          if (typeof gf === 'string') currentKnownColumns.add(gf);
          else currentKnownColumns.add(gf.alias); // Add GroupByExpression alias
        });

        summarizeNode.aggregations.forEach(agg => {
          let aggSql = '';
          const fieldForAgg = agg.field ? getFieldSqlRepresentation(agg.field, 'AGG_ARG') : '';
          switch (agg.function) {
            case 'count': aggSql = `COUNT(*)`; break;
            case 'dcount':
              if (!agg.field) throw new Error("dcount requires a field.");
              aggSql = `COUNT(DISTINCT ${fieldForAgg})`; break;
            // Cast for numeric aggregations if field is from parsed_fields (heuristic in getFieldSqlRepresentation)
            case 'min': aggSql = `MIN(${fieldForAgg})`; break;
            case 'max': aggSql = `MAX(${fieldForAgg})`; break;
            case 'avg': aggSql = `AVG(${fieldForAgg})`; break;
            case 'sum': aggSql = `SUM(${fieldForAgg})`; break;
            default: throw new Error(`Unsupported aggregation function: ${agg.function}`);
          }
          selectParts.push(`${aggSql} AS "${escapeSqlString(agg.newColumnName)}"`);
          currentKnownColumns.add(agg.newColumnName);
        });
        break;
      case 'Distinct': // New
        const distinctNode = operation as DistinctNode;
        isDistinct = true;
        if (distinctNode.columns && distinctNode.columns.length > 0) {
            selectParts = distinctNode.columns.map(c => getFieldSqlRepresentation(c, 'SELECT'));
            distinctNode.columns.forEach(c => currentKnownColumns.add(c)); // Assuming distinct columns are simple strings
        } else if (selectParts[0] === '*') {
            // `distinct *` is not valid KQL, usually `distinct col1, col2` or `summarize by col1, col2 | distinct col1, col2`
            // If `distinct` follows `project`, it uses those columns.
            // If `distinct` is on its own with no columns, it implies distinct across all currently available columns.
            // This PoC will assume `distinct` with no columns means `DISTINCT *` if no prior projection.
            // If selectParts were already set by project/extend, DISTINCT applies to those.
        }
        break;
      case 'Project':
        const projectNode = operation as ProjectNode;
        if (projectNode.fields && projectNode.fields.length > 0) {
            selectParts = projectNode.fields.map(f => {
                // If the field 'f' was an alias from a previous summarize or extend, it should be used directly.
                // Otherwise, it's a direct column or parsed_field.
                if (currentKnownColumns.has(f)) return `"${escapeSqlString(f)}"`; // Use existing alias
                return getFieldSqlRepresentation(f, 'SELECT'); // Create new selection (possibly with alias for parsed_field)
            });
            currentKnownColumns = new Set(projectNode.fields); // Project redefines the available columns
        } else {
            // `project` with no fields is effectively a no-op or might imply keeping all current.
            // For this PoC, if selectParts was '*', it remains so. If it was specific, it remains.
            // KQL `project` usually requires fields.
        }
        finalProjectFields = projectNode.fields; // Track the last projection
        break;
      case 'Sort': // Sort / Order By
        const sortNode = operation as SortNode;
        if (sortNode.clauses && sortNode.clauses.length > 0) {
          orderByParts = sortNode.clauses.map(c => {
            let fieldToSortBy = `"${escapeSqlString(c.field)}"`; // Assume sorting by an existing (possibly aliased) column
            // Check if c.field is a direct column/path if not in currentKnownColumns (less likely after summarize/extend)
            if (!currentKnownColumns.has(c.field)) {
                 fieldToSortBy = getFieldSqlRepresentation(c.field, 'ORDER_BY');
            }
            let clauseSql = fieldToSortBy;
            if (c.order) clauseSql += ` ${c.order.toUpperCase()}`;
            if (c.nulls) clauseSql += ` NULLS ${c.nulls.toUpperCase()}`;
            return clauseSql;
          });
        }
        break;
      case 'Top': // New
        const topNode = operation as TopNode;
        orderByParts = [`${getFieldSqlRepresentation(topNode.byField, 'ORDER_BY')} ${topNode.order === 'asc' ? 'ASC' : 'DESC'}`];
        limitClause = `LIMIT ${topNode.count}`;
        // `withothers` is a KQL concept not directly translatable to simple SQL LIMIT.
        // It implies further processing or a more complex query (e.g., with window functions or unions).
        // For PoC, we ignore `withothers` at the SQL generation stage.
        if (topNode.withOthers) console.warn("[Transpiler] `top ... withothers` is not fully supported in SQL generation.");
        break;
      case 'Take':
        const takeNode = operation as TakeNode;
        if (takeNode.count > 0) {
          limitClause = `LIMIT ${takeNode.count}`;
        }
        break;
      default:
        // @ts-ignore
        throw new Error(`Unsupported KQL operation during SQL construction: ${operation.type}`);
    }
    processedOperations.push(operation);
  }

  // Construct final SELECT clause
  let finalSelectClause = "SELECT ";
  if (isDistinct) finalSelectClause += "DISTINCT ";

  if (selectParts.length === 0 || (selectParts.length === 1 && selectParts[0] === '*')) {
      if (processedOperations.some(op => op.type === 'Extend')) {
          // If extend was used but no project/summarize followed, select original cols + extended.
          // This requires knowing original columns. For PoC, assume '*' + extended parts.
          // The 'selectParts' from Extend already includes 'AS alias'.
          // This logic is tricky. Let's assume `selectParts` from Extend is complete if it's not empty.
          // If `selectParts` is still ['*'] after extend, it means `SELECT *, ext1 as E1, ext2 as E2 ...`
          // This is a common SQL pattern but makes `selectParts` management complex.
          // Simplification: If extend happened, and selectParts is empty, it should have been populated by extend.
          // If selectParts is ['*'] it means the user wants all original columns PLUS the extended ones.
          // The current extend logic *replaces* selectParts if it was ['*'].
          // If extend populated selectParts, and it's not empty, use it.
          if (selectParts.length > 0 && !(selectParts.length === 1 && selectParts[0] === '*')) {
              finalSelectClause += selectParts.join(', ');
          } else { // selectParts is empty or still '*' after extend. This case needs better handling.
                    // For now, if it's empty after extend, it's an issue. If it's '*', it's fine.
              finalSelectClause += '*'; // Default if extend didn't populate and no project/summarize
              // A more robust `Extend` would add its columns to a list of "available" columns,
              // and if `selectParts` is `*`, it would be `source.*, extended_col1, extended_col2`.
              // The current extend logic directly pushes `expr AS alias` into selectParts.
          }
      } else {
          finalSelectClause += '*'; // Default if no Project, Summarize, or populated Distinct.columns
      }
  } else {
      finalSelectClause += selectParts.join(', ');
  }


  const fromClause = `FROM "${ast.source}"`;
  const whereClauseSql = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
  const groupByClauseSql = groupByParts.length > 0 ? `GROUP BY ${groupByParts.join(', ')}` : '';
  const orderByClauseSql = orderByParts.length > 0 ? `ORDER BY ${orderByParts.join(', ')}` : '';
  const limitClauseSql = limitClause || '';

  return `${finalSelectClause} ${fromClause}${whereClauseSql ? ' ' + whereClauseSql : ''}${groupByClauseSql ? ' ' + groupByClauseSql : ''}${orderByClauseSql ? ' ' + orderByClauseSql : ''}${limitClauseSql ? ' ' + limitClauseSql : ''};`.trim();
}
