import React, { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { 
  Shield, 
  Check, 
  FileText, 
  Settings, 
  Download, 
  CheckCircle,
  AlertCircle,
  Play,
  Loader2
} from 'lucide-react'

interface SystemInfo {
  os: string
  arch: string
  version: string
  has_admin: boolean
}

interface InstallConfig {
  install_path: string
  server_endpoint: string
  agent_name: string
  install_as_service: boolean
  start_automatically: boolean
  create_desktop_shortcut: boolean
  architecture: string
}

interface InstallProgress {
  step: string
  progress: number
  message: string
  completed: boolean
  error?: string
}

type Step = 'welcome' | 'license' | 'config' | 'install' | 'complete'

const steps = [
  { id: 'welcome', title: 'Introduction', icon: Shield },
  { id: 'license', title: 'License Agreement', icon: FileText },
  { id: 'config', title: 'Configuration', icon: Settings },
  { id: 'install', title: 'Installation', icon: Download },
  { id: 'complete', title: 'Complete', icon: CheckCircle },
]

function App() {
  const [currentStep, setCurrentStep] = useState<Step>('welcome')
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [config, setConfig] = useState<InstallConfig>({
    install_path: '',
    server_endpoint: 'https://your-securewatch-server.com',
    agent_name: 'SecureWatch Agent',
    install_as_service: true,
    start_automatically: true,
    create_desktop_shortcut: false,
    architecture: '',
  })
  const [licenseAccepted, setLicenseAccepted] = useState(false)
  const [installProgress, setInstallProgress] = useState<InstallProgress | null>(null)
  const [installing, setInstalling] = useState(false)
  const [installComplete, setInstallComplete] = useState(false)
  const [installError, setInstallError] = useState<string | null>(null)

  useEffect(() => {
    // Get system information
    invoke<SystemInfo>('get_system_info').then(setSystemInfo)
    
    // Set default install path based on OS
    setConfig(prev => ({
      ...prev,
      install_path: systemInfo?.os === 'windows' 
        ? 'C:\\Program Files\\SecureWatch Agent'
        : '/usr/local/bin',
      architecture: systemInfo?.arch || '',
    }))

    // Listen for installation progress
    const unlisten = listen<InstallProgress>('installation_progress', (event) => {
      setInstallProgress(event.payload)
      if (event.payload.completed) {
        setInstallComplete(true)
        setInstalling(false)
      }
      if (event.payload.error) {
        setInstallError(event.payload.error)
        setInstalling(false)
      }
    })

    return () => {
      unlisten.then(fn => fn())
    }
  }, [systemInfo?.os, systemInfo?.arch])

  const handleNext = () => {
    const stepIndex = steps.findIndex(s => s.id === currentStep)
    if (stepIndex < steps.length - 1) {
      setCurrentStep(steps[stepIndex + 1].id as Step)
    }
  }

  const handleBack = () => {
    const stepIndex = steps.findIndex(s => s.id === currentStep)
    if (stepIndex > 0) {
      setCurrentStep(steps[stepIndex - 1].id as Step)
    }
  }

  const handleInstall = async () => {
    setInstalling(true)
    setInstallError(null)
    try {
      await invoke('perform_installation', { config })
      setCurrentStep('complete')
    } catch (error) {
      setInstallError(error as string)
      setInstalling(false)
    }
  }

  const handleStartService = async () => {
    try {
      await invoke('start_agent_service')
    } catch (error) {
      console.error('Failed to start service:', error)
    }
  }

  const isStepCompleted = (stepId: string) => {
    const stepIndex = steps.findIndex(s => s.id === stepId)
    const currentIndex = steps.findIndex(s => s.id === currentStep)
    return stepIndex < currentIndex || (stepId === 'complete' && installComplete)
  }

  const canProceed = () => {
    switch (currentStep) {
      case 'welcome':
        return systemInfo?.has_admin
      case 'license':
        return licenseAccepted
      case 'config':
        return config.install_path && config.server_endpoint
      case 'install':
        return !installing
      default:
        return true
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <div className="welcome-content">
            <div className="welcome-icon">
              <Shield />
            </div>
            <h1 className="welcome-title">Welcome to SecureWatch Agent Installer</h1>
            <p className="welcome-description">
              This wizard will guide you through the installation of SecureWatch Agent, 
              a high-performance SIEM log collection and forwarding agent designed for 
              enterprise security monitoring.
            </p>
            
            <div className="version-info">
              <div className="version-title">SecureWatch Agent v1.0.0</div>
              <div className="version-details">
                © 2025 SecureWatch - Enterprise SIEM Platform<br />
                Universal binary with enterprise security features
              </div>
            </div>

            {systemInfo && (
              <div className="requirements-grid">
                <div className="requirement-item">
                  <div className="requirement-label">Operating System</div>
                  <div className="requirement-value">{systemInfo.os} {systemInfo.version}</div>
                  <span className="requirement-status ok">Compatible</span>
                </div>
                <div className="requirement-item">
                  <div className="requirement-label">Architecture</div>
                  <div className="requirement-value">{systemInfo.arch}</div>
                  <span className="requirement-status ok">Supported</span>
                </div>
                <div className="requirement-item">
                  <div className="requirement-label">Administrator Privileges</div>
                  <div className="requirement-value">
                    {systemInfo.has_admin ? 'Available' : 'Required'}
                  </div>
                  <span className={`requirement-status ${systemInfo.has_admin ? 'ok' : 'warning'}`}>
                    {systemInfo.has_admin ? 'Ready' : 'Needed'}
                  </span>
                </div>
                <div className="requirement-item">
                  <div className="requirement-label">Disk Space</div>
                  <div className="requirement-value">50 MB required</div>
                  <span className="requirement-status ok">Available</span>
                </div>
              </div>
            )}

            {!systemInfo?.has_admin && (
              <div className="alert alert-warning">
                Administrator privileges are required for installation. 
                Please restart the installer as an administrator.
              </div>
            )}
          </div>
        )

      case 'license':
        return (
          <div>
            <h2 className="content-title">License Agreement</h2>
            <p style={{ marginBottom: '20px', color: '#6c757d' }}>
              Please read and accept the license agreement to continue.
            </p>
            
            <div className="license-container">
              <div className="license-text">
                <h3>SecureWatch Agent License Agreement</h3>
                <br />
                <p>
                  <strong>END USER LICENSE AGREEMENT</strong>
                </p>
                <br />
                <p>
                  This End User License Agreement (&quot;Agreement&quot;) is a legal agreement between you 
                  (either an individual or a single entity) and SecureWatch for the SecureWatch Agent 
                  software product identified above, which includes computer software and may include 
                  associated media, printed materials, and &quot;online&quot; or electronic documentation 
                  (&quot;Software Product&quot;).
                </p>
                <br />
                <p>
                  <strong>GRANT OF LICENSE</strong>
                </p>
                <p>
                  SecureWatch grants you a non-exclusive license to install and use the Software Product 
                  for enterprise security monitoring purposes in accordance with the terms of this Agreement.
                </p>
                <br />
                <p>
                  <strong>RESTRICTIONS</strong>
                </p>
                <p>
                  You may not reverse engineer, decompile, or disassemble the Software Product. 
                  You may not rent, lease, or lend the Software Product.
                </p>
                <br />
                <p>
                  <strong>SUPPORT AND UPDATES</strong>
                </p>
                <p>
                  SecureWatch may provide support and updates for the Software Product at its discretion.
                </p>
                <br />
                <p>
                  <strong>DISCLAIMER OF WARRANTY</strong>
                </p>
                <p>
                  THE SOFTWARE PRODUCT IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTY OF ANY KIND. 
                  SECUREWATCH DISCLAIMS ALL WARRANTIES, EITHER EXPRESS OR IMPLIED.
                </p>
                <br />
                <p>
                  By installing this software, you acknowledge that you have read this agreement, 
                  understand it, and agree to be bound by its terms and conditions.
                </p>
              </div>
            </div>
            
            <div className="license-agreement">
              <input
                type="checkbox"
                id="license-accept"
                checked={licenseAccepted}
                onChange={(e) => setLicenseAccepted(e.target.checked)}
              />
              <label htmlFor="license-accept">
                I accept the terms of the License Agreement
              </label>
            </div>
          </div>
        )

      case 'config':
        return (
          <div>
            <h2 className="content-title">Installation Configuration</h2>
            <p style={{ marginBottom: '30px', color: '#6c757d' }}>
              Configure the installation settings for SecureWatch Agent.
            </p>

            <div className="form-group">
              <label className="form-label">Installation Directory</label>
              <input
                type="text"
                className="form-input"
                value={config.install_path}
                onChange={(e) => setConfig({ ...config, install_path: e.target.value })}
                placeholder="Enter installation path"
              />
            </div>

            <div className="form-group">
              <label className="form-label">SecureWatch Server Endpoint</label>
              <input
                type="text"
                className="form-input"
                value={config.server_endpoint}
                onChange={(e) => setConfig({ ...config, server_endpoint: e.target.value })}
                placeholder="https://your-securewatch-server.com"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Agent Name</label>
              <input
                type="text"
                className="form-input"
                value={config.agent_name}
                onChange={(e) => setConfig({ ...config, agent_name: e.target.value })}
                placeholder="Enter agent name"
              />
            </div>

            <div className="form-group">
              <h3 style={{ marginBottom: '15px', fontSize: '16px', color: '#495057' }}>
                Installation Options
              </h3>
              
              <div className="form-checkbox">
                <input
                  type="checkbox"
                  id="install-service"
                  checked={config.install_as_service}
                  onChange={(e) => setConfig({ ...config, install_as_service: e.target.checked })}
                />
                <label htmlFor="install-service">Install as system service</label>
              </div>

              <div className="form-checkbox">
                <input
                  type="checkbox"
                  id="start-auto"
                  checked={config.start_automatically}
                  onChange={(e) => setConfig({ ...config, start_automatically: e.target.checked })}
                />
                <label htmlFor="start-auto">Start automatically with system</label>
              </div>

              <div className="form-checkbox">
                <input
                  type="checkbox"
                  id="desktop-shortcut"
                  checked={config.create_desktop_shortcut}
                  onChange={(e) => setConfig({ ...config, create_desktop_shortcut: e.target.checked })}
                />
                <label htmlFor="desktop-shortcut">Create desktop shortcut</label>
              </div>
            </div>
          </div>
        )

      case 'install':
        return (
          <div>
            <h2 className="content-title">Installing SecureWatch Agent</h2>
            
            {!installing && !installComplete && !installError && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p style={{ fontSize: '16px', color: '#495057', marginBottom: '30px' }}>
                  Ready to install SecureWatch Agent with the following configuration:
                </p>
                <div className="version-info" style={{ textAlign: 'left', maxWidth: '400px', margin: '0 auto' }}>
                  <div><strong>Install Path:</strong> {config.install_path}</div>
                  <div><strong>Server Endpoint:</strong> {config.server_endpoint}</div>
                  <div><strong>Agent Name:</strong> {config.agent_name}</div>
                  <div><strong>Install as Service:</strong> {config.install_as_service ? 'Yes' : 'No'}</div>
                </div>
                <button 
                  className="nav-button primary"
                  onClick={handleInstall}
                  style={{ marginTop: '30px', padding: '15px 30px', fontSize: '16px' }}
                >
                  <Download style={{ width: '18px', height: '18px', marginRight: '8px' }} />
                  Begin Installation
                </button>
              </div>
            )}

            {installing && (
              <div className="install-status">
                <div className="install-spinner"></div>
                <div className="install-message">
                  {installProgress?.message || 'Installing SecureWatch Agent...'}
                </div>
                {installProgress && (
                  <div className="progress-container">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${installProgress.progress}%` }}
                      ></div>
                    </div>
                    <div className="progress-text">{installProgress.progress}% Complete</div>
                  </div>
                )}
              </div>
            )}

            {installError && (
              <div className="install-status">
                <div className="error-icon">
                  <AlertCircle />
                </div>
                <div className="install-message">Installation Failed</div>
                <div className="install-details">{installError}</div>
                <button 
                  className="nav-button"
                  onClick={() => {
                    setInstallError(null)
                    setInstalling(false)
                  }}
                  style={{ marginTop: '20px' }}
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        )

      case 'complete':
        return (
          <div className="welcome-content">
            <div className="success-icon">
              <Check />
            </div>
            <h1 className="welcome-title">Installation Complete!</h1>
            <p className="welcome-description">
              SecureWatch Agent has been successfully installed and configured. 
              The agent is ready to begin collecting and forwarding security logs 
              to your SecureWatch server.
            </p>

            <div className="version-info" style={{ textAlign: 'left' }}>
              <div className="version-title">Next Steps:</div>
              <div style={{ fontSize: '14px', lineHeight: '1.6', marginTop: '10px' }}>
                • The agent has been installed to: <strong>{config.install_path}</strong><br />
                • Configuration file: <strong>/etc/securewatch/config.toml</strong><br />
                • Log file: <strong>/tmp/securewatch-agent.log</strong><br />
                {config.install_as_service && (
                  <>• Service installed and configured for automatic startup<br /></>
                )}
                • Edit the configuration file to customize log collection<br />
                • Review the log file to verify agent operation
              </div>
            </div>

            {config.start_automatically && (
              <button 
                className="nav-button primary"
                onClick={handleStartService}
                style={{ marginTop: '20px' }}
              >
                <Play style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                Start Service Now
              </button>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="installer-container">
      {/* Left Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">S</div>
            <div>
              <div className="logo-text">SecureWatch</div>
              <div className="logo-subtitle">Agent Installer</div>
            </div>
          </div>
        </div>
        
        <div className="step-navigation">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isActive = step.id === currentStep
            const isCompleted = isStepCompleted(step.id)
            
            return (
              <div
                key={step.id}
                className={`step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              >
                <div className="step-number">
                  {isCompleted ? <Check size={14} /> : index + 1}
                </div>
                <div className="step-text">{step.title}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="content-header">
          <div className="content-title">
            {steps.find(s => s.id === currentStep)?.title}
          </div>
          <div className="content-subtitle">
            SecureWatch Agent Professional Installer v1.0.0
          </div>
        </div>

        <div className="content-body">
          {renderStepContent()}
        </div>

        <div className="bottom-navigation">
          <button
            className="nav-button"
            onClick={handleBack}
            disabled={currentStep === 'welcome' || installing}
          >
            Back
          </button>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            {currentStep !== 'complete' && (
              <button
                className="nav-button primary"
                onClick={currentStep === 'install' ? handleInstall : handleNext}
                disabled={!canProceed() || installing}
              >
                {installing && <Loader2 className="animate-spin" style={{ width: '16px', height: '16px', marginRight: '8px' }} />}
                {currentStep === 'install' ? 'Install' : 'Continue'}
              </button>
            )}
            
            {currentStep === 'complete' && (
              <button
                className="nav-button"
                onClick={() => window.close()}
              >
                Finish
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App