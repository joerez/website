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
	combine = require('gulp-jsoncombine'),
	spritesmith = require('gulp.spritesmith'),
	screenshots = require('gulp-local-screenshots'),
	sequence = require('gulp-sequence'),
	util = require('gulp-util'),
	data = require('gulp-data'),
	jade = require('gulp-jade'),
	moment = require('moment'),
	glob = require('glob'),
	path = require('path'),
	_ = require('lodash');

var publicDir = 'www'
var tempDir = "tmp"


gulp.task('connect', function() {
  connect.server({
    root: publicDir,
    port: 9010,
    livereload: true
  });
});

gulp.task('build', function() {
	gulp.start('buildSequence');
})

gulp.task('buildSequence', sequence('img', 'sass', 'jade', 'uglify', 'fonts', 'copy'));

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


	var trainings = function() {
		var files = glob.sync("jade/training/*/index.json");
		return _.chain(files)
					.filter(function(file) { 
						return !_.includes(path.dirname(file), '__'); 
					})
					.map(function(file) { 
						var json = require('./' + file); 
						var parentDir = "training/" + path.dirname(file).split(path.sep)[2];
						return _.extend({}, json, {url: parentDir});
					})
					.sortBy(function(json) { 
						return moment(json.date, 'DD MMMM YYYY').unix()
					})
				.value();
	}

	gulp.src('./jade/index.jade')		
	    .pipe(jade({
	    	locals: {
	    		"trainings": trainings()
	    	},
	    	pretty: true
	    }))
	    .pipe(gulp.dest(publicDir))
	    .pipe(connect.reload());

	gulp.src('./jade/**/*/{index,index_og}.jade')
		.pipe(data(function(file_) {
			var file = path.parse(file_.path)
			return require(file.dir + "/index.json");
	    }))		
	    .pipe(jade({
	    	pretty: true
	    }))
	    .pipe(gulp.dest(publicDir))
	    .pipe(connect.reload());
});

gulp.task('uglify', function() {
	gulp.src(['js/jquery.min.js', 'js/main.js'])
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

// gulp.task('screens', function () {
// 	return gulp.src(publicDir + '**/training/*/**.html')
//   		.pipe(screenshots({
// 	        path: publicDir + '/',
// 	        folder: publicDir + '/img',
// 	        type: 'png',
// 	        suffix: 'shot',
// 	        width: ['1300']
//    		}))
//   		.pipe(gulp.dest(publicDir + '/img'));
// });


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
    	remoteUrl: "https://github.com/devchampions/website.git",
    	branch: "gh-pages"
    }

    return gulp.src(['./www/**/*'])
        .pipe(deploy(options));
});