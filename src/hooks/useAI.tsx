import { useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface AIChatResponse {
  sqlQuery: string;
  explanation: string;
  creditsUsed: number;
  remainingCredits: number;
}

interface AIInsightsResponse {
  insights: string;
  creditsUsed: number;
  remainingCredits: number;
  generatedAt: string;
}

export function useAI() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const askDataQuestion = async (question: string, connectionId: string): Promise<AIChatResponse> => {
    if (!session) throw new Error('Not authenticated');

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-data-chat', {
        body: { question, connectionId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Query Generated",
        description: `Used 1 AI credit. ${data.remainingCredits} remaining.`,
      });

      return data;
    } catch (error: any) {
      console.error('Error in AI chat:', error);
      toast({
        title: "AI Chat Error",
        description: error.message || 'Failed to generate query',
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = async (dashboardId: string, chartData: any[]): Promise<AIInsightsResponse> => {
    if (!session) throw new Error('Not authenticated');

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-generate-insights', {
        body: { dashboardId, chartData },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Insights Generated",
        description: `Used 1 AI credit. ${data.remainingCredits} remaining.`,
      });

      return data;
    } catch (error: any) {
      console.error('Error generating insights:', error);
      toast({
        title: "AI Insights Error",
        description: error.message || 'Failed to generate insights',
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    askDataQuestion,
    generateInsights,
    loading,
  };
}