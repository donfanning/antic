module.exports = function(grunt) {
	var config = {
		connect: {
			server: {
				options: {
					port: 9001,
					base: 'public'
				}
			}
		},
		browserify: {
			options: {
				"transform-options": {
					"node-lessify": "textMode"
				},
				transform: ["browserify-ejs", "node-lessify"]
			},

			prod: {
				files: {
					'public/main.js': ['src/**/*']
				}
			},

			dev: {
				files: {
					'public/main.js': ['src/**/*']
				},
				options: {
					bundleOptions: { debug: true },
					watch: true,
					keepAlive: true,
				}
			}
		}
	};

	grunt.initConfig(config);

	grunt.loadNpmTasks('grunt-browserify');
	grunt.loadNpmTasks('grunt-contrib-connect');
	grunt.loadNpmTasks('grunt-contrib-watch');

	grunt.registerTask("default", ["browserify:prod"]);
	grunt.registerTask("dev", ["connect", "browserify:dev"]);
};
