#!/usr/bin/env python3
"""
SecureWatch Agent Remote Installer
Deploys and configures SecureWatch agents on remote systems
"""

import argparse
import asyncio
import json
import logging
import os
import platform
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import paramiko
import zipfile


class AgentInstaller:
    """Handles remote installation of SecureWatch agents"""
    
    def __init__(self, console_url: str, api_key: str):
        self.console_url = console_url.rstrip('/')
        self.api_key = api_key
        self.logger = logging.getLogger(__name__)
        
        # Installation paths
        self.linux_install_path = "/opt/securewatch-agent"
        self.windows_install_path = "C:\\Program Files\\SecureWatch\\Agent"
        
        # Service names
        self.linux_service_name = "securewatch-agent"
        self.windows_service_name = "SecureWatchAgent"
    
    async def install_agent(self, host: str, username: str, password: str = None,
                           private_key: str = None, collectors: List[str] = None,
                           port: int = 22) -> Dict[str, str]:
        """Install agent on remote host"""
        try:
            self.logger.info(f"Starting agent installation on {host}")
            
            # Detect target OS
            os_type = await self._detect_os(host, username, password, private_key, port)
            if not os_type:
                return {"success": False, "error": "Could not detect target OS"}
            
            self.logger.info(f"Target OS detected: {os_type}")
            
            # Create installation package
            package_path = await self._create_installation_package(os_type, collectors)
            
            # Copy package to target
            if not await self._copy_package(host, username, password, private_key, 
                                          port, package_path, os_type):
                return {"success": False, "error": "Failed to copy installation package"}
            
            # Execute installation
            if not await self._execute_installation(host, username, password, 
                                                  private_key, port, os_type):
                return {"success": False, "error": "Installation failed"}
            
            # Configure agent
            agent_id = f"agent-{host.replace('.', '-')}-{self._generate_id()}"
            if not await self._configure_agent(host, username, password, 
                                             private_key, port, os_type, agent_id):
                return {"success": False, "error": "Agent configuration failed"}
            
            # Start agent service
            if not await self._start_agent_service(host, username, password,
                                                 private_key, port, os_type):
                return {"success": False, "error": "Failed to start agent service"}
            
            self.logger.info(f"Agent installation completed successfully on {host}")
            
            return {
                "success": True,
                "agent_id": agent_id,
                "host": host,
                "os_type": os_type,
                "message": "Agent installed and started successfully"
            }
            
        except Exception as e:
            self.logger.error(f"Installation failed: {e}")
            return {"success": False, "error": str(e)}
        
        finally:
            # Cleanup temporary files
            if 'package_path' in locals():
                try:
                    os.remove(package_path)
                except:
                    pass
    
    async def _detect_os(self, host: str, username: str, password: str = None,
                        private_key: str = None, port: int = 22) -> Optional[str]:
        """Detect operating system of target host"""
        try:
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            # Connect to host
            if private_key:
                key = paramiko.RSAKey.from_private_key_file(private_key)
                ssh.connect(host, port=port, username=username, pkey=key)
            else:
                ssh.connect(host, port=port, username=username, password=password)
            
            # Try to detect OS
            stdin, stdout, stderr = ssh.exec_command('uname -s')
            uname_output = stdout.read().decode().strip()
            
            if 'Linux' in uname_output:
                return 'linux'
            elif 'Darwin' in uname_output:
                return 'macos'
            else:
                # Try Windows detection
                stdin, stdout, stderr = ssh.exec_command('echo %OS%')
                os_output = stdout.read().decode().strip()
                if 'Windows' in os_output:
                    return 'windows'
            
            ssh.close()
            return None
            
        except Exception as e:
            self.logger.error(f"OS detection failed: {e}")
            return None
    
    async def _create_installation_package(self, os_type: str, 
                                         collectors: List[str] = None) -> str:
        """Create installation package for target OS"""
        try:
            # Create temporary directory
            temp_dir = tempfile.mkdtemp()
            package_path = os.path.join(temp_dir, f"securewatch-agent-{os_type}.zip")
            
            # Source directory (agent core)
            source_dir = Path(__file__).parent.parent / "core"
            
            # Create zip package
            with zipfile.ZipFile(package_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                # Add core agent files
                for file_path in source_dir.rglob("*.py"):
                    arcname = str(file_path.relative_to(source_dir.parent))
                    zipf.write(file_path, arcname)
                
                # Add installation script
                install_script = self._generate_install_script(os_type, collectors)
                zipf.writestr(f"install.{'sh' if os_type != 'windows' else 'bat'}", 
                            install_script)
                
                # Add configuration template
                config_template = self._generate_config_template(collectors)
                zipf.writestr("config.json.template", config_template)
                
                # Add service file for Linux
                if os_type == 'linux':
                    service_file = self._generate_systemd_service()
                    zipf.writestr("securewatch-agent.service", service_file)
            
            self.logger.info(f"Created installation package: {package_path}")
            return package_path
            
        except Exception as e:
            self.logger.error(f"Failed to create installation package: {e}")
            raise
    
    def _generate_install_script(self, os_type: str, collectors: List[str] = None) -> str:
        """Generate OS-specific installation script"""
        if os_type == 'linux':
            return f"""#!/bin/bash
set -e

# SecureWatch Agent Installation Script for Linux

INSTALL_DIR="{self.linux_install_path}"
SERVICE_NAME="{self.linux_service_name}"
USER="securewatch"

echo "Installing SecureWatch Agent..."

# Create user
if ! id "$USER" &>/dev/null; then
    useradd --system --home-dir "$INSTALL_DIR" --shell /bin/false "$USER"
fi

# Create directories
mkdir -p "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR/config"
mkdir -p "$INSTALL_DIR/data"
mkdir -p "$INSTALL_DIR/logs"

# Install Python 3.11+ if not available
if ! command -v python3.11 &> /dev/null; then
    apt-get update
    apt-get install -y python3.11 python3.11-venv python3.11-dev
fi

# Create virtual environment
python3.11 -m venv "$INSTALL_DIR/venv"

# Install dependencies
"$INSTALL_DIR/venv/bin/pip" install --upgrade pip
"$INSTALL_DIR/venv/bin/pip" install asyncio aiohttp zstandard psutil sqlite3

# Copy agent files
cp -r core/ "$INSTALL_DIR/"

# Set permissions
chown -R "$USER:$USER" "$INSTALL_DIR"
chmod +x "$INSTALL_DIR/core/agent.py"

# Install systemd service
cp securewatch-agent.service /etc/systemd/system/
systemctl daemon-reload

echo "Installation completed successfully"
"""
        
        elif os_type == 'windows':
            return f"""@echo off
REM SecureWatch Agent Installation Script for Windows

echo Installing SecureWatch Agent...

set INSTALL_DIR={self.windows_install_path}

REM Create directories
mkdir "%INSTALL_DIR%" 2>nul
mkdir "%INSTALL_DIR%\\config" 2>nul
mkdir "%INSTALL_DIR%\\data" 2>nul
mkdir "%INSTALL_DIR%\\logs" 2>nul

REM Check for Python 3.11+
python --version | findstr "3.11" >nul
if errorlevel 1 (
    echo Python 3.11+ is required. Please install Python 3.11+ first.
    exit /b 1
)

REM Create virtual environment
python -m venv "%INSTALL_DIR%\\venv"

REM Install dependencies
"%INSTALL_DIR%\\venv\\Scripts\\pip" install --upgrade pip
"%INSTALL_DIR%\\venv\\Scripts\\pip" install asyncio aiohttp zstandard psutil

REM Copy agent files
xcopy /E /I /Y core\\* "%INSTALL_DIR%\\core\\"

REM Install as Windows service
"%INSTALL_DIR%\\venv\\Scripts\\python" -m pip install pywin32
"%INSTALL_DIR%\\venv\\Scripts\\python" "%INSTALL_DIR%\\core\\agent.py" --install-service

echo Installation completed successfully
"""
        
        else:  # macOS
            return f"""#!/bin/bash
set -e

# SecureWatch Agent Installation Script for macOS

INSTALL_DIR="{self.linux_install_path}"
USER="securewatch"

echo "Installing SecureWatch Agent..."

# Create user
if ! id "$USER" &>/dev/null; then
    sudo dscl . -create /Users/$USER
    sudo dscl . -create /Users/$USER UserShell /bin/false
    sudo dscl . -create /Users/$USER RealName "SecureWatch Agent"
    sudo dscl . -create /Users/$USER UniqueID 501
    sudo dscl . -create /Users/$USER PrimaryGroupID 80
    sudo dscl . -create /Users/$USER NFSHomeDirectory "$INSTALL_DIR"
fi

# Create directories
sudo mkdir -p "$INSTALL_DIR"
sudo mkdir -p "$INSTALL_DIR/config"
sudo mkdir -p "$INSTALL_DIR/data"
sudo mkdir -p "$INSTALL_DIR/logs"

# Install Python 3.11+ via Homebrew if not available
if ! command -v python3.11 &> /dev/null; then
    if ! command -v brew &> /dev/null; then
        echo "Homebrew is required. Please install Homebrew first."
        exit 1
    fi
    brew install python@3.11
fi

# Create virtual environment
python3.11 -m venv "$INSTALL_DIR/venv"

# Install dependencies
"$INSTALL_DIR/venv/bin/pip" install --upgrade pip
"$INSTALL_DIR/venv/bin/pip" install asyncio aiohttp zstandard psutil

# Copy agent files
sudo cp -r core/ "$INSTALL_DIR/"

# Set permissions
sudo chown -R "$USER:staff" "$INSTALL_DIR"
sudo chmod +x "$INSTALL_DIR/core/agent.py"

echo "Installation completed successfully"
"""
    
    def _generate_config_template(self, collectors: List[str] = None) -> str:
        """Generate configuration template"""
        if not collectors:
            collectors = ["file", "syslog"]
        
        config = {
            "agent_id": "AGENT_ID_PLACEHOLDER",
            "version": "1.0.0",
            "console_url": self.console_url,
            "api_key": self.api_key,
            "transport": {
                "protocol": "https",
                "port": 8443,
                "compression": {
                    "enabled": True,
                    "level": 6
                },
                "tls": {
                    "enabled": True,
                    "verify_certs": True,
                    "cert_file": None,
                    "key_file": None,
                    "ca_file": None
                },
                "retry": {
                    "max_attempts": 3,
                    "backoff_factor": 2.0,
                    "max_backoff": 300
                }
            },
            "buffer": {
                "max_size_mb": 100,
                "batch_size": 100,
                "flush_interval": 30,
                "retention_hours": 24
            },
            "health": {
                "check_interval": 60,
                "metrics_retention_hours": 24,
                "thresholds": {
                    "cpu_percent": 80,
                    "memory_percent": 85,
                    "disk_percent": 90
                }
            },
            "resource_limits": {
                "max_cpu_percent": 20,
                "max_memory_mb": 512,
                "max_disk_mb": 1024,
                "max_events_per_second": 1000
            },
            "collectors": {}
        }
        
        # Add collector configurations
        for collector in collectors:
            if collector == "file":
                config["collectors"]["file_collector"] = {
                    "type": "file",
                    "enabled": True,
                    "config": {
                        "file_patterns": ["/var/log/*.log", "/var/log/**/*.log"],
                        "directory_paths": ["/var/log"],
                        "recursive": True,
                        "log_format": "auto",
                        "encoding": "utf-8",
                        "start_position": "end"
                    }
                }
            
            elif collector == "syslog":
                config["collectors"]["syslog_collector"] = {
                    "type": "syslog",
                    "enabled": True,
                    "config": {
                        "bind_address": "0.0.0.0",
                        "port": 514,
                        "protocol": "udp",
                        "buffer_size": 65536
                    }
                }
            
            elif collector == "windows_event":
                config["collectors"]["windows_event_collector"] = {
                    "type": "windows_event",
                    "enabled": True,
                    "config": {
                        "channels": ["Security", "System", "Application"],
                        "event_ids": [],
                        "servers": ["localhost"],
                        "collection_mode": "api"
                    }
                }
        
        return json.dumps(config, indent=2)
    
    def _generate_systemd_service(self) -> str:
        """Generate systemd service file for Linux"""
        return f"""[Unit]
Description=SecureWatch Agent
After=network.target

[Service]
Type=simple
User=securewatch
Group=securewatch
WorkingDirectory={self.linux_install_path}
Environment=PATH={self.linux_install_path}/venv/bin
ExecStart={self.linux_install_path}/venv/bin/python {self.linux_install_path}/core/agent.py --config {self.linux_install_path}/config/agent.json
Restart=always
RestartSec=10

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths={self.linux_install_path}/data {self.linux_install_path}/logs

[Install]
WantedBy=multi-user.target
"""
    
    async def _copy_package(self, host: str, username: str, password: str = None,
                           private_key: str = None, port: int = 22,
                           package_path: str = "", os_type: str = "") -> bool:
        """Copy installation package to target host"""
        try:
            # Create SFTP connection
            transport = paramiko.Transport((host, port))
            
            if private_key:
                key = paramiko.RSAKey.from_private_key_file(private_key)
                transport.connect(username=username, pkey=key)
            else:
                transport.connect(username=username, password=password)
            
            sftp = paramiko.SFTPClient.from_transport(transport)
            
            # Copy package to temporary location
            remote_path = f"/tmp/securewatch-agent-{os_type}.zip"
            if os_type == "windows":
                remote_path = f"C:\\temp\\securewatch-agent-{os_type}.zip"
            
            sftp.put(package_path, remote_path)
            
            sftp.close()
            transport.close()
            
            self.logger.info(f"Package copied to {host}:{remote_path}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to copy package: {e}")
            return False
    
    async def _execute_installation(self, host: str, username: str, 
                                   password: str = None, private_key: str = None,
                                   port: int = 22, os_type: str = "") -> bool:
        """Execute installation script on target host"""
        try:
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            # Connect to host
            if private_key:
                key = paramiko.RSAKey.from_private_key_file(private_key)
                ssh.connect(host, port=port, username=username, pkey=key)
            else:
                ssh.connect(host, port=port, username=username, password=password)
            
            # Extract package and run installation
            commands = []
            
            if os_type == "windows":
                commands = [
                    "cd C:\\temp",
                    "powershell -Command \"Expand-Archive securewatch-agent-windows.zip -DestinationPath .\"",
                    "install.bat"
                ]
            else:
                commands = [
                    "cd /tmp",
                    "unzip securewatch-agent-linux.zip",
                    "chmod +x install.sh",
                    "sudo ./install.sh"
                ]
            
            for command in commands:
                stdin, stdout, stderr = ssh.exec_command(command)
                exit_status = stdout.channel.recv_exit_status()
                
                if exit_status != 0:
                    error_output = stderr.read().decode()
                    self.logger.error(f"Command failed: {command}")
                    self.logger.error(f"Error: {error_output}")
                    return False
                
                output = stdout.read().decode()
                self.logger.debug(f"Command output: {output}")
            
            ssh.close()
            self.logger.info("Installation script executed successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Installation execution failed: {e}")
            return False
    
    async def _configure_agent(self, host: str, username: str, password: str = None,
                              private_key: str = None, port: int = 22,
                              os_type: str = "", agent_id: str = "") -> bool:
        """Configure agent on target host"""
        try:
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            # Connect to host
            if private_key:
                key = paramiko.RSAKey.from_private_key_file(private_key)
                ssh.connect(host, port=port, username=username, pkey=key)
            else:
                ssh.connect(host, port=port, username=username, password=password)
            
            # Update configuration with actual agent ID
            config_path = f"{self.linux_install_path}/config/agent.json"
            if os_type == "windows":
                config_path = f"{self.windows_install_path}\\config\\agent.json"
            
            commands = [
                f"cp /tmp/config.json.template {config_path}",
                f"sed -i 's/AGENT_ID_PLACEHOLDER/{agent_id}/g' {config_path}"
            ]
            
            if os_type == "windows":
                commands = [
                    f"copy C:\\temp\\config.json.template \"{config_path}\"",
                    f"powershell -Command \"(Get-Content '{config_path}') -replace 'AGENT_ID_PLACEHOLDER', '{agent_id}' | Set-Content '{config_path}'\""
                ]
            
            for command in commands:
                stdin, stdout, stderr = ssh.exec_command(command)
                exit_status = stdout.channel.recv_exit_status()
                
                if exit_status != 0:
                    error_output = stderr.read().decode()
                    self.logger.error(f"Configuration command failed: {command}")
                    self.logger.error(f"Error: {error_output}")
                    return False
            
            ssh.close()
            self.logger.info("Agent configured successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Agent configuration failed: {e}")
            return False
    
    async def _start_agent_service(self, host: str, username: str, 
                                  password: str = None, private_key: str = None,
                                  port: int = 22, os_type: str = "") -> bool:
        """Start agent service on target host"""
        try:
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            # Connect to host
            if private_key:
                key = paramiko.RSAKey.from_private_key_file(private_key)
                ssh.connect(host, port=port, username=username, pkey=key)
            else:
                ssh.connect(host, port=port, username=username, password=password)
            
            # Start service
            if os_type == "linux":
                commands = [
                    f"sudo systemctl enable {self.linux_service_name}",
                    f"sudo systemctl start {self.linux_service_name}",
                    f"sudo systemctl status {self.linux_service_name}"
                ]
            elif os_type == "windows":
                commands = [
                    f"sc start {self.windows_service_name}",
                    f"sc query {self.windows_service_name}"
                ]
            else:  # macOS
                commands = [
                    f"sudo launchctl load /Library/LaunchDaemons/com.securewatch.agent.plist",
                    f"sudo launchctl start com.securewatch.agent"
                ]
            
            for command in commands:
                stdin, stdout, stderr = ssh.exec_command(command)
                exit_status = stdout.channel.recv_exit_status()
                output = stdout.read().decode()
                
                self.logger.debug(f"Command: {command}")
                self.logger.debug(f"Output: {output}")
                
                if "status" in command or "query" in command:
                    # Status commands may return non-zero but still provide useful info
                    continue
                
                if exit_status != 0:
                    error_output = stderr.read().decode()
                    self.logger.error(f"Service command failed: {command}")
                    self.logger.error(f"Error: {error_output}")
                    return False
            
            ssh.close()
            self.logger.info("Agent service started successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to start agent service: {e}")
            return False
    
    def _generate_id(self) -> str:
        """Generate a unique ID"""
        import secrets
        return secrets.token_hex(4)
    
    async def uninstall_agent(self, host: str, username: str, password: str = None,
                             private_key: str = None, port: int = 22) -> Dict[str, str]:
        """Uninstall agent from remote host"""
        try:
            self.logger.info(f"Starting agent uninstallation on {host}")
            
            # Detect OS
            os_type = await self._detect_os(host, username, password, private_key, port)
            if not os_type:
                return {"success": False, "error": "Could not detect target OS"}
            
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            # Connect to host
            if private_key:
                key = paramiko.RSAKey.from_private_key_file(private_key)
                ssh.connect(host, port=port, username=username, pkey=key)
            else:
                ssh.connect(host, port=port, username=username, password=password)
            
            # Stop and remove service
            if os_type == "linux":
                commands = [
                    f"sudo systemctl stop {self.linux_service_name}",
                    f"sudo systemctl disable {self.linux_service_name}",
                    f"sudo rm -f /etc/systemd/system/{self.linux_service_name}.service",
                    "sudo systemctl daemon-reload",
                    f"sudo rm -rf {self.linux_install_path}",
                    "sudo userdel securewatch"
                ]
            elif os_type == "windows":
                commands = [
                    f"sc stop {self.windows_service_name}",
                    f"sc delete {self.windows_service_name}",
                    f"rmdir /s /q \"{self.windows_install_path}\""
                ]
            else:  # macOS
                commands = [
                    "sudo launchctl unload /Library/LaunchDaemons/com.securewatch.agent.plist",
                    "sudo rm -f /Library/LaunchDaemons/com.securewatch.agent.plist",
                    f"sudo rm -rf {self.linux_install_path}",
                    "sudo dscl . -delete /Users/securewatch"
                ]
            
            for command in commands:
                stdin, stdout, stderr = ssh.exec_command(command)
                exit_status = stdout.channel.recv_exit_status()
                
                # Some commands may fail (e.g., user doesn't exist), continue anyway
                if exit_status != 0:
                    error_output = stderr.read().decode()
                    self.logger.warning(f"Command failed (continuing): {command}")
                    self.logger.warning(f"Error: {error_output}")
            
            ssh.close()
            
            self.logger.info(f"Agent uninstallation completed on {host}")
            return {"success": True, "message": "Agent uninstalled successfully"}
            
        except Exception as e:
            self.logger.error(f"Uninstallation failed: {e}")
            return {"success": False, "error": str(e)}


async def main():
    """Main entry point for agent installer"""
    parser = argparse.ArgumentParser(description='SecureWatch Agent Remote Installer')
    
    parser.add_argument('action', choices=['install', 'uninstall'],
                       help='Action to perform')
    
    parser.add_argument('--host', required=True,
                       help='Target host IP or hostname')
    
    parser.add_argument('--username', required=True,
                       help='SSH username')
    
    parser.add_argument('--password',
                       help='SSH password')
    
    parser.add_argument('--private-key',
                       help='Path to SSH private key file')
    
    parser.add_argument('--port', type=int, default=22,
                       help='SSH port (default: 22)')
    
    parser.add_argument('--console-url', 
                       default='https://localhost:8080',
                       help='Management console URL')
    
    parser.add_argument('--api-key',
                       default='default-api-key',
                       help='API key for console authentication')
    
    parser.add_argument('--collectors', nargs='*',
                       default=['file', 'syslog'],
                       help='Collectors to enable')
    
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Enable verbose logging')
    
    args = parser.parse_args()
    
    # Setup logging
    level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
    
    # Validate authentication
    if not args.password and not args.private_key:
        print("Error: Either --password or --private-key must be provided")
        return 1
    
    # Create installer
    installer = AgentInstaller(args.console_url, args.api_key)
    
    # Execute action
    if args.action == 'install':
        result = await installer.install_agent(
            args.host, args.username, args.password, args.private_key,
            args.collectors, args.port
        )
    else:
        result = await installer.uninstall_agent(
            args.host, args.username, args.password, args.private_key, args.port
        )
    
    # Print result
    if result["success"]:
        print(f"Success: {result['message']}")
        if 'agent_id' in result:
            print(f"Agent ID: {result['agent_id']}")
        return 0
    else:
        print(f"Error: {result['error']}")
        return 1


if __name__ == '__main__':
    import sys
    sys.exit(asyncio.run(main()))