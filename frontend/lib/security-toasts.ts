import { toast } from 'sonner';

export const securityToasts = {
  // Threat Detection
  threatDetected: (threat: {
    title: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    details: string;
    id?: string; // Optional incident ID for action
  }) => {
    const severityConfig = {
      low: { icon: '🔵', fn: toast.info },
      medium: { icon: '🟡', fn: toast.warning },
      high: { icon: '🟠', fn: toast.error }, // Changed high to error for more impact
      critical: { icon: '🔴', fn: toast.error },
    };

    const config = severityConfig[threat.severity];
    config.fn(`${config.icon} ${threat.title}`, {
      description: threat.details,
      duration: threat.severity === 'critical' ? 15000 : 8000, // Adjusted durations
      action: threat.id
        ? {
            label: 'Investigate',
            onClick: () =>
              (window.location.href = `/incident-investigation?id=${threat.id}`),
          }
        : undefined,
    });
  },

  // User Activity
  userActivity: (
    user: string,
    action: string,
    riskLevel: 'low' | 'medium' | 'high'
  ) => {
    const riskConfig = {
      low: { fn: toast.info, icon: '👤' },
      medium: { fn: toast.warning, icon: '⚠️' },
      high: { fn: toast.error, icon: '🚨' },
    };

    const config = riskConfig[riskLevel];
    config.fn(`${config.icon} User Activity: ${action}`, {
      description: `${user} - Risk Level: ${riskLevel.toUpperCase()}`,
    });
  },

  // Integration Status
  integrationStatus: (
    provider: string,
    status: 'connected' | 'disconnected' | 'error'
  ) => {
    const statusConfig = {
      connected: { fn: toast.success, icon: '✅' },
      disconnected: { fn: toast.warning, icon: '⚠️' },
      error: { fn: toast.error, icon: '❌' },
    };

    const config = statusConfig[status];
    config.fn(`${config.icon} ${provider} Integration ${status}`, {
      description:
        status === 'connected'
          ? `The ${provider} integration is now active.`
          : `The ${provider} integration is ${status}. Check configuration.`,
      action:
        status !== 'connected'
          ? {
              label: 'Settings',
              onClick: () => (window.location.href = '/settings/integrations'),
            }
          : undefined,
    });
  },

  // Training Progress
  trainingProgress: (student: string, module: string, completion: number) => {
    toast.success(`🎓 Training Progress: ${module}`, {
      description: `${student} completed ${completion}% of the module.`,
    });
  },

  // Generic Success
  success: (title: string, description?: string) => {
    toast.success(title, { description });
  },

  // Generic Error
  error: (title: string, description?: string) => {
    toast.error(title, { description });
  },

  // Generic Info
  info: (title: string, description?: string) => {
    toast.info(title, { description });
  },

  // Generic Warning
  warning: (title: string, description?: string) => {
    toast.warning(title, { description });
  },
};
