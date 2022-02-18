'use strict';

const shell = require('shelljs');
const path = require('path');
const rootDir = process.cwd();
const fs = require('fs-extra');

const silent = true;
shell.config.verbose = !silent;
shell.config.silent = silent;

module.exports = {

  setupStage: (stageName) => {
    const stagePath = path.join(rootDir, stageName);
    fs.ensureDirSync(stagePath);
    shell.cd(stagePath);
  },

  setupStageWithFixture: (stageName, fixtureName) => {
    const stagePath = path.join(rootDir, stageName);

    fs.copySync(path.join(rootDir, 'test', 'fixtures', fixtureName), stagePath);
    fs.ensureSymlinkSync(
      path.join(rootDir, 'node_modules'),
      path.join(stagePath, 'node_modules')
    );
    fs.ensureSymlinkSync(
      path.join(rootDir, 'packages'),
      path.join(stagePath, 'packages')
    );
    shell.cd(stagePath);
  },

  setupStageWithExample: (
    stageName,
    exampleName,
    symlink=true,
    yarnlink=false,
    install=false,
    test=false
  ) => {
    const stagePath = path.join(rootDir, stageName);
    const packagesPath = path.join(rootDir, 'packages');

    fs.copySync(path.join(rootDir, 'examples', exampleName), stagePath);
    if (symlink) {
      fs.ensureSymlinkSync(
        path.join(rootDir, 'node_modules'),
        path.join(stagePath, 'node_modules')
      );
      fs.ensureSymlinkSync(
        packagesPath,
        path.join(stagePath, 'packages')
      );
    }
    if (yarnlink) {
      const dirs = fs.readdirSync(packagesPath, { withFileTypes:true })
        .map(dir=>{ return dir.isDirectory ? dir.name: dir });
      for (const packageName of dirs) {
        const packagePath = path.join(packagesPath, packageName);
        shell.cd(packagePath);
        shell.exec(`yarn link`);
        shell.cd(stagePath);
        shell.exec(`yarn link ${packageName}`);
        console.log(`Linked ${packageName} to ${stagePath}`);
      }
    }
    shell.cd(stagePath);
    if (install) {
      shell.exec("NODE_ENV=development yarn install");
    }
    if (test) {
      shell.exec("CI=true yarn run test");
    }
    return stagePath;
  },

  teardownStage: stageName => {
    shell.cd(rootDir);
    fs.removeSync(path.join(rootDir, stageName));
  },

  rootDir,
};
