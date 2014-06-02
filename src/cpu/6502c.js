function CPU() {
	// Force all registers to a high state (disabled interrupts)
	this.pc = 0xFFFF;
	this.a = 0xFF;
	this.x = 0xFF;
	this.y = 0xFF;
	this.s = 0xFF;
	this.p = 0xFF;
	this.flags = {};

	// Setup runtime for CPU
	this._generator = this._runtime();
}

Object.defineProperties(CPU.prototype, {
	p: {
		get: function () {
			return 0x20
				| (this.flags.s ? 0x80 : 0)
				| (this.flags.v ? 0x40 : 0)
				| (this.flags.d ? 0x08 : 0)
				| (this.flags.i ? 0x04 : 0)
				| (this.flags.z ? 0x02 : 0)
				| (this.flags.c ? 0x01 : 0);
		},
		set: function (v) {
			this.flags.s = v & 0x80;
			this.flags.v = v & 0x40;
			this.flags.d = v & 0x08;
			this.flags.i = v & 0x04;
			this.flags.z = v & 0x02;
			this.flags.c = v & 0x01;
		}
	}
});

CPU.prototype._runtime = function* () {
	var instructions = require("./instructions.json"),
		flags = this.flags;

	// Execute forever
	while (true) {
		yield null;
	}
}

module.export = CPU;
