export type ControlType = 
  | 'dropdown'
  | 'advanced-filter' 
  | 'date-range'
  | 'slider'
  | 'checkbox';

export interface ControlConfiguration {
  id: string;
  type: ControlType;
  label: string;
  dataSource: string;
  field: string;
  metric?: string;
  defaultValue?: any;
  isMultiSelect?: boolean;
  condition?: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'regex';
  style: ControlStyle;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ControlStyle {
  // Label styles
  label: {
    text: string;
    color: string;
    fontSize: number;
    alignment: 'left' | 'center' | 'right';
    visible: boolean;
  };
  
  // Container styles
  container: {
    backgroundColor: string;
    borderColor: string;
    borderRadius: number;
    shadow: string;
    borderWidth: number;
  };
  
  // Options styles (for dropdowns)
  options: {
    textColor: string;
    hoverBackground: string;
    fontSize: number;
  };
}

export interface FilterCondition {
  field: string;
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'regex' | 'between' | 'in';
  value: any;
  dataSource: string;
}

export interface DashboardControlsState {
  controls: ControlConfiguration[];
  activeFilters: FilterCondition[];
  selectedControl: string | null;
}