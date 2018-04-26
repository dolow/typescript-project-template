/**
 * module requirements
 */
const fs            = require('fs');
const path          = require('path');
const child_process = require('child_process');
const commander     = require('commander');
const project       = require('./package.json');

/**
 * shared variables
 */
const SCRIPT_DIR   = __dirname;
const TEMPLATE_DIR = path.join(SCRIPT_DIR, 'templates');
const NPM_COMMAND  = 'npm';

/**
 * CLI arguments
 */
ParseArgs : {
  commander
    .version(project.version)
    .option('-n, --project-name [name]', 'project name',                  'my-typescript-project')
    .option('-d, --destination [dest]',  'project destination directory')
    .option('--lint-rule [rule]',        'base lint rule',                'tslint-config-airbnb')
    .option('--no-test',                 'exclude unit test')
    .option('--no-lint',                 'exclude tslint')
    .option('--no-docs',                 'exclude typedoc')
    .option('--skip-install',            'skip node module installation')
    .option('--skip-validation',         'skip generated project validation')
    .parse(process.argv);

  if (!commander.destination) {
    commander.destination = path.join(process.cwd(), commander.projectName);
  }
  if (!path.isAbsolute(commander.destination)) {
    commander.destination = path.join(process.cwd(), commander.destination);
  }
}

/**
 * main
 */
const main = (function(){
  const loadTemplate = function(path, toJson) {
    let content = fs.readFileSync(path).toString();
    content = content.replace(/::PROJECT_NAME::/g, commander.projectName);
    return (toJson) ? JSON.parse(content) : content;
  }

  const applyTemplate = function(defaultTemplatePath, destination, optionalTemplatePaths = []) {
    const isJson = (path.extname(defaultTemplatePath) === '.json');
    const template = loadTemplate(defaultTemplatePath, isJson);

    if (isJson) {
      for (let i = 0; i < optionalTemplatePaths.length; i++) {
        const optionalTemplate = loadTemplate(optionalTemplatePaths[i], isJson);
        Object.assign(template, optionalTemplate);
      }
    }

    fs.writeFileSync(destination, (isJson) ? JSON.stringify(template, null, 2) : template);
  }

  const run = function() {
    if (!fs.existsSync(commander.destination)) {
      console.log('creating destination directory', commander.destination);
      fs.mkdirSync(commander.destination);
    }

    console.log('changing working directory', commander.destination);
    process.chdir(commander.destination);

    InitProject : {
      console.log('initializing npm project');
      child_process.execSync(`${NPM_COMMAND} init -y`);
    }

    MergeTemplates : {
      PackageJson : {
        const defaultTemplatePath = path.join(TEMPLATE_DIR, 'package.json', 'default.json');
        const defaultTemplate     = loadTemplate(defaultTemplatePath, true);
        const templateKeys        = Object.keys(defaultTemplate);

        Load : {
          const variants = [];
          if (!commander.noTest) variants.push('test');
          if (!commander.noLint) variants.push('lint');
          if (!commander.noDocs) variants.push('docs');

          for (let i = 0; i < variants.length; i++) {
            const variant = variants[i];

            const templatePath = path.join(TEMPLATE_DIR, 'package.json', `${variants[i]}.json`);
            const template = loadTemplate(templatePath, true);

            for (let j = 0; j < templateKeys.length; j++) {
              const key = templateKeys[j];
              Object.assign(defaultTemplate[key], template[key]);
            }
          }
        }

        const packageJsonPath = path.join(commander.destination, 'package.json');
        const packageJson     = loadTemplate(packageJsonPath, true);

        Merge : {
          for (let i = 0; i < templateKeys.length; i++) {
            const key = templateKeys[i];
            if (!packageJson[key]) packageJson[key] = {};
            Object.assign(packageJson[key], defaultTemplate[key]);
          }
        }

        Default : {
          packageJson.name = commander.projectName;
          packageJson.main = "lib/index.js";
        }

        console.log('merging package.json templates');
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      }

      TsConfig : {
        const optionalTemplates = [];
        if (!commander.noDocs) {
          optionalTemplates.push(path.join(TEMPLATE_DIR, 'tsconfig.json', 'docs.json'));
        }

        console.log('merging tsconfig.json template');
        applyTemplate(
          path.join(TEMPLATE_DIR, 'tsconfig.json', 'default.json'),
          path.join(commander.destination, 'tsconfig.json'),
          optionalTemplates
        );
      }

      WebPack : {
        console.log('merging webpack.config.js template');
        applyTemplate(
          path.join(TEMPLATE_DIR, 'webpack.config.js', 'default.js'),
          path.join(commander.destination, 'webpack.config.js')
        );
      }

      Src : {
        const srcDir = path.join(commander.destination, 'src');
        console.log('creating src directory');
        fs.mkdirSync(srcDir);

        console.log('deploying default entry point');
        applyTemplate(
          path.join(TEMPLATE_DIR, 'src', 'default.ts'),
          path.join(commander.destination, 'src', 'index.ts')
        );
      }

      Tests : if (!commander.noTest) {
        Unit : {
          const testDir = path.join(commander.destination, 'test');
          console.log('creating test directory');
          fs.mkdirSync(testDir);

          console.log('deploying default unit test script');
          applyTemplate(
            path.join(TEMPLATE_DIR, 'test', 'index.js'),
            path.join(testDir, 'index.js')
          );
        }
        Karma : {
          console.log('deploying default karma.conf.js');
          applyTemplate(
            path.join(TEMPLATE_DIR, 'karma.conf.js', 'default.js'),
            path.join(commander.destination, 'karma.conf.js')
          );
        }
        Lint : {
          console.log('deploying default tslint.json');
          const defaultTemplatePath = path.join(TEMPLATE_DIR, 'tslint.json', 'default.json');
          const defaultTemplate = loadTemplate(defaultTemplatePath, true);
          if (commander.lintRule) {
            console.log(`setting base lint rule : ${commander.lintRule}`);
            defaultTemplate.extends.push(commander.lintRule);
          }

          console.log('deploying tslint.json templates');
          const destDir = path.join(commander.destination, 'tslint.json');
          fs.writeFileSync(destDir, JSON.stringify(defaultTemplate, null, 2));
        }
      }
    }

    Install : if (!commander.skipInstall) {
      console.log('installing node_modules');
      child_process.execSync(`${NPM_COMMAND} install`);

      if (commander.lintRule) {
        console.log(`installing desired lint extension : ${commander.lintRule}`);
        child_process.execSync(`${NPM_COMMAND} install ${commander.lintRule} --save-dev`);
      }

      TestRun : if (!commander.skipValidation) {
        console.log('validating webpack build');
        child_process.execSync(`${NPM_COMMAND} run workflow:build`);

        if (!commander.noTest) {
          console.log('validating unit test');
          child_process.execSync(`${NPM_COMMAND} run test:unit`);
        }
        if (!commander.noLint) {
          console.log('validating lint');
          child_process.execSync(`${NPM_COMMAND} run test:lint`);
        }
        if (!commander.noDocs) {
          console.log('validating docs');
          child_process.execSync(`${NPM_COMMAND} run build:docs`);
        }
      }
    }
  }

  return run;
}());

main();
