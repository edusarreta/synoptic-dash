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
        <Label htmlFor="project_url">Project URL</Label>
        <Input
          id="project_url"
          value={values.project_url || ''}
          onChange={(e) => onChange('project_url', e.target.value)}
          placeholder="https://xxxx.supabase.co"
        />
        <p className="text-xs text-muted-foreground">
          URL do projeto Supabase (ex: https://xxx.supabase.co)
        </p>
      </div>
      
      <div className="grid gap-2">
        <Label htmlFor="anon_key">Anon Key (Public)</Label>
        <Input
          id="anon_key"
          value={values.anon_key || ''}
          onChange={(e) => onChange('anon_key', e.target.value)}
          placeholder="Chave pública anon"
        />
        <p className="text-xs text-muted-foreground">
          Chave pública para autenticação (apikey header)
        </p>
      </div>
      
      <div className="grid gap-2">
        <Label htmlFor="service_role">Service Role (Secret)</Label>
        <Input
          id="service_role"
          type="password"
          value={values.service_role || ''}
          onChange={(e) => onChange('service_role', e.target.value)}
          placeholder="Chave service_role (secreto)"
        />
        <p className="text-xs text-muted-foreground">
          Chave secreta service_role para operações avançadas
        </p>
      </div>
      
      <div className="grid gap-2">
        <Label htmlFor="schema">Schema</Label>
        <Input
          id="schema"
          value={values.schema || 'public'}
          onChange={(e) => onChange('schema', e.target.value)}
          placeholder="public"
        />
        <p className="text-xs text-muted-foreground">
          Schema PostgreSQL (default: public). O catálogo e previews usam a REST API do PostgREST.
        </p>
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