import { QuerySpec, Widget } from '../state/editorStore';

const q = (id: string) => `"${id.replace(/"/g, '""')}"`;

export function buildSqlFromSpec(widget: Widget): { sql: string; params: Record<string, any> } {
  const { query: spec } = widget;
  const dims = spec.dims.map(d => q(d.field));
  const mets = spec.mets.map((m) => {
    const col = q(m.field);
    const alias = m.alias ?? `${m.agg}_${m.field}`.toLowerCase();
    
    if (m.agg === 'count_distinct') return `COUNT(DISTINCT ${col}) AS ${q(alias)}`;
    if (m.agg === 'count')          return `COUNT(${col}) AS ${q(alias)}`;
    if (m.agg === 'avg')            return `AVG(${col}) AS ${q(alias)}`;
    return `SUM(${col}) AS ${q(alias)}`;
  });

  const selects = [...dims, ...mets].join(', ');
  
  const source = spec.source.kind === 'table'
    ? `FROM ${spec.source.table!}`
    : `FROM (${spec.source.sql!}) AS sub`;

  const groupBy = dims.length ? `GROUP BY ${dims.join(', ')}` : '';
  
  const order = spec.sort?.length
    ? 'ORDER BY ' + spec.sort.map(s => `${q(s.field)} ${s.dir.toUpperCase()}`).join(', ')
    : (dims.length ? `ORDER BY ${dims[0]}` : '');
    
  const limit = `LIMIT ${spec.limit ?? 1000}`;

  // Simple filters (without params for now)
  const where = spec.filters?.length
      ? 'WHERE ' + spec.filters.map(f => {
        const value = typeof f.value === 'string' 
          ? `'${f.value.replace(/'/g, "''")}'` 
          : f.value;
        return `${q(f.field)} ${f.op} ${value}`;
      }).join(' AND ')
    : '';

  const sql = `SELECT ${selects} ${source} ${where} ${groupBy} ${order} ${limit}`.replace(/\s+/g, ' ').trim();
  
  return { sql, params: {} };
}