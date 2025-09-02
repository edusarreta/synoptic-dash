import { create } from 'zustand';

interface DataHubState {
  // Navigation state
  currentView: 'main' | 'connection-form' | 'catalog-detail' | 'sql-editor' | 'dataset-detail';
  previousView: string | null;
  
  // Selected items
  selectedConnectionId: string | null;
  selectedSchema: string | null;
  selectedTable: string | null;
  
  // SQL Editor state
  sqlQuery: string;
  queryResults: any | null;
  
  // Datasets
  datasets: any[];
  
  // Loading states
  isLoadingConnections: boolean;
  isLoadingCatalog: boolean;
  isLoadingSQL: boolean;
  isLoadingDatasets: boolean;
  
  // Actions
  setCurrentView: (view: DataHubState['currentView'], previous?: string) => void;
  navigateBack: () => void;
  setSelectedConnection: (connectionId: string | null) => void;
  setSelectedConnectionId: (connectionId: string | null) => void;
  setSelectedSchema: (schema: string | null) => void;
  setSelectedTable: (table: string | null) => void;
  setSQLQuery: (query: string) => void;
  setQueryResults: (results: any) => void;
  setDatasets: (datasets: any[]) => void;
  setLoadingConnections: (loading: boolean) => void;
  setLoadingCatalog: (loading: boolean) => void;
  setLoadingSQL: (loading: boolean) => void;
  setLoadingDatasets: (loading: boolean) => void;
  
  // Composite actions
  selectTableAndGenerateSQL: (schema: string, table: string, connectionType: string) => void;
  clearSelection: () => void;
}

export const useDataHubStore = create<DataHubState>((set, get) => ({
  // Initial state
  currentView: 'main',
  previousView: null,
  selectedConnectionId: null,
  selectedSchema: null,
  selectedTable: null,
  sqlQuery: "SELECT 1 as id, 'Exemplo' as name, NOW() as timestamp;",
  queryResults: null,
  datasets: [],
  isLoadingConnections: false,
  isLoadingCatalog: false,
  isLoadingSQL: false,
  isLoadingDatasets: false,
  
  // Actions
  setCurrentView: (view, previous) => set({ 
    currentView: view, 
    previousView: previous || get().currentView 
  }),
  navigateBack: () => {
    const { previousView } = get();
    if (previousView) {
      set({ currentView: previousView as DataHubState['currentView'], previousView: null });
    }
  },
  setSelectedConnection: (connectionId) => set({ selectedConnectionId: connectionId }),
  setSelectedConnectionId: (connectionId) => set({ selectedConnectionId: connectionId }),
  setSelectedSchema: (schema) => set({ selectedSchema: schema }),
  setSelectedTable: (table) => set({ selectedTable: table }),
  setSQLQuery: (query) => set({ sqlQuery: query }),
  setQueryResults: (results) => set({ queryResults: results }),
  setDatasets: (datasets) => set({ datasets }),
  setLoadingConnections: (loading) => set({ isLoadingConnections: loading }),
  setLoadingCatalog: (loading) => set({ isLoadingCatalog: loading }),
  setLoadingSQL: (loading) => set({ isLoadingSQL: loading }),
  setLoadingDatasets: (loading) => set({ isLoadingDatasets: loading }),
  
  // Composite actions
  selectTableAndGenerateSQL: (schema, table, connectionType) => {
    let sql = '';
    if (connectionType === 'postgresql') {
      sql = `SELECT * FROM "${schema}"."${table}" LIMIT 100;`;
    } else if (connectionType === 'mysql') {
      sql = `SELECT * FROM \`${schema}\`.\`${table}\` LIMIT 100;`;
    } else {
      sql = `SELECT * FROM ${schema}.${table} LIMIT 100;`;
    }
    
    set({
      selectedSchema: schema,
      selectedTable: table,
      sqlQuery: sql
    });
  },
  
  clearSelection: () => set({
    selectedSchema: null,
    selectedTable: null,
    queryResults: null
  })
}));