import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ChevronDown, 
  Search, 
  Calendar, 
  Sliders, 
  CheckSquare,
  Filter
} from "lucide-react";

interface ControlTypePickerProps {
  onSelect: (controlType: string) => void;
  onClose: () => void;
}

const controlTypes = [
  {
    id: 'dropdown',
    name: 'Lista Suspensa',
    icon: ChevronDown,
    description: 'Seleção única ou múltipla'
  },
  {
    id: 'advanced-filter',
    name: 'Filtro Avançado',
    icon: Filter,
    description: 'Campo de texto com condições'
  },
  {
    id: 'date-range',
    name: 'Controle de Período',
    icon: Calendar,
    description: 'Seletor de intervalo de datas'
  },
  {
    id: 'slider',
    name: 'Controle Deslizante',
    icon: Sliders,
    description: 'Intervalo numérico'
  },
  {
    id: 'checkbox',
    name: 'Caixa de Seleção',
    icon: CheckSquare,
    description: 'Valores booleanos'
  },
  {
    id: 'search',
    name: 'Busca de Texto',
    icon: Search,
    description: 'Campo de busca livre'
  }
];

export function ControlTypePicker({ onSelect, onClose }: ControlTypePickerProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <Card className="w-[500px] max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Escolher Tipo de Controle</h3>
            <Button variant="ghost" size="sm" onClick={onClose}>×</Button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {controlTypes.map((control) => {
              const Icon = control.icon;
              return (
                <Button
                  key={control.id}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-primary/5 hover:border-primary/50"
                  onClick={() => onSelect(control.id)}
                >
                  <Icon className="w-8 h-8 text-primary" />
                  <div className="text-center">
                    <div className="font-medium text-sm">{control.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {control.description}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}