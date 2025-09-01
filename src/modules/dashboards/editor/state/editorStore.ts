import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export type Agg = 'sum' | 'avg' | 'count' | 'count_distinct';
export type ChartType = 'table' | 'bar' | 'line';

export interface QuerySpec {
  datasetId: string;
  connectionId: string;
  source: {
    kind: 'table' | 'sql';
    table?: string; // schema.table quando for tabela
    sql?: string;   // quando for saved_query/dataset SQL
  };
  dims: Array<{ field: string; dataType?: 'text' | 'number' | 'date' | 'datetime' }>;
  mets: Array<{ field: string; agg: Agg; alias?: string }>;
  filters?: Array<{ field: string; op: '=' | '!=' | '>' | '>=' | '<' | '<=' | 'in' | 'like'; value: any }>;
  sort?: Array<{ field: string; dir: 'asc' | 'desc' }>;
  limit?: number;
}

export interface Widget {
  id: string;
  title: string;
  type: ChartType;
  x: number;
  y: number;
  w: number;
  h: number;
  query: QuerySpec;
  data?: { columns: string[]; rows: any[]; truncated?: boolean };
  loading?: boolean;
  error?: string | null;
}

export interface DashboardState {
  id?: string;
  name: string;
  widgets: Widget[];
  selectedDatasetId?: string;
  selectedWidgetId?: string;
  isDragging: boolean;
  breakpoint: 'lg' | 'md' | 'sm' | 'xs';
  layouts: Record<string, any[]>;
  canUndo: boolean;
  canRedo: boolean;
  isDirty: boolean;
}

export interface EditorActions {
  // Widget management
  addWidget: (type: ChartType, position?: { x: number; y: number }) => void;
  removeWidget: (id: string) => void;
  duplicateWidget: (id: string) => void;
  updateWidget: (id: string, updates: Partial<Widget>) => void;
  selectWidget: (id?: string) => void;
  getWidget: (id: string) => Widget | undefined;
  
  // Dataset management
  setSelectedDataset: (datasetId: string, connectionId: string, source: QuerySpec['source']) => void;
  
  // Field management for selected widget
  addDimension: (field: string, dataType?: string) => void;
  removeDimension: (field: string) => void;
  addMetric: (field: string, agg: Agg) => void;
  removeMetric: (field: string) => void;
  updateMetricAgg: (field: string, agg: Agg) => void;
  
  // Layout management
  updateLayout: (breakpoint: string, layout: any[]) => void;
  setBreakpoint: (breakpoint: DashboardState['breakpoint']) => void;
  setDragging: (isDragging: boolean) => void;
  
  // Dashboard management
  setDashboardName: (name: string) => void;
  loadDashboard: (dashboard: Partial<DashboardState>) => void;
  saveDashboard: () => Promise<void>;
  
  // History management
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
  
  // Utility
  resetEditor: () => void;
}

const initialState: DashboardState = {
  name: 'Novo Dashboard',
  widgets: [],
  isDragging: false,
  breakpoint: 'lg',
  layouts: { lg: [], md: [], sm: [], xs: [] },
  canUndo: false,
  canRedo: false,
  isDirty: false,
};

let historyStack: DashboardState[] = [initialState];
let historyIndex = 0;

