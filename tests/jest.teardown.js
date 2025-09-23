// Jest global teardown for test database
const fs = require('fs');
const path = require('path');

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
  // Remove test database file
  if (fs.existsSync(testDbFile)) {
    fs.unlinkSync(testDbFile);
  }
  // Remove test directories
  deleteFolderRecursive(testCollections);
  deleteFolderRecursive(testTracking);
};
