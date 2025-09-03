import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Database } from 'lucide-react';
import { useDatasets } from '@/hooks/useDatasets';
import { useSession } from '@/providers/SessionProvider';

interface DatasetSelectProps {
  value?: string;
  onValueChange: (datasetId: string, dataset: any) => void;
  className?: string;
}

export function DatasetSelect({ value, onValueChange, className }: DatasetSelectProps) {
  const { userProfile } = useSession();
  const { datasets, isLoading, error } = useDatasets(userProfile?.org_id);

  const handleValueChange = (datasetId: string) => {
    const selectedDataset = datasets.find(d => d.id === datasetId);
    if (selectedDataset) {
      onValueChange(datasetId, selectedDataset);
    }
  };

  if (error) {
    return (
      <div className="space-y-2">
        <Label>Dataset</Label>
        <div className="text-sm text-destructive">
          Erro ao carregar datasets: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="flex items-center gap-2">
        <Database className="w-4 h-4" />
        Dataset
      </Label>
      <Select value={value} onValueChange={handleValueChange} disabled={isLoading}>
        <SelectTrigger>
          <SelectValue 
            placeholder={isLoading ? "Carregando..." : "Selecione um dataset"}
          />
        </SelectTrigger>
        <SelectContent>
          {datasets.map((dataset) => (
            <SelectItem key={dataset.id} value={dataset.id}>
              <div className="flex flex-col">
                <span className="font-medium">{dataset.name}</span>
                {dataset.description && (
                  <span className="text-xs text-muted-foreground">
                    {dataset.description}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {dataset.type === 'dataset' ? 'Dataset' : 'Consulta Salva'}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {datasets.length === 0 && !isLoading && (
        <div className="text-sm text-muted-foreground">
          Nenhum dataset encontrado. 
          <br />
          Crie datasets no Data Hub primeiro.
        </div>
      )}
    </div>
  );
}