import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Database, 
  Plus, 
  Trash2, 
  Play, 
  Save, 
  Download,
  Link as LinkIcon,
  Filter,
  Calculator,
  Merge,
  Settings
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface DataConnection {
  id: string;
  name: string;
  connection_type: string;
  database_name: string;
}

interface TransformationStep {
  id: string;
  type: 'join' | 'filter' | 'calculate' | 'aggregate' | 'rename';
  config: any;
  description: string;
}

interface DataTransformation {
  id?: string;
  name: string;
  description: string;
  source_connections: any;
  transformation_config: any;
  is_materialized: boolean;
  created_at?: string;
  updated_at?: string;
}

export function VisualDataPrep() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [transformations, setTransformations] = useState<DataTransformation[]>([]);
  const [currentTransformation, setCurrentTransformation] = useState<DataTransformation>({
    name: '',
    description: '',
    source_connections: [],
    transformation_config: {
      steps: [],
      output_columns: [],
    },
    is_materialized: false,
  });
  const [selectedConnections, setSelectedConnections] = useState<string[]>([]);
  const [steps, setSteps] = useState<TransformationStep[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConnections();
    loadTransformations();
  }, [user]);

  const loadConnections = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (profile) {
        const { data } = await supabase
          .from('data_connections')
          .select('id, name, connection_type, database_name')
          .eq('account_id', profile.org_id)
          .eq('is_active', true);

        setConnections(data || []);
      }
    } catch (error) {
      console.error('Error loading connections:', error);
    }
  };

  const loadTransformations = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (profile) {
        const { data } = await supabase
          .from('data_transformations')
          .select('*')
          .eq('account_id', profile.org_id)
          .order('created_at', { ascending: false });

        setTransformations(data || []);
      }
    } catch (error) {
      console.error('Error loading transformations:', error);
    }
  };

  const addTransformationStep = (type: TransformationStep['type']) => {
    const newStep: TransformationStep = {
      id: `step-${Date.now()}`,
      type,
      config: {},
      description: `${type.charAt(0).toUpperCase() + type.slice(1)} step`,
    };

    setSteps([...steps, newStep]);
  };

  const updateStep = (stepId: string, config: any, description: string) => {
    setSteps(steps.map(step => 
      step.id === stepId 
        ? { ...step, config, description }
        : step
    ));
  };

  const removeStep = (stepId: string) => {
    setSteps(steps.filter(step => step.id !== stepId));
  };

  const executePreview = async () => {
    if (selectedConnections.length === 0) {
      toast({
        title: "No Data Sources",
        description: "Please select at least one data source.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Simulate data preview execution
      // In a real implementation, this would execute the transformation pipeline
      const mockData = [
        { id: 1, name: 'Sample Data', value: 100, category: 'A' },
        { id: 2, name: 'Test Record', value: 200, category: 'B' },
        { id: 3, name: 'Demo Entry', value: 150, category: 'A' },
      ];

      setPreviewData(mockData);
      toast({
        title: "Preview Generated",
        description: "Data transformation preview completed.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveTransformation = async () => {
    if (!currentTransformation.name.trim()) {
      toast({
        title: "Missing Name",
        description: "Please provide a name for the transformation.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (profile) {
        const transformationData = {
          name: currentTransformation.name,
          description: currentTransformation.description,
          account_id: profile.org_id,
          source_connections: selectedConnections,
          transformation_config: {
            steps,
            output_columns: previewData.length > 0 ? Object.keys(previewData[0]) : [],
          },
          is_materialized: currentTransformation.is_materialized,
          created_by: user.id,
        };

        const { error } = await supabase
          .from('data_transformations')
          .insert(transformationData as any);

        if (error) throw error;

        toast({
          title: "Transformation Saved",
          description: "Data transformation saved successfully.",
        });

        // Reset form
        setCurrentTransformation({
          name: '',
          description: '',
          source_connections: [],
          transformation_config: { steps: [], output_columns: [] },
          is_materialized: false,
        });
        setSelectedConnections([]);
        setSteps([]);
        setPreviewData([]);
        
        loadTransformations();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepEditor = (step: TransformationStep) => {
    const updateStepConfig = (config: any, description?: string) => {
      updateStep(step.id, config, description || step.description);
    };

    switch (step.type) {
      case 'join':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Left Table</Label>
                <Select 
                  value={step.config.leftTable || ''} 
                  onValueChange={(value) => updateStepConfig({ ...step.config, leftTable: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select table" />
                  </SelectTrigger>
                  <SelectContent>
                    {connections.map(conn => (
                      <SelectItem key={conn.id} value={conn.id}>
                        {conn.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Right Table</Label>
                <Select 
                  value={step.config.rightTable || ''} 
                  onValueChange={(value) => updateStepConfig({ ...step.config, rightTable: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select table" />
                  </SelectTrigger>
                  <SelectContent>
                    {connections.map(conn => (
                      <SelectItem key={conn.id} value={conn.id}>
                        {conn.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Join Type</Label>
              <Select 
                value={step.config.joinType || 'inner'} 
                onValueChange={(value) => updateStepConfig({ ...step.config, joinType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inner">Inner Join</SelectItem>
                  <SelectItem value="left">Left Join</SelectItem>
                  <SelectItem value="right">Right Join</SelectItem>
                  <SelectItem value="full">Full Outer Join</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Left Key</Label>
                <Input 
                  value={step.config.leftKey || ''} 
                  onChange={(e) => updateStepConfig({ ...step.config, leftKey: e.target.value })}
                  placeholder="Column name"
                />
              </div>
              <div>
                <Label>Right Key</Label>
                <Input 
                  value={step.config.rightKey || ''} 
                  onChange={(e) => updateStepConfig({ ...step.config, rightKey: e.target.value })}
                  placeholder="Column name"
                />
              </div>
            </div>
          </div>
        );

      case 'filter':
        return (
          <div className="space-y-3">
            <div>
              <Label>Column</Label>
              <Input 
                value={step.config.column || ''} 
                onChange={(e) => updateStepConfig({ ...step.config, column: e.target.value })}
                placeholder="Column to filter"
              />
            </div>
            <div>
              <Label>Operator</Label>
              <Select 
                value={step.config.operator || '='} 
                onValueChange={(value) => updateStepConfig({ ...step.config, operator: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="=">=</SelectItem>
                  <SelectItem value="!=">!=</SelectItem>
                  <SelectItem value=">">&gt;</SelectItem>
                  <SelectItem value="<">&lt;</SelectItem>
                  <SelectItem value=">=">&gt;=</SelectItem>
                  <SelectItem value="<=">&lt;=</SelectItem>
                  <SelectItem value="LIKE">LIKE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Value</Label>
              <Input 
                value={step.config.value || ''} 
                onChange={(e) => updateStepConfig({ ...step.config, value: e.target.value })}
                placeholder="Filter value"
              />
            </div>
          </div>
        );

      case 'calculate':
        return (
          <div className="space-y-3">
            <div>
              <Label>New Column Name</Label>
              <Input 
                value={step.config.columnName || ''} 
                onChange={(e) => updateStepConfig({ ...step.config, columnName: e.target.value })}
                placeholder="New column name"
              />
            </div>
            <div>
              <Label>Formula</Label>
              <Textarea 
                value={step.config.formula || ''} 
                onChange={(e) => updateStepConfig({ ...step.config, formula: e.target.value })}
                placeholder="e.g., column1 + column2 * 0.1"
                className="font-mono text-sm"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="text-sm text-muted-foreground">
            Configuration options for {step.type} will be available soon.
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card border-0 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Visual Data Preparation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Create Transformation</TabsTrigger>
              <TabsTrigger value="manage">Manage Transformations</TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Transformation Name</Label>
                  <Input
                    id="name"
                    value={currentTransformation.name}
                    onChange={(e) => setCurrentTransformation({
                      ...currentTransformation,
                      name: e.target.value
                    })}
                    placeholder="My Data Transformation"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={currentTransformation.description}
                    onChange={(e) => setCurrentTransformation({
                      ...currentTransformation,
                      description: e.target.value
                    })}
                    placeholder="Brief description"
                  />
                </div>
              </div>

              {/* Data Sources */}
              <div>
                <Label>Data Sources</Label>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {connections.map(conn => (
                    <Card 
                      key={conn.id} 
                      className={`cursor-pointer transition-all ${
                        selectedConnections.includes(conn.id) 
                          ? 'ring-2 ring-primary bg-primary/5' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => {
                        if (selectedConnections.includes(conn.id)) {
                          setSelectedConnections(selectedConnections.filter(id => id !== conn.id));
                        } else {
                          setSelectedConnections([...selectedConnections, conn.id]);
                        }
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4" />
                          <div>
                            <div className="font-medium text-sm">{conn.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {conn.connection_type}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Transformation Steps */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label>Transformation Steps</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addTransformationStep('join')}
                    >
                      <Merge className="w-4 h-4 mr-2" />
                      Join
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addTransformationStep('filter')}
                    >
                      <Filter className="w-4 h-4 mr-2" />
                      Filter
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addTransformationStep('calculate')}
                    >
                      <Calculator className="w-4 h-4 mr-2" />
                      Calculate
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  {steps.map((step, index) => (
                    <Card key={step.id} className="border-l-4 border-l-primary">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{index + 1}</Badge>
                            <span className="font-medium capitalize">{step.type}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeStep(step.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {renderStepEditor(step)}
                      </CardContent>
                    </Card>
                  ))}

                  {steps.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                      <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No transformation steps added yet.</p>
                      <p className="text-sm">Use the buttons above to add transformation steps.</p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={executePreview}
                  disabled={loading || selectedConnections.length === 0}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Preview Data
                </Button>
                <Button
                  onClick={saveTransformation}
                  disabled={loading || !currentTransformation.name.trim()}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Transformation
                </Button>
              </div>

              {/* Preview */}
              {previewData.length > 0 && (
                <div>
                  <Label>Data Preview</Label>
                  <div className="mt-2 border rounded-lg overflow-hidden">
                    <ScrollArea className="h-[300px]">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            {Object.keys(previewData[0]).map(key => (
                              <th key={key} className="text-left p-3 font-medium">
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.map((row, index) => (
                            <tr key={index} className="border-t">
                              {Object.values(row).map((value, cellIndex) => (
                                <td key={cellIndex} className="p-3">
                                  {String(value)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="manage" className="space-y-4">
              <div className="grid gap-4">
                {transformations.map(transformation => (
                  <Card key={transformation.id} className="glass-card">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{transformation.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {transformation.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {transformation.is_materialized && (
                            <Badge variant="default">Materialized</Badge>
                          )}
                          <Badge variant="secondary">
                            {transformation.transformation_config?.steps?.length || 0} steps
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          Sources: {Array.isArray(transformation.source_connections) ? transformation.source_connections.length : 0} • 
                          Last updated: {transformation.updated_at ? new Date(transformation.updated_at).toLocaleDateString() : 'Unknown'}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Play className="w-4 h-4 mr-2" />
                            Execute
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4 mr-2" />
                            Export
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {transformations.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Database className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No transformations yet</p>
                    <p>Create your first data transformation to get started.</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}