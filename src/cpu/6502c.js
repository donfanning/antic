var constants = require("./const.js");

var IMPLIED = constants.IMPLIED,
	ACCUMULATOR = constants.ACCUMULATOR,
	RELATIVE = constants.RELATIVE,
	IMMEDIATE = constants.IMMEDIATE,
	ZEROPAGE = constants.ZEROPAGE,
	ZEROPAGE_X = constants.ZEROPAGE_X,
	ZEROPAGE_Y = constants.ZEROPAGE_Y,
	INDIRECT_X = constants.INDIRECT_X,
	INDIRECT_Y = constants.INDIRECT_Y,
	ABSOLUTE = constants.ABSOLUTE,
	ABSOLUTE_X = constants.ABSOLUTE_X,
	ABSOLUTE_Y = constants.ABSOLUTE_Y,
	INDIRECT = constants.INDIRECT,
	SPECIAL = constants.SPECIAL;

var RESET_VECTOR = 0xFFFC,
	IRQ_VECTOR = 0xFFFE,
	NMI_VECTOR = 0xFFFA;

function CPU() {
	this.flags = {};

	// Force all registers to a high state (disabled interrupts)
	this.pc = 0xFFFF;
	this.a = 0xFF;
	this.x = 0xFF;
	this.y = 0xFF;
	this.s = 0xFF;
	this.p = 0xFF;

	// These are our interrupt levels
	this._reset = false;
	this._nmi = false;
	this._irq = false;

	this._operation_address = this.pc;

	// Setup runtime for CPU
	this._generator = this._runtime();
}

CPU.prototype.instructions = require("./instructions.js");
CPU.prototype.disassemble = require("./disassemble.js");

Object.defineProperties(CPU.prototype, {
	p: {
		get: function () {
			return 0x20
				| (this.flags.n ? 0x80 : 0)
				| (this.flags.v ? 0x40 : 0)
				| (this.flags.d ? 0x08 : 0)
				| (this.flags.i ? 0x04 : 0)
				| (this.flags.z ? 0x02 : 0)
				| (this.flags.c ? 0x01 : 0);
		},
		set: function (v) {
			this.flags.n = v & 0x80;
			this.flags.v = v & 0x40;
			this.flags.d = v & 0x08;
			this.flags.i = v & 0x04;
			this.flags.z = v & 0x02;
			this.flags.c = v & 0x01;
		}
	}
});

CPU.prototype._nextbyte = function () {
	var data = this._peek(this.pc);
	this.pc = (this.pc + 1) & 0xFFFF;
	return data;
};

CPU.prototype._interrupt = function* (opcode, block_write) {
	// Cycle 3
	this[block_write ? "_peek" : "_poke"](this.s | 0x100, this.pc >> 8);
	this.s = (this.s - 1) & 0xFF;
	yield null;
	// Cycle 4
	this[block_write ? "_peek" : "_poke"](this.s | 0x100, this.pc & 0xFF);
	this.s = (this.s - 1) & 0xFF;
	yield null;
	// Cycle 5
	this[block_write ? "_peek" : "_poke"](this.s | 0x100, this.p | (opcode ? 0x10 : 0));
	this.s = (this.s - 1) & 0xFF;
	yield null;
	// Cycle 6
	var vector = this._reset ? RESET_VECTOR : (this._nmi ? NMI_VECTOR : IRQ_VECTOR);
	this.pc = this._peek(vector++);
	yield null;
	// Cycle 7
	this.pc |= this._peek(vector) << 8;
	yield null;
}

