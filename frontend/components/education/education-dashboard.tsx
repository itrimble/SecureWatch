'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BookOpen, 
  Award, 
  Play, 
  Search, 
  Filter, 
  Clock, 
  Users, 
  Star,
  TrendingUp,
  Calendar,
  CheckCircle
} from 'lucide-react';

interface EducationDashboardProps {
  className?: string;
}

interface LearningPath {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number;
  modules: number;
  enrolled: boolean;
  progress?: number;
  thumbnail?: string;
  tags: string[];
}

interface UserProgress {
  totalEnrollments: number;
  completedCourses: number;
  inProgressCourses: number;
  totalSkillPoints: number;
  currentLevel: string;
}

interface Certificate {
  id: string;
  title: string;
  issuedAt: string;
  validUntil?: string;
  badgeUrl: string;
}

export function EducationDashboard({ className }: EducationDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // Mock data - replace with actual API calls
  const [userProgress] = useState<UserProgress>({
    totalEnrollments: 8,
    completedCourses: 5,
    inProgressCourses: 3,
    totalSkillPoints: 1450,
    currentLevel: 'Intermediate',
  });

  const [learningPaths] = useState<LearningPath[]>([
    {
      id: '1',
      title: 'SIEM Fundamentals',
      description: 'Learn the basics of Security Information and Event Management',
      category: 'Security Monitoring',
      difficulty: 'beginner',
      estimatedDuration: 240,
      modules: 6,
      enrolled: true,
      progress: 75,
      tags: ['siem', 'monitoring', 'logs'],
    },
    {
      id: '2',
      title: 'Advanced Threat Hunting',
      description: 'Master techniques for proactive threat detection and hunting',
      category: 'Threat Hunting',
      difficulty: 'advanced',
      estimatedDuration: 480,
      modules: 12,
      enrolled: false,
      tags: ['hunting', 'analytics', 'detection'],
    },
    {
      id: '3',
      title: 'Incident Response Playbooks',
      description: 'Create and execute effective incident response procedures',
      category: 'Incident Response',
      difficulty: 'intermediate',
      estimatedDuration: 360,
      modules: 8,
      enrolled: true,
      progress: 25,
      tags: ['incident', 'response', 'playbooks'],
    },
  ]);

  const [certificates] = useState<Certificate[]>([
    {
      id: '1',
      title: 'SIEM Analyst Certified',
      issuedAt: '2024-11-15',
      validUntil: '2026-11-15',
      badgeUrl: '/images/cert-siem-analyst.svg',
    },
    {
      id: '2',
      title: 'Security Fundamentals',
      issuedAt: '2024-10-20',
      badgeUrl: '/images/cert-security-fundamentals.svg',
    },
  ]);

  const categories = ['all', 'Security Monitoring', 'Threat Hunting', 'Incident Response', 'Compliance', 'Forensics'];
  const difficulties = ['all', 'beginner', 'intermediate', 'advanced'];

  const filteredPaths = learningPaths.filter(path => {
    const matchesSearch = path.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         path.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         path.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || path.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'all' || path.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Education Center</h1>
          <p className="text-muted-foreground">
            Enhance your cybersecurity skills with comprehensive learning paths and hands-on labs
          </p>
        </div>
        <Button>
          <Play className="mr-2 h-4 w-4" />
          Continue Learning
        </Button>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Level</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userProgress.currentLevel}</div>
            <p className="text-xs text-muted-foreground">
              {userProgress.totalSkillPoints} skill points
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enrollments</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userProgress.totalEnrollments}</div>
            <p className="text-xs text-muted-foreground">
              {userProgress.inProgressCourses} in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userProgress.completedCourses}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((userProgress.completedCourses / userProgress.totalEnrollments) * 100)}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Certificates</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{certificates.length}</div>
            <p className="text-xs text-muted-foreground">
              Professional certifications
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="catalog">Learning Catalog</TabsTrigger>
          <TabsTrigger value="progress">My Progress</TabsTrigger>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
          <TabsTrigger value="labs">Labs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Continue Learning */}
          <Card>
            <CardHeader>
              <CardTitle>Continue Learning</CardTitle>
              <CardDescription>Pick up where you left off</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {learningPaths.filter(p => p.enrolled && p.progress).map(path => (
                  <div key={path.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-semibold">{path.title}</h4>
                      <p className="text-sm text-muted-foreground">{path.description}</p>
                      <div className="mt-2">
                        <Progress value={path.progress} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">{path.progress}% complete</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Play className="mr-2 h-4 w-4" />
                      Continue
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommended */}
          <Card>
            <CardHeader>
              <CardTitle>Recommended for You</CardTitle>
              <CardDescription>Based on your current progress and interests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {learningPaths.filter(p => !p.enrolled).slice(0, 2).map(path => (
                  <div key={path.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold">{path.title}</h4>
                      <Badge className={getDifficultyColor(path.difficulty)}>
                        {path.difficulty}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{path.description}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                      <div className="flex items-center">
                        <Clock className="mr-1 h-3 w-3" />
                        {Math.floor(path.estimatedDuration / 60)}h {path.estimatedDuration % 60}m
                      </div>
                      <div className="flex items-center">
                        <BookOpen className="mr-1 h-3 w-3" />
                        {path.modules} modules
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {path.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <Button className="w-full" size="sm">Enroll Now</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="catalog" className="space-y-6">
          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Learning Catalog</CardTitle>
              <CardDescription>Explore our comprehensive cybersecurity curriculum</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search learning paths..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category === 'all' ? 'All Categories' : category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    {difficulties.map(difficulty => (
                      <SelectItem key={difficulty} value={difficulty}>
                        {difficulty === 'all' ? 'All Levels' : difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Learning Paths Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPaths.map(path => (
                  <Card key={path.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{path.title}</CardTitle>
                          <CardDescription className="mt-1">{path.category}</CardDescription>
                        </div>
                        <Badge className={getDifficultyColor(path.difficulty)}>
                          {path.difficulty}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">{path.description}</p>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                        <div className="flex items-center">
                          <Clock className="mr-1 h-3 w-3" />
                          {Math.floor(path.estimatedDuration / 60)}h {path.estimatedDuration % 60}m
                        </div>
                        <div className="flex items-center">
                          <BookOpen className="mr-1 h-3 w-3" />
                          {path.modules} modules
                        </div>
                      </div>

                      {path.enrolled && path.progress !== undefined && (
                        <div className="mb-4">
                          <Progress value={path.progress} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">{path.progress}% complete</p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1 mb-4">
                        {path.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      <Button 
                        className="w-full" 
                        variant={path.enrolled ? "outline" : "default"}
                        size="sm"
                      >
                        {path.enrolled ? (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            Continue
                          </>
                        ) : (
                          'Enroll Now'
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certificates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>My Certificates</CardTitle>
              <CardDescription>Professional certifications you've earned</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {certificates.map(cert => (
                  <div key={cert.id} className="border rounded-lg p-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <Award className="h-8 w-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{cert.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          Issued: {new Date(cert.issuedAt).toLocaleDateString()}
                        </p>
                        {cert.validUntil && (
                          <p className="text-sm text-muted-foreground">
                            Valid until: {new Date(cert.validUntil).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 flex space-x-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        View Certificate
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="labs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Hands-on Labs</CardTitle>
              <CardDescription>Practice your skills in realistic environments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Labs Coming Soon</h3>
                <p className="text-muted-foreground">
                  Interactive lab environments are being prepared. Check back soon!
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}