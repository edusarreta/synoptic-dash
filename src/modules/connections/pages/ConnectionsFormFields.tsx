import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface FormFieldsProps {
  type: string;
  values: any;
  onChange: (field: string, value: any) => void;
}

export function ConnectionFormFields({ type, values, onChange }: FormFieldsProps) {
  const renderSqlFields = () => (
    <>
      <div className="grid gap-2">
        <Label htmlFor="host">Host</Label>
        <Input
          id="host"
          value={values.host || ''}
          onChange={(e) => onChange('host', e.target.value)}
          placeholder="localhost"
        />
      </div>
      
      <div className="grid gap-2">
        <Label htmlFor="port">Porta</Label>
        <Input
          id="port"
          type="number"
          value={values.port || 5432}
          onChange={(e) => onChange('port', parseInt(e.target.value) || 5432)}
        />
      </div>
      
      <div className="grid gap-2">
        <Label htmlFor="database">Banco de Dados</Label>
        <Input
          id="database"
          value={values.database_name || ''}
          onChange={(e) => onChange('database_name', e.target.value)}
          placeholder="meubank"
        />
      </div>
      
      <div className="grid gap-2">
        <Label htmlFor="username">Usuário</Label>
        <Input
          id="username"
          value={values.username || ''}
          onChange={(e) => onChange('username', e.target.value)}
          placeholder="postgres"
        />
      </div>
      
      <div className="grid gap-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          value={values.password || ''}
          onChange={(e) => onChange('password', e.target.value)}
          placeholder="Deixe vazio para manter a atual"
        />
      </div>
      
      <div className="grid gap-2">
        <Label htmlFor="ssl_mode">SSL</Label>
        <Select value={values.ssl_mode || 'require'} onValueChange={(value) => onChange('ssl_mode', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="require">Obrigatório</SelectItem>
            <SelectItem value="prefer">Preferir</SelectItem>
            <SelectItem value="disable">Desabilitado</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );

  const renderSupabaseApiFields = () => (
    <>
      <div className="grid gap-2">
        <Label htmlFor="supabase_url">URL do Supabase</Label>
        <Input
          id="supabase_url"
          value={values.supabase_url || ''}
          onChange={(e) => onChange('supabase_url', e.target.value)}
          placeholder="https://xyz.supabase.co"
        />
      </div>
      
      <div className="grid gap-2">
        <Label htmlFor="supabase_key">Chave do Supabase</Label>
        <Input
          id="supabase_key"
          type="password"
          value={values.supabase_key || ''}
          onChange={(e) => onChange('supabase_key', e.target.value)}
          placeholder="Chave anon ou service_role"
        />
      </div>
      
      <div className="grid gap-2">
        <Label htmlFor="schema_default">Schema Padrão</Label>
        <Input
          id="schema_default"
          value={values.schema_default || 'public'}
          onChange={(e) => onChange('schema_default', e.target.value)}
          placeholder="public"
        />
      </div>
    </>
  );

  const renderRestFields = () => (
    <>
      <div className="grid gap-2">
        <Label htmlFor="base_url">URL Base</Label>
        <Input
          id="base_url"
          value={values.base_url || ''}
          onChange={(e) => onChange('base_url', e.target.value)}
          placeholder="https://api.exemplo.com"
        />
      </div>
      
      <div className="grid gap-2">
        <Label htmlFor="auth_type">Tipo de Autenticação</Label>
        <Select value={values.auth_type || 'none'} onValueChange={(value) => onChange('auth_type', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhuma</SelectItem>
            <SelectItem value="bearer">Bearer Token</SelectItem>
            <SelectItem value="header">Header Customizado</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {values.auth_type !== 'none' && (
        <div className="grid gap-2">
          <Label htmlFor="auth_token">Token</Label>
          <Input
            id="auth_token"
            type="password"
            value={values.auth_token || ''}
            onChange={(e) => onChange('auth_token', e.target.value)}
            placeholder="Token de autenticação"
          />
        </div>
      )}
      
      <div className="grid gap-2">
        <Label htmlFor="headers_json">Headers Adicionais (JSON)</Label>
        <Textarea
          id="headers_json"
          value={values.headers_json || '{}'}
          onChange={(e) => onChange('headers_json', e.target.value)}
          placeholder='{"Content-Type": "application/json"}'
          rows={3}
        />
      </div>
    </>
  );

  switch (type) {
    case 'postgresql':
    case 'mysql':
      return renderSqlFields();
    case 'supabase_api':
      return renderSupabaseApiFields();
    case 'rest':
      return renderRestFields();
    default:
      return renderSqlFields();
  }
}