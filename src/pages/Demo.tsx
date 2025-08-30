import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BarChart3, ArrowLeft, CalendarIcon, Filter, Eye, Share2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Mock chart component for demo
const MockChart = ({ type, title, data }: { type: string; title: string; data: any }) => {
  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <div className="h-48 flex items-end justify-center gap-2 p-4">
            {data.map((item: any, index: number) => (
              <div key={index} className="flex flex-col items-center gap-1">
                <div 
                  className="bg-primary rounded-t-sm min-w-8"
                  style={{ height: `${(item.value / Math.max(...data.map((d: any) => d.value))) * 120}px` }}
                />
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        );
      case 'line':
        return (
          <div className="h-48 flex items-center justify-center p-4">
            <div className="w-full h-full relative">
              <svg width="100%" height="100%" className="absolute inset-0">
                <polyline
                  points="20,160 80,120 140,80 200,100 260,60 320,40"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                {[20, 80, 140, 200, 260, 320].map((x, i) => (
                  <circle
                    key={i}
                    cx={x}
                    cy={[160, 120, 80, 100, 60, 40][i]}
                    r="4"
                    fill="hsl(var(--primary))"
                  />
                ))}
              </svg>
            </div>
          </div>
        );
      case 'pie':
        return (
          <div className="h-48 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full relative overflow-hidden">
              <div className="absolute inset-0 bg-primary" style={{ clipPath: 'polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%)' }} />
              <div className="absolute inset-0 bg-blue-500" style={{ clipPath: 'polygon(50% 50%, 100% 100%, 0% 100%)' }} />
              <div className="absolute inset-0 bg-green-500" style={{ clipPath: 'polygon(50% 50%, 0% 100%, 0% 0%)' }} />
              <div className="absolute inset-0 bg-orange-500" style={{ clipPath: 'polygon(50% 50%, 0% 0%, 50% 0%)' }} />
            </div>
          </div>
        );
      default:
        return (
          <div className="h-48 flex items-center justify-center">
            <BarChart3 className="w-16 h-16 text-muted-foreground" />
          </div>
        );
    }
  };

  return (
    <Card className="shadow-card hover:shadow-elevated transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {renderChart()}
      </CardContent>
    </Card>
  );
};

export default function Demo() {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const mockData = {
    vendas: [
      { label: 'Brasil', value: 1200 },
      { label: 'EUA', value: 2500 },
      { label: 'Alemanha', value: 1800 },
      { label: 'França', value: 900 }
    ],
    receita: [
      { label: 'Q1', value: 15000 },
      { label: 'Q2', value: 23000 },
      { label: 'Q3', value: 18000 },
      { label: 'Q4', value: 28000 }
    ]
  };

  const handleQuickDateRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="font-semibold text-foreground">Dashboard Demo</h1>
                  <p className="text-xs text-muted-foreground">Demonstração Interativa</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Eye className="w-3 h-3" />
                Modo Demo
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/auth?mode=signup")}
                className="gap-2"
              >
                <Share2 className="w-4 h-4" />
                Criar Conta
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Demo Description */}
        <div className="mb-8 p-6 bg-muted/30 rounded-xl border">
          <h2 className="text-2xl font-bold mb-3">Experimente o SynopticBI</h2>
          <p className="text-muted-foreground mb-4">
            Esta é uma demonstração interativa do nosso dashboard. Explore os filtros de data e visualizações abaixo.
            Para acessar todas as funcionalidades, crie sua conta gratuita.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/auth?mode=signup")} className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Começar Grátis
            </Button>
            <Button variant="outline" onClick={() => navigate("/auth")} className="gap-2">
              Já tenho conta
            </Button>
          </div>
        </div>

        {/* Global Filters */}
        <div className="mb-8 p-4 bg-muted/20 rounded-lg border-dashed border-2 border-muted-foreground/20">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="w-4 h-4" />
              Filtros Globais:
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickDateRange(7)}
                className="text-xs"
              >
                Últimos 7 dias
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickDateRange(30)}
                className="text-xs"
              >
                Este mês
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickDateRange(90)}
                className="text-xs"
              >
                Últimos 3 meses
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "justify-start text-left font-normal text-xs",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="w-3 h-3 mr-2" />
                    {startDate ? format(startDate, "dd/MM/yyyy") : "Data de início"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "justify-start text-left font-normal text-xs",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="w-3 h-3 mr-2" />
                    {endDate ? format(endDate, "dd/MM/yyyy") : "Data de fim"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              {(startDate || endDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStartDate(undefined);
                    setEndDate(undefined);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Limpar
                </Button>
              )}
            </div>

            {(startDate || endDate) && (
              <Badge variant="secondary" className="text-xs">
                Filtro aplicado: {startDate && format(startDate, "dd/MM")} - {endDate && format(endDate, "dd/MM")}
              </Badge>
            )}
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MockChart
            type="bar"
            title="Vendas por País"
            data={mockData.vendas}
          />
          
          <MockChart
            type="line"
            title="Receita Trimestral"
            data={mockData.receita}
          />
          
          <MockChart
            type="pie"
            title="Distribuição de Produtos"
            data={[]}
          />
          
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Total de Vendas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">R$ 127.5k</div>
                <div className="text-sm text-muted-foreground">↗️ +12.5% vs mês anterior</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Clientes Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">2,847</div>
                <div className="text-sm text-muted-foreground">↗️ +8.2% vs mês anterior</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Taxa de Conversão</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">24.8%</div>
                <div className="text-sm text-muted-foreground">↗️ +2.1% vs mês anterior</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center p-8 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl border">
          <h3 className="text-2xl font-bold mb-4">Gostou do que viu?</h3>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Este é apenas uma pequena amostra do poder do SynopticBI. 
            Crie sua conta gratuita e conecte seus próprios dados para criar dashboards ainda mais impressionantes.
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => navigate("/auth?mode=signup")} size="lg" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Começar Grátis
            </Button>
            <Button variant="outline" onClick={() => navigate("/auth")} size="lg">
              Fazer Login
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}