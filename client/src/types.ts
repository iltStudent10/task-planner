export type UserRole = 'adjuster' | 'admin';

export interface User {
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
}

export interface Policy {
  id?: string;
  policyNumber: string;
  holderName: string;
  type: 'auto' | 'home' | 'life';
  premium: number;
  status: 'active' | 'expired' | 'cancelled';
  effectiveDate?: string;
  expirationDate?: string;
  owner?: string;
  createdAt?: string;
}

export interface Note {
  id?: string;
  author?: string;
  text: string;
  createdAt?: string;
}

export interface Claim {
  id?: string;
  claimNumber: string;
  policy: string;
  description: string;
  incidentDate: string;
  amount: number;
  status: 'submitted' | 'under-review' | 'approved' | 'denied' | 'closed';
  assignedTo?: string;
  notes?: Note[];
  createdAt?: string;
}

export interface DashboardStats {
  name?: string;
  totalPolicies: number;
  totalClaims: number;
  totalUsers?: number;
  totalClaimAmount?: number;
  policyStatuses?: Record<string, number>;
  claimStatuses?: Record<string, number>;
  recentClaims?: Claim[];
}

export interface AuthSession {
  user: User;
  token: string;
}
