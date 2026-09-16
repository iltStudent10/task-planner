import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const portsToTry = [3000, 3001];

const authProbe = async (port) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1000);

    const response = await fetch(`http://localhost:${port}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Probe User', email: 'probe@example.com', password: 'password123' }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    return [200, 201, 400, 409].includes(response.status);
  } catch {
    return false;
  }
};

const detectApiTarget = async () => {
  const envPort = Number(process.env.VITE_API_PORT);
  if (envPort) {
    return `http://localhost:${envPort}`;
  }

  for (const port of portsToTry) {
    if (await authProbe(port)) {
      return `http://localhost:${port}`;
    }
  }

  return 'http://localhost:3000';
};

const apiTarget = await detectApiTarget();

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': apiTarget,
    },
  },
});
