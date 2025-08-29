import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Database, Table, Columns, RefreshCw } from "lucide-react";
import { DatabaseTable, DataConnection } from "@/hooks/useDatabase";

interface TableSelectorProps {
  connections: DataConnection[];
  tables: DatabaseTable[];
  selectedConnection: string;
  selectedTables: string[];
  loading: boolean;
  onConnectionChange: (connectionId: string) => void;
  onTableToggle: (tableName: string) => void;
  onRefreshTables: () => void;
}

export function TableSelector({
  connections,
  tables,
  selectedConnection,
  selectedTables,
  loading,
  onConnectionChange,
  onTableToggle,
  onRefreshTables
}: TableSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTables = tables.filter(table =>
    table.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedConnection_ = connections.find(c => c.id === selectedConnection);

  return (
    <Card className="glass-card border-0 shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Data Sources
        </CardTitle>
        <CardDescription>
          Select database connection and tables for your chart
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Selection */}
        <div className="space-y-2">
          <Label>Database Connection</Label>
          <Select value={selectedConnection} onValueChange={onConnectionChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a data connection" />
            </SelectTrigger>
            <SelectContent>
              {connections.map((connection) => (
                <SelectItem key={connection.id} value={connection.id}>
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    {connection.name} ({connection.connection_type})
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {connections.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No active connections found. Add a data source first.
            </p>
          )}
        </div>

        {/* Tables Section */}
        {selectedConnection && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Table className="w-4 h-4" />
                Tables ({tables.length})
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={onRefreshTables}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {selectedConnection && selectedConnection_ && (
              <div className="text-sm text-muted-foreground">
                Database: {selectedConnection_.database_name || 'Loading...'}
              </div>
            )}

            {/* Selected Tables Summary */}
            {selectedTables.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs">Selected Tables:</Label>
                <div className="flex flex-wrap gap-1">
                  {selectedTables.map(tableName => (
                    <Badge key={tableName} variant="secondary" className="text-xs">
                      {tableName}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Search */}
            <div>
              <input
                type="text"
                placeholder="Search tables..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-md bg-background"
              />
            </div>

            {/* Tables List */}
            <div key={`tables-${selectedConnection}`} className="max-h-64 overflow-y-auto space-y-2 border rounded-md p-2">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredTables.length > 0 ? (
                filteredTables.map((table) => (
                  <div
                    key={`${selectedConnection}-${table.name}`}
                    className="flex items-center space-x-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
                    onClick={() => onTableToggle(table.name)}
                  >
                    <Checkbox
                      checked={selectedTables.includes(table.name)}
                      onChange={() => onTableToggle(table.name)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{table.name}</span>
                        <Badge 
                          variant={table.type === 'BASE TABLE' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {table.type === 'BASE TABLE' ? 'Table' : 'View'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Columns className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {table.columns.length} columns
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : tables.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No tables found in this database</p>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-sm">No tables match your search</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}