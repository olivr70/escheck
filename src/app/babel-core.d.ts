
/// <reference path="../../typings/tsd.d.ts" />
/// <reference path="../../typings/minimatch/minimatch.d.ts" />

declare module "babel-core" {
  
 /**
  * @see http://babeljs.io/docs/usage/options/
  */
 interface Options {
   filename?:string;
   filenameRelative?:string;
   presets?:string[];
   plugins?:string[];
   highlightCode?:boolean;
   only?: string|RegExp|(string|RegExp)[];
   ignore?: string|RegExp|(string|RegExp)[];
   auxiliaryCommentBefore?: string;
   auxiliaryCommentAfter?: string;
   sourceMaps?: any; // truthy | "both" | "inline"
   inputSourceMap?: {};
   sourceMapTarget?: string;
   sourceFileName?: string;
   sourceRoot?:any;
   moduleRoot?:any;
   moduleIds?:boolean;
   moduleId?:string;
   getModuleId?:(moduleName:string) => string | boolean;
   resolveModuleSource?: {};
   code?: boolean;
   babelrc?: boolean
   ast?: boolean;
   compact?: boolean|string; // "auto"
   comments?: boolean;
   /** An optional callback that controls whether a comment should be output or not */
   shouldPrintComment?: (commentContents:string) => boolean;
   /** This is an object of keys that represent different environments */
   env?: {};
   /** Retain line numbers. */
   retainLines?: boolean;
   /** A path to an .babelrc file to extend */
   extends?:string;
 }
 
 interface TransformResult {
   code:string;
   map: {};
   ast: {};
 } 

 export function transform(code:string, options?: Options):TransformResult;
 export function transformFile(filename:string,options?:Options):TransformResult;
 export function transformFilesync(filename:string,options?:Options):TransformResult;
}