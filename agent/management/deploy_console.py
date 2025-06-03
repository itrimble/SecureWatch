#!/usr/bin/env python3
"""
SecureWatch Agent Management Console Deployment Script
Provides easy deployment and management of the console service
"""

import argparse
import asyncio
import logging
import os
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional


class ConsoleDeployer:
    """Handles deployment of the SecureWatch Management Console"""
    
    def __init__(self, install_dir: str = "/opt/securewatch-console"):
        self.install_dir = Path(install_dir)
        self.service_name = "securewatch-console"
        self.user = "securewatch"
        self.group = "securewatch"
        self.port = 8080
        self.logger = logging.getLogger(__name__)
    
    def deploy(self, production: bool = False) -> bool:
        """Deploy the management console"""
        try:
            self.logger.info("Starting SecureWatch Management Console deployment")
            
            # Create system user and directories
            if not self._create_system_user():
                return False
            
            if not self._create_directories():
                return False
            
            # Install Python dependencies
            if not self._install_dependencies():
                return False
            
            # Copy application files
            if not self._copy_application_files():
                return False
            
            # Create configuration files
            if not self._create_configuration(production):
                return False
            
            # Install systemd service
            if not self._install_systemd_service():
                return False
            
            # Configure firewall
            if not self._configure_firewall():
                return False
            
            # Start and enable service
            if not self._start_service():
                return False
            
            self.logger.info("SecureWatch Management Console deployed successfully")
            self.logger.info(f"Console will be available at http://localhost:{self.port}")
            
            return True
            
        except Exception as e:
            self.logger.error(f"Deployment failed: {e}")
            return False
    
    def _create_system_user(self) -> bool:
        """Create system user for the console service"""
        try:
            # Check if user already exists
            result = subprocess.run(['id', self.user], 
                                  capture_output=True, text=True)
            
            if result.returncode == 0:
                self.logger.info(f"User {self.user} already exists")
                return True
            
            # Create system user
            cmd = [
                'sudo', 'useradd',
                '--system',
                '--home-dir', str(self.install_dir),
                '--shell', '/bin/false',
                '--comment', 'SecureWatch Console Service',
                self.user
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                self.logger.info(f"Created system user: {self.user}")
                return True
            else:
                self.logger.error(f"Failed to create user: {result.stderr}")
                return False
                
        except Exception as e:
            self.logger.error(f"Error creating system user: {e}")
            return False
    
    def _create_directories(self) -> bool:
        """Create required directories"""
        try:
            directories = [
                self.install_dir,
                self.install_dir / "app",
                self.install_dir / "config", 
                self.install_dir / "data",
                self.install_dir / "logs",
                self.install_dir / "templates",
                self.install_dir / "static"
            ]
            
            for directory in directories:
                directory.mkdir(parents=True, exist_ok=True)
                
                # Set ownership
                subprocess.run(['sudo', 'chown', f'{self.user}:{self.group}', 
                              str(directory)], check=True)
                
                # Set permissions
                subprocess.run(['sudo', 'chmod', '755', str(directory)], 
                              check=True)
            
            self.logger.info("Created installation directories")
            return True
            
        except Exception as e:
            self.logger.error(f"Error creating directories: {e}")
            return False
    
    def _install_dependencies(self) -> bool:
        """Install Python dependencies"""
        try:
            # Install system packages
            system_packages = [
                'python3', 'python3-pip', 'python3-venv'
            ]
            
            cmd = ['sudo', 'apt-get', 'update']
            subprocess.run(cmd, check=True)
            
            cmd = ['sudo', 'apt-get', 'install', '-y'] + system_packages
            subprocess.run(cmd, check=True)
            
            # Create virtual environment
            venv_path = self.install_dir / "venv"
            cmd = ['python3', '-m', 'venv', str(venv_path)]
            subprocess.run(cmd, check=True)
            
            # Install Python packages
            pip_path = venv_path / "bin" / "pip"
            requirements_path = Path(__file__).parent / "requirements.txt"
            
            cmd = [str(pip_path), 'install', '-r', str(requirements_path)]
            subprocess.run(cmd, check=True)
            
            # Set ownership
            subprocess.run(['sudo', 'chown', '-R', f'{self.user}:{self.group}',
                          str(venv_path)], check=True)
            
            self.logger.info("Installed Python dependencies")
            return True
            
        except Exception as e:
            self.logger.error(f"Error installing dependencies: {e}")
            return False
    
    def _copy_application_files(self) -> bool:
        """Copy application files to installation directory"""
        try:
            source_dir = Path(__file__).parent
            
            # Copy Python files
            files_to_copy = [
                "console.py",
                "requirements.txt"
            ]
            
            for file_name in files_to_copy:
                source_file = source_dir / file_name
                dest_file = self.install_dir / "app" / file_name
                
                if source_file.exists():
                    subprocess.run(['sudo', 'cp', str(source_file), 
                                  str(dest_file)], check=True)
            
            # Copy templates directory
            templates_source = source_dir / "templates"
            templates_dest = self.install_dir / "templates"
            
            if templates_source.exists():
                subprocess.run(['sudo', 'cp', '-r', str(templates_source) + "/.", 
                              str(templates_dest)], check=True)
            
            # Set ownership
            subprocess.run(['sudo', 'chown', '-R', f'{self.user}:{self.group}',
                          str(self.install_dir / "app")], check=True)
            subprocess.run(['sudo', 'chown', '-R', f'{self.user}:{self.group}',
                          str(self.install_dir / "templates")], check=True)
            
            self.logger.info("Copied application files")
            return True
            
        except Exception as e:
            self.logger.error(f"Error copying application files: {e}")
            return False
    
    def _create_configuration(self, production: bool) -> bool:
        """Create configuration files"""
        try:
            # Create main configuration
            config_content = f"""
# SecureWatch Management Console Configuration
[console]
host = 0.0.0.0
port = {self.port}
debug = {"false" if production else "true"}
secret_key = {self._generate_secret_key()}

[database]
path = {self.install_dir}/data/console.db

[logging]
level = {"INFO" if production else "DEBUG"}
file = {self.install_dir}/logs/console.log
max_size = 100MB
backup_count = 5

[security]
enable_https = {"true" if production else "false"}
cert_file = {self.install_dir}/config/cert.pem
key_file = {self.install_dir}/config/key.pem
"""
            
            config_file = self.install_dir / "config" / "console.conf"
            with open(config_file, 'w') as f:
                f.write(config_content)
            
            # Set ownership and permissions
            subprocess.run(['sudo', 'chown', f'{self.user}:{self.group}',
                          str(config_file)], check=True)
            subprocess.run(['sudo', 'chmod', '600', str(config_file)], 
                          check=True)
            
            self.logger.info("Created configuration files")
            return True
            
        except Exception as e:
            self.logger.error(f"Error creating configuration: {e}")
            return False
    
    def _install_systemd_service(self) -> bool:
        """Install systemd service file"""
        try:
            service_content = f"""[Unit]
Description=SecureWatch Agent Management Console
After=network.target

[Service]
Type=simple
User={self.user}
Group={self.group}
WorkingDirectory={self.install_dir}
Environment=PATH={self.install_dir}/venv/bin
ExecStart={self.install_dir}/venv/bin/python {self.install_dir}/app/console.py --config-dir {self.install_dir}/config --db-path {self.install_dir}/data/console.db --host 0.0.0.0 --port {self.port}
Restart=always
RestartSec=10

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths={self.install_dir}/data {self.install_dir}/logs

[Install]
WantedBy=multi-user.target
"""
            
            service_file = f"/etc/systemd/system/{self.service_name}.service"
            
            with open(service_file, 'w') as f:
                f.write(service_content)
            
            # Reload systemd
            subprocess.run(['sudo', 'systemctl', 'daemon-reload'], check=True)
            
            self.logger.info("Installed systemd service")
            return True
            
        except Exception as e:
            self.logger.error(f"Error installing systemd service: {e}")
            return False
    
    def _configure_firewall(self) -> bool:
        """Configure firewall rules"""
        try:
            # Check if ufw is available
            result = subprocess.run(['which', 'ufw'], 
                                  capture_output=True, text=True)
            
            if result.returncode == 0:
                # Allow the console port
                cmd = ['sudo', 'ufw', 'allow', str(self.port)]
                subprocess.run(cmd, check=True)
                
                self.logger.info(f"Configured firewall to allow port {self.port}")
            else:
                self.logger.warning("UFW not available, skipping firewall configuration")
            
            return True
            
        except Exception as e:
            self.logger.warning(f"Error configuring firewall: {e}")
            return True  # Don't fail deployment for firewall issues
    
    def _start_service(self) -> bool:
        """Start and enable the service"""
        try:
            # Enable service
            subprocess.run(['sudo', 'systemctl', 'enable', self.service_name],
                          check=True)
            
            # Start service
            subprocess.run(['sudo', 'systemctl', 'start', self.service_name],
                          check=True)
            
            # Check service status
            result = subprocess.run(['sudo', 'systemctl', 'is-active', 
                                   self.service_name],
                                  capture_output=True, text=True)
            
            if result.stdout.strip() == 'active':
                self.logger.info("Service started successfully")
                return True
            else:
                self.logger.error("Service failed to start")
                return False
                
        except Exception as e:
            self.logger.error(f"Error starting service: {e}")
            return False
    
    def _generate_secret_key(self) -> str:
        """Generate a random secret key"""
        import secrets
        return secrets.token_hex(32)
    
    def uninstall(self) -> bool:
        """Uninstall the management console"""
        try:
            self.logger.info("Uninstalling SecureWatch Management Console")
            
            # Stop and disable service
            subprocess.run(['sudo', 'systemctl', 'stop', self.service_name],
                          check=False)
            subprocess.run(['sudo', 'systemctl', 'disable', self.service_name],
                          check=False)
            
            # Remove service file
            service_file = f"/etc/systemd/system/{self.service_name}.service"
            if os.path.exists(service_file):
                os.remove(service_file)
                subprocess.run(['sudo', 'systemctl', 'daemon-reload'], 
                              check=True)
            
            # Remove installation directory
            if self.install_dir.exists():
                subprocess.run(['sudo', 'rm', '-rf', str(self.install_dir)],
                              check=True)
            
            # Remove user
            subprocess.run(['sudo', 'userdel', self.user], check=False)
            
            self.logger.info("Uninstallation completed")
            return True
            
        except Exception as e:
            self.logger.error(f"Error during uninstallation: {e}")
            return False
    
    def status(self) -> Dict[str, str]:
        """Get service status"""
        try:
            # Check if service exists
            service_file = f"/etc/systemd/system/{self.service_name}.service"
            service_exists = os.path.exists(service_file)
            
            if not service_exists:
                return {"status": "not_installed"}
            
            # Check service status
            result = subprocess.run(['sudo', 'systemctl', 'is-active', 
                                   self.service_name],
                                  capture_output=True, text=True)
            
            active_status = result.stdout.strip()
            
            # Check if enabled
            result = subprocess.run(['sudo', 'systemctl', 'is-enabled', 
                                   self.service_name],
                                  capture_output=True, text=True)
            
            enabled_status = result.stdout.strip()
            
            return {
                "status": "installed",
                "active": active_status,
                "enabled": enabled_status,
                "port": str(self.port),
                "install_dir": str(self.install_dir)
            }
            
        except Exception as e:
            return {"status": "error", "error": str(e)}


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='SecureWatch Management Console Deployment'
    )
    
    parser.add_argument('action', 
                       choices=['deploy', 'uninstall', 'status'],
                       help='Action to perform')
    
    parser.add_argument('--production', action='store_true',
                       help='Deploy for production use')
    
    parser.add_argument('--install-dir', 
                       default='/opt/securewatch-console',
                       help='Installation directory')
    
    parser.add_argument('--port', type=int, default=8080,
                       help='Port for the console (default: 8080)')
    
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Enable verbose logging')
    
    args = parser.parse_args()
    
    # Setup logging
    level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
    
    # Check if running as root for installation actions
    if args.action in ['deploy', 'uninstall'] and os.geteuid() != 0:
        print("Error: This script must be run as root for deployment/uninstallation")
        print("Please run with sudo")
        sys.exit(1)
    
    # Create deployer
    deployer = ConsoleDeployer(args.install_dir)
    deployer.port = args.port
    
    # Execute action
    if args.action == 'deploy':
        success = deployer.deploy(args.production)
        sys.exit(0 if success else 1)
        
    elif args.action == 'uninstall':
        success = deployer.uninstall()
        sys.exit(0 if success else 1)
        
    elif args.action == 'status':
        status = deployer.status()
        print(f"Service Status: {status}")
        sys.exit(0)


if __name__ == '__main__':
    main()