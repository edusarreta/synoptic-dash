import React, { useState, useCallback } from 'react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import { useEditorStore } from '../store/editorStore';
import { ChartWidget } from './ChartWidget';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const breakpoints = {
  lg: 1200,
  md: 996,
  sm: 768,
  xs: 480
};

const cols = {
  lg: 12,
  md: 10,
  sm: 6,
  xs: 4
};

export function EditorCanvas() {
  const { 
    charts, 
    layouts, 
    breakpoint,
    selectedChartId,
    isDragging,
    updateLayout,
    selectChart,
    setDragging,
    setBreakpoint
  } = useEditorStore();

  const generateLayout = useCallback((): Layout[] => {
    return charts.map(chart => ({
      i: chart.id,
      x: chart.x,
      y: chart.y,
      w: chart.w,
      h: chart.h,
      minW: chart.minW || 2,
      minH: chart.minH || 2,
      static: chart.locked || false
    }));
  }, [charts]);

  const handleLayoutChange = useCallback((layout: Layout[], allLayouts: any) => {
    updateLayout(breakpoint, layout);
  }, [breakpoint, updateLayout]);

  const handleBreakpointChange = useCallback((newBreakpoint: string) => {
    setBreakpoint(newBreakpoint as any);
  }, [setBreakpoint]);

  const handleDragStart = useCallback(() => {
    setDragging(true);
  }, [setDragging]);

  const handleDragStop = useCallback(() => {
    setDragging(false);
  }, [setDragging]);

  const handleWidgetClick = useCallback((chartId: string) => {
    if (!isDragging) {
      selectChart(chartId === selectedChartId ? undefined : chartId);
    }
  }, [isDragging, selectedChartId, selectChart]);

  return (
    <div className="h-full overflow-auto bg-background p-4">
      {charts.length === 0 ? (
        <div className="h-full flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="text-6xl">📊</div>
            <h2 className="text-xl font-semibold text-muted-foreground">
              Seu dashboard está vazio
            </h2>
            <p className="text-muted-foreground">
              Adicione gráficos usando o painel lateral
            </p>
          </div>
        </div>
      ) : (
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={breakpoints}
          cols={cols}
          rowHeight={60}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          onLayoutChange={handleLayoutChange}
          onBreakpointChange={handleBreakpointChange}
          onDragStart={handleDragStart}
          onDragStop={handleDragStop}
          onResizeStart={handleDragStart}
          onResizeStop={handleDragStop}
          measureBeforeMount={false}
          useCSSTransforms={true}
          compactType="vertical"
          preventCollision={false}
        >
          {charts.map(chart => (
            <div 
              key={chart.id}
              className={`bg-card border rounded-lg shadow-sm transition-all ${
                selectedChartId === chart.id 
                  ? 'ring-2 ring-primary ring-offset-2' 
                  : 'hover:shadow-md'
              } ${chart.locked ? 'opacity-75' : ''}`}
              onClick={() => handleWidgetClick(chart.id)}
            >
              <ChartWidget chart={chart} />
            </div>
          ))}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}