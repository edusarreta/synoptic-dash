import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
  Hash, 
  Type, 
  Calendar, 
  ToggleLeft,
  Filter,
  Sigma,
  Eye,
  EyeOff,
  ChevronDown
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DatabaseTable } from "@/hooks/useDatabase";

interface FieldSelectorProps {
  tables: DatabaseTable[];
  selectedTables: string[];
  selectedFields: SelectedField[];
  onFieldToggle: (field: SelectedField) => void;
  onFieldRoleChange: (field: SelectedField, role: 'dimension' | 'metric') => void;
  onFieldAggregationChange: (field: SelectedField, aggregation: 'sum' | 'count' | 'avg' | 'min' | 'max' | 'count_distinct') => void;
}

export interface SelectedField {
  tableName: string;
  columnName: string;
  dataType: string;
  role: 'dimension' | 'metric';
  aggregation?: 'sum' | 'count' | 'avg' | 'min' | 'max' | 'count_distinct';
}

const getColumnIcon = (dataType: string) => {
  const type = dataType.toLowerCase();
  if (type.includes('int') || type.includes('numeric') || type.includes('decimal') || type.includes('float')) {
    return Hash;
  }
  if (type.includes('date') || type.includes('time') || type.includes('timestamp')) {
    return Calendar;
  }
  if (type.includes('bool')) {
    return ToggleLeft;
  }
  return Type;
};

const getDataTypeColor = (dataType: string) => {
  const type = dataType.toLowerCase();
  if (type.includes('int') || type.includes('numeric') || type.includes('decimal') || type.includes('float')) {
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  }
  if (type.includes('date') || type.includes('time') || type.includes('timestamp')) {
    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  }
  if (type.includes('bool')) {
    return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
  }
  return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
};

