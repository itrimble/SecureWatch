#!/bin/bash

# Script to build the KQL Parser Wasm module.
# Ensure you are in the kqlparser_adapter_wasm directory (where this script and Cargo.toml are)
# before running this script.

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Navigate to the script's directory if not already there
# This allows running the script from any location, e.g., project root via ./kqlparser_adapter_wasm/build_wasm.sh
cd "$SCRIPT_DIR" || exit 1

# Define the output directory relative to the Next.js project structure.
# This assumes kqlparser_adapter_wasm is a direct child of the project root,
# and the Next.js 'src' directory is also at the project root.
# Adjust if your directory structure is different.
# Example: ProjectRoot/kqlparser_adapter_wasm (current dir)
#          ProjectRoot/src/lib/kql_parser_wasm_pkg (target output)
OUTPUT_DIR="../../src/lib/kql_parser_wasm_pkg"

echo "Building KQL Parser Wasm module..."
echo "Output directory will be: $OUTPUT_DIR"

# Run wasm-pack build
# --target nodejs: Generates output suitable for Node.js environment (like Next.js API routes).
# --out-dir: Specifies the output directory.
# --release: Builds in release mode (optimized).
# -- --features "wee_alloc": Example of enabling a feature from Cargo.toml.
#   You can add more features here if defined, e.g., "logging".
#   If no extra features, the "-- --features ..." part can be omitted or just use default features.
wasm-pack build --target nodejs --out-dir "$OUTPUT_DIR" --release # Add -- --features "wee_alloc" "console_error_panic_hook" if needed and not default

# Check build status
if [ $? -eq 0 ]; then
  echo "Wasm module built successfully."
  echo "Output located in: $OUTPUT_DIR"
  echo "Make sure to add this path to your .gitignore if it's not already (e.g., src/lib/kql_parser_wasm_pkg/)"
else
  echo "Wasm module build failed."
  exit 1
fi
