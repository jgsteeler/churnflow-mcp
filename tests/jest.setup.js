// Jest global setup for test database
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const testConfigPath = path.resolve(__dirname, 'churn.config.test.json');
const testCollections = '/tmp/churn-test/Collections';
const testTracking = '/tmp/churn-test/Tracking';
const testDbFile = path.resolve(__dirname, '../../test-churnflow.db');

function deleteFolderRecursive(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach((file) => {
      const curPath = path.join(folderPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(folderPath);
  }
}

module.exports = async () => {
  // Set environment variables for test config and test DB
  process.env.CHURN_CONFIG = testConfigPath;
  process.env.CHURN_DB_PATH = path.resolve(__dirname, '../../test-churnflow.db');

  // Remove test database and folders before setup
  if (fs.existsSync(testDbFile)) {
    fs.unlinkSync(testDbFile);
  }
  deleteFolderRecursive(testCollections);
  deleteFolderRecursive(testTracking);

  // Ensure test directories exist
  fs.mkdirSync(testCollections, { recursive: true });
  fs.mkdirSync(testTracking, { recursive: true });

  // Run db setup script
  try {
    execSync('npm run db:setup', { stdio: 'inherit', env: { ...process.env, CHURN_DB_PATH: path.resolve(__dirname, '../../test-churnflow.db') } });
  } catch (err) {
    console.error('Failed to set up test database:', err);
    throw err;
  }
};
