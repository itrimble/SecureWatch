#!/bin/bash

# Installer script for the Event Log Agent on macOS

echo "Starting Event Log Agent setup for macOS..."

# --- Configuration ---
AGENT_DIR="agent"
VENV_DIR="agent_venv"
PYTHON_CMD="python3"

# --- Helper Functions ---
print_error() {
    echo ""
    echo "ERROR: $1" >&2
    echo ""
    exit 1
}

print_success() {
    echo ""
    echo "$1"
    echo ""
}

print_instruction() {
    echo "    $1"
}

# --- Check for Python 3 ---
if ! command -v $PYTHON_CMD &> /dev/null
then
    print_error "$PYTHON_CMD could not be found. Please install Python 3."
fi
echo "Python 3 found."

# --- Create Virtual Environment ---
echo "Creating virtual environment in $VENV_DIR..."
if [ -d "$VENV_DIR" ]; then
    echo "Virtual environment '$VENV_DIR' already exists. Skipping creation."
else
    $PYTHON_CMD -m venv "$VENV_DIR"
    if [ $? -ne 0 ]; then
        print_error "Failed to create virtual environment in $VENV_DIR."
    fi
    echo "Virtual environment created."
fi

# --- Activate Virtual Environment and Install Dependencies ---
# Note: Activation within a script is tricky. For installing packages,
# it's often easier to call the pip from the venv directly.
VENV_PIP="$VENV_DIR/bin/pip"

echo "Installing dependencies from $AGENT_DIR/requirements.txt..."
if [ ! -f "$AGENT_DIR/requirements.txt" ]; then
    print_error "$AGENT_DIR/requirements.txt not found. Make sure the agent files are present."
fi

"$VENV_PIP" install -r "$AGENT_DIR/requirements.txt"
if [ $? -ne 0 ]; then
    print_error "Failed to install dependencies. Check $VENV_DIR/pip.log if it exists, or try running pip install manually after activating the venv."
fi
echo "Dependencies installed successfully."

# --- Copy Configuration File ---
CONFIG_FILE="$AGENT_DIR/config.ini"
CONFIG_EXAMPLE_FILE="$AGENT_DIR/config.ini.example"

echo "Setting up configuration file..."
if [ -f "$CONFIG_FILE" ]; then
    echo "Configuration file '$CONFIG_FILE' already exists. Skipping copy."
else
    if [ ! -f "$CONFIG_EXAMPLE_FILE" ]; then
        print_error "Example configuration file '$CONFIG_EXAMPLE_FILE' not found."
    fi
    cp "$CONFIG_EXAMPLE_FILE" "$CONFIG_FILE"
    if [ $? -ne 0 ]; then
        print_error "Failed to copy example configuration to $CONFIG_FILE."
    fi
    echo "Copied '$CONFIG_EXAMPLE_FILE' to '$CONFIG_FILE'."
fi

# --- Print Completion Message and Instructions ---
print_success "Agent setup completed successfully!"
echo "Next Steps:"
echo ""
print_instruction "1. Activate the virtual environment in your terminal:"
print_instruction "   source $VENV_DIR/bin/activate"
echo ""
print_instruction "2. Configure the agent by editing the '$CONFIG_FILE' file."
print_instruction "   - Focus on the [FileLog:...] sections for macOS."
print_instruction "   - The [WindowsEventLog] section will not function on macOS and can be disabled or ignored."
print_instruction "   Example for a local log file on macOS:"
print_instruction "   [FileLog:MySystemLog]"
print_instruction "   ENABLED = true"
print_instruction "   LOG_SOURCE_IDENTIFIER = my_mac_system_log"
print_instruction "   FILE_PATH = /var/log/system.log"
print_instruction "   COLLECTION_INTERVAL_SECONDS = 60"
echo ""
print_instruction "3. Run the agent **from the project root directory, using the python3 interpreter**:"
print_instruction "   Make sure your virtual environment is still active!"
print_instruction "   Example: python3 $AGENT_DIR/event_log_agent.py"
echo ""
print_instruction "   IMPORTANT: Always use 'python3' to start the agent."
print_instruction "   Do NOT try to run it directly like './agent/event_log_agent.py' even if it's executable."
print_instruction "   This can cause conflicts with other system commands (like ImageMagick's 'import')."
echo ""
print_instruction "To deactivate the virtual environment later, simply type:"
print_instruction "   deactivate"
echo ""

exit 0
