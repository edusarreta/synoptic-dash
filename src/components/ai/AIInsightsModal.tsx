import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sparkles, Loader2, Brain, TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react';
import { useAI } from '@/hooks/useAI';

interface AIInsightsModalProps {
  dashboardId: string;
  chartData: any[];
  trigger?: React.ReactNode;
}

export function AIInsightsModal({ dashboardId, chartData, trigger }: AIInsightsModalProps) {
  const { generateInsights, loading } = useAI();
  const [insights, setInsights] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);

  const handleGenerateInsights = async () => {
    try {
      const response = await generateInsights(dashboardId, chartData);
      setInsights(response.insights);
    } catch (error) {
      console.error('Error generating insights:', error);
    }
  };

  const formatInsights = (text: string) => {
    const sections = text.split(/(\d+\.\s*[^:]+:?)/g).filter(Boolean);
    return sections.map((section, index) => {
      if (section.match(/\d+\.\s*Executive Summary/i)) {
        return (
          <div key={index} className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <h4 className="font-semibold text-blue-900">Executive Summary</h4>
            </div>
          </div>
        );
      }
      if (section.match(/\d+\.\s*Key Trends/i)) {
        return (
          <div key={index} className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-green-500" />
              <h4 className="font-semibold text-green-900">Key Trends</h4>
            </div>
          </div>
        );
      }
      if (section.match(/\d+\.\s*Notable Patterns/i) || section.match(/\d+\.\s*Anomalies/i)) {
        return (
          <div key={index} className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <h4 className="font-semibold text-orange-900">Notable Patterns & Anomalies</h4>
            </div>
          </div>
        );
      }
      if (section.match(/\d+\.\s*Recommendations/i)) {
        return (
          <div key={index} className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-purple-500" />
              <h4 className="font-semibold text-purple-900">Recommendations</h4>
            </div>
          </div>
        );
      }
      return (
        <div key={index} className="mb-3">
          <p className="text-sm leading-relaxed whitespace-pre-line">{section}</p>
        </div>
      );
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Generate AI Insights
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI-Generated Insights
          </DialogTitle>
          <DialogDescription>
            Get intelligent analysis and recommendations based on your dashboard data.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          <Badge variant="secondary" className="gap-1">
            <Brain className="w-3 h-3" />
            AI-Powered Analysis
          </Badge>
          {!insights && (
            <Button
              onClick={handleGenerateInsights}
              disabled={loading}
              size="sm"
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {loading ? 'Analyzing...' : 'Generate Insights'}
            </Button>
          )}
        </div>

        <Separator />

        <ScrollArea className="flex-1 mt-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium mb-2">Analyzing your data...</p>
              <p className="text-sm text-muted-foreground">
                Our AI is examining patterns and generating insights
              </p>
            </div>
          ) : insights ? (
            <div className="space-y-4">
              {formatInsights(insights)}
              <Separator className="my-6" />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="w-3 h-3" />
                Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Brain className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Ready to analyze your dashboard</p>
              <p className="text-sm text-muted-foreground mb-4">
                Click "Generate Insights" to get AI-powered analysis of your data
              </p>
              <ul className="text-xs text-muted-foreground text-left space-y-1">
                <li>• Executive summary of key findings</li>
                <li>• Trend analysis and patterns</li>
                <li>• Anomaly detection</li>
                <li>• Actionable recommendations</li>
              </ul>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}