var cpu = require("./cpu/6502c.js"),
	tmpl = require("./views/main.ejs");

Array.prototype.forEach.call(document.querySelectorAll("antic"), function (el) {
	el.innerHTML = tmpl({});
});
