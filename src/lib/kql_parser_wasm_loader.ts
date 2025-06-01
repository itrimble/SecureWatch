// src/lib/kql_parser_wasm_loader.ts

import { QueryNode } from './kql_ast'; // Our target AST
import {
    transformRustAstToQueryNode,
    ActualRustKqlQuery,
    ActualRustKqlStatement,
    ActualRustKqlTabularOperator,
    ActualRustKqlExpression,
    ActualRustKqlLiteralValue,
    ActualRustKqlNamedExpression,
    ActualRustKqlSortClause,
    ActualRustKqlSource,
    // ActualRustKqlSearchOperator,   // Not strictly needed for constructing, but good for context
    // ActualRustKqlExtendOperator,   // "
    // ActualRustKqlDistinctOperator, // "
    // ActualRustKqlTopOperator,      // "
    ActualRustKqlArrayLiteral,
    ActualRustKqlLiteralExpression,
    ActualRustKqlColumnExpression,
    ActualRustKqlPathAccessor,     // For constructing Path
    ActualRustKqlFunctionName,     // For constructing FunctionCall
    ActualRustKqlBinaryOperator    // For constructing BinaryExpression
} from './kql_ast_transformer';

// Simulates calling the Wasm module's exported function.
// It now directly constructs objects matching ActualRustKql... interfaces and then stringifies them.
async function simulatedWasmCall(kqlQuery: string): Promise<string> {
    const normalizedQuery = kqlQuery.trim().replace(/\s+/g, ' ').toLowerCase();
    let rustAstObject: ActualRustKqlQuery | null = null;

    // --- Helper functions to construct "Actual Rust AST" nodes ---
    const RIdent = (name: string): { value: string } => ({ value: name });
    const RFuncIdent = (name: string): ActualRustKqlFunctionName => ({ value: name });

    const RLiteral = (value: string | number | boolean | null): ActualRustKqlLiteralExpression => {
        let literalValue: ActualRustKqlLiteralValue;
        if (typeof value === 'string') {
            if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value) || /^\d{4}-\d{2}-\d{2}$/.test(value)) literalValue = { Datetime: value };
            else if (/^\d+(d|h|m|s|ms|us|ns)$/.test(value)) literalValue = { Timespan: value };
            else literalValue = { String: value };
        } else if (typeof value === 'number') {
            literalValue = Number.isInteger(value) ? { Long: value } : { Real: value };
        } else if (typeof value === 'boolean') {
            literalValue = { Bool: value };
        } else if (value === null) {
            literalValue = { Null: null };
        } else {
            literalValue = { Dynamic: value };
        }
        return { Literal: literalValue };
    };

    const RCol = (name: string): ActualRustKqlColumnExpression => ({ Column: { name: RIdent(name) } });

    const RPath = (objectName: string, memberName: string): { Path: { expression: ActualRustKqlExpression, accessors: ActualRustKqlPathAccessor[] } } => ({
        Path: {
            expression: RCol(objectName),
            accessors: [{ Member: { name: RIdent(memberName) } }]
        }
    });

    const RNamedExpr = (alias: string | null, expression: ActualRustKqlExpression): ActualRustKqlNamedExpression => ({
        alias: alias ? { name: RIdent(alias) } : null,
        expression
    });
    const RProjCol = (name: string): ActualRustKqlNamedExpression => ({
        alias: { name: RIdent(name) },
        expression: RCol(name)
    });

    const RFuncCall = (name: string, args: ActualRustKqlExpression[]): { FunctionCall: { name: ActualRustKqlFunctionName, args: ActualRustKqlExpression[] } } => ({
        FunctionCall: { name: RFuncIdent(name), args }
    });
    const RArrayLiteral = (values: (string | number | boolean | null)[]): { ArrayLiteral: ActualRustKqlArrayLiteral } => ({
        ArrayLiteral: { Array: values.map(v => RLiteral(v).Literal) }
    });
    const RBinaryExpr = (left: ActualRustKqlExpression, op: ActualRustKqlBinaryOperator, right: ActualRustKqlExpression): { BinaryExpression: any } => ({
        BinaryExpression: { left, op, right }
    });


    // --- Define ActualRustKql ASTs for supported queries ---
    let mainTabularExpression: { source: ActualRustKqlSource; operations: ActualRustKqlTabularOperator[] } | null = null;
    const eventsSource: ActualRustKqlSource = { name: RIdent('events'), alias: null };

    // KQL for the complex query:
    const complexQueryKql = `events | where timestamp > ago(7d) and severity in ("high", "critical") and (process_name matches regex @"^ ভয়ানক" or message_short has "suspicious_pattern") | extend event_day = date_trunc('day', timestamp), alert_source = strcat(event_source_name, ":", event_type_id) | summarize error_count = count(), distinct_users = dcount(user_id) by event_day, alert_source, severity | sort by event_day asc, error_count desc | top 3 by error_count desc | project event_day, alert_source, severity, error_count, distinct_users`;

    if (normalizedQuery === complexQueryKql) {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const wherePredicate = RBinaryExpr( // outer AND
            RBinaryExpr( // (timestamp > ago(7d)) AND (severity in (...))
                RBinaryExpr(RCol('timestamp'), 'GreaterThan', RLiteral(sevenDaysAgo)),
                'And',
                RBinaryExpr(RCol('severity'), 'In', RArrayLiteral(["High", "Critical"]))
            ),
            'And',
            RBinaryExpr( // (process_name matches regex ...) OR (message_short has ...)
                RBinaryExpr(RCol('process_name'), 'MatchesRegex', RLiteral("^ ভয়ানক")), // Assuming KQL @"" means raw string for regex
                'Or',
                RBinaryExpr(RCol('message_short'), 'Has', RLiteral("suspicious_pattern")) // 'has' is like 'contains'
            )
        );

        mainTabularExpression = {
            source: eventsSource,
            operations: [
                { Where: { predicate: wherePredicate } },
                { Extend: { columns: [
                    RNamedExpr('event_day', RFuncCall('date_trunc', [RLiteral('day'), RCol('timestamp')])),
                    RNamedExpr('alert_source', RFuncCall('strcat', [RCol('event_source_name'), RLiteral(':'), RCol('event_type_id')]))
                ]}},
                { Summarize: {
                    aggregations: [
                        RNamedExpr('error_count', RFuncCall('count', [])),
                        RNamedExpr('distinct_users', RFuncCall('dcount', [RCol('user_id')]))
                    ],
                    // In irtimmer/rust-kql, by_clauses are NamedExpressions.
                    // If KQL is `by event_day`, it's `NamedExpression {alias: Some("event_day"), expression: Column("event_day")}`
                    by_clauses: [
                        RNamedExpr('event_day', RCol('event_day')),        // References alias from extend
                        RNamedExpr('alert_source', RCol('alert_source')),  // References alias from extend
                        RNamedExpr('severity', RCol('severity'))          // Direct column
                    ],
                }},
                { SortBy: { clauses: [
                    { expression: RCol('event_day'), sort_order: 'Asc' },
                    { expression: RCol('error_count'), sort_order: 'Desc' }
                ]}},
                { Top: { // `top` operator in irtimmer/rust-kql might be different, this is a guess
                          // Based on `TopOperator { take_count, by_expression, sort_order, nulls_order, with_others }`
                          // `by_expression` is `NamedExpression`
                    count: RLiteral(3),
                    by_expression: RNamedExpr('error_count', RCol('error_count')), // KQL `top by X` means X is the expression
                    sort_order: 'Desc', // Top implies desc on the by_expression
                    with_others: null // Assuming no `withothers` specified, or it's an expression that can be null/None
                } },
                { Project: { columns: [
                    RProjCol('event_day'), RProjCol('alert_source'), RProjCol('severity'),
                    RProjCol('error_count'), RProjCol('distinct_users')
                ]}},
            ],
        };

    }
    // --- Other Existing Queries (adapted to new helpers) ---
    else if (normalizedQuery === 'events | take 10') {
        mainTabularExpression = {
            source: eventsSource,
            operations: [ { Limit: { count: RLiteral(10) } } ],
        };
    } else if (normalizedQuery === 'events | where event_type_id == "4624" | project timestamp, user_id, ip_address | take 5') {
        mainTabularExpression = {
            source: eventsSource,
            operations: [
                { Where: { predicate: RBinaryExpr(RCol('event_type_id'), 'Equal', RLiteral('4624')) } },
                { Project: { columns: [ RProjCol('timestamp'), RProjCol('user_id'), RProjCol('ip_address') ]}},
                { Limit: { count: RLiteral(5) } },
            ],
        };
    } else if (normalizedQuery === 'events | where event_type_id == "4625" | summarize attempts = count() by user_id | sort by attempts desc | take 10') {
        mainTabularExpression = {
            source: eventsSource,
            operations: [
                { Where: { predicate: RBinaryExpr(RCol('event_type_id'), 'Equal', RLiteral('4625')) } },
                { Summarize: {
                    aggregations: [ RNamedExpr('attempts', RFuncCall('count', [])) ],
                    by_clauses: [ RNamedExpr('user_id', RCol('user_id')) ],
                }},
                { SortBy: { clauses: [ { expression: RCol('attempts'), sort_order: 'Desc' } ]}},
                { Limit: { count: RLiteral(10) } },
            ],
        };
    } else if (normalizedQuery === "events | summarize count_ = count() by timestamp_hour = date_trunc('hour', timestamp), event_source_name | sort by timestamp_hour asc") {
        mainTabularExpression = {
            source: eventsSource,
            operations: [
                { Summarize: {
                    aggregations: [ RNamedExpr('count_', RFuncCall('count', [])) ],
                    by_clauses: [
                        RNamedExpr('timestamp_hour', RFuncCall('date_trunc', [RLiteral('hour'), RCol('timestamp')])),
                        RNamedExpr('event_source_name', RCol('event_source_name')),
                    ],
                }},
                { SortBy: { clauses: [ { expression: RCol('timestamp_hour'), sort_order: 'Asc' } ]}},
            ],
        };
    } else if (normalizedQuery === 'events | where parsed_fields.logontype == 2 | project timestamp, user_id, parsed_fields.workstationname') {
        mainTabularExpression = {
            source: eventsSource,
            operations: [
                { Where: { predicate: RBinaryExpr(RPath('parsed_fields', 'LogonType'), 'Equal', RLiteral(2)) }},
                { Project: { columns: [
                    RProjCol('timestamp'), RProjCol('user_id'),
                    RNamedExpr('parsed_fields.WorkstationName', RPath('parsed_fields', 'WorkstationName')),
                ]}},
            ]
        };
    } else if (normalizedQuery === 'events | where success == true') {
        mainTabularExpression = {
            source: eventsSource,
            operations: [ { Where: { predicate: RBinaryExpr(RCol('success'), 'Equal', RLiteral(true)) }} ]
        };
    }
    else if (normalizedQuery === 'events | search "critical error"') {
        mainTabularExpression = {
            source: eventsSource,
            operations: [ { Search: { search_term: RLiteral("critical error"), columns: null } } ],
        };
    }
    else if (normalizedQuery === 'events | where timestamp < ago(5m) and severity in ("high", "critical") and message contains "failed"') {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        mainTabularExpression = {
            source: eventsSource,
            operations: [ { Where: { predicate: RBinaryExpr(
                RBinaryExpr(
                    RBinaryExpr(RCol('timestamp'), 'LessThan', RLiteral(fiveMinutesAgo)),
                    'And',
                    RBinaryExpr(RCol('severity'), 'In', RArrayLiteral(["High", "Critical"]))
                ),
                'And',
                RBinaryExpr(RCol('message'), 'Contains', RLiteral('failed'))
            ) } } ],
        };
    }
    else if (normalizedQuery === 'events | where process_name startswith "powershell" and command_line endswith ".exe"') {
        mainTabularExpression = {
            source: eventsSource,
            operations: [ { Where: { predicate: RBinaryExpr(
                RBinaryExpr(RCol('process_name'), 'StartsWith', RLiteral('powershell')),
                'And',
                RBinaryExpr(RPath('parsed_fields', 'CommandLine'), 'EndsWith', RLiteral('.exe'))
            ) } } ],
        };
    }
    else if (normalizedQuery === 'events | where details matches regex "user=([^\\s]+)"') {
        mainTabularExpression = {
            source: eventsSource,
            operations: [ { Where: { predicate: RBinaryExpr(
                RCol('details'),
                'MatchesRegex',
                RLiteral("user=([^\\s]+)")
            ) } } ],
        };
    }
    else if (normalizedQuery === 'events | extend event_hour = gethour(timestamp), user_domain = strcat(username, "@", domain)') {
        mainTabularExpression = {
            source: eventsSource,
            operations: [ { Extend: { columns: [
                RNamedExpr('event_hour', RFuncCall('gethour', [RCol('timestamp')])),
                RNamedExpr('user_domain', RFuncCall('strcat', [RCol('username'), RLiteral('@'), RCol('domain')]))
            ]}} ],
        };
    }
    else if (normalizedQuery === 'events | distinct event_type_id, user_id') {
        mainTabularExpression = {
            source: eventsSource,
            operations: [ { Distinct: { columns: [ RCol('event_type_id'), RCol('user_id') ] } } ],
        };
    }
    else if (normalizedQuery === 'events | top 3 by event_count desc withothers = true') {
        mainTabularExpression = {
            source: eventsSource,
            operations: [ { Top: {
                count: RLiteral(3),
                by_expression: RNamedExpr('event_count',RCol('event_count')),
                sort_order: 'Desc',
                with_others: RLiteral(true) // This is ActualRustKqlLiteralExpression
            } } ],
        };
    }


    if (mainTabularExpression) {
        rustAstObject = {
            statements: [ { TabularExpression: mainTabularExpression } ]
        };
        await new Promise(resolve => setTimeout(resolve, 10));
        return JSON.stringify(rustAstObject);
    } else {
        await new Promise(resolve => setTimeout(resolve, 5));
        const errorPayload = { error: "KQL Parsing Error (Simulated Wasm)", details: `Unsupported KQL query in Wasm simulation: ${kqlQuery}` };
        return Promise.reject(new Error(JSON.stringify(errorPayload)));
    }
}

export async function parseKqlToAst(kqlQuery: string): Promise<QueryNode | null> {
  try {
    console.log(`[WasmLoader] Received KQL: ${kqlQuery}`);
    const rustAstJsonString = await simulatedWasmCall(kqlQuery);

    const rustAstParsed = JSON.parse(rustAstJsonString);

    const queryNode = transformRustAstToQueryNode(rustAstParsed);
    if (!queryNode) {
      console.error(`[WasmLoader] Failed to transform Actual Rust AST for query: ${kqlQuery}. Input Rust AST (first 1000 chars):`, JSON.stringify(rustAstParsed, null, 2).substring(0, 1000));
      return null;
    }

    return queryNode;

  } catch (error: any) {
    let errorMessage = error.message;
    try {
        const parsedError = JSON.parse(error.message);
        errorMessage = `Error from Wasm sim: ${parsedError.error} - ${parsedError.details}`;
        console.error(`[WasmLoader] Parsed error details from Wasm sim:`, parsedError);
    } catch (e) {
        // Not a JSON error message from reject, or error is from transform/JSON.parse itself
    }
    console.error(`[WasmLoader] Error during KQL processing pipeline: ${errorMessage}`, error.stack ? `\nStack: ${error.stack}` : '');
    return null;
  }
}
