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