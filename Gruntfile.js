module.exports = function(grunt) {
	var config = {
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
		connect: {
			server: {
				options: {
					port: 9001,
					base: 'public'
				}
			}
		},
		uglify: {
			options: {
				mangle: true,
				compress: { warnings: false },
				preserveComments: 'some'
			},
			prod: {
				files: {
					'public/main.min.js': ['public/main.js']
				}
			}
		},
		browserify: {
			dev: {
				options: {
					bundleOptions: { debug: true },
					transform: ["browserify-ejs"],
					watch: true
				},
				files: {
					'public/main.js': ['src/**/*.js']
				}
			}
		},
		watch: {
			sass: {
				files: ["less/**/*"],
				tasks: ["less"],
				options: { atBegin: true }
			}
		}
	};

	grunt.initConfig(config);

	grunt.loadNpmTasks('grunt-browserify');
	grunt.loadNpmTasks('grunt-contrib-connect');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-less');
	grunt.loadNpmTasks('grunt-contrib-uglify');

	grunt.registerTask("default", ["browserify", "less"]);
	grunt.registerTask("dev", ["connect", "browserify", "watch"]);
};
