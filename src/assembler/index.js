var grammar = require("./65c02.pegjs");

var asm = 
	".proc\n" +
	"adc [1], Y\n" +
	".end\n" +
	"";

var ast = grammar.parse(asm);

console.log(JSON.stringify(ast, null, 4));
