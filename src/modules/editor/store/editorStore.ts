import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface ChartItem {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  type: 'table' | 'bar' | 'line' | 'area' | 'timeseries' | 'pie' | 'kpi';
  title: string;
  datasetId?: string;
  spec: ChartSpec;
  locked?: boolean;
}

export interface ChartSpec {
  datasetId: string;
  viz: 'table' | 'bar' | 'line' | 'area' | 'timeseries' | 'pie' | 'kpi';
  encoding: {
    x?: FieldEncoding;
    y?: FieldEncoding;
    series?: FieldEncoding;
    value?: FieldEncoding;
  };
  filters: FilterSpec[];
  calculatedFields: CalculatedField[];
  format: {
    locale: string;
    currency: string;
  };
  options: Record<string, any>;
}

export interface FieldEncoding {
  field: string;
  type: 'text' | 'number' | 'currency' | 'date' | 'datetime' | 'boolean';
  aggregate?: 'sum' | 'avg' | 'count' | 'count_distinct' | 'min' | 'max' | 'percent_of_total';
  legend?: boolean;
}

export interface FilterSpec {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'like' | 'between';
  value: any;
}

export interface CalculatedField {
  id: string;
  name: string;
  expression: string;
  type: 'number' | 'text' | 'date';
}

export interface DashboardState {
  id?: string;
  name: string;
  charts: ChartItem[];
  selectedChartId?: string;
  isDragging: boolean;
  breakpoint: 'lg' | 'md' | 'sm' | 'xs';
  layouts: Record<string, any[]>;
  canUndo: boolean;
  canRedo: boolean;
  isDirty: boolean;
}

export interface EditorActions {
  // Chart management
  addChart: (type: ChartItem['type'], position?: { x: number; y: number }) => void;
  removeChart: (id: string) => void;
  duplicateChart: (id: string) => void;
  updateChart: (id: string, updates: Partial<ChartItem>) => void;
  selectChart: (id?: string) => void;
  lockChart: (id: string, locked: boolean) => void;
  
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
  charts: [],
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

    addChart: (type, position) => {
      set((state) => {
        const id = `chart_${Date.now()}`;
        const newChart: ChartItem = {
          id,
          x: position?.x || 0,
          y: position?.y || 0,
          w: type === 'kpi' ? 2 : 4,
          h: type === 'kpi' ? 2 : 3,
          type,
          title: `${type.charAt(0).toUpperCase() + type.slice(1)} Chart`,
          spec: {
            datasetId: '',
            viz: type,
            encoding: {},
            filters: [],
            calculatedFields: [],
            format: { locale: 'pt-BR', currency: 'BRL' },
            options: {}
          }
        };
        state.charts.push(newChart);
        state.selectedChartId = id;
        state.isDirty = true;
      });
      get().pushHistory();
    },

    removeChart: (id) => {
      set((state) => {
        state.charts = state.charts.filter(chart => chart.id !== id);
        if (state.selectedChartId === id) {
          state.selectedChartId = undefined;
        }
        state.isDirty = true;
      });
      get().pushHistory();
    },

    duplicateChart: (id) => {
      set((state) => {
        const original = state.charts.find(chart => chart.id === id);
        if (original) {
          const newId = `chart_${Date.now()}`;
          const duplicate: ChartItem = {
            ...original,
            id: newId,
            x: original.x + 1,
            y: original.y + 1,
            title: `${original.title} (Cópia)`
          };
          state.charts.push(duplicate);
          state.selectedChartId = newId;
          state.isDirty = true;
        }
      });
      get().pushHistory();
    },

    updateChart: (id, updates) => {
      set((state) => {
        const chart = state.charts.find(c => c.id === id);
        if (chart) {
          Object.assign(chart, updates);
          state.isDirty = true;
        }
      });
    },

    selectChart: (id) => {
      set((state) => {
        state.selectedChartId = id;
      });
    },

    lockChart: (id, locked) => {
      set((state) => {
        const chart = state.charts.find(c => c.id === id);
        if (chart) {
          chart.locked = locked;
          state.isDirty = true;
        }
      });
    },

    updateLayout: (breakpoint, layout) => {
      set((state) => {
        state.layouts[breakpoint] = layout;
        // Update chart positions
        layout.forEach(item => {
          const chart = state.charts.find(c => c.id === item.i);
          if (chart) {
            chart.x = item.x;
            chart.y = item.y;
            chart.w = item.w;
            chart.h = item.h;
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