import React from 'react';
import { Widget } from '../state/editorStore';
import TableWidget from './widgets/TableWidget';
import BarWidget from './widgets/BarWidget';
import LineWidget from './widgets/LineWidget';
import PieWidget from './widgets/PieWidget';

interface WidgetRendererProps {
  widget: Widget;
}

export function WidgetRenderer({ widget }: WidgetRendererProps) {
  switch (widget.type) {
    case 'bar':
      return <BarWidget widget={widget} />;
    case 'line':
      return <LineWidget widget={widget} />;
    case 'pie':
      return <PieWidget widget={widget} />;
    case 'table':
    default:
      return <TableWidget widget={widget} />;
  }
}