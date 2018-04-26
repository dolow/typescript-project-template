# typescript-project-template

Npm typescript project generator.

The generated project includes following packages;

- typescript
- tslint
- tsdoc
- unit testing using karma/mocha
- webpack

Once new project is generated, it automatically validates its configuration through building and testing.

# Usage

```
  Usage: typescript-project-template [options]

  Options:

    -V, --version              output the version number
    -n, --project-name [name]  project name (default: my-typescript-project)
    -d, --destination [dest]   project destination directory (default: /Users/kuwabara_yuki/workspace/git/typescript-project-template)
    --lint-rule                base lint rule
    --no-test                  exclude unit test
    --no-lint                  exclude tslint
    --no-docs                  exclude typedoc
    --skip-install             skip node module installation
    --skip-validation          skip generated project validation
    -h, --help                 output usage information
```

## example

```
node typescript-project-template  -n my-brand-new-project -d ~/workspace/projects/my-brand-new-project
```
