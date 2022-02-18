'use strict';

const execa = require('execa');
const updateSection = require('update-section');
const fs = require('fs-extra');
const path = require('path');

const rootDir = process.cwd();

var startInstall = '<!-- START install generated instructions please keep comment here to allow auto update -->\n' +
            '<!-- DON\'T EDIT THIS SECTION, INSTEAD RE-RUN yarn update-examples TO UPDATE -->'
  , endInstall   = '<!-- END install generated instructions please keep comment here to allow auto update -->'


function matchesStartInstall(line) {
  return /<!-- START install /.test(line);
}

function matchesEndInstall(line) {
  return (/<!-- END install /).test(line);
}

function updateInstallSection(example, readme, branch) {
  fs.readFile(readme).then(content => {
    let update = '';
    if (['master', 'canary', 'three'].includes(branch)) {
      const tag = branch !== 'master' ? `@${branch}` : '';
      const info = branch !== 'master' ? `\nThis is the ${branch} release documentation for this example\n\n` : '';
      update = `${info}Create and start the example:\n\n`;
      update += `\`\`\`bash\nnpx create-razzle-app${tag} --example ${example} ${example}\n\n`;
      update += `cd ${example}\nyarn start\n\`\`\`\n`;
    } else {
      update = '\nThis is the development documentation for this example\n\nClone the `razzle` repository:\n\n';
      update += `\`\`\`bash\ngit clone https://github.com/jaredpalmer/razzle.git\n\n`;
      update += `cd razzle\nyarn install --frozen-lockfile --ignore-engines --network-timeout 30000\n\`\`\`\n\n`;
      update += `Create and start the example:\n\n`;
      update += `\`\`\`bash\nnode -e 'require("./test/fixtures/util").setupStageWithExample("${example}", "${example}", symlink=false, yarnlink=true, install=true, test=false);'\n\n`;
      update += `cd ${example}\nyarn start\n\`\`\`\n`;
    }
    const contentString = content.toString();
    if (matchesStartInstall(contentString)) {
      const updated = updateSection(contentString, startInstall+update+endInstall, matchesStartInstall, matchesEndInstall);
      return fs.writeFile(readme, updated);
    }
  })
}

function updatePackageJson(example, packageJson, branch) {
  fs.pathExists(packageJson).then(exists => {
    if (exists) {
      fs.readFile(packageJson).then(content => {
        const tag = branch !== 'master' ? branch : 'latest';
        const contentString = content.toString();
        const updated = contentString.replace(/("razzle(-plugin-\w*)?": ")(three|canary|latest)(")/g, '$1' + tag + '$4');
        return fs.writeFile(packageJson, updated);
      })
    }
  })
}

execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {shell: true}).then(({stdout}) => {
  const branch = stdout.split('\n')[0];
  fs.readdir(path.join(rootDir, 'examples'), {withFileTypes: true}).then(items => {
    return items
      .filter(item => item.isDirectory())
      .map(item => {
        updateInstallSection(
          item.name, path.join(rootDir, 'examples', item.name, 'README.md'), branch);
        updatePackageJson(
          item.name, path.join(rootDir, 'examples', item.name, 'package.json'), branch);
      })
  })

  const loadExamplePath = 'packages/create-razzle-app/lib/utils/load-example.js';
  fs.readFile(loadExamplePath).then(content => {
    const updated = content.toString().replace(/(?=const branch.*?yarn update-examples)(.*?)'.*?'/, '$1\'' + branch + '\'');
    return fs.writeFile(loadExamplePath, updated);
  })

  const  installExamplePath = 'packages/create-razzle-app/lib/index.js';
  fs.readFile(installExamplePath).then(content => {
    const updated = content.toString().replace(/(?=const branch.*?yarn update-examples)(.*?)'.*?'/, '$1\'' + branch + '\'');
    return fs.writeFile(installExamplePath, updated);
  })
});
