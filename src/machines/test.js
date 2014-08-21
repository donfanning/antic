var CPU = require("../cpu/6502c.js"),
	rom = require("./6502_functional_test.bin");

function TestMachine() {
	this.cpu = new CPU();

	this.cpu._operation_address =
	this.cpu.pc = 0x400;

	this.cpu._safe_read = this.peek.bind(this);
	this.cpu._peek = this.peek.bind(this);
	this.cpu._poke = this.poke.bind(this);

	this.memory = new Uint8Array(rom);
}

TestMachine.prototype.peek = function (address) {
	return this.memory[address & 0xFFFF];
}

TestMachine.prototype.poke = function (address, data) {
	this.memory[address] = data;
}

TestMachine.prototype.step = function () {
	this.cpu._generator.next();
};

module.exports = TestMachine;
