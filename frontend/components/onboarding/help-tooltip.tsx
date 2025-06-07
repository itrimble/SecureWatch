"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { HelpCircle, X, Lightbulb } from "lucide-react";
import { useOnboarding } from "@/hooks/use-onboarding";

interface HelpTooltipProps {
  id: string;
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  showOnce?: boolean;
  children: React.ReactNode;
}

export function HelpTooltip({ 
  id, 
  title, 
  content, 
  placement = 'top',
  showOnce = true,
  children 
}: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const { hasSeenFeature, markFeatureAsSeen } = useOnboarding();

  // If showOnce is true and user has seen this feature, don't show the tooltip
  const shouldShowTooltip = !showOnce || !hasSeenFeature(`help-tooltip-${id}`);

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsOpen(false);
    if (showOnce) {
      markFeatureAsSeen(`help-tooltip-${id}`);
    }
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen && showOnce) {
      markFeatureAsSeen(`help-tooltip-${id}`);
    }
  };

  if (!shouldShowTooltip || isDismissed) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider>
      <Tooltip open={isOpen} onOpenChange={setIsOpen}>
        <TooltipTrigger asChild>
          <div className="relative inline-block">
            {children}
            <Button
              variant="ghost"
              size="sm"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 bg-primary/90 hover:bg-primary text-primary-foreground rounded-full"
              onClick={handleToggle}
            >
              <HelpCircle className="w-3 h-3" />
            </Button>
          </div>
        </TooltipTrigger>
        
        <TooltipContent side={placement} className="p-0 max-w-sm">
          <Card className="border-border shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                  <h4 className="font-medium text-sm">{title}</h4>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={handleDismiss}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">{content}</p>
            </CardContent>
          </Card>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Contextual help component for complex features
interface ContextualHelpProps {
  feature: string;
  steps: Array<{
    target: string;
    title: string;
    content: string;
  }>;
  trigger?: React.ReactNode;
}

export function ContextualHelp({ feature, steps, trigger }: ContextualHelpProps) {
  const [isActive, setIsActive] = useState(false);

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <HelpCircle className="w-4 h-4 mr-2" />
      Show Help
    </Button>
  );

  return (
    <>
      <div onClick={() => setIsActive(true)}>
        {trigger || defaultTrigger}
      </div>
      
      {/* This would integrate with Joyride for contextual tours */}
      {isActive && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-md mx-4">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Feature Help: {feature}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsActive(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div key={index} className="border-l-2 border-primary pl-3">
                    <h4 className="font-medium text-sm">{step.title}</h4>
                    <p className="text-sm text-muted-foreground">{step.content}</p>
                  </div>
                ))}
              </div>
              
              <Button 
                className="w-full mt-4" 
                onClick={() => setIsActive(false)}
              >
                Got it!
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}