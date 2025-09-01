// Connection Types Enum and Constants
export const CONNECTION_TYPES = {
  POSTGRESQL: 'postgresql',
  MYSQL: 'mysql', 
  SUPABASE_API: 'supabase_api'
} as const;

export type ConnectionType = typeof CONNECTION_TYPES[keyof typeof CONNECTION_TYPES];

// Connection Type Labels for UI
export const CONNECTION_TYPE_LABELS: Record<ConnectionType, string> = {
  [CONNECTION_TYPES.POSTGRESQL]: 'PostgreSQL',
  [CONNECTION_TYPES.MYSQL]: 'MySQL',
  [CONNECTION_TYPES.SUPABASE_API]: 'Supabase (API)'
};

// Normalize legacy connection types
export const normalizeConnectionType = (type: string): ConnectionType => {
  const normalized = type.toLowerCase();
  
  switch (normalized) {
    case 'supabase':
    case 'supabase (postgres db)':
    case 'supabase_postgres':
    case 'postgres':
    case 'postgresql':
      return CONNECTION_TYPES.POSTGRESQL;
    
    case 'mysql':
      return CONNECTION_TYPES.MYSQL;
      
    case 'supabase_api':
    case 'rest':
    case 'rest_api':
      return CONNECTION_TYPES.SUPABASE_API;
      
    default:
      return CONNECTION_TYPES.POSTGRESQL; // Default fallback
  }
};

// Get display label for connection type
export const getConnectionTypeLabel = (type: string): string => {
  const normalized = normalizeConnectionType(type);
  return CONNECTION_TYPE_LABELS[normalized];
};

// Get connection help text
export const getConnectionHelpText = (type: string): string => {
  const normalized = normalizeConnectionType(type);
  
  switch (normalized) {
    case CONNECTION_TYPES.POSTGRESQL:
      return 'Conecte-se ao seu banco PostgreSQL usando host, porta, database, usuário e senha. SSL mode padrão: require.';
    case CONNECTION_TYPES.MYSQL:
      return 'Conecte-se ao seu banco MySQL usando host, porta, database, usuário e senha.';
    case CONNECTION_TYPES.SUPABASE_API:
      return 'Configure a URL da API e chave de acesso para acessar dados via Supabase API.';
    default:
      return 'Configure os parâmetros de conexão para acessar sua fonte de dados.';
  }
};

// Get available connection types for UI - only the 3 main types
export const getAvailableConnectionTypes = () => [
  { value: CONNECTION_TYPES.POSTGRESQL, label: CONNECTION_TYPE_LABELS[CONNECTION_TYPES.POSTGRESQL] },
  { value: CONNECTION_TYPES.MYSQL, label: CONNECTION_TYPE_LABELS[CONNECTION_TYPES.MYSQL] },
  { value: CONNECTION_TYPES.SUPABASE_API, label: CONNECTION_TYPE_LABELS[CONNECTION_TYPES.SUPABASE_API] }
];

// Check if connection type supports SQL Editor
export const supportsSQLEditor = (type: string): boolean => {
  const normalized = normalizeConnectionType(type);
  return normalized === CONNECTION_TYPES.POSTGRESQL || normalized === CONNECTION_TYPES.MYSQL;
};

// Get default SSL mode for connection type
export const getDefaultSSLMode = (type: string): string => {
  const normalized = normalizeConnectionType(type);
  return normalized === CONNECTION_TYPES.POSTGRESQL ? 'require' : 'disable';
};