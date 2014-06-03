var tmpl = require("./views/main.ejs");

function UI(el, machine) {
	var that = this;

	this.machine = machine;

	el.innerHTML = tmpl({});

	this.instructions = Array.prototype.slice.call(el.querySelectorAll(".debugger .disassembly .row"));
	this.registers = Array.prototype.slice.call(el.querySelectorAll(".debugger .registers .register"));
	this.flags = Array.prototype.slice.call(el.querySelectorAll(".debugger .registers .flags .flag"));

	Array.prototype.forEach.call(el.querySelectorAll(".action"), function (el) {
		el.addEventListener("click", function (evt) {
			that[el.getAttribute("data-event")]();;

			evt.stopPropagation();
			evt.preventDefault();
		});
	});

	this.update();
}

UI.prototype.step = function () {
	this.machine.step();
	this.update();
};

UI.prototype.stop = function () {
	clearInterval(this.interval);
	//this.machine.stop();
	this.update();
};

UI.prototype.run = function () {
	var that = this;
	this.interval = setInterval(function () {
		for (var i = 0; i < 0x100; i++) {
			that.machine.step();
			that.update();
		}
	}, 10);
};

UI.prototype.reset = function () {
	this.machine.reset();
	this.update();
};

UI.prototype.update = function () {
	var machine = this.machine,
		cpu = machine.cpu,
		pc = cpu._operation_address;

	function toHex(v, l) {
		v = v.toString(16).toUpperCase();
		while (v.length < l) { v = "0" + v; }
		return v;
	}

	this.registers.forEach(function(el) {
		var val = cpu[el.getAttribute("name").toLowerCase()];
		el.setAttribute("value", val.toString(16).toUpperCase());
	});

	this.flags.forEach(function (el) {
		var val = cpu.flags[el.getAttribute("name").toLowerCase()];

		el.classList.toggle("active", val);
	});

	var start_address = this._previous_address === undefined ?  pc : this._previous_address,
		disasm = [],
		found_index, address,
		target_index = Math.floor(this.instructions.length / 2);


	// Predisassemble
	address = start_address;
	this.instructions.forEach(function (el, i) {
		var output = cpu.disassemble(address);
		address = output.next;
		disasm[i] = output;

		if (output.start == pc) { found_index = i; }
	});

	if (found_index === undefined) {
		start_address = pc;
	} if (found_index > target_index) {
		start_address = disasm[found_index - target_index].start;
	}

	// Update UI
	address = start_address;
	this.instructions.forEach(function (el, i) {
		var output = cpu.disassemble(address);
		address = output.next;

		el.classList.toggle("valid", output.operation);
		el.classList.toggle("current", output.start == pc);

		el.setAttribute("address", toHex(output.start, 4));
		el.setAttribute("operation", output.operation);
		el.setAttribute("mode", output.mode);
		el.setAttribute("immediate", output.immediate);
		el.setAttribute("bytes", output.bytes);
	});

	this._previous_address = start_address;
}

module.exports = UI;
