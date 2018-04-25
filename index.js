/**
 * module requirements
 */
const fs        = require('fs');
const path      = require('path');
const commander = require('commander');
const project   = require('./package.json');

/**
 * shared variables
 */
const WORK_DIR     = process.cwd();
const SCRIPT_DIR   = __dirname;
const TEMPLATE_DIR = path.join(SCRIPT_DIR, 'templates');

/**
 * CLI arguments
 */
ParseArgs : {
  commander
    .version(project.version)
    .option('-n, --project-name [name]', 'project name',                  'my-typescript-project')
    .option('-d, --destination [dest]',  'project destination directory', process.cwd())
    .option('--lint-rule',               'base lint rule',                'tslint-config-airbnb')
    .option('--no-test',                 'exclude unit test')
    .option('--no-lint',                 'exclude tslint')
    .option('--no-docs',                 'exclude typedoc')
    .option('--skip-install',            'skip node module installation')
    .option('--skip-validation',         'skip generated project validation')
    .parse(process.argv);

  if (!path.isAbsolute(commander.destination)) {
    commander.destination = path.join(process.cwd(), commander.destination);
  }
}

/**
 * main
 */
(function(){
  function loadTemplate(path, toJson) {
    let content = fs.fileReadSync(path);
    content = content.replace(/::PROJECT_NAME::/g, commander.projectName);
    return (toJson) ? JSON.parse(content) : content;
  }

  function applyTemplate(defaultTemplatePath, destination, optionalTemplatePaths = []) {
    const isJson = (path.extname(defaultTemplatePath) === '.json');
    const template = loadTemplate(defaultTemplatePath, isJson);

    if (isJson) {
      for (let i = 0; i < optionalTemplatePaths.length; i++) {
        const optionalTemplate = loadTemplate(optionalTemplatePaths[i], isJson);
        Object.assign(template, optionalTemplate);
      }
    }

    fs.writeFileSync(destination, (isJson) ? JSON.stringify(jsonObj, null, 2) : template);
  }

  function run() {
    if (!fs.existsSync(commander.destination)) {
      fs.mkdirSync(commander.destination);
    }

    process.chdir(commander.destination);

    commander.command('npm init -y');

    MergeTemplates : {
      PackageJson : {
        const defaultTemplatePath = path.join(TEMPLATE_DIR, 'package.json', 'default.json');
        const defaultTemplate     = loadTemplate(defaultTemplatePath, true);

        const variants = [];
        if (!commander.noTest) variants.push('test');
        if (!commander.noLint) variants.push('lint');
        if (!commander.noDocs) variants.push('docs');

        const templateKeys = Object.keys(defaultTemplate);

        for (let i = 0; i < variants.length; i++) {
          const variant = variants[i];

          const templatePath = path.join(TEMPLATE_DIR, 'package.json', `${variants[i]}.json`);
          const template = loadTemplate(templatePath, true);

          for (let j = 0; j < templateKeys.length; j++) {
            const key = templateKeys[j];
            Object.assign(defaultTemplate[key], template[key]);
          }
        }

        const packageJsonPath = path.join(commander.destination, 'package.json');
        const packageJson     = loadTemplate(packageJsonPath, true);

        for (let i = 0; i < templateKeys.length; i++) {
          Object.assign(packageJson[key], defaultTemplate[key]);
        }

        jsonObj.name = commander.projectName;
        jsonObj.main = "lib/index.js";

        fs.writeFileSync(packageJsonPath, JSON.stringify(jsonObj, null, 2));
      }

      TsConfig : {
        const optionalTemplates = [];
        if (!commander.noDocs) {
          optionalTemplates.push(path.join(TEMPLATE_DIR, 'tsconfig.json', 'docs.json'));
        }

        applyTemplate(
          path.join(TEMPLATE_DIR, 'tsconfig.json', 'default.json'),
          path.join(commander.destination, 'tsconfig.json'),
          optionalTemplates
        );
      }

      WebPack : {
        applyTemplate(
          path.join(TEMPLATE_DIR, 'webpack.config.js', 'default.js'),
          path.join(commander.destination, 'webpack.config.js')
        );
      }

      Src : {
        applyTemplate(
          path.join(TEMPLATE_DIR, 'src', 'default.ts'),
          path.join(commander.destination, 'src', 'index.ts')
        );
      }

      Tests : if (!commander.noTest) {
        Unit : {
          const testDir = path.join(commander.destination, 'test');
          fs.mkdirSync(testDir);

          applyTemplate(
            path.join(TEMPLATE_DIR, 'test', 'index.js'),
            path.join(testDir, 'index.js')
          );
        }
        Karma : {
          applyTemplate(
            path.join(TEMPLATE_DIR, 'karma.conf.js', 'default.js'),
            path.join(commander.destination, 'karma.conf.js')
          );
        }
      }
    }

    Install : if (!commander.skipInstall) {
      commander.command('npm i');
    }

    TestRun : if (!commander.skipValidation) {
      commander.command('npm run workflow:build');

      if (!commander.noTest) {
        commander.command('npm run test:unit');
      }
      if (!commander.noLint) {
        commander.command('npm run test:lint');
      }
      if (!commander.noDocs) {
        commander.command('npm run build:docs');
      }
    }
  }
})();
