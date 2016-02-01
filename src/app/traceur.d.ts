
/// <reference path="../../typings/tsd.d.ts" />
/// <reference path="../../typings/minimatch/minimatch.d.ts" />

declare module "traceur" {
  
  export enum Modules {
    /** each input module creates an output file in AMD format */
    'amd', 
    /** All dependencies of the root modules and/or scripts are compiled in to functions 
     * that register the modules then execute any scripts. */
    'bootstrap', 
    'closure', 
    /** each input module creates an output file in ? */
    'commonjs', 
    /** All dependencies of the root modules and/or scripts are compiled into a long script 
     * that creates modules upon execution then runs the dependents */
    'inline',
    /** for systemjs bundling */
    'instantiate'
  }
  
  export enum OutputLanguage { 'es5', 'es6' }
  
  export enum SourceMaps { 'file', 'inline', 'memory' }
 /**
  * @see https://github.com/google/traceur-compiler/wiki/Options-for-Compiling
  *
  * Default values are indicative, based on documentation on 2016-01-28
  */
 export interface Options {
  annotations: boolean; // false
  atscript: boolean; // false
  arrayComprehension: boolean; // false
  arrowFunctions: boolean; // true
  asyncFunctions: boolean; // false
  asyncGenerators: boolean; // false
  blockBinding: boolean; // true
  classes: boolean; // true
  commentCallback: boolean; // false
  computedPropertyNames: boolean; // true
  debug: boolean; // false
  debugNames: boolean; // false
  defaultParameters: boolean; // true
  destructuring: boolean; // true
  exponentiation: boolean; // false
  exportFromExtended: boolean; // false
  forOf: boolean; // true
  forOn: boolean; // false
  freeVariableChecker: boolean; // false
  generatorComprehension: boolean; // false
  generators: boolean; // true
  inputSourceMap: boolean; // false
  jsx: boolean; // false
  /** Lower sourceMaps granularity to one mapping per output line */
  lowResolutionSourceMap: boolean; // false
  memberVariables: boolean; // false
  /** true for named, false for anonymous modules; default depends on --modules */
  moduleName: boolean | string; // 'default',
  modules: Modules; // 'bootstrap'
  numericLiterals: boolean; // true
  outputLanguage: OutputLanguage; // 'es5',
  properTailCalls: boolean; // false
  propertyMethods: boolean; // true
  propertyNameShorthand: boolean; // true
  referrer: string; // '',
  require: boolean; // false
  restParameters: boolean; // true
  script: boolean; // false
  sourceMaps: boolean | SourceMaps; // false
  /** sourcemap sourceRoot value. false to omit, true for directory of output file. */
  sourceRoot: boolean|string; // false
  spread: boolean; // true
  symbols: boolean; // true
  templateLiterals: boolean; // true
  types: boolean; // false,
  unicodeEscapeSequences: boolean; // true,
  unicodeExpressions: boolean; // true,
  validate: boolean; // false,
 }
 

 export function compile(code:string, options?: Options):string;
}