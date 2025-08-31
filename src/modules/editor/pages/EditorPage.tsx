import React from 'react';
import { EditorCanvas } from '../components/EditorCanvas';
import { EditorToolbar } from '../components/EditorToolbar';
import { EditorSidebar } from '../components/EditorSidebar';
import { useEditorStore } from '../store/editorStore';

export function EditorPage() {
  const { name, isDirty } = useEditorStore();

  return (
    <div className="h-screen flex flex-col bg-background">
      <EditorToolbar />
      
      <div className="flex-1 flex overflow-hidden">
        <EditorSidebar />
        
        <main className="flex-1 flex flex-col">
          <div className="border-b bg-muted/30 px-4 py-2 flex items-center justify-between">
            <h1 className="font-semibold text-lg">
              {name} {isDirty && <span className="text-muted-foreground">*</span>}
            </h1>
            <div className="text-sm text-muted-foreground">
              Editor de Dashboard
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <EditorCanvas />
          </div>
        </main>
      </div>
    </div>
  );
}