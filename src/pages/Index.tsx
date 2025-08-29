import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { BarChart3, Database, TrendingUp, Shield, Zap, Users } from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) {
      navigate("/dashboards");
    }
  }, [user, loading, navigate]);

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
                onClick={() => navigate("/auth")}
              >
                Get Started Free
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="text-lg px-8 py-6 h-auto"
                onClick={() => navigate("/auth")}
              >
                View Demo
              </Button>
            </div>
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
            onClick={() => navigate("/auth")}
          >
            Start Your Free Trial
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;