export function FieldSelector({
  tables,
  selectedTables,
  selectedFields,
  onFieldToggle,
  onFieldRoleChange,
  onFieldAggregationChange
}: FieldSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [groupBy, setGroupBy] = useState<'table' | 'type'>('table');

  // Get available tables and their fields
  const availableTables = tables.filter(table => selectedTables.includes(table.name));
  
  // Filter fields based on search
  const getFilteredFields = () => {
    let allFields: Array<{table: DatabaseTable, column: any}> = [];
    
    availableTables.forEach(table => {
      table.columns.forEach(column => {
        if (column.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          allFields.push({ table, column });
        }
      });
    });

    if (showOnlySelected) {
      allFields = allFields.filter(({ table, column }) =>
        selectedFields.some(f => f.tableName === table.name && f.columnName === column.name)
      );
    }

    return allFields;
  };

  const isFieldSelected = (tableName: string, columnName: string) => {
    return selectedFields.some(f => f.tableName === tableName && f.columnName === columnName);
  };

  const getFieldRole = (tableName: string, columnName: string) => {
    const field = selectedFields.find(f => f.tableName === tableName && f.columnName === columnName);
    return field?.role || 'dimension';
  };

  const getFieldAggregation = (tableName: string, columnName: string) => {
    const field = selectedFields.find(f => f.tableName === tableName && f.columnName === columnName);
    return field?.aggregation || 'count';
  };

  const getAggregationOptions = (dataType: string, columnName?: string): Array<{ value: 'sum' | 'count' | 'avg' | 'min' | 'max' | 'count_distinct', label: string }> => {
    const type = dataType.toLowerCase();
    const colName = (columnName || '').toLowerCase();
    console.log('🔍 Getting aggregation options for dataType:', dataType, 'columnName:', columnName, 'type:', type);
    
    const baseOptions = [
      { value: 'count' as const, label: 'Contagem' },
      { value: 'count_distinct' as const, label: 'Contagem Única' }
    ];
    
    // Enhanced numeric type detection
    const isNumeric = type.includes('int') || 
                     type.includes('numeric') || 
                     type.includes('decimal') || 
                     type.includes('float') || 
                     type.includes('money') || 
                     type.includes('double') ||
                     type.includes('bigint') ||
                     type.includes('smallint') ||
                     type.includes('real') ||
                     dataType.toLowerCase().includes('number') ||
                     // Force specific fields to be numeric based on column name
                     ['valor', 'price', 'amount', 'total', 'quantity', 'qty', 'count', 'sum', 'avg'].some(keyword => 
                       colName.includes(keyword)
                     );
    
    if (isNumeric) {
      const options = [
        ...baseOptions,
        { value: 'sum' as const, label: 'Soma' },
        { value: 'avg' as const, label: 'Média' },
        { value: 'min' as const, label: 'Mínimo' },
        { value: 'max' as const, label: 'Máximo' }
      ];
      console.log('🔍 Numeric field detected, returning all options:', options);
      return options;
    }
    
    console.log('🔍 Non-numeric field, returning base options:', baseOptions);
    return baseOptions;
  };

  const handleFieldClick = (table: DatabaseTable, column: any) => {
    const field: SelectedField = {
      tableName: table.name,
      columnName: column.name,
      dataType: column.dataType,
      role: 'dimension'
    };
    onFieldToggle(field);
  };

  const filteredFields = getFilteredFields();

  return (
    <Card className="glass-card border-0 shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Fields
        </CardTitle>
        <CardDescription>
          Select and configure fields for your visualization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search fields..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border rounded-md bg-background"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowOnlySelected(!showOnlySelected)}
            >
              {showOnlySelected ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </Button>
          </div>

          {selectedFields.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs">Selected Fields ({selectedFields.length}):</Label>
              <div className="max-h-24 overflow-y-auto space-y-1">
                {selectedFields.map((field) => (
                  <div key={`${field.tableName}.${field.columnName}`} className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {field.tableName}.{field.columnName}
                    </Badge>
                    <Badge 
                      variant={field.role === 'metric' ? 'default' : 'outline'}
                      className="text-xs cursor-pointer"
                      onClick={() => onFieldRoleChange(field, field.role === 'metric' ? 'dimension' : 'metric')}
                    >
                      {field.role === 'metric' ? <Sigma className="w-3 h-3" /> : <Filter className="w-3 h-3" />}
                      {field.role}
                    </Badge>
                    {field.role === 'metric' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Badge variant="outline" className="text-xs cursor-pointer flex items-center gap-1 hover:bg-muted">
                            {getAggregationOptions(field.dataType, field.columnName).find(opt => opt.value === field.aggregation)?.label || 'Contagem'}
                            <ChevronDown className="w-3 h-3" />
                          </Badge>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="min-w-[120px] bg-white dark:bg-gray-800 border shadow-lg z-50">
                          {getAggregationOptions(field.dataType, field.columnName).map((option) => (
                            <DropdownMenuItem
                              key={option.value}
                              onClick={() => {
                                console.log('🔄 Changing aggregation for', field.columnName, '(', field.dataType, ') from', field.aggregation, 'to', option.value);
                                onFieldAggregationChange(field, option.value);
                              }}
                              className={`${field.aggregation === option.value ? 'bg-muted' : ''} hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer`}
                            >
                              {option.label}
                              {field.aggregation === option.value && <span className="ml-2">✓</span>}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Fields List */}
        {availableTables.length > 0 ? (
          <div className="max-h-96 overflow-y-auto space-y-4">
            {groupBy === 'table' ? (
              // Group by table
              availableTables.map(table => {
                const tableFields = filteredFields.filter(f => f.table.name === table.name);
                if (tableFields.length === 0) return null;

                return (
                  <div key={table.name} className="space-y-2">
                    <div className="flex items-center gap-2 pb-1 border-b">
                      <Badge variant="outline" className="text-xs">
                        {table.name}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {tableFields.length} fields
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-1">
                      {tableFields.map(({ column }) => {
                        const Icon = getColumnIcon(column.dataType);
                        const isSelected = isFieldSelected(table.name, column.name);
                        const fieldRole = getFieldRole(table.name, column.name);

                        return (
                          <div
                            key={column.name}
                            className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                              isSelected 
                                ? 'bg-primary/10 border border-primary/20' 
                                : 'hover:bg-muted/50'
                            }`}
                            onClick={() => handleFieldClick(table, column)}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium truncate">{column.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Badge 
                                className={`text-xs ${getDataTypeColor(column.dataType)}`}
                                variant="secondary"
                              >
                                {column.dataType}
                              </Badge>
                              {isSelected && (
                                <div className="flex items-center gap-1">
                                  <Badge 
                                    variant={fieldRole === 'metric' ? 'default' : 'outline'}
                                    className="text-xs"
                                  >
                                    {fieldRole === 'metric' ? <Sigma className="w-3 h-3" /> : <Filter className="w-3 h-3" />}
                                  </Badge>
                             {fieldRole === 'metric' && (
                               <DropdownMenu>
                                 <DropdownMenuTrigger asChild>
                                   <Badge variant="outline" className="text-xs cursor-pointer flex items-center gap-1 hover:bg-muted">
                                     {getAggregationOptions(column.dataType, column.name).find(opt => opt.value === getFieldAggregation(table.name, column.name))?.label || 'Contagem'}
                                     <ChevronDown className="w-3 h-3" />
                                   </Badge>
                                 </DropdownMenuTrigger>
                                 <DropdownMenuContent align="start" className="min-w-[120px] bg-white dark:bg-gray-800 border shadow-lg z-50">
                                   {getAggregationOptions(column.dataType, column.name).map((option) => (
                                     <DropdownMenuItem
                                       key={option.value}
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         console.log('🔄 Table view - Changing aggregation for', column.name, 'to', option.value);
                                         const field = selectedFields.find(f => f.tableName === table.name && f.columnName === column.name);
                                         if (field) {
                                           onFieldAggregationChange(field, option.value);
                                         }
                                       }}
                                       className={`${getFieldAggregation(table.name, column.name) === option.value ? 'bg-muted' : ''} hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer`}
                                     >
                                       {option.label}
                                       {getFieldAggregation(table.name, column.name) === option.value && <span className="ml-2">✓</span>}
                                     </DropdownMenuItem>
                                   ))}
                                 </DropdownMenuContent>
                               </DropdownMenu>
                             )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              // All fields in one list
              <div className="grid grid-cols-1 gap-1">
                {filteredFields.map(({ table, column }) => {
                  const Icon = getColumnIcon(column.dataType);
                  const isSelected = isFieldSelected(table.name, column.name);
                  const fieldRole = getFieldRole(table.name, column.name);

                  return (
                    <div
                      key={`${table.name}.${column.name}`}
                      className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-primary/10 border border-primary/20' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handleFieldClick(table, column)}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium truncate">
                          {table.name}.{column.name}
                        </span>
                      </div>
                       <div className="flex items-center gap-1">
                         <Badge 
                           className={`text-xs ${getDataTypeColor(column.dataType)}`}
                           variant="secondary"
                         >
                           {column.dataType}
                         </Badge>
                         {isSelected && (
                           <div className="flex items-center gap-1">
                             <Badge 
                               variant={fieldRole === 'metric' ? 'default' : 'outline'}
                               className="text-xs"
                             >
                               {fieldRole === 'metric' ? <Sigma className="w-3 h-3" /> : <Filter className="w-3 h-3" />}
                             </Badge>
                             {fieldRole === 'metric' && (
                               <DropdownMenu>
                                 <DropdownMenuTrigger asChild>
                                   <Badge variant="outline" className="text-xs cursor-pointer flex items-center gap-1 hover:bg-muted">
                                     {getAggregationOptions(column.dataType, column.name).find(opt => opt.value === getFieldAggregation(table.name, column.name))?.label || 'Contagem'}
                                     <ChevronDown className="w-3 h-3" />
                                   </Badge>
                                 </DropdownMenuTrigger>
                                 <DropdownMenuContent align="start" className="min-w-[120px] bg-white dark:bg-gray-800 border shadow-lg z-50">
                                   {getAggregationOptions(column.dataType, column.name).map((option) => (
                                     <DropdownMenuItem
                                       key={option.value}
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         console.log('🔄 List view - Changing aggregation for', column.name, 'to', option.value);
                                         const field = selectedFields.find(f => f.tableName === table.name && f.columnName === column.name);
                                         if (field) {
                                           onFieldAggregationChange(field, option.value);
                                         }
                                       }}
                                       className={`${getFieldAggregation(table.name, column.name) === option.value ? 'bg-muted' : ''} hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer`}
                                     >
                                       {option.label}
                                       {getFieldAggregation(table.name, column.name) === option.value && <span className="ml-2">✓</span>}
                                     </DropdownMenuItem>
                                   ))}
                                 </DropdownMenuContent>
                               </DropdownMenu>
                             )}
                           </div>
                         )}
                       </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Select tables to see available fields</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}