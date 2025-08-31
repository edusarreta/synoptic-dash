import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useEditorStore } from '../store/editorStore';
import { 
  Save, 
  Undo, 
  Redo, 
  Eye, 
  Share, 
  Settings,
  Grid,
  Smartphone,
  Tablet,
  Monitor
} from 'lucide-react';

export function EditorToolbar() {
  const { 
    canUndo, 
    canRedo, 
    isDirty,
    breakpoint,
    undo, 
    redo, 
    saveDashboard,
    setBreakpoint 
  } = useEditorStore();

  const breakpoints = [
    { key: 'lg' as const, icon: Monitor, label: 'Desktop' },
    { key: 'md' as const, icon: Tablet, label: 'Tablet' },
    { key: 'sm' as const, icon: Smartphone, label: 'Mobile' }
  ];

  return (
    <div className="border-b bg-background px-4 py-2 flex items-center gap-2">
      {/* File actions */}
      <Button 
        size="sm" 
        onClick={saveDashboard}
        disabled={!isDirty}
      >
        <Save className="w-4 h-4 mr-1" />
        Salvar
      </Button>
      
      <Separator orientation="vertical" className="h-6" />
      
      {/* History actions */}
      <Button 
        size="sm" 
        variant="ghost"
        onClick={undo}
        disabled={!canUndo}
      >
        <Undo className="w-4 h-4" />
      </Button>
      
      <Button 
        size="sm" 
        variant="ghost"
        onClick={redo}
        disabled={!canRedo}
      >
        <Redo className="w-4 h-4" />
      </Button>
      
      <Separator orientation="vertical" className="h-6" />
      
      {/* Breakpoint selector */}
      <div className="flex items-center gap-1">
        {breakpoints.map(({ key, icon: Icon, label }) => (
          <Button
            key={key}
            size="sm"
            variant={breakpoint === key ? "default" : "ghost"}
            onClick={() => setBreakpoint(key)}
            title={label}
          >
            <Icon className="w-4 h-4" />
          </Button>
        ))}
      </div>
      
      <Separator orientation="vertical" className="h-6" />
      
      {/* View actions */}
      <Button size="sm" variant="ghost">
        <Eye className="w-4 h-4 mr-1" />
        Preview
      </Button>
      
      <Button size="sm" variant="ghost">
        <Share className="w-4 h-4 mr-1" />
        Compartilhar
      </Button>
      
      <div className="ml-auto">
        <Button size="sm" variant="ghost">
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}