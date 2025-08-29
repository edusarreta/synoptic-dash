import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, BarChart3, Database, Users, TrendingUp, Sparkles } from "lucide-react";
import { AIInsightsModal } from "@/components/ai/AIInsightsModal";

export default function Dashboard() {
  const [stats] = useState([
    {
      title: "Total Dashboards",
      value: "12",
      description: "Active dashboards",
      icon: BarChart3,
      trend: "+2 this month",
    },
    {
      title: "Data Sources",
      value: "4",
      description: "Connected databases",
      icon: Database,
      trend: "+1 this week",
    },
    {
      title: "Team Members",
      value: "8",
      description: "Active users",
      icon: Users,
      trend: "+3 this month",
    },
    {
      title: "Total Queries",
      value: "1,234",
      description: "This month",
      icon: TrendingUp,
      trend: "+15% increase",
    },
  ]);

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Overview of your Business Intelligence workspace
            </p>
          </div>
          <Button className="gradient-primary">
            <Plus className="w-4 h-4 mr-2" />
            New Dashboard
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={index} className="relative overflow-hidden glass-card border-0 shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <stat.icon className="w-4 h-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground mb-1">
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
                <p className="text-xs text-accent font-medium mt-2">
                  {stat.trend}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Dashboards */}
          <Card className="lg:col-span-2 glass-card border-0 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Recent Dashboards
              </CardTitle>
              <CardDescription>
                Your recently accessed dashboards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "Sales Performance", lastViewed: "2 hours ago", type: "Sales" },
                  { name: "Customer Analytics", lastViewed: "1 day ago", type: "Marketing" },
                  { name: "Financial Overview", lastViewed: "3 days ago", type: "Finance" },
                ].map((dashboard, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div>
                      <h4 className="font-medium text-foreground">{dashboard.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {dashboard.type} • Last viewed {dashboard.lastViewed}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <AIInsightsModal
                        dashboardId={`dashboard-${index}`}
                        chartData={[
                          { name: dashboard.name, type: "bar", data: [{ x: "Sample", y: 100 }], description: dashboard.type }
                        ]}
                        trigger={
                          <Button variant="ghost" size="sm" className="gap-1">
                            <Sparkles className="w-3 h-3" />
                            AI Insights
                          </Button>
                        }
                      />
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="glass-card border-0 shadow-card">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Get started with common tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start h-12">
                <Plus className="w-4 h-4 mr-3" />
                Create Dashboard
              </Button>
              <Button variant="outline" className="w-full justify-start h-12">
                <Database className="w-4 h-4 mr-3" />
                Add Data Source
              </Button>
              <Button variant="outline" className="w-full justify-start h-12">
                <BarChart3 className="w-4 h-4 mr-3" />
                Build Chart
              </Button>
              <Button variant="outline" className="w-full justify-start h-12">
                <Users className="w-4 h-4 mr-3" />
                Invite Team
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Getting Started */}
        <Card className="glass-card border-0 shadow-card bg-gradient-to-r from-primary/5 to-accent/5">
          <CardHeader>
            <CardTitle className="text-xl">Welcome to SynopticBI</CardTitle>
            <CardDescription className="text-base">
              Start building powerful analytics dashboards in minutes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Database className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">1. Connect Data</h3>
                <p className="text-sm text-muted-foreground">
                  Connect to your PostgreSQL databases securely
                </p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">2. Create Charts</h3>
                <p className="text-sm text-muted-foreground">
                  Build visualizations with SQL queries
                </p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">3. Build Dashboards</h3>
                <p className="text-sm text-muted-foreground">
                  Combine charts into interactive dashboards
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}