var assembler = require("../../src/assembler"),
	fs = require("fs"),
	path = require("path");

var SOURCE_PATH = path.join(__dirname, "programs");

console.log(SOURCE_PATH);

describe('Assembler', function(){
	describe('#parser', function(){
		it('should accurately parse instructions', function(done){
			console.log(assembler.parser.parse(fs.readFileSync(SOURCE_PATH+"/kitchensink.asm","utf-8")));
			done();
		})
	})
})
