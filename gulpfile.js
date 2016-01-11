/**

 - copyJs : copie les sources Javascript de stc/app dans build/app
 - copyDebugJs : copie les debug Javascript de stc/debug dans build/debug
 - copyTestJs : copie les debug Javascript de src/test dans build/test
 - build : exécute copyJs, copyDebugJs, copyTestJs et compileTs
 - mocha : exécute les tests depuis build/test
 - tests : build et mocha
 

*/
var gulp = require("gulp");
var mocha = require('gulp-mocha');
var ts = require('gulp-typescript');
var cached = require('gulp-cached');
var remember = require('gulp-remember');

var tsProject = ts.createProject('tsconfig.json');

gulp.task("test", ['build', 'mocha'], function() {
})

gulp.task("mocha", function() {
  var argv = require('yargs').usage("[-g 'grep']").help("h").alias("h","help")
     .option('g', {
        alias: 'grep',
        demand: false,
        describe: '-g "nom" ne lance que les tests dont le titre comporte nom',
        type: 'string'
    }).argv;
  var opts = {};
  if (argv.g) { opts.grep = argv.g; }
  return gulp.src(["src/test/*_spec.js"] )
    .pipe(mocha(opts));
})

gulp.task('copyCompatTableTests', function() {
   gulp.src('/node_modules/compat-table/data-*.js')
   .pipe(cached('compatTableData'))
   .pipe(gulp.dest('/src/data/'));
});
gulp.task('copyJs', function() {
   gulp.src('src/app/*.js')
   .pipe(cached('tests'))
   .pipe(gulp.dest('./build/app'));
   gulp.src('src/*.js')
   .pipe(cached('tests'))
   .pipe(gulp.dest('./build'));
});
gulp.task('copyTestJs', function() {
   gulp.src('src/test/*.js')
   .pipe(cached('tests'))
   .pipe(gulp.dest('./build/test'));
});
gulp.task('copyDebugJs', function() {
   gulp.src('src/debug/*.js')
   .pipe(cached('debug'))
   .pipe(gulp.dest('./build/debug'));
});

gulp.task('compileTs', function() {
    var tsResult = tsProject.src() // instead of gulp.src(...) 
        .pipe(ts(tsProject));
    
    return tsResult.js.pipe(gulp.dest('build'));
});

gulp.task('watch', function() {  
    gulp.watch('src/app/*.js', ['copyJs']);
    gulp.watch('src/test/*.js', ['copyTestJs']);
    gulp.watch('src/debug/*.js', ['copyDebugJs']);
    gulp.watch('src/**/*.ts', ['compileTs']);
});

gulp.task('build', [ 'copyCompatTableTests', 'copyJs','copyTestJs','compileTs','copyDebugJs']);