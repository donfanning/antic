module.exports = function(grunt) {
	var config = {
		mochaTest: {
			test: {
				options: {
					reporter: 'spec',
					require: 'pegjs-require'
				},
				src: ['test/**/*.js']
			}
		},
		connect: {
			server: {
				options: {
					port: 9001,
					base: 'public'
				}
			}
		},
		less: {
			dev: {
				options: {
					style: 'expanded'
				},
				files: {
					'public/assets/main.css': 'less/main.less'
				}
			}
		},
		browserify: {
			dev: {
				files: {
					'public/assets/main.js': ['src/**/*']
				},
				options: {
					transform: ["browserify-ejs", ["browserify-pegjs", { cache: true }]],
					bundleOptions: { debug: true },
					watch: true
				}
			}
		},
		watch: {
			less: {
				options: { atBegin: true },
				files: ["less/**/*"],
				tasks: ["less"]
			}
		}
	};

	grunt.initConfig(config);

	grunt.loadNpmTasks('grunt-browserify');
	grunt.loadNpmTasks('grunt-contrib-less');
	grunt.loadNpmTasks('grunt-contrib-connect');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-mocha-test');

	grunt.registerTask("test", ["mochaTest"]);
	grunt.registerTask("default", ["less", "browserify"]);
	grunt.registerTask("dev", ["connect", "browserify", "watch"]);
};