export const useEditorStore = create<DashboardState & EditorActions>()(
  immer((set, get) => ({
    ...initialState,

    addWidget: (type, position) => {
      set((state) => {
        const id = `widget_${Date.now()}`;
        const newWidget: Widget = {
          id,
          title: `${type.charAt(0).toUpperCase() + type.slice(1)} Chart`,
          type,
          x: position?.x || 0,
          y: position?.y || 0,
          w: type === 'table' ? 6 : 4,
          h: type === 'table' ? 4 : 3,
          query: {
            datasetId: state.selectedDatasetId || '',
            connectionId: '',
            source: { kind: 'table' },
            dims: [],
            mets: [],
            filters: [],
            sort: [],
            limit: 1000
          }
        };
        state.widgets.push(newWidget);
        state.selectedWidgetId = id;
        state.isDirty = true;
      });
      get().pushHistory();
    },

    removeWidget: (id) => {
      set((state) => {
        state.widgets = state.widgets.filter(widget => widget.id !== id);
        if (state.selectedWidgetId === id) {
          state.selectedWidgetId = undefined;
        }
        state.isDirty = true;
      });
      get().pushHistory();
    },

    duplicateWidget: (id) => {
      set((state) => {
        const original = state.widgets.find(widget => widget.id === id);
        if (original) {
          const newId = `widget_${Date.now()}`;
          const duplicate: Widget = {
            ...original,
            id: newId,
            x: original.x + 1,
            y: original.y + 1,
            title: `${original.title} (Cópia)`
          };
          state.widgets.push(duplicate);
          state.selectedWidgetId = newId;
          state.isDirty = true;
        }
      });
      get().pushHistory();
    },

    updateWidget: (id, updates) => {
      set((state) => {
        const widget = state.widgets.find(w => w.id === id);
        if (widget) {
          Object.assign(widget, updates);
          state.isDirty = true;
        }
      });
    },

    selectWidget: (id) => {
      set((state) => {
        state.selectedWidgetId = id;
      });
    },

    getWidget: (id) => {
      return get().widgets.find(w => w.id === id);
    },

    setSelectedDataset: (datasetId, connectionId, source) => {
      set((state) => {
        state.selectedDatasetId = datasetId;
        // Update all widgets to use this dataset
        state.widgets = state.widgets.map(widget => ({
          ...widget,
          query: {
            ...widget.query,
            datasetId,
            connectionId,
            source
          }
        }));
        state.isDirty = true;
      });
    },

    addDimension: (field, dataType: 'text' | 'number' | 'date' | 'datetime' = 'text') => {
      const selectedId = get().selectedWidgetId;
      if (!selectedId) return;
      
      set((state) => {
        const widget = state.widgets.find(w => w.id === selectedId);
        if (widget && !widget.query.dims.find(d => d.field === field)) {
          widget.query.dims.push({ field, dataType });
          widget.data = undefined; // Clear data to trigger refresh
          state.isDirty = true;
        }
      });
    },

    removeDimension: (field) => {
      const selectedId = get().selectedWidgetId;
      if (!selectedId) return;
      
      set((state) => {
        const widget = state.widgets.find(w => w.id === selectedId);
        if (widget) {
          widget.query.dims = widget.query.dims.filter(d => d.field !== field);
          widget.data = undefined; // Clear data to trigger refresh
          state.isDirty = true;
        }
      });
    },

    addMetric: (field, agg = 'count') => {
      const selectedId = get().selectedWidgetId;
      if (!selectedId) return;
      
      set((state) => {
        const widget = state.widgets.find(w => w.id === selectedId);
        if (widget && !widget.query.mets.find(m => m.field === field)) {
          widget.query.mets.push({ field, agg, alias: `${agg}_${field}`.toLowerCase() });
          widget.data = undefined; // Clear data to trigger refresh
          state.isDirty = true;
        }
      });
    },

    removeMetric: (field) => {
      const selectedId = get().selectedWidgetId;
      if (!selectedId) return;
      
      set((state) => {
        const widget = state.widgets.find(w => w.id === selectedId);
        if (widget) {
          widget.query.mets = widget.query.mets.filter(m => m.field !== field);
          widget.data = undefined; // Clear data to trigger refresh
          state.isDirty = true;
        }
      });
    },

    updateMetricAgg: (field, agg) => {
      const selectedId = get().selectedWidgetId;
      if (!selectedId) return;
      
      set((state) => {
        const widget = state.widgets.find(w => w.id === selectedId);
        if (widget) {
          const metric = widget.query.mets.find(m => m.field === field);
          if (metric) {
            metric.agg = agg;
            metric.alias = `${agg}_${field}`.toLowerCase();
            widget.data = undefined; // Clear data to trigger refresh
            state.isDirty = true;
          }
        }
      });
    },

    updateLayout: (breakpoint, layout) => {
      set((state) => {
        state.layouts[breakpoint] = layout;
        // Update widget positions
        layout.forEach(item => {
          const widget = state.widgets.find(w => w.id === item.i);
          if (widget) {
            widget.x = item.x;
            widget.y = item.y;
            widget.w = item.w;
            widget.h = item.h;
          }
        });
        state.isDirty = true;
      });
    },

    setBreakpoint: (breakpoint) => {
      set((state) => {
        state.breakpoint = breakpoint;
      });
    },

    setDragging: (isDragging) => {
      set((state) => {
        state.isDragging = isDragging;
      });
    },

    setDashboardName: (name) => {
      set((state) => {
        state.name = name;
        state.isDirty = true;
      });
    },

    loadDashboard: (dashboard) => {
      set((state) => {
        Object.assign(state, { ...initialState, ...dashboard, isDirty: false });
      });
      historyStack = [get()];
      historyIndex = 0;
    },

    saveDashboard: async () => {
      // Implementation for saving to API
      set((state) => {
        state.isDirty = false;
      });
    },

    pushHistory: () => {
      const currentState = get();
      historyStack = historyStack.slice(0, historyIndex + 1);
      historyStack.push({ ...currentState });
      historyIndex = historyStack.length - 1;
      
      set((state) => {
        state.canUndo = historyIndex > 0;
        state.canRedo = false;
      });
    },

    undo: () => {
      if (historyIndex > 0) {
        historyIndex--;
        const previousState = historyStack[historyIndex];
        set((state) => {
          Object.assign(state, previousState);
          state.canUndo = historyIndex > 0;
          state.canRedo = true;
        });
      }
    },

    redo: () => {
      if (historyIndex < historyStack.length - 1) {
        historyIndex++;
        const nextState = historyStack[historyIndex];
        set((state) => {
          Object.assign(state, nextState);
          state.canUndo = true;
          state.canRedo = historyIndex < historyStack.length - 1;
        });
      }
    },

    resetEditor: () => {
      set((state) => {
        Object.assign(state, initialState);
      });
      historyStack = [initialState];
      historyIndex = 0;
    },
  }))
);