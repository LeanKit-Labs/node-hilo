var gulp = require( "gulp" );
var bg = require( "biggulp" )( gulp );
var jscs = require( "gulp-jscs" );
var gulpChanged = require( "gulp-changed" );
var jshint = require( "gulp-jshint" );
var stylish = require( "jshint-stylish" );
var allSrcFiles = "./src/**/*.js";

gulp.task( "coverage", bg.withCoverage() );

gulp.task( "specs-behavior", function() {
	return bg.test( false, "./behavior/*.spec.js" );
} );

gulp.task( "specs-int", function() {
	return bg.test( false, "./integration/*.spec.js" );
} );

gulp.task( "coverage-watch", function() {
	bg.watch( [ "coverage" ] );
} );

gulp.task( "show-coverage", bg.showCoverage() );

gulp.task( "continuous-specs", function() {
	return bg.test();
} );

gulp.task( "specs-watch", function() {
	bg.watch( [ "continuous-specs" ] );
} );

gulp.task( "test-and-exit", function() {
	return bg.testOnce();
} );

gulp.task( "format", [ "jshint" ], function() {
	return gulp.src( [ "**/*.js", "!node_modules*" ] )
		.pipe( jscs( {
			configPath: ".jscsrc",
			fix: true
		} ) )
		.pipe( gulpChanged( ".", { hasChanged: gulpChanged.compareSha1Digest } ) )
		.pipe( gulp.dest( "." ) );
} );

gulp.task( "jshint", function() {
	return gulp.src( allSrcFiles )
		.on( "error", function( error ) {
			gutil.log( gutil.colors.red( error.message + " in " + error.fileName ) );
			this.end();
		} )
		.pipe( jshint() )
		.pipe( jshint.reporter( stylish ) )
		.pipe( jshint.reporter( "fail" ) );
} );

gulp.task( "default", [ "coverage", "coverage-watch" ], function() {} );
gulp.task( "specs", [ "continuous-specs", "specs-watch" ], function() {} );
gulp.task( "build", [ "test-and-exit" ] );
