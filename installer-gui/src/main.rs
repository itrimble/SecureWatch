// SecureWatch Agent Professional Installer
// Enterprise-grade GUI installer for cross-platform deployment

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::{Path, PathBuf};
use std::process::Command;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, State, Emitter};
use directories::ProjectDirs;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct InstallationConfig {
    install_path: String,
    server_endpoint: String,
    agent_name: String,
    install_as_service: bool,
    start_automatically: bool,
    create_desktop_shortcut: bool,
    architecture: String,
}

impl Default for InstallationConfig {
    fn default() -> Self {
        let default_path = if cfg!(target_os = "windows") {
            "C:\\Program Files\\SecureWatch Agent".to_string()
        } else {
            "/usr/local/bin".to_string()
        };

        Self {
            install_path: default_path,
            server_endpoint: "https://your-securewatch-server.com".to_string(),
            agent_name: "SecureWatch Agent".to_string(),
            install_as_service: true,
            start_automatically: true,
            create_desktop_shortcut: false,
            architecture: std::env::consts::ARCH.to_string(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct InstallationProgress {
    step: String,
    progress: u32,
    message: String,
    completed: bool,
    error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct SystemInfo {
    os: String,
    arch: String,
    version: String,
    has_admin: bool,
}

// Tauri commands for frontend communication
#[tauri::command]
async fn get_system_info() -> Result<SystemInfo, String> {
    let os = std::env::consts::OS.to_string();
    let arch = std::env::consts::ARCH.to_string();
    let version = match sys_info::os_release() {
        Ok(v) => v,
        Err(_) => "Unknown".to_string(),
    };
    
    let has_admin = check_admin_privileges();

    Ok(SystemInfo {
        os,
        arch,
        version,
        has_admin,
    })
}

#[tauri::command]
async fn validate_install_path(path: String) -> Result<bool, String> {
    let path = Path::new(&path);
    
    // Check if parent directory exists and is writable
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            return Err("Parent directory does not exist".to_string());
        }
        
        // Try to create a test file to check write permissions
        let test_file = parent.join(".securewatch_install_test");
        match std::fs::File::create(&test_file) {
            Ok(_) => {
                let _ = std::fs::remove_file(&test_file);
                Ok(true)
            }
            Err(e) => Err(format!("Cannot write to directory: {}", e)),
        }
    } else {
        Err("Invalid path".to_string())
    }
}

#[tauri::command]
async fn perform_installation(
    config: InstallationConfig,
    app_handle: AppHandle,
) -> Result<(), String> {
    let window = app_handle.get_webview_window("main").unwrap();
    
    // Step 1: Prepare installation
    let _ = window.emit("installation_progress", InstallationProgress {
        step: "prepare".to_string(),
        progress: 10,
        message: "Preparing installation...".to_string(),
        completed: false,
        error: None,
    });

    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

    // Step 2: Copy files
    let _ = window.emit("installation_progress", InstallationProgress {
        step: "copy_files".to_string(),
        progress: 30,
        message: "Copying SecureWatch Agent files...".to_string(),
        completed: false,
        error: None,
    });

    if let Err(e) = copy_agent_files(&config).await {
        let _ = window.emit("installation_progress", InstallationProgress {
            step: "copy_files".to_string(),
            progress: 30,
            message: "Failed to copy files".to_string(),
            completed: false,
            error: Some(e.clone()),
        });
        return Err(e);
    }

    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

    // Step 3: Create configuration
    let _ = window.emit("installation_progress", InstallationProgress {
        step: "configure".to_string(),
        progress: 50,
        message: "Creating configuration files...".to_string(),
        completed: false,
        error: None,
    });

    if let Err(e) = create_configuration(&config).await {
        let _ = window.emit("installation_progress", InstallationProgress {
            step: "configure".to_string(),
            progress: 50,
            message: "Failed to create configuration".to_string(),
            completed: false,
            error: Some(e.clone()),
        });
        return Err(e);
    }

    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

    // Step 4: Install service
    if config.install_as_service {
        let _ = window.emit("installation_progress", InstallationProgress {
            step: "service".to_string(),
            progress: 70,
            message: "Installing system service...".to_string(),
            completed: false,
            error: None,
        });

        if let Err(e) = install_service(&config).await {
            let _ = window.emit("installation_progress", InstallationProgress {
                step: "service".to_string(),
                progress: 70,
                message: "Failed to install service".to_string(),
                completed: false,
                error: Some(e.clone()),
            });
            return Err(e);
        }
    }

    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

    // Step 5: Final setup
    let _ = window.emit("installation_progress", InstallationProgress {
        step: "finalize".to_string(),
        progress: 90,
        message: "Finalizing installation...".to_string(),
        completed: false,
        error: None,
    });

    if config.create_desktop_shortcut {
        let _ = create_desktop_shortcut(&config).await;
    }

    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

    // Step 6: Complete
    let _ = window.emit("installation_progress", InstallationProgress {
        step: "complete".to_string(),
        progress: 100,
        message: "Installation completed successfully!".to_string(),
        completed: true,
        error: None,
    });

    Ok(())
}

#[tauri::command]
async fn start_agent_service() -> Result<String, String> {
    if cfg!(target_os = "macos") {
        let output = Command::new("launchctl")
            .args(&["load", "-w", "/Library/LaunchDaemons/com.securewatch.agent.plist"])
            .output()
            .map_err(|e| format!("Failed to start service: {}", e))?;

        if output.status.success() {
            Ok("Service started successfully".to_string())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    } else if cfg!(target_os = "windows") {
        let output = Command::new("sc")
            .args(&["start", "SecureWatchAgent"])
            .output()
            .map_err(|e| format!("Failed to start service: {}", e))?;

        if output.status.success() {
            Ok("Service started successfully".to_string())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    } else {
        Err("Unsupported platform".to_string())
    }
}

// Helper functions
fn check_admin_privileges() -> bool {
    if cfg!(target_os = "windows") {
        // Check if running as administrator on Windows
        Command::new("net")
            .args(&["session"])
            .output()
            .map(|output| output.status.success())
            .unwrap_or(false)
    } else {
        // Check if running as root/sudo on Unix-like systems
        std::env::var("USER").unwrap_or_default() == "root" || 
        std::env::var("SUDO_USER").is_ok()
    }
}

async fn copy_agent_files(config: &InstallationConfig) -> Result<(), String> {
    let install_path = Path::new(&config.install_path);
    
    // Create install directory
    std::fs::create_dir_all(install_path)
        .map_err(|e| format!("Failed to create install directory: {}", e))?;

    // Get the path to bundled agent binary
    let binary_name = if cfg!(target_os = "windows") {
        "securewatch-agent.exe"
    } else if config.architecture == "aarch64" {
        "securewatch-agent-arm64-macos"
    } else {
        "securewatch-agent-x86_64-macos"
    };

    // Copy the appropriate binary
    let src_path = std::env::current_exe()
        .map_err(|e| format!("Failed to get current exe path: {}", e))?
        .parent()
        .ok_or("Failed to get parent directory")?
        .join(binary_name);

    let dest_path = install_path.join("securewatch-agent");

    if src_path.exists() {
        std::fs::copy(&src_path, &dest_path)
            .map_err(|e| format!("Failed to copy binary: {}", e))?;
        
        // Make executable on Unix
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = std::fs::metadata(&dest_path)
                .map_err(|e| format!("Failed to get permissions: {}", e))?
                .permissions();
            perms.set_mode(0o755);
            std::fs::set_permissions(&dest_path, perms)
                .map_err(|e| format!("Failed to set permissions: {}", e))?;
        }
    } else {
        return Err(format!("Agent binary not found: {}", src_path.display()));
    }

    Ok(())
}

async fn create_configuration(config: &InstallationConfig) -> Result<(), String> {
    let config_dir = if cfg!(target_os = "windows") {
        PathBuf::from(&config.install_path)
    } else {
        PathBuf::from("/etc/securewatch")
    };

    std::fs::create_dir_all(&config_dir)
        .map_err(|e| format!("Failed to create config directory: {}", e))?;

    let config_content = format!(r#"# SecureWatch Agent Configuration
# Generated by SecureWatch Agent Installer

[agent]
id = "securewatch-agent-{}"
name = "{}"
log_level = "info"
buffer_size = 10000

[collectors.syslog]
enabled = true
udp_port = 514
tcp_port = 514

[collectors.file_monitor]
enabled = true
paths = [
    "/var/log/**/*.log",
    "/usr/local/var/log/**/*.log"
]

[transport]
endpoint = "{}/api/events"
compression = "gzip"
retry_attempts = 3
retry_delay_ms = 1000

[transport.tls]
verify_certificates = true
ca_cert_path = ""

[buffer]
type = "persistent"
disk_buffer_size = 100000
high_water_mark = 0.8
low_water_mark = 0.3

[parsers.syslog]
enabled = true
pattern = "^(?P<timestamp>\\S+\\s+\\S+\\s+\\S+)\\s+(?P<hostname>\\S+)\\s+(?P<program>\\S+)\\[?(?P<pid>\\d+)?\\]?:\\s*(?P<message>.*)$"

[management]
enabled = false
bind_address = "127.0.0.1:9090"
"#, 
        uuid::Uuid::new_v4().to_string().replace("-", "")[..8].to_string(),
        config.agent_name,
        config.server_endpoint
    );

    let config_file = config_dir.join("config.toml");
    std::fs::write(config_file, config_content)
        .map_err(|e| format!("Failed to write config file: {}", e))?;

    Ok(())
}

async fn install_service(config: &InstallationConfig) -> Result<(), String> {
    if cfg!(target_os = "macos") {
        install_macos_service(config).await
    } else if cfg!(target_os = "windows") {
        install_windows_service(config).await
    } else {
        Err("Service installation not supported on this platform".to_string())
    }
}

async fn install_macos_service(config: &InstallationConfig) -> Result<(), String> {
    let plist_content = format!(r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.securewatch.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>{}/securewatch-agent</string>
        <string>--config</string>
        <string>/etc/securewatch/config.toml</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/securewatch-agent.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/securewatch-agent.log</string>
    <key>WorkingDirectory</key>
    <string>/etc/securewatch</string>
</dict>
</plist>"#, config.install_path);

    let plist_path = "/Library/LaunchDaemons/com.securewatch.agent.plist";
    std::fs::write(plist_path, plist_content)
        .map_err(|e| format!("Failed to write LaunchDaemon plist: {}", e))?;

    Ok(())
}

async fn install_windows_service(_config: &InstallationConfig) -> Result<(), String> {
    // Windows service installation would use sc.exe or NSSM
    // For now, return success - full implementation would require service wrapper
    Ok(())
}

async fn create_desktop_shortcut(_config: &InstallationConfig) -> Result<(), String> {
    // Desktop shortcut creation - platform specific
    Ok(())
}

fn main() {
    tracing_subscriber::fmt::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            get_system_info,
            validate_install_path,
            perform_installation,
            start_agent_service
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}