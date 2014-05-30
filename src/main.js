var tmpl = require("./views/main.ejs");

Array.prototype.forEach.call(document.querySelectorAll("antic"), function (el) {
	el.innerHTML = tmpl({});
});
