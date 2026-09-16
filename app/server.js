const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const requestLogger = require('./middleware/requestLogger');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const authenticate = require('./middleware/authenticate');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const store = require('./data/taskStore');
const userStore = require('./data/userStore');

const app = express();
const configuredPort = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.get('/health', async (req, res) => {
  res.json({
    status: 'ok',
    service: 'task-manager-api',
    storage: store.hasMongo() ? 'mongodb' : 'json-file',
    dataFile: path.basename(store.dataFilePath),
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);

app.get('/api/summary', authenticate, async (req, res, next) => {
  try {
    const tasks = await store.getAll();
    const completedTasks = tasks.filter((task) => task.completed).length;
    const categories = [...new Set(tasks.map((task) => task.category || 'General'))].sort();

    res.json({
      name: 'Task Manager App',
      totalTasks: tasks.length,
      completedTasks,
      openTasks: tasks.length - completedTasks,
      categories,
    });
  } catch (error) {
    next(error);
  }
});

app.use('/api/tasks', authenticate, taskRoutes);
app.use(notFound);
app.use(errorHandler);

const start = async (port = configuredPort) => {
  await Promise.all([store.seedIfEmpty(), userStore.seedIfEmpty()]);

  const server = app.listen(port, () => {
    console.log(`Task Manager API listening on port ${port}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && !process.env.PORT && port < 3010) {
      console.warn(`Port ${port} is busy, retrying on ${port + 1}`);
      start(port + 1).catch((startError) => {
        console.error(startError);
        process.exit(1);
      });
      return;
    }

    console.error(error);
    process.exit(1);
  });
};

start();
