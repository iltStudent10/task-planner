const fs = require('fs/promises');
const path = require('path');
const bcrypt = require('bcryptjs');
const userStore = require('./data/userStore');
const policyStore = require('./data/policyStore');
const claimStore = require('./data/claimStore');

const writeJson = async (file, data) => {
  await fs.writeFile(file, JSON.stringify(data, null, 2));
};

const seed = async () => {
  const userSeed = [
    { name: 'Avery Admin', email: 'admin@policyclaims.local', password: 'AdminPass123', role: 'admin' },
    { name: 'Jordan Adjuster', email: 'adjuster@policyclaims.local', password: 'Adjuster123', role: 'adjuster' },
    { name: 'Morgan Adjuster', email: 'morgan@policyclaims.local', password: 'Adjuster456', role: 'adjuster' },
  ];

  const createdUsers = [];
  for (const user of userSeed) {
    const existing = await userStore.getByEmail(user.email);
    if (!existing) {
      const created = await userStore.create({
        name: user.name,
        email: user.email,
        password: user.password,
        role: user.role,
      });
      createdUsers.push(created);
    } else {
      createdUsers.push(existing);
    }
  }

  const policySeed = [
    { policyNumber: 'AUTO-1001', holderName: 'Alice Johnson', type: 'auto', premium: 1250, status: 'active', effectiveDate: '2025-01-01', expirationDate: '2026-01-01', owner: createdUsers[0].id },
    { policyNumber: 'HOME-2002', holderName: 'Brian Smith', type: 'home', premium: 2200, status: 'active', effectiveDate: '2024-06-01', expirationDate: '2027-06-01', owner: createdUsers[1].id },
    { policyNumber: 'LIFE-3003', holderName: 'Carmen Lee', type: 'life', premium: 890, status: 'expired', effectiveDate: '2022-05-10', expirationDate: '2024-05-10', owner: createdUsers[0].id },
    { policyNumber: 'AUTO-1004', holderName: 'Derek Wilson', type: 'auto', premium: 1750, status: 'cancelled', effectiveDate: '2023-02-15', expirationDate: '2024-02-15', owner: createdUsers[2].id },
    { policyNumber: 'HOME-2005', holderName: 'Eve Brown', type: 'home', premium: 3100, status: 'active', effectiveDate: '2025-03-01', expirationDate: '2026-03-01', owner: createdUsers[1].id },
  ];

  const createdPolicies = [];
  for (const policy of policySeed) {
    const existing = await policyStore.getByNumber(policy.policyNumber);
    if (!existing) {
      createdPolicies.push(await policyStore.create(policy));
    } else {
      createdPolicies.push(existing);
    }
  }

  const claimSeed = [
    { claimNumber: 'CLM-1001', policy: createdPolicies[0].id, description: 'Minor collision on freeway', incidentDate: '2025-02-20', amount: 4200, status: 'submitted', assignedTo: createdUsers[1].id, notes: [{ text: 'Claim logged by front desk', author: createdUsers[1].id }] },
    { claimNumber: 'CLM-1002', policy: createdPolicies[1].id, description: 'Roof leak after hail storm', incidentDate: '2025-04-13', amount: 6800, status: 'under-review', assignedTo: createdUsers[1].id, notes: [{ text: 'Awaiting inspection', author: createdUsers[0].id }] },
    { claimNumber: 'CLM-1003', policy: createdPolicies[2].id, description: 'Life policy beneficiary update', incidentDate: '2024-09-05', amount: 15000, status: 'approved', assignedTo: createdUsers[0].id, notes: [{ text: 'Approved by underwriting', author: createdUsers[0].id }] },
    { claimNumber: 'CLM-1004', policy: createdPolicies[3].id, description: 'Windshield cracked in parking lot', incidentDate: '2024-11-11', amount: 820, status: 'denied', assignedTo: createdUsers[2].id, notes: [] },
    { claimNumber: 'CLM-1005', policy: createdPolicies[4].id, description: 'Water damage from burst pipe', incidentDate: '2025-06-09', amount: 4100, status: 'closed', assignedTo: createdUsers[2].id, notes: [{ text: 'Repair paid in full', author: createdUsers[2].id }] },
  ];

  for (const claim of claimSeed) {
    const existing = await claimStore.getByNumber(claim.claimNumber);
    if (!existing) {
      await claimStore.create(claim);
    }
  }

  console.log('Seed data loaded successfully');
};

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
