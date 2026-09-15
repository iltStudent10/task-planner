const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

const requestLogger = require('./middleware/requestLogger');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const taskRoutes = require('./routes/taskRoutes');
const store = require('./data/taskStore');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.get('/health', async (req, res) => {
  res.json({
    status: 'ok',
    service: 'task-manager-api',
    dataFile: path.basename(store.dataFilePath),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/summary', async (req, res, next) => {
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

app.use('/api/tasks', taskRoutes);
app.use(notFound);
app.use(errorHandler);

const start = async () => {
  await store.seedIfEmpty();
  app.listen(port, () => {
    console.log(`Task Manager API listening on port ${port}`);
  });
};

start();
