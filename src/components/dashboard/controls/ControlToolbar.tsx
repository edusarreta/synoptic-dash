import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Filter, 
  ChevronDown, 
  List, 
  Search, 
  Calendar, 
  Sliders, 
  CheckSquare 
} from "lucide-react";
import { ControlType } from "./ControlTypes";

interface ControlToolbarProps {
  onAddControl: (type: ControlType) => void;
  disabled?: boolean;
}

const CONTROL_TYPES = [
  {
    type: 'dropdown' as ControlType,
    label: 'Lista Suspensa',
    description: 'Filtro de seleção única ou múltipla',
    icon: List
  },
  {
    type: 'advanced-filter' as ControlType,
    label: 'Filtro Avançado',
    description: 'Campo de texto com condições',
    icon: Search
  },
  {
    type: 'date-range' as ControlType,
    label: 'Controle de Período',
    description: 'Seletor de datas robusto',
    icon: Calendar
  },
  {
    type: 'slider' as ControlType,
    label: 'Controle Deslizante',
    description: 'Filtrar por intervalo numérico',
    icon: Sliders
  },
  {
    type: 'checkbox' as ControlType,
    label: 'Caixa de Seleção',
    description: 'Filtros booleanos',
    icon: CheckSquare
  }
];

export function ControlToolbar({ onAddControl, disabled = false }: ControlToolbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleAddControl = (type: ControlType) => {
    onAddControl(type);
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          disabled={disabled}
          className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 shadow-sm"
        >
          <Filter className="w-4 h-4" />
          Adicionar um Controle
          <ChevronDown className="w-4 h-4 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        className="w-72 p-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
        align="start"
      >
        {CONTROL_TYPES.map((control) => {
          const Icon = control.icon;
          return (
            <DropdownMenuItem
              key={control.type}
              onClick={() => handleAddControl(control.type)}
              className="flex items-start gap-3 p-3 rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center mt-0.5">
                <Icon className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 text-sm">
                  {control.label}
                </div>
                <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  {control.description}
                </div>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}