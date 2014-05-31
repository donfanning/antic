var instr = require("./cpu/instructions.json"),
	tmpl = require("./views/main.ejs");

console.log(instr[0])

Array.prototype.forEach.call(document.querySelectorAll("antic"), function (el) {
	el.innerHTML = tmpl({});
});
