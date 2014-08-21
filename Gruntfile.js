var path = require("path"),
	through = require("through"),
	fs = require("fs");

module.exports = function(grunt) {
	function RawFile(file, options) {
		if (path.extname(file) !== ".bin") return through();
		
		options = options || {};
		options.output = "source";

		var src = [];
		return through(write, end);

		function write(chunk) {
			var block = [];
			for (var i = 0; i < chunk.length; i++) {
				block.push(chunk[i]);
				if (block.length >= 32) {
					src.push(block.join(", "));
					block = [];
				}
			}
			
			if (block.length) { src.push(block.join(", ")); }
		}

		function end() {
			var contents = "module.exports = [1];"//\n\t" + src.join(",\n\t") + "\n];";
			this.emit("data", contents);
			this.emit("end");
		}
	}

	var config = {
		mochaTest: {
			test: {
				options: {
					reporter: 'spec',
					require: './test/helper.js'
				},
				src: ['test/**/*.js', "!test/helper.js"]
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
					'public/assets/main.js': ['src/main.js']
				},
				options: {
					transform: [
						RawFile,
						["browserify-pegjs", { cache: true }], 
						"browserify-ejs"
					],
					browserifyOptions: { 
						debug: true
					},
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
