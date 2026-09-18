const request = require('supertest');
const { app } = require('../server');
const userStore = require('../data/userStore');
const policyStore = require('../data/policyStore');

const uniqueEmail = (prefix = 'user') => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;

const registerUser = async (email = uniqueEmail('register')) => {
  const payload = {
    name: 'Test User',
    email,
    password: 'Password123',
    role: 'adjuster',
  };

  const res = await request(app).post('/api/auth/register').send(payload);
  return { payload, res };
};

describe('Policy Claims API', () => {
  beforeEach(async () => {
    await Promise.all([userStore.seedIfEmpty(), policyStore.seedIfEmpty()]);
  });

  it('register returns a token', async () => {
    const email = uniqueEmail('register-token');
    const res = await request(app).post('/api/auth/register').send({
      name: 'Token User',
      email,
      password: 'Password123',
      role: 'admin',
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe(email);
  });

  it('login with wrong password returns 401', async () => {
    const email = uniqueEmail('login-error');
    await request(app).post('/api/auth/register').send({
      name: 'Login Error User',
      email,
      password: 'Password123',
      role: 'adjuster',
    });

    const res = await request(app).post('/api/auth/login').send({
      email,
      password: 'WrongPassword123',
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid|password/i);
  });

  it('create claim returns 201', async () => {
    const { res: registerRes } = await registerUser(uniqueEmail('claim-creator'));
    const token = registerRes.body.token;

    const policyRes = await request(app)
      .post('/api/policies')
      .set('Authorization', `Bearer ${token}`)
      .send({
        policyNumber: `AUTO-${Date.now()}`,
        holderName: 'Claim Test Holder',
        type: 'auto',
        premium: 1800,
        status: 'active',
        effectiveDate: '2025-01-01',
        expirationDate: '2026-01-01',
      });

    const claimRes = await request(app)
      .post('/api/claims')
      .set('Authorization', `Bearer ${token}`)
      .send({
        claimNumber: `CLM-${Date.now()}`,
        policy: policyRes.body.policy.id,
        incidentDate: '2025-05-12',
        amount: 2500,
        description: 'Front bumper damage after minor accident',
        status: 'submitted',
      });

    expect(claimRes.status).toBe(201);
    expect(claimRes.body.claim).toBeTruthy();
    expect(claimRes.body.claim.description).toContain('Front bumper');
  });

  it('get claims without auth returns 401', async () => {
    const res = await request(app).get('/api/claims');
    expect(res.status).toBe(401);
  });

  it('create claim with missing fields returns 400', async () => {
    const { res: registerRes } = await registerUser(uniqueEmail('claim-missing'));
    const token = registerRes.body.token;

    const res = await request(app)
      .post('/api/claims')
      .set('Authorization', `Bearer ${token}`)
      .send({
        description: 'Missing required claim details',
      });

    expect(res.status).toBe(400);
  });
});
