import { ControlConfiguration, ControlType, ControlStyle } from "./ControlTypes";

export const createDefaultStyle = (): ControlStyle => ({
  label: {
    text: 'Novo Controle',
    color: '#374151',
    fontSize: 14,
    alignment: 'left',
    visible: true
  },
  container: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
    borderRadius: 6,
    shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    borderWidth: 1
  },
  options: {
    textColor: '#374151',
    hoverBackground: '#f3f4f6',
    fontSize: 14
  }
});

export const createDefaultControl = (type: ControlType, x: number, y: number): ControlConfiguration => {
  const baseControl = {
    id: `control_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    label: getDefaultLabel(type),
    dataSource: '',
    field: '',
    style: createDefaultStyle(),
    position: {
      x: Math.max(0, x - 100), // Center on click
      y: Math.max(0, y - 20),
      width: getDefaultWidth(type),
      height: getDefaultHeight(type)
    }
  };

  // Update label text
  baseControl.style.label.text = getDefaultLabel(type);

  // Type-specific configurations
  switch (type) {
    case 'dropdown':
      return {
        ...baseControl,
        isMultiSelect: false
      };
    
    case 'advanced-filter':
      return {
        ...baseControl,
        condition: 'contains'
      };
    
    case 'date-range':
      return {
        ...baseControl,
        defaultValue: {
          preset: 'last_7_days'
        }
      };
    
    case 'slider':
      return {
        ...baseControl,
        defaultValue: {
          type: 'range' // 'single' or 'range'
        }
      };
    
    case 'checkbox':
      return {
        ...baseControl,
        defaultValue: false
      };
    
    default:
      return baseControl;
  }
};

const getDefaultLabel = (type: ControlType): string => {
  switch (type) {
    case 'dropdown':
      return 'Lista Suspensa';
    case 'advanced-filter':
      return 'Filtro Avançado';
    case 'date-range':
      return 'Período';
    case 'slider':
      return 'Intervalo';
    case 'checkbox':
      return 'Seleção';
    default:
      return 'Controle';
  }
};

const getDefaultWidth = (type: ControlType): number => {
  switch (type) {
    case 'dropdown':
      return 200;
    case 'advanced-filter':
      return 250;
    case 'date-range':
      return 220;
    case 'slider':
      return 200;
    case 'checkbox':
      return 150;
    default:
      return 200;
  }
};

const getDefaultHeight = (type: ControlType): number => {
  switch (type) {
    case 'dropdown':
      return 70;
    case 'advanced-filter':
      return 70;
    case 'date-range':
      return 70;
    case 'slider':
      return 80;
    case 'checkbox':
      return 60;
    default:
      return 70;
  }
};