CPU.prototype._runtime = function* () {
	var instructions = this.instructions,
		flags = this.flags,
		temp, result, ea, fix_up, branch_test;

	function same_page(addr, incr) {
		return (addr & 0xFF00) | ((addr + incr) & 0xFF);
	}

	function nz(data) {
		flags.n = data & 0x80;
		flags.z = !data;
		return data;
	}

	function ror(data) {
		var out = (data >> 1) | (flags.c ? 0x80 : 0);
		flags.c = data & 0x01;
		return nz(out);
	}

	function rol(data) {
		var out = ((data << 1) | (flags.c ? 0x01 : 0)) & 0xFF;;
		flags.c = data & 0x80;
		return nz(out);
	}

	function lsr(data) {
		var out = (data >> 1)
		flags.c = data & 0x01;
		return nz(out);
	}

	function asl(data) {
		var out = (data << 1) & 0xFF;
		flags.c = data & 0x80;
		return nz(out);
	}

	// Execute forever
	while (true) {
		this._operation_address = this.pc;

		// Interrupt / reset logic
		if ((!flags.i && this._irq) || this._nmi || this._reset) {
			if (!flags.i && this._irq) flags.i = true;

			this._peek(this.pc);
			yield null;
			this._peek(this.pc);
			yield null;

			yield* this._interrupt(false, this._reset);
			continue ;
		}

		// Cycle 0: Fetch instruction (ignored for interrupts)
		var operation = instructions[this._nextbyte()];
		yield null;

		if (!operation) { throw new Error("Processor has jammed"); }

		// Begin calculating effective address
		switch (operation.mode) {
		case IMPLIED:
			// Dummy read
			this._peek(this.pc);
			yield null;
			break ;
		case IMMEDIATE:
			// Immediate addressing
			ea = this.pc;
			this.pc = (this.pc + 1) & 0xFFFF;
			break ;
		case INDIRECT:
			temp = this._nextbyte();
			yield null;
			temp |= this._nextbyte() << 8;
			yield null;
			ea = this._peek(temp);
			yield null;
			ea |= this._peek(same_page(temp, 1)) << 8;
			yield null;
			break ;
		case ZEROPAGE:
			ea = this._nextbyte();
			yield null;
			break ;
		case ZEROPAGE_X:
			ea = this._nextbyte();
			this._peek(ea);
			yield null;
			ea = (ea + this.x) & 0xFF;
			yield null;
			break ;
		case ZEROPAGE_Y:
			ea = this._nextbyte();
			this._peek(ea);
			yield null;
			ea = (ea + this.y) & 0xFF;
			yield null;
			break ;
		case ABSOLUTE:
			ea = this._nextbyte();
			yield null;
			ea |= this._nextbyte() << 8;
			yield null;
			break ;
		case ABSOLUTE_X:
			ea = this._nextbyte();
			fix_up = (ea + this.x) > 0x100;
			yield null;
			ea |= this._nextbyte() << 8;
			yield null;

			if (fix_up) {
				this._peek(same_page(ea, this.x));
				yield null;
			}

			ea = (ea + this.x) & 0xFFFF;
			break ;
		case ABSOLUTE_Y:
			ea = this._nextbyte();
			fix_up = (ea + this.y) >= 0x100;
			yield null;
			ea |= this._nextbyte() << 8;
			yield null;

			if (fix_up) {
				this._peek(same_page(ea, this.y));
				yield null;
			}

			ea = (ea + this.y) & 0xFFFF;
			break ;
		case INDIRECT_X:
			temp = this._nextbyte();
			yield null;
			this._peek(temp);
			temp += this.x;
			yield null;
			ea = this._peek(temp++ & 0xFF);
			yield null;
			ea |= this._peek(temp & 0xFF) << 8;
			yield null;
			break ;
		case INDIRECT_Y:
			temp = this._nextbyte();
			yield null;
			ea = this._peek(temp++ & 0xFF);
			fix_up = (ea + this.y) >= 0x100;
			yield null;
			ea |= this._peek(temp & 0xFF) << 8;
			yield null;

			if (fix_up) {
				this._peek(same_page(ea, this.y));
				yield null;
			}

			ea = (ea + this.y) & 0xFFFF;
			break ;
		case RELATIVE:
			var branch_test;

			temp = this._nextbyte();
			yield null;

			switch (operation.operation) {
			case "BNE":
				branch_test = !flags.z;
				break ;
			case "BEQ":
				branch_test = flags.z;
				break ;
			case "BPL":
				branch_test = !flags.n;
				break ;
			case "BMI":
				branch_test = flags.n;
				break ;
			case "BCC":
				branch_test = !flags.c;
				break ;
			case "BCS":
				branch_test = flags.c;
				break ;
			case "BVC":
				branch_test = !flags.v;
				break ;
			case "BVS":
				branch_test = flags.v;
				break ;
			}

			if (branch_test) {
				if (temp & 0x80) { temp -= 0x100; }

				// Fake instruction load
				this._peek(this.pc);
				yield null;

				ea = same_page(this.pc, temp);
				this.pc = (this.pc + temp) & 0xFFFF;

				if (ea != this.pc) {
					this._peek(ea);
					yield null;
				}
			}
			continue ;
		case ACCUMULATOR:
			// Fake instruction load
			this._peek(this.pc);
			yield null;

			switch (operation.operation) {
			case 'ASL':
				this.a = asl(this.a);
				break ;
			case 'LSR':
				this.a = lsr(this.a);
				break ;
			case 'ROR':
				this.a = ror(this.a);
				break ;
			case 'ROL':
				this.a = rol(this.a);
				break ;
			default:
				throw new Error("ACCUMULATOR MODE INSTRUCTIONS INCOMPLETE");
			}
			continue;
		}

		// Process actual instruction
		switch (operation.operation) {
			// Special
			case "NOP":
				break ;

			case "BRK":
				this._nextbyte();
				yield null;

				yield* this._interrupt(true);
				flags.i = true;
				break ;

			case "JSR":
				temp = this._nextbyte();
				yield null;
				this._peek(this.s | 0x100);
				yield null;
				this._poke(this.s | 0x100, this.pc >> 8);
				this.s = (this.s - 1) & 0xFF;
				yield null;
				this._poke(this.s | 0x100, this.pc & 0xFF);
				this.s = (this.s - 1) & 0xFF;
				yield null;
				this.pc = temp | (this._nextbyte() << 8);
				yield null;
				break ;

			case "RTI":
				this._peek(this.pc);
				yield null;
				this._peek(this.s | 0x100);
				this.s = (this.s + 1) & 0xFF;
				yield null;
				this.p = this._peek(this.s | 0x100);
				this.s = (this.s + 1) & 0xFF;
				yield null;
				this.pc = this._peek(this.s | 0x100);
				this.s = (this.s + 1) & 0xFF;
				yield null;
				this.pc |= this._peek(this.s | 0x100) << 8;
				yield null;
				break ;

			case "RTS":
				this._peek(this.pc);
				yield null;
				this._peek(this.s | 0x100);
				this.s = (this.s + 1) & 0xFF;
				yield null;
				this.pc = this._peek(this.s | 0x100);
				this.s = (this.s + 1) & 0xFF;
				yield null;
				this.pc |= this._peek(this.s | 0x100) << 8;
				yield null;
				this._nextbyte();
				yield null;
				break ;

			// Stack
			case "PHA":
				this._peek(this.pc);
				yield null;
				this._poke(this.s | 0x100, this.a);
				this.s = (this.s - 1) & 0xFF;
				yield null;
				break;
			case "PHP":
				this._peek(this.pc);
				yield null;
				this._poke(this.s | 0x100, this.p | 0x10);
				this.s = (this.s - 1) & 0xFF;
				yield null;
				break;

			case "PLA":
				this._peek(this.pc);
				yield null;
				this._peek(this.s | 0x100);
				yield null;
				this.s = (this.s + 1) & 0xFF;
				this.a = nz(this._peek(this.s | 0x100));
				yield null;
				break;
			case "PLP":
				this._peek(this.pc);
				yield null;
				this._peek(this.s | 0x100);
				yield null;
				this.s = (this.s + 1) & 0xFF;
				this.p = this._peek(this.s | 0x100);
				yield null;
				break;

			// Branching
			case "JMP":
				this.pc = ea;
				break ;

			// Flags
			case "SEC":
				this.flags.c = true;
				break ;
			case "SED":
				this.flags.d = true;
				break ;
			case "SEI":
				this.flags.i = true;
				break ;
			case "CLC":
				this.flags.c = false;
				break ;
			case "CLD":
				this.flags.d = false;
				break ;
			case "CLI":
				this.flags.i = false;
				break ;
			case "CLV":
				this.flags.v = false;
				break ;

			// Load / Store
			case "LDA":
				this.a = nz(this._peek(ea));
				break ;
			case "LDX":
				this.x = nz(this._peek(ea));
				break ;
			case "LDY":
				this.y = nz(this._peek(ea));
				break ;

			case "STA":
				this._poke(ea, this.a);
				break ;
			case "STX":
				this._poke(ea, this.x);
				break ;
			case "STY":
				this._poke(ea, this.y);
				break ;

			case "TAX":
				nz(this.x = this.a);
				break ;
			case "TAY":
				nz(this.y = this.a);
				break ;
			case "TSX":
				nz(this.x = this.s);
				break ;
			case "TXA":
				nz(this.a = this.x);
				break ;
			case "TXS":
				this.s = this.x;
				break ;
			case "TYA":
				nz(this.a = this.y);
				break ;

			// Bit operators
			case "ORA":
				this.a = nz(this._peek(ea) | this.a);
				yield null;
				break ;
			case "AND":
				this.a = nz(this._peek(ea) & this.a);
				yield null;
				break ;
			case "EOR":
				this.a = nz(this._peek(ea) ^ this.a);
				yield null;
				break ;
			case "BIT":
				temp = this._peek(ea);
				flags.n = temp & 0x80;
				flags.v = temp & 0x40;
				flags.z = !(temp & this.a);
				yield null
				break ;
			case 'ASL':
				temp = this._peek(ea);
				yield null;
				this._poke(ea, temp);
				yield null;
				this._poke(ea, asl(temp));
				yield null;
				break ;
			case 'LSR':
				temp = this._peek(ea);
				yield null;
				this._poke(ea, temp);
				yield null;
				this._poke(ea, lsr(temp));
				yield null;
				break ;
			case 'ROR':
				temp = this._peek(ea);
				yield null;
				this._poke(ea, temp);
				yield null;
				this._poke(ea, ror(temp));
				yield null;
				break ;
			case 'ROL':
				temp = this._peek(ea);
				yield null;
				this._poke(ea, temp);
				yield null;
				this._poke(ea, rol(temp));
				yield null;
				break ;

			// Math / comparisons
			case "CMP":
				var data = this.a - this._peek(ea);
				this.flags.c = data >= 0;
				nz(data & 0xFF);
				yield null;
				break ;

			case "CPX":
				var data = this.x - this._peek(ea);
				this.flags.c = data >= 0;
				nz(data & 0xFF);
				yield null;
				break ;

			case "CPY":
				var data = this.y - this._peek(ea);
				this.flags.c = data >= 0;
				nz(data & 0xFF);
				yield null;
				break ;

			case "DEC":
				temp = this._peek(ea);
				yield null;
				this._poke(ea, temp)
				yield null;
				this._poke(ea, nz((temp - 1) & 0xFF));
				yield null;
				break ;

			case "DEX":
				this.x = nz((this.x - 1) & 0xFF);
				break ;
			case "DEY":
				this.y = nz((this.y - 1) & 0xFF);
				break ;

			case "INC":
				temp = this._peek(ea);
				yield null;
				this._poke(ea, temp)
				yield null;
				this._poke(ea, nz((temp + 1) & 0xFF));
				yield null;
				break ;
			case "INX":
				this.x = nz((this.x + 1) & 0xFF);
				break ;
			case "INY":
				this.y = nz((this.y + 1) & 0xFF);
				break ;

			case "ADC":
				temp = this._peek(ea);
				result = this.a + temp + (flags.c ? 1 : 0)

				flags.v = ~(this.a ^ temp) & (this.a ^ result) & 0x80;
				nz(result & 0xFF);

				if (flags.d) {
					var al = (this.a & 0x0F) + (temp & 0x0F) + (flags.c ? 1 : 0),
						ah = (this.a & 0xF0) + (temp & 0xF0) + ((al >= 0x10) ? 0x10 : 0);

					// Decimal mode fixup
					if (al > 0x09) { al += 0x06; }
					if (ah > 0x90) { ah += 0x60; }

					// We fixed up the decimal, recombine
					result = (al & 0x0F) + ah;
				}

				flags.c = result >= 0x100;
				this.a = result & 0xFF;
				yield null;
				break ;


			case "SBC":
        		temp = this._peek(ea);
            	result = this.a - temp - (flags.c ? 0 : 1);

		        // All flags are like binary mode
		        flags.v = (this.a ^ temp) & (this.a ^ result) & 0x80;
		        nz(result & 0xFF);
		        flags.c = result >= 0;

		        if (flags.d) {
		            var al = (this.a & 0x0F) - (data & 0x0F) - (flags.c ? 0 : 1),
		                ah = (this.a & 0xF0) - (data & 0xF0) - ((al < 0) ? 0x10 : 0);

		            // Calculate fix up decimal mode
		            if (al < 0x00) { al -= 0x06; }
		            if (ah < 0x00) { ah -= 0x60; }

		            result = (al & 0x0F) + ah;
		        }

		        this.a = result & 0xFF;
				yield null;
		        break ;

			default:
				throw new Error("Unhandled operation: " + operation.operation);
		}
	}
}

module.exports = CPU;
