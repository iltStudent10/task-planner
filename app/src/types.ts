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

export interface ClaimNote {
  author?: string;
  text: string;
  createdAt?: string;
}

export interface Claim {
  id?: string;
  claimNumber?: string;
  policy: string;
  description: string;
  incidentDate: string;
  amount: number;
  status: 'submitted' | 'under-review' | 'approved' | 'denied' | 'closed';
  assignedTo?: string;
  notes?: ClaimNote[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardSummary {
  totalPolicies: number;
  totalClaims: number;
  totalUsers: number;
  totalClaimAmount: number;
  claimsByStatus: Record<string, number>;
  policiesByType: Record<string, number>;
  recentClaims: Claim[];
}
