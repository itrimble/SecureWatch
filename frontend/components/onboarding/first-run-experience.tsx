"use client";

import React, { useState, useEffect } from 'react';
import { TourProvider, useTour } from '@reactour/tour';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Play, 
  SkipForward,
  CheckCircle,
  Lightbulb,
  Shield,
  Search,
  Activity,
  Database,
  Settings,
  Bell
} from "lucide-react";

interface FirstRunExperienceProps {
  onComplete?: () => void;
  skipOnboarding?: () => void;
}

// Tour steps configuration
const tourSteps = [
  {
    selector: '.main-navigation',
    content: 'Welcome to SecureWatch! This is your main navigation. From here you can access all platform features including search, dashboards, alerts, and settings.',
    title: 'Platform Navigation',
    position: 'bottom' as const
  },
  {
    selector: '.global-search',
    content: 'Use this global search bar to query your security data with KQL (Kusto Query Language). Type queries like "EventID:4625" to find failed Windows logins.',
    title: 'Global Search',
    position: 'bottom' as const
  },
  {
    selector: '.quick-start-cta',
    content: 'New to SecureWatch? Visit our Quick Start Center for interactive tutorials, demo data, and hands-on learning scenarios to master the platform.',
    title: 'Quick Start Learning Center',
    position: 'left' as const
  },
  {
    selector: '.critical-alerts-card',
    content: 'Monitor your critical and high-priority alerts here. This card shows real-time security incidents that need immediate attention.',
    title: 'Critical Alerts',
    position: 'right' as const
  },
  {
    selector: '.data-ingestion-card',
    content: 'Track your data ingestion status and events per second (EPS). This shows how much security data is being processed in real-time.',
    title: 'Data Ingestion',
    position: 'left' as const
  },
  {
    selector: '.platform-health-card',
    content: 'Monitor the health of all SecureWatch services. Green indicators show healthy services, yellow indicates warnings.',
    title: 'Platform Health',
    position: 'left' as const
  },
  {
    selector: '.recent-alerts-feed',
    content: 'View your latest security alerts in real-time. Click on any alert to investigate further and see detailed information.',
    title: 'Alert Feed',
    position: 'top' as const
  },
  {
    selector: '.threat-intelligence-card',
    content: 'Get insights from threat intelligence data including IOCs (Indicators of Compromise) and threat categorization.',
    title: 'Threat Intelligence',
    position: 'top' as const
  },
  {
    selector: '.quick-hunt-searches',
    content: 'Access pre-built security searches for common threat hunting scenarios. Click any search to run it immediately.',
    title: 'Quick Hunt Searches',
    position: 'top' as const
  }
];

// Custom Popover Component
function CustomPopover({ children, ...props }: any) {
  const { currentStep, steps, setCurrentStep, setIsOpen } = useTour();
  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <Card className="max-w-sm bg-card border-border shadow-lg" {...props}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">SecureWatch Tour</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        {step.title && (
          <CardTitle className="text-lg font-semibold">{step.title}</CardTitle>
        )}
        <Progress value={progress} className="h-1" />
        <div className="text-xs text-muted-foreground">
          Step {currentStep + 1} of {steps.length}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="text-sm text-foreground mb-4">
          {step.content}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setIsOpen(false);
                localStorage.setItem('securewatch-onboarding-completed', 'true');
              }}
              className="text-xs"
            >
              <SkipForward className="w-3 h-3 mr-1" />
              Skip Tour
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            {currentStep > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentStep(currentStep - 1)}
                className="text-xs"
              >
                <ChevronLeft className="w-3 h-3 mr-1" />
                Back
              </Button>
            )}
            <Button 
              size="sm" 
              onClick={() => {
                if (currentStep === steps.length - 1) {
                  setIsOpen(false);
                  localStorage.setItem('securewatch-onboarding-completed', 'true');
                } else {
                  setCurrentStep(currentStep + 1);
                }
              }}
              className="text-xs"
            >
              {currentStep === steps.length - 1 ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Finish
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-3 h-3 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Tour Component that handles the actual tour logic
function TourComponent({ onComplete, skipOnboarding }: FirstRunExperienceProps) {
  const [showWelcome, setShowWelcome] = useState(true);
  const { setIsOpen, setCurrentStep } = useTour();

  // Check if user has completed onboarding before
  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem('securewatch-onboarding-completed');
    if (hasCompletedOnboarding) {
      setShowWelcome(false);
    }
  }, []);

  const startTour = () => {
    setShowWelcome(false);
    setCurrentStep(0);
    setIsOpen(true);
  };

  const skipTour = () => {
    setShowWelcome(false);
    setIsOpen(false);
    localStorage.setItem('securewatch-onboarding-completed', 'true');
    skipOnboarding?.();
  };

  if (!showWelcome) {
    return null;
  }

  return (
    <>
      {/* Welcome Modal */}
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="max-w-lg mx-4 bg-card border-border">
          <CardHeader>
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Welcome to SecureWatch!</CardTitle>
                <p className="text-muted-foreground">Your comprehensive SIEM platform</p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="p-1 bg-blue-500/10 rounded">
                  <Search className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <h4 className="font-medium">Advanced Search & Analytics</h4>
                  <p className="text-sm text-muted-foreground">
                    Query security data with KQL and create custom dashboards
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="p-1 bg-red-500/10 rounded">
                  <Bell className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <h4 className="font-medium">Real-time Threat Detection</h4>
                  <p className="text-sm text-muted-foreground">
                    Monitor alerts and incidents as they happen
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="p-1 bg-green-500/10 rounded">
                  <Database className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <h4 className="font-medium">Unified Data Ingestion</h4>
                  <p className="text-sm text-muted-foreground">
                    Collect logs from all your security tools and infrastructure
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Lightbulb className="w-4 h-4 text-yellow-500" />
                <span className="font-medium text-sm">Quick Start</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Take our guided tour to learn about key features and get started with threat hunting!
              </p>
            </div>
            
            <div className="flex items-center justify-between pt-4">
              <Button variant="outline" onClick={skipTour}>
                Skip Tour
              </Button>
              <Button onClick={startTour} className="ml-3">
                <Play className="w-4 h-4 mr-2" />
                Start Guided Tour
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground text-center">
              You can restart this tour anytime from Settings → Help
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export function FirstRunExperience({ onComplete, skipOnboarding }: FirstRunExperienceProps) {
  return (
    <TourProvider
      steps={tourSteps}
      components={{ Popover: CustomPopover }}
      className="z-50"
      maskClassName="z-40"
      highlightedMaskClassName="z-50"
      styles={{
        popover: (base) => ({
          ...base,
          borderRadius: '8px',
          padding: 0,
        }),
        mask: (base) => ({
          ...base,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }),
        badge: (base) => ({
          ...base,
          display: 'none', // Hide the default badge
        }),
      }}
      onClickMask={({ setIsOpen }) => setIsOpen(false)}
      onClickHighlighted={(e, { setCurrentStep, currentStep, steps, setIsOpen }) => {
        // Allow interaction with highlighted elements
        e.stopPropagation();
      }}
    >
      <TourComponent onComplete={onComplete} skipOnboarding={skipOnboarding} />
    </TourProvider>
  );
}