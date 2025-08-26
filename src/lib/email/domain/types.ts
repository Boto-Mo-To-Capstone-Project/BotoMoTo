/**
 * Domain and DNS configuration types for email system
 */

export interface DnsRecord {
  type: 'TXT' | 'CNAME' | 'MX';
  name: string;
  value: string;
  priority?: number;
  ttl?: number;
}

export interface DkimSettings {
  selector: string;
  publicKey: string;
  privateKey?: string;
}

export interface DomainSettings {
  domain: string;
  provider: 'resend' | 'ses' | 'gmail';
  verified: boolean;
  dkimEnabled: boolean;
  spfEnabled: boolean;
  dmarcEnabled: boolean;
  // DNS records to be set up
  dnsRecords: DnsRecord[];
  // Provider-specific settings
  providerSettings: {
    resend?: {
      domainId: string;
      apiKey: string;
    };
    ses?: {
      region: string;
      identityArn?: string;
      configurationSetName?: string;
    };
    gmail?: {
      // Gmail uses OAuth2, no domain-specific setup
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface DomainVerificationResult {
  verified: boolean;
  dkimVerified: boolean;
  spfVerified: boolean;
  dmarcVerified: boolean;
  errors: string[];
  warnings: string[];
}
