import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Palette, Shield, Globe, Eye } from 'lucide-react';
import { useAccountSettings } from '@/hooks/useAccountSettings';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/components/ui/use-toast';

export function EnterpriseSettings() {
  const { permissions } = usePermissions();
  const { settings, loading, updateSettings } = useAccountSettings();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  if (!permissions?.canManageUsers) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
        <p className="text-muted-foreground">
          Only administrators can access enterprise settings.
        </p>
      </div>
    );
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 2MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      // In a real implementation, you would upload to Supabase Storage
      // For now, we'll simulate the upload
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockUrl = `https://example.com/logos/${file.name}`;
      await updateSettings({ logo_url: mockUrl });
      
      toast({
        title: "Logo uploaded",
        description: "Company logo has been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSettingUpdate = async (key: string, value: any) => {
    try {
      await updateSettings({ [key]: value });
    } catch (error) {
      console.error('Failed to update setting:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Enterprise Settings</h2>
        <p className="text-muted-foreground">
          Configure advanced settings for your organization
        </p>
      </div>

      <Tabs defaultValue="branding" className="space-y-4">
        <TabsList>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="domain">Custom Domain</TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Brand Customization
              </CardTitle>
              <CardDescription>
                Customize the appearance of your analytics platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  value={settings?.company_name || ''}
                  onChange={(e) => handleSettingUpdate('company_name', e.target.value)}
                  placeholder="Enter your company name"
                />
              </div>

              <div className="space-y-2">
                <Label>Company Logo</Label>
                <div className="flex items-center gap-4">
                  {settings?.logo_url && (
                    <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                      <img 
                        src={settings.logo_url} 
                        alt="Company logo" 
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  )}
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                      disabled={uploading}
                    />
                    <Button 
                      variant="outline" 
                      asChild
                      disabled={uploading}
                    >
                      <label htmlFor="logo-upload" className="cursor-pointer">
                        <Upload className="w-4 h-4 mr-2" />
                        {uploading ? 'Uploading...' : 'Upload Logo'}
                      </label>
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      Recommended: PNG or SVG, max 2MB
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary-color">Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="primary-color"
                      type="color"
                      value={settings?.primary_color || '#3b82f6'}
                      onChange={(e) => handleSettingUpdate('primary_color', e.target.value)}
                      className="w-12 h-10 p-1 rounded cursor-pointer"
                    />
                    <Input
                      value={settings?.primary_color || '#3b82f6'}
                      onChange={(e) => handleSettingUpdate('primary_color', e.target.value)}
                      placeholder="#3b82f6"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondary-color">Secondary Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="secondary-color"
                      type="color"
                      value={settings?.secondary_color || '#64748b'}
                      onChange={(e) => handleSettingUpdate('secondary_color', e.target.value)}
                      className="w-12 h-10 p-1 rounded cursor-pointer"
                    />
                    <Input
                      value={settings?.secondary_color || '#64748b'}
                      onChange={(e) => handleSettingUpdate('secondary_color', e.target.value)}
                      placeholder="#64748b"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>White Label Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Remove SynopticBI branding from the interface
                  </p>
                </div>
                <Switch
                  checked={settings?.white_label_enabled || false}
                  onCheckedChange={(checked) => handleSettingUpdate('white_label_enabled', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security & Authentication
              </CardTitle>
              <CardDescription>
                Configure enterprise security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Single Sign-On (SSO)</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable SSO authentication for your organization
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={settings?.sso_enabled ? "default" : "secondary"}>
                    {settings?.sso_enabled ? "Enabled" : "Disabled"}
                  </Badge>
                  <Switch
                    checked={settings?.sso_enabled || false}
                    onCheckedChange={(checked) => handleSettingUpdate('sso_enabled', checked)}
                  />
                </div>
              </div>

              {settings?.sso_enabled && (
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                  <div className="space-y-2">
                    <Label>SSO Provider</Label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={settings?.sso_provider || ''}
                      onChange={(e) => handleSettingUpdate('sso_provider', e.target.value)}
                    >
                      <option value="">Select a provider</option>
                      <option value="google">Google Workspace</option>
                      <option value="microsoft">Microsoft Azure AD</option>
                      <option value="okta">Okta</option>
                      <option value="saml">Generic SAML 2.0</option>
                    </select>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                      <strong>SSO Configuration:</strong> Contact our enterprise support team to complete SSO setup for your organization.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="domain" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Custom Domain
              </CardTitle>
              <CardDescription>
                Configure a custom domain for your analytics platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="custom-domain">Custom Domain</Label>
                <Input
                  id="custom-domain"
                  value={settings?.custom_domain || ''}
                  onChange={(e) => handleSettingUpdate('custom_domain', e.target.value)}
                  placeholder="analytics.yourcompany.com"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the subdomain where you want to host your analytics platform
                </p>
              </div>

              {settings?.custom_domain && (
                <div className="space-y-4">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <h4 className="font-medium mb-2">DNS Configuration Required</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Add the following CNAME record to your DNS provider:
                    </p>
                    <div className="bg-black text-green-400 p-3 rounded font-mono text-sm">
                      <div>Type: CNAME</div>
                      <div>Name: {settings.custom_domain.split('.')[0]}</div>
                      <div>Value: platform.synopticbi.com</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      <Eye className="w-3 h-3 mr-1" />
                      DNS Check Pending
                    </Badge>
                    <Button variant="outline" size="sm">
                      Verify DNS
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}