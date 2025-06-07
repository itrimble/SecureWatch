"use client";

import React from 'react';
import { QuickStartDashboard } from '@/components/quick-start-dashboard';
import { OnboardingProgress } from '@/components/onboarding/onboarding-progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowLeft, 
  BookOpen, 
  Target, 
  Lightbulb,
  HelpCircle 
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function QuickStartPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/')}
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Welcome to SecureWatch</h1>
          <p className="text-xl text-muted-foreground">
            Your comprehensive Security Operations Center platform
          </p>
        </div>

        {/* Quick Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="text-center">
            <CardContent className="p-4">
              <BookOpen className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <h3 className="font-semibold mb-1">Learn & Practice</h3>
              <p className="text-sm text-muted-foreground">
                Interactive tutorials and hands-on scenarios
              </p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="p-4">
              <Target className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <h3 className="font-semibold mb-1">Demo Environment</h3>
              <p className="text-sm text-muted-foreground">
                Explore with real security data samples
              </p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="p-4">
              <Lightbulb className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <h3 className="font-semibold mb-1">Guided Setup</h3>
              <p className="text-sm text-muted-foreground">
                Step-by-step platform configuration
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Onboarding Progress Sidebar */}
        <div className="xl:col-span-1">
          <OnboardingProgress />
          
          {/* Help & Support */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <HelpCircle className="w-5 h-5 mr-2" />
                Need Help?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => router.push('/marketplace')}
              >
                📚 Documentation
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => router.push('/settings')}
              >
                ⚙️ Configuration Guide
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => router.push('/settings/platform-status')}
              >
                🔧 Troubleshooting
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main Quick Start Dashboard */}
        <div className="xl:col-span-3">
          <QuickStartDashboard />
        </div>
      </div>
    </div>
  );
}