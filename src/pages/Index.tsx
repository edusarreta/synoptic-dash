import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@/providers/SessionProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Database, TrendingUp, Shield, Zap, Users, CalendarIcon, Eye, Play } from "lucide-react";

// Mock chart component for landing page
const MockChart = ({ type, title, data }: { type: string; title: string; data: any }) => {
  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <div className="h-32 flex items-end justify-center gap-1 p-2">
            {data.map((item: any, index: number) => (
              <div key={index} className="flex flex-col items-center gap-1">
                <div 
                  className="bg-primary rounded-t-sm w-6"
                  style={{ height: `${(item.value / Math.max(...data.map((d: any) => d.value))) * 80}px` }}
                />
                <span className="text-xs text-muted-foreground truncate">{item.label}</span>
              </div>
            ))}
          </div>
        );
      case 'line':
        return (
          <div className="h-32 flex items-center justify-center p-2">
            <div className="w-full h-full relative">
              <svg width="100%" height="100%" className="absolute inset-0">
                <polyline
                  points="10,80 50,60 90,40 130,50 170,30 210,20"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                {[10, 50, 90, 130, 170, 210].map((x, i) => (
                  <circle
                    key={i}
                    cx={x}
                    cy={[80, 60, 40, 50, 30, 20][i]}
                    r="2"
                    fill="hsl(var(--primary))"
                  />
                ))}
              </svg>
            </div>
          </div>
        );
      case 'scorecard':
        return (
          <div className="h-32 flex flex-col items-center justify-center">
            <div className="text-2xl font-bold text-primary mb-1">{data.value}</div>
            <div className="text-xs text-muted-foreground text-center">{data.label}</div>
          </div>
        );
    }
  };

  return (
    <Card className="shadow-card hover:shadow-elevated transition-all group cursor-pointer">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          {title}
          <Badge variant="secondary" className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">
            Demo
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {renderChart()}
      </CardContent>
    </Card>
  );
};

const Index = () => {
  const { user, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) {
      navigate("/looker-builder");
    }
  }, [user, loading, navigate]);

  // Mock data for demo charts
  const mockChartData = {
    vendas: [
      { label: 'BR', value: 1200 },
      { label: 'US', value: 2500 },
      { label: 'DE', value: 1800 },
      { label: 'FR', value: 900 }
    ],
    receita: { value: 'R$ 127.5k', label: 'Receita Total' },
    clientes: { value: '2,847', label: 'Clientes Ativos' }
  };

  if (loading) {
    return null; // Will redirect once loading is complete
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-10"></div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-glow">
                <BarChart3 className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-4xl font-bold gradient-primary bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                SynopticBI
              </h1>
            </div>
            
            <h2 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              Transform Your Data Into
              <span className="block gradient-primary bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Actionable Insights
              </span>
            </h2>
            
            <p className="text-xl text-muted-foreground mb-10 max-w-3xl mx-auto">
              The modern Business Intelligence platform that connects your databases, 
              builds stunning visualizations, and creates powerful dashboards that drive business decisions.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="gradient-primary text-lg px-8 py-6 h-auto shadow-glow"
                onClick={() => navigate("/login")}
              >
                Começar Grátis
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="text-lg px-8 py-6 h-auto gap-2"
                onClick={() => navigate("/demo")}
              >
                <Eye className="w-5 h-5" />
                Ver Demonstração
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section className="py-16 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-foreground mb-4">
              Visualizações Poderosas em Tempo Real
            </h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Explore dashboards interativos que transformam seus dados em insights acionáveis
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <MockChart
              type="bar"
              title="Vendas por País"
              data={mockChartData.vendas}
            />
            
            <MockChart
              type="line"
              title="Tendência de Crescimento"
              data={[]}
            />
            
            <MockChart
              type="scorecard"
              title="Receita Total"
              data={mockChartData.receita}
            />

            <MockChart
              type="scorecard"
              title="Clientes Ativos"
              data={mockChartData.clientes}
            />

            <div className="md:col-span-2 flex items-center justify-center p-8 border-2 border-dashed border-muted-foreground/20 rounded-lg">
              <div className="text-center">
                <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-semibold mb-2">Filtros Interativos</h4>
                <p className="text-muted-foreground mb-4">
                  Seletores de data, filtros dinâmicos e controles personalizados
                </p>
                <Button variant="outline" onClick={() => navigate("/demo")} className="gap-2">
                  <Play className="w-4 h-4" />
                  Experimentar
                </Button>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Button onClick={() => navigate("/demo")} size="lg" variant="outline" className="gap-2">
              <Eye className="w-5 h-5" />
              Ver Dashboard Completo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-foreground mb-4">
              Everything you need for modern analytics
            </h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built for teams that need powerful insights without the complexity
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Database,
                title: "Secure Data Connections",
                description: "Connect to PostgreSQL databases with enterprise-grade security and encryption."
              },
              {
                icon: BarChart3,
                title: "Interactive Visualizations",
                description: "Create stunning charts and graphs with our intuitive drag-and-drop interface."
              },
              {
                icon: TrendingUp,
                title: "Real-time Dashboards",
                description: "Build responsive dashboards that update automatically with fresh data."
              },
              {
                icon: Shield,
                title: "Multi-tenant Security",
                description: "Enterprise-grade security with complete data isolation between accounts."
              },
              {
                icon: Zap,
                title: "Lightning Fast",
                description: "Optimized queries and caching ensure your dashboards load instantly."
              },
              {
                icon: Users,
                title: "Team Collaboration",
                description: "Share insights with role-based access controls and collaborative workflows."
              }
            ].map((feature, index) => (
              <div key={index} className="glass-card p-6 rounded-xl border-0 shadow-card hover:shadow-elevated transition-all">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h4 className="text-xl font-semibold text-foreground mb-3">
                  {feature.title}
                </h4>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h3 className="text-4xl font-bold text-foreground mb-6">
            Ready to transform your data?
          </h3>
          <p className="text-xl text-muted-foreground mb-10">
            Join thousands of teams already using SynopticBI to make data-driven decisions.
          </p>
          <Button 
            size="lg" 
            className="gradient-primary text-lg px-12 py-6 h-auto shadow-glow"
            onClick={() => navigate("/login")}
          >
            Começar Teste Grátis
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;
