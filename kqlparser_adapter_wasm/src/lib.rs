use wasm_bindgen::prelude::*;
use kqlparser::parser::parse_query;
// Assuming the top-level AST node in irtimmer/rust-kql/kqlparser/src/ast.rs is `Query`
// and it (and its children) derive `serde::Serialize` when the "serialization" feature is enabled.
use kqlparser::ast::Query as KqlRustAst;
use serde_json;

// Optional: wee_alloc for smaller Wasm size if the "optimize_size" feature is enabled in Cargo.toml
// #[cfg(feature = "optimize_size")]
// #[global_allocator]
// static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

// Optional: Logging setup (e.g., if "logging" feature is enabled)
// fn setup_logging() {
//     #[cfg(feature = "logging")]
//     {
//         wasm_bindgen_console_logger::init_with_level(log::Level::Debug)
//             .expect("Failed to initialize console logger");
//     }
// }

// Called once from JavaScript to set the panic hook, etc.
#[wasm_bindgen(start)]
pub fn main_js() -> Result<(), JsValue> {
    // Set the panic hook for better error messages in the console (if feature enabled)
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();

    // Initialize logging if enabled
    // setup_logging();

    // log::info!("KQL Wasm parser initialized (Rust side).");
    Ok(())
}

/// Parses a KQL query string and returns its AST serialized as a JSON string.
/// If parsing fails, returns an error message (as JsValue).
/// If AST serialization fails, also returns an error.
#[wasm_bindgen]
pub fn parse_kql_to_json_ast_string(kql_query: &str) -> Result<String, JsValue> {
    // log::debug!("[Rust Wasm] Received KQL query: {}", kql_query);

    match parse_query(kql_query) {
        Ok(parsed_query_ast) => { // parsed_query_ast is of type kqlparser::ast::Query
            // log::debug!("[Rust Wasm] KQL parsing successful.");

            // Serialize the Rust AST directly to a JSON string.
            // This requires `KqlRustAst` and all its nested members to derive `serde::Serialize`.
            match serde_json::to_string_pretty(&parsed_query_ast) { // Using to_string_pretty for easier debugging if needed
                Ok(json_string) => {
                    // log::debug!("[Rust Wasm] AST successfully serialized to JSON string (length: {}).", json_string.len());
                    Ok(json_string)
                },
                Err(e) => {
                    let error_message = format!("[Rust Wasm] AST Serialization Error: {}", e);
                    // log::error!("{}", error_message);
                    Err(JsValue::from_str(&error_message))
                }
            }
        }
        Err(nom_error) => {
            // Convert nom::Err to a more JS-friendly error string.
            // nom::Err<nom::error::VerboseError<&str>> has useful methods, but to_string() is basic.
            // For a production library, you might want to format this more thoroughly.
            let error_message = format!("[Rust Wasm] KQL Parsing Error: {}", nom_error.to_string());
            // log::error!("{}", error_message);
            Err(JsValue::from_str(&error_message))
        }
    }
}

/// A simple health check function for the Wasm module.
#[wasm_bindgen]
pub fn health_check() -> String {
    // log::info!("[Rust Wasm] Health check called.");
    "KQL Wasm Parser (Rust) is healthy!".to_string()
}
