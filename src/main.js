var TestMachine = require("./machines/test.js"),
	UI = require("./ui.js"),
	assembler = require("./assembler");


var xhr = new XMLHttpRequest();
xhr.responseType = "arraybuffer";
xhr.open("GET", "/test/6502_functional_test.bin", true);
xhr.send();
xhr.onreadystatechange = function () {
	if (xhr.readyState !== 4) { return ; }

	Array.prototype.forEach.call(document.querySelectorAll("antic"), function (el) {
		var testMachine = new TestMachine(xhr.response);
		new UI(el, testMachine);
	});
};
