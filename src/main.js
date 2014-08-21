var UI = require("./ui.js"),
	TestMachine = require("./machines/test.js"),
	assembler = require("./assembler");

var testMachine = new TestMachine(),
	ui = new UI(document.querySelector("antic"), testMachine);
