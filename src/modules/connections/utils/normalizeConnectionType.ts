export type RawConnectionType = 'postgres' | 'postgresql' | 'supabase' | 'mysql' | 'rest' | 'webhook';
export type NormalizedConnectionType = 'POSTGRES' | 'MYSQL' | 'REST' | 'WEBHOOK';

export function normalizeConnectionType(rawType: RawConnectionType): NormalizedConnectionType {
  switch (rawType.toLowerCase()) {
    case 'postgres':
    case 'postgresql':
    case 'supabase':
      return 'POSTGRES';
    case 'mysql':
      return 'MYSQL';
    case 'rest':
      return 'REST';
    case 'webhook':
      return 'WEBHOOK';
    default:
      throw new Error(`Unsupported connection type: ${rawType}`);
  }
}

export function getDisplayName(normalizedType: NormalizedConnectionType): string {
  switch (normalizedType) {
    case 'POSTGRES':
      return 'PostgreSQL';
    case 'MYSQL':
      return 'MySQL';
    case 'REST':
      return 'REST API';
    case 'WEBHOOK':
      return 'Webhook';
    default:
      return normalizedType;
  }
}

export function getTypeLabel(rawType: string): string {
  switch (rawType) {
    case 'postgres':
    case 'postgresql':
      return 'PostgreSQL';
    case 'supabase':
      return 'Supabase Postgres (DB)';
    case 'mysql':
      return 'MySQL';
    case 'rest':
      return 'REST API (Supabase/Genérico)';
    case 'webhook':
      return 'Webhook';
    default:
      return rawType;
  }
}

export function getConnectionHelpText(rawType: string): string {
  switch (rawType) {
    case 'supabase':
      return 'Pegue host/porta/database/username/password em Supabase → Settings → Database. Isto não é a URL da API. Use SSL=require.';
    case 'rest':
      return 'Configure base_url, tipo de autenticação e headers para conectar com APIs REST.';
    case 'postgres':
    case 'postgresql':
      return 'Conexão direta com banco PostgreSQL. Certifique-se que o firewall permite acesso.';
    default:
      return '';
  }
}