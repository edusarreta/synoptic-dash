// Normalize connection types to standard values
export const normalizeConnectionType = (type: string): string => {
  const normalized = type.toLowerCase();
  
  switch (normalized) {
    case 'supabase':
    case 'supabase_postgres':
    case 'supabase (postgres db)':
    case 'supabase (postgresql)':
    case 'postgres':
    case 'postgresql':
      return 'postgresql';
    
    case 'mysql':
      return 'mysql';
      
    case 'rest':
    case 'rest api':
      return 'rest';
      
    default:
      return 'postgresql'; // Default fallback
  }
};

// Get display name for connection type
export const getConnectionTypeDisplayName = (type: string): string => {
  const normalized = normalizeConnectionType(type);
  
  switch (normalized) {
    case 'postgresql':
      return 'PostgreSQL';
    case 'mysql':
      return 'MySQL';
    case 'rest':
      return 'REST API';
    default:
      return 'PostgreSQL';
  }
};

// Get type label for UI (no more duplicates)
export const getTypeLabel = (type: string): string => {
  const normalized = type.toLowerCase();
  switch (normalized) {
    case 'postgres':
      return 'PostgreSQL';
    case 'postgresql':
      return 'Supabase (PostgreSQL)';
    case 'mysql':
      return 'MySQL';
    case 'rest':
      return 'REST API';
    default:
      return 'PostgreSQL';
  }
};

// Get connection help text
export const getConnectionHelpText = (type: string): string => {
  const normalized = type.toLowerCase();
  switch (normalized) {
    case 'postgres':
    case 'postgresql':
      return 'Conecte-se ao seu banco PostgreSQL usando host, porta, database, usuário e senha.';
    case 'supabase':
      return 'Use as credenciais do Database do Supabase (não a URL da API). Configure SSL como "require".';
    case 'mysql':
      return 'Conecte-se ao seu banco MySQL usando host, porta, database, usuário e senha.';
    case 'rest':
      return 'Configure a URL base da API e método de autenticação para acessar dados via REST.';
    default:
      return 'Configure os parâmetros de conexão para acessar sua fonte de dados.';
  }
};

// Get available connection types for UI
export const getAvailableConnectionTypes = () => [
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'supabase', label: 'Supabase (PostgreSQL)' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'rest', label: 'REST API' }
];