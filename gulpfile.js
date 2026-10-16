
// Base Gulp File
var gulp = require('gulp'),
    watch = require('gulp-watch'),
    sass = require('gulp-sass'),
    sourcemaps = require('gulp-sourcemaps'),
    cssBase64 = require('gulp-css-base64'),
    path = require('path'),
    notify = require('gulp-notify'),
    inlinesource = require('gulp-inline-source'),
    browserSync = require('browser-sync'),
    imagemin = require('gulp-imagemin'),
    del = require('del'),
    cache = require('gulp-cache'),
    uglify = require('gulp-uglify'),
    pump = require('pump'),
    autoprefixer = require('gulp-autoprefixer'),
    runSequence = require('run-sequence'),
    cleanCSS = require('gulp-clean-css'),
    htmlmin = require('gulp-html-minifier'),
    gutil = require('gulp-util'),
    strip = require('gulp-strip-comments');

// Task to compile SCSS
gulp.task('sass', function () {
  return gulp.src('./src/scss/**/*.scss')
    .pipe(sourcemaps.init())
    .pipe(sass({
      errLogToConsole: false,
      paths: [ path.join(__dirname, 'scss', 'includes') ]
    })
    .on("error", notify.onError(function(error) {
      return "Failed to Compile SCSS: " + error.message;
    })))
    .pipe(cssBase64())
    .pipe(autoprefixer())
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('./src/css/'))
    .pipe(gulp.dest('./dist/css/'))
    .pipe(browserSync.reload({
      stream: true
    }))
    //.pipe(notify("SCSS Compiled Successfully :)"));
});

gulp.task('minify-css', function() {
    return gulp.src('./dist/css/*.css')
        .pipe(cleanCSS({compatibility: 'ie8'}))
        .pipe(gulp.dest('./dist/css/'));
});

gulp.task('compress', function (cb) {
  pump([
        gulp.src('./src/js/**/*.js'),
        uglify(),
        gulp.dest('./dist/js/')
    ],
    cb
  );
});

//strip comments
gulp.task('strip', function() {
  return gulp.src('./src/js/**/*.js')
    .pipe(strip())
    .pipe(gulp.dest('./dist/js/'));
});

// Task to Minify JS
gulp.task('jsmin', function() {
  return gulp.src('./src/js/**/*.js')
    //.pipe(uglify().on('error', gutil.log))
    .pipe(gulp.dest('./dist/js/'));
});

// Minify Images
gulp.task('imagemin', function (){
  return gulp.src('./src/img/**/*.+(png|jpg|jpeg|gif|svg|mp4)')
  // Caching images that ran through imagemin
  .pipe(cache(imagemin({
      interlaced: true
    })))
  .pipe(gulp.dest('./dist/img'));
});

//Copy fonts
gulp.task('fonts', function() {
   return gulp.src(['./src/fonts/**/*'])
  .pipe(gulp.dest('dist/fonts'));
});

//Copy videos
gulp.task('video', function() {
   return gulp.src(['./src/video/**/*'])
  .pipe(gulp.dest('dist/video'));
});

//Copy default video and json
gulp.task('defaultimport', function(){
  return gulp.src(['./src/test/**/*'])
  .pipe(gulp.dest('dist/test'));
});


// BrowserSync Task (Live reload)
gulp.task('browserSync', function() {
  browserSync({
    server: {
      baseDir: './src/'
    }
  })
});

// Minify HTML 
gulp.task('minifyhtml', function() {
  gulp.src('./src/*.html')
    .pipe(htmlmin({collapseWhitespace: true}))
    .pipe(gulp.dest('./dist'))
});



// Gulp Inline Source Task
// Embed scripts, CSS or images inline (make sure to add an inline attribute to the linked files)
// Eg: <script src="default.js" inline></script>
// Will compile all inline within the html file (less http requests - woot!)
gulp.task('inlinesource', function () {
  return gulp.src('./src/**/*.html')
    .pipe(inlinesource())
    .pipe(gulp.dest('./dist/'));
});

// Gulp Watch Task
gulp.task('watch', ['browserSync'], function () {
   gulp.watch('./src/scss/**/*', ['sass']);
   gulp.watch('./src/js/**/*').on('change', browserSync.reload);
    gulp.watch('./src/img/**/*.svg', ['sass']);
   gulp.watch('./src/**/*.html').on('change', browserSync.reload);
});

// Gulp Clean Up Task
gulp.task('clean', function() {
  del('dist');
});

// Gulp Default Task
gulp.task('default', ['watch']);

// Gulp Build Task
gulp.task('build', function() {
  runSequence('clean', 'sass','minify-css','minifyhtml', 'jsmin', 'fonts', 'video', 'defaultimport', 'strip', 'imagemin');
});