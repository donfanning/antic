var constants = require("./const.js");

module.exports = function(address) {
	var start_address = address,
		instr = this.instructions[this._safe_read(address++)],
		immediate;

	// Undefined instruction
	if (!instr) { return { start: start_address, next: address & 0xFFFF }; }

	switch (instr.immediate) {
		case null:
			immediate = "";
			break ;

		case -8:
			immediate = this._safe_read(address++);
			if (immediate & 0x80) immediate -= 0x100;
			immediate = (immediate + address) & 0xFFFF;
			immediate = "$" + immediate.toString(16).toUpperCase();
			break ;

		case 8:
			immediate  = this._safe_read(address++);
			immediate = "$" + immediate.toString(16).toUpperCase();
			break ;

		case 16:
			immediate  = this._safe_read(address++);
			immediate |= this._safe_read(address++) << 8;
			immediate = "$" + immediate.toString(16).toUpperCase();
			break ;

		default:
			debugger ;
			immediate = "!?!?"
	}

	return {
		start: start_address,
		next: address & 0xFFFF,
		immediate: immediate,
		operation: instr.operation,
		mode: instr.mode
	};
};
