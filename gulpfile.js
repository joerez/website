var gulp = require('gulp'),
	connect = require('gulp-connect'),
	sass = require('gulp-sass')
	imagemin = require('gulp-imagemin')
	autoprefix = require('gulp-autoprefixer'),
	neat = require('node-neat'),
	gulpif = require('gulp-if'),
	resize = require('gulp-image-resize'),	
	concat = require('gulp-concat'),
	uglify = require('gulp-uglify'),
	buffer = require('vinyl-buffer'),
	deploy = require('gulp-gh-pages'),
	spritesmith = require('gulp.spritesmith'),
	jade = require('gulp-jade');

var publicDir = 'www'


gulp.task('connect', function() {
  connect.server({
    root: publicDir,
    port: 9010,
    livereload: true
  });
});

gulp.task('build', function() {
	gulp.start('img', 'sass', 'jade', 'uglify', 'fonts', 'copy');
})

gulp.task('img', function() {
	
	var sprites = gulp.src('img/trainers/*.png')
		.pipe(spritesmith({
			imgName: 'trainers.png',
			imgPath: '/img/trainers.png',
			cssName: 'trainers.css'
		}))

	sprites.img
		.pipe(buffer())
	    .pipe(gulpif('trainers/*', resize({
			imageMagick: true,
			width : 100,
			height : 100,
			crop : true,
			upscale : true
		})))		
		.pipe(imagemin())
    	.pipe(gulp.dest(publicDir + '/img'));	

    sprites.css
    	.pipe(gulp.dest(publicDir + '/css'));

	gulp.src('img/*.{png,jpg,svg}')
		.pipe(imagemin())
		.pipe(gulp.dest(publicDir + '/img'));	
})

gulp.task('sass', function () {
	gulp.src('sass/*.scss')
	  	.pipe(sass({
			includePaths: neat.includePaths
		}))
		.pipe(autoprefix('last 10 version'))
		.pipe(gulp.dest(publicDir + '/css'))
		.pipe(connect.reload());
});

gulp.task('jade', function() {
	var trainings = require('./data/trainings.json');
	gulp.src('./jade/*.jade')
	    .pipe(jade({
	    	pretty: true,
	    	locals: {
	    		"trainings": trainings
	    	}
	    }))
	    .pipe(gulp.dest(publicDir))
	    .pipe(connect.reload());
});

gulp.task('uglify', function() {
	gulp.src(['js/zepto.min.js', 'js/**/*.js', 'js/*.js'])
		.pipe(concat('main.js'))
		.pipe(uglify())
		.pipe(gulp.dest(publicDir + '/js'))
		.pipe(connect.reload());
});

gulp.task('fonts', function() {
	return gulp.src(['fonts/*'])
		.pipe(gulp.dest(publicDir + '/fonts' ))
})

gulp.task('copy', function() {
	return gulp.src(['favicon.ico', 'robots.txt', 'CNAME'])
		.pipe(gulp.dest(publicDir))
		.pipe(connect.reload());
});


gulp.task('watch', function() {
    gulp.watch(['js/*.js', 'js/**/*.js'], ['uglify']);
    gulp.watch(['img/*', 'img/**/*'], ['img']);
    gulp.watch(['sass/*.scss', 'sass/**/*.scss'], ['sass']);
    gulp.watch(['jade/*.jade', 'jade/**/*.jade', 'data/*.json'], ['jade']);
    gulp.watch(['favicon.ico', 'robots.txt'], ['copy']);
});

gulp.task('default', ['connect', 'build', 'watch']);

gulp.task('deploy', function () {
    var options = {
    	remoteUrl: "git@github.com:eduardsi/devchampions.git",
    	branch: "gh-pages"
    }

    return gulp.src(['./www/**/*'])
        .pipe(deploy(options));
});