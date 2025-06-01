// src/app/api/query/route.ts
import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { parseKqlToAst } from '@/lib/kql_parser_wasm_loader';
import { transpileAstToSql } from '@/lib/kql_to_sql';

const pool = new Pool({
  user: process.env.PGUSER || 'eventlogger', // Corrected to PGUSER
  host: process.env.PGHOST || 'localhost',   // Corrected to PGHOST
  database: process.env.PGDATABASE || 'eventlog_dev', // Corrected to PGDATABASE
  password: process.env.PGPASSWORD || 'localdevpassword', // Corrected to PGPASSWORD
  port: parseInt(process.env.PGPORT || '5432', 10), // Corrected to PGPORT
});

export async function POST(request: Request) {
  const body = await request.json();
  const kqlQuery: string = body.query;

  if (!kqlQuery || typeof kqlQuery !== 'string') {
    return NextResponse.json({ error: 'Invalid query provided. Expecting a JSON object with a "query" field of type string.' }, { status: 400 });
  }

  console.log(`[KQL_API] Received KQL Query: ${kqlQuery}`);

  let ast;
  try {
    // Call the async parser from the Wasm loader simulation
    ast = await parseKqlToAst(kqlQuery);
    if (!ast) {
      // This case is hit if parseKqlToAst (from kql_parser_wasm_loader) returns null,
      // which it does after catching an error from simulatedWasmCall or transformation.
      console.warn(`[KQL_API] KQL parsing/transformation resulted in null AST for query: ${kqlQuery}.`);
      // The kql_parser_wasm_loader already logs the specific error.
      return NextResponse.json({ error: 'KQL Processing Error', details: "Failed to parse KQL query or transform its AST. Check server logs for Wasm loader details." }, { status: 400 });
    }
    console.log(`[KQL_API] Generated AST (QueryNode): ${JSON.stringify(ast, null, 2)}`);
  } catch (parseOrTransformError: any) {
    // This catch block might be redundant if parseKqlToAst in kql_parser_wasm_loader handles all its internal errors and returns null.
    // However, keeping it for safety in case of unexpected exceptions from the loader itself.
    console.error(`[KQL_API] KQL Parsing/Transformation Exception: ${parseOrTransformError.message}`, parseOrTransformError.stack);
    return NextResponse.json({ error: 'KQL Processing Error', details: parseOrTransformError.message || "Fatal error during KQL parsing or AST transformation." }, { status: 400 });
  }

  let sqlQuery;
  try {
    sqlQuery = transpileAstToSql(ast); // AST here is QueryNode
    console.log(`[KQL_API] Generated SQL: ${sqlQuery}`);
  } catch (transpileError: any) {
    console.error(`[KQL_API] KQL Transpiling Error: ${transpileError.message}`, transpileError.stack);
    return NextResponse.json({ error: 'KQL Transpiling Error', details: transpileError.message || "Could not convert KQL AST to SQL." }, { status: 500 });
  }

  if (!sqlQuery.trim().toUpperCase().startsWith('SELECT')) {
      console.error(`[KQL_API] Generated SQL is not a SELECT query: ${sqlQuery}`);
      return NextResponse.json({ error: 'Generated SQL query is not a SELECT statement. Execution aborted for safety.' }, { status: 400 });
  }

  let client;
  try {
    client = await pool.connect();
    const { rows } = await client.query(sqlQuery);
    return NextResponse.json({ data: rows, query: kqlQuery, sql: sqlQuery });
  } catch (dbError: any) {
    console.error(`[KQL_API] Database Query Error: Code: ${dbError.code}, Message: ${dbError.message}`, dbError.stack);
    let clientErrorDetails = "Error executing query against the database.";
    if (process.env.NODE_ENV === 'development') {
        clientErrorDetails = `DB Error Code ${dbError.code}: ${dbError.message}`;
    }
    return NextResponse.json({ error: 'Database Query Error', details: clientErrorDetails }, { status: 500 });
  } finally {
    if (client) {
      client.release();
    }
  }
}

export async function GET() {
  return NextResponse.json({ message: 'KQL query endpoint. Use POST with a JSON body: { "query": "your_kql_query" }' });
}
