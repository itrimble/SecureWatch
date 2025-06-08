"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, 
  Circle, 
  Play, 
  RotateCcw,
  Trophy,
  Target,
  Zap
} from "lucide-react";
import { useOnboarding } from "@/hooks/use-onboarding";

interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  category: 'essential' | 'recommended' | 'advanced';
  completed: boolean;
  action?: () => void;
}

interface OnboardingProgressProps {
  onStartTour?: () => void;
  className?: string;
}

export function OnboardingProgress({ onStartTour, className }: OnboardingProgressProps) {
  const { hasCompletedOnboarding, hasSeenFeature, markFeatureAsSeen, resetOnboarding } = useOnboarding();

  // Define onboarding tasks
  const tasks: OnboardingTask[] = [
    {
      id: 'main-tour',
      title: 'Complete Platform Tour',
      description: 'Take the guided tour to learn about key features',
      category: 'essential',
      completed: hasCompletedOnboarding,
      action: onStartTour
    },
    {
      id: 'first-search',
      title: 'Run Your First Search',
      description: 'Execute a KQL query to explore your data',
      category: 'essential',
      completed: hasSeenFeature('first-search')
    },
    {
      id: 'create-alert',
      title: 'Create an Alert Rule',
      description: 'Set up monitoring for security events',
      category: 'essential',
      completed: hasSeenFeature('create-alert')
    },
    {
      id: 'view-dashboard',
      title: 'Explore Dashboards',
      description: 'View pre-built security dashboards',
      category: 'recommended',
      completed: hasSeenFeature('view-dashboard')
    },
    {
      id: 'configure-source',
      title: 'Add Log Source',
      description: 'Connect your first data source',
      category: 'essential',
      completed: hasSeenFeature('configure-source')
    },
    {
      id: 'investigate-incident',
      title: 'Investigate an Incident',
      description: 'Use the incident investigation tools',
      category: 'recommended',
      completed: hasSeenFeature('investigate-incident')
    },
    {
      id: 'customize-dashboard',
      title: 'Customize Dashboard',
      description: 'Create or modify a dashboard layout',
      category: 'advanced',
      completed: hasSeenFeature('customize-dashboard')
    },
    {
      id: 'correlation-rules',
      title: 'Configure Correlation Rules',
      description: 'Set up advanced threat correlation',
      category: 'advanced',
      completed: hasSeenFeature('correlation-rules')
    }
  ];

  const essentialTasks = tasks.filter(t => t.category === 'essential');
  const recommendedTasks = tasks.filter(t => t.category === 'recommended');
  const advancedTasks = tasks.filter(t => t.category === 'advanced');

  const completedEssential = essentialTasks.filter(t => t.completed).length;
  const completedRecommended = recommendedTasks.filter(t => t.completed).length;
  const completedAdvanced = advancedTasks.filter(t => t.completed).length;
  const totalCompleted = tasks.filter(t => t.completed).length;
  
  const overallProgress = (totalCompleted / tasks.length) * 100;
  const essentialProgress = (completedEssential / essentialTasks.length) * 100;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'essential': return <Target className="w-4 h-4 text-red-500" />;
      case 'recommended': return <Zap className="w-4 h-4 text-yellow-500" />;
      case 'advanced': return <Trophy className="w-4 h-4 text-purple-500" />;
      default: return <Circle className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'essential': return 'destructive';
      case 'recommended': return 'secondary';
      case 'advanced': return 'outline';
      default: return 'secondary';
    }
  };

  const TaskItem = ({ task }: { task: OnboardingTask }) => (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          {task.completed ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <Circle className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            {getCategoryIcon(task.category)}
            <h4 className="text-sm font-medium">{task.title}</h4>
            <Badge variant={getCategoryColor(task.category) as any} className="text-xs">
              {task.category}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
        </div>
      </div>
      {!task.completed && task.action && (
        <Button variant="outline" size="sm" onClick={task.action}>
          <Play className="w-3 h-3 mr-1" />
          Start
        </Button>
      )}
    </div>
  );

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Getting Started</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetOnboarding}
            className="text-xs"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset
          </Button>
        </div>
        
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span>Overall Progress</span>
              <span className="font-medium">{totalCompleted}/{tasks.length}</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-red-500">{completedEssential}/{essentialTasks.length}</div>
              <div className="text-xs text-muted-foreground">Essential</div>
            </div>
            <div>
              <div className="text-lg font-bold text-yellow-500">{completedRecommended}/{recommendedTasks.length}</div>
              <div className="text-xs text-muted-foreground">Recommended</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-500">{completedAdvanced}/{advancedTasks.length}</div>
              <div className="text-xs text-muted-foreground">Advanced</div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Essential Tasks */}
        <div>
          <h3 className="text-sm font-semibold text-red-500 mb-2 flex items-center">
            <Target className="w-4 h-4 mr-2" />
            Essential Setup ({completedEssential}/{essentialTasks.length})
          </h3>
          <div className="space-y-2">
            {essentialTasks.map(task => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        </div>

        {/* Recommended Tasks */}
        <div>
          <h3 className="text-sm font-semibold text-yellow-500 mb-2 flex items-center">
            <Zap className="w-4 h-4 mr-2" />
            Recommended ({completedRecommended}/{recommendedTasks.length})
          </h3>
          <div className="space-y-2">
            {recommendedTasks.map(task => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        </div>

        {/* Advanced Tasks */}
        <div>
          <h3 className="text-sm font-semibold text-purple-500 mb-2 flex items-center">
            <Trophy className="w-4 h-4 mr-2" />
            Advanced ({completedAdvanced}/{advancedTasks.length})
          </h3>
          <div className="space-y-2">
            {advancedTasks.map(task => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        </div>

        {/* Completion Message */}
        {overallProgress === 100 && (
          <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <Trophy className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <h3 className="font-semibold text-green-700 dark:text-green-300">
              Congratulations! 🎉
            </h3>
            <p className="text-sm text-green-600 dark:text-green-400">
              You&apos;ve completed the SecureWatch onboarding. You&apos;re ready to hunt threats!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}