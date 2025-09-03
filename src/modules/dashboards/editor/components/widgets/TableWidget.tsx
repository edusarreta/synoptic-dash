import React from 'react';
import { useWidgetData } from '../../hooks/useWidgetData';
import { Widget } from '../../state/editorStore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface TableWidgetProps {
  widget: Widget;
}

export default function TableWidget({ widget }: TableWidgetProps) {
  useWidgetData(widget.id);

  if (widget.loading) {
    return (
      <div className="p-4 text-muted-foreground flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
        Carregando…
      </div>
    );
  }

  if (widget.error) {
    return (
      <div className="p-4 text-red-600 text-sm">
        Erro: {widget.error}
      </div>
    );
  }

  if (!widget.data?.rows?.length) {
    return (
      <div className="p-6 text-muted-foreground text-center">
        <div className="space-y-2">
          <div>Sem dados disponíveis</div>
          {(widget.query.dims.length === 0 && widget.query.mets.length === 0) && (
            <div className="text-xs">Adicione dimensões e métricas para visualizar dados</div>
          )}
        </div>
      </div>
    );
  }

  // Extract column names properly
  const cols = Array.isArray(widget.data.columns) 
    ? (typeof widget.data.columns[0] === 'string' 
        ? widget.data.columns as string[]
        : (widget.data.columns as Array<{ name: string; type: string }>).map(col => col.name))
    : Object.keys(widget.data.rows[0] ?? {});

  console.log('TableWidget Debug:', {
    columns: widget.data.columns,
    rows: widget.data.rows?.slice(0, 2),
    cols,
    firstRowType: typeof widget.data.rows?.[0],
    isArray: Array.isArray(widget.data.rows?.[0])
  });

  return (
    <div className="overflow-auto min-h-[220px] h-full">
      <Table>
        <TableHeader>
          <TableRow>
            {cols.map(col => (
              <TableHead key={col} className="px-3 py-2 text-left font-medium">
                {col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {widget.data.rows.slice(0, 100).map((row, i) => (
            <TableRow key={i}>
              {cols.map((col, colIndex) => {
                // Handle both array and object row formats
                const cellValue = Array.isArray(row) ? row[colIndex] : row[col];
                return (
                  <TableCell key={col} className="px-3 py-2 border-t">
                    {typeof cellValue === 'object' 
                      ? JSON.stringify(cellValue) 
                      : String(cellValue ?? '')}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {widget.data.truncated && (
        <div className="text-xs text-muted-foreground p-2 border-t">
          Dados truncados para melhor performance
        </div>
      )}
    </div>
  );
}