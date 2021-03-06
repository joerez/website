var gulp = require('gulp'),
    connect = require('gulp-connect'),
    sass = require('gulp-sass'),
    imagemin = require('gulp-imagemin'),
    autoprefix = require('gulp-autoprefixer'),
    neat = require('node-neat'),
    gulpif = require('gulp-if'),
    resize = require('gulp-image-resize'),
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify'),
    buffer = require('vinyl-buffer'),    
    flatmap = require('gulp-flatmap'),
    deploy = require('gulp-gh-pages'),
    combine = require('gulp-jsoncombine'),
    spritesmith = require('gulp.spritesmith'),
    screenshots = require('gulp-local-screenshots'),
    cityTimezones = require('city-timezones'),
    removeDiacritics = require('diacritics').remove,
    sequence = require('gulp-sequence'),    
    util = require('gulp-util'),
    data = require('gulp-data'),
    jade = require('gulp-jade'),
    gpug = require('gulp-pug'),    
    moment = require('moment'),    
    glob = require('glob'),
    path = require('path'),
    fse = require('fs-extra'),    
    pug = require('pug'),
    _ = require('lodash');

var publicDir = 'www';

gulp.task('connect', function () {
    connect.server({
        root: publicDir,
        port: 9012,
        livereload: false
    });
});

gulp.task('build', function () {
    gulp.run('buildSequence');
});

gulp.task('buildSequence', sequence('img', 'sass', 'jade', 'uglify', 'fonts', 'copy'));

gulp.task('img', function () {

    var sprites = gulp.src('img/trainers/*.png')
        .pipe(spritesmith({
            imgName: 'trainers.png',
            imgPath: '/img/trainers.png',
            cssName: 'trainers.css'
        }));

    sprites.img
        .pipe(buffer())
        .pipe(gulpif('trainers/*', resize({
            imageMagick: true,
            width: 100,
            height: 100,
            crop: true,
            upscale: true
        })))
        // .pipe(imagemin())
        .pipe(gulp.dest(publicDir + '/img'));

    sprites.css
        .pipe(gulp.dest(publicDir + '/css'));

    gulp.src('img/**/*.{png,jpg,svg}')
        // .pipe(imagemin())
        .pipe(gulp.dest(publicDir + '/img'));
});

gulp.task('sass', function () {
    gulp.src('sass/*.scss')
        .pipe(sass({
            includePaths: neat.includePaths
        }))
        .pipe(autoprefix('last 10 version'))
        .pipe(gulp.dest(publicDir + '/css'))
        .pipe(connect.reload());
});

gulp.task('jade', function () {

    var trainings = function () {
        var files = glob.sync("jade/training/*/index.json");
        return _.chain(files)
            // removing hidden trainings
            .filter(function(file) {
                return !_.includes(path.dirname(file), '__');
            })
            // generating multi-edition trainings (e.g. Java 8 & Java 9)
            .map(function(file) {
                var json = require('./' + file);
                var parentDir = "training/" + path.dirname(file).split("/")[2];
                if (json.editions) {
                    return _.map(json.editions, function(edition) {
                        return _.extend({templateDir: parentDir}, json, edition);
                    })
                } else {
                    return _.extend({templateDir: parentDir}, json, {url: parentDir});
                }                
            })
            .flatMap()
            // generating multi-landing trainings for different locations
            .map(function(training) {
                var landings = _.map(training.landings ? training.landings.locations : [], function(it) {
                    var city = it.location.split(',')[0].trim();
                    var timezones = cityTimezones.lookupViaCity(city);
                    if (!timezones.length) {
                        console.log("Timezone cannot be resolved for " + city)
                    }
                    return _.extend({}, training, { 
                        date : it.date,
                        url: training.url + '/' + removeDiacritics(city.toLowerCase()),
                        location: it.location,
                        landing: true 
                    });
                });
                return _.concat(landings, training);
            })
            .flatMap()
            // generating landing pages for different dates
            .map(function(training) {
                if (training.landing) {
                    return _.map(training.landings.dates, function(it) {
                        var month = it.date.match(/([A-Za-z]+)/)[0].toLowerCase();
                        var url = training.url + '/' + month;
                        // console.log("Generating a training (landing) at " + url);
                        return _.extend({}, training,
                            {
                                date : it.date,
                                url: url
                            });
                    })
                } else {
                    // console.log("Generating a training at " + training.url);
                    return training;
                }
            })
            .flatMap()
            .sortBy(function(json) {
                var date = json.date;
                if (json.locations) {
                    date = json.locations[0].date;
                }
                return moment(date, 'DD MMMM YYYY').unix()
            })
            .uniqBy('url')
            .value();
    }();

    console.log("cancel.pug");

    gulp.src('./jade/cancel.pug')
        .pipe(gpug())
        .pipe(gulp.dest(publicDir))
        .pipe(connect.reload());

    var trainingsVisibleOnFrontPage = _.filter(trainings, function(training) {
        return !training.landing;
    });

    console.log("index.pug");
    gulp.src('./jade/index.pug')
        .pipe(gpug({
            locals: {
                "trainings": trainingsVisibleOnFrontPage,
                "all_trainings": trainings
            }
        }))
        .pipe(gulp.dest(publicDir))
        .pipe(connect.reload());

    console.log("trainings.pug");

    trainings.forEach(function(tr) {
        var html = pug.renderFile('./jade/' + tr.templateDir + '/index.pug', _.extend(tr, {
            self: true, 
            cache: true
        }))
        fse.outputFileSync(publicDir + '/' + tr.url + '/index.html', html);
    })
});

gulp.task('uglify', function () {
    gulp.src(['js/jquery.min.js', 'js/main.js'])
        .pipe(concat('main.js'))
        .pipe(uglify())
        .pipe(gulp.dest(publicDir + '/js'))
        .pipe(connect.reload());
});

gulp.task('fonts', function () {
    return gulp.src(['fonts/*'])
        .pipe(gulp.dest(publicDir + '/fonts'))
});

gulp.task('copy', function () {
    return gulp.src(['favicon.ico', 'robots.txt', 'CNAME'])
        .pipe(gulp.dest(publicDir))
        .pipe(connect.reload());
});

gulp.task('watch', function () {
    gulp.watch(['js/*.js', 'js/**/*.js'], ['uglify']);
    gulp.watch(['img/*', 'img/**/*'], ['img']);
    gulp.watch(['sass/*.scss', 'sass/**/*.scss'], ['sass']);
    gulp.watch(['jade/*.pug', 'jade/**/*.pug', 'jade/*.json', 'jade/**/*.json'], ['jade']);
    gulp.watch(['favicon.ico', 'robots.txt'], ['copy']);
});

gulp.task('default', ['connect', 'build']);

gulp.task('deploy', function () {
    var options = {
        remoteUrl: "https://github.com/devchampions/website.git",
        branch: "gh-pages"
    };
    return gulp.src(['./www/**/*'])
        .pipe(deploy(options));
});
