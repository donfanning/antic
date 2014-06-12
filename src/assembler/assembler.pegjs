top_level
	= _ statements:statement*
		{ return statements }

statement
	= label
	/ instance
	/ directive
	/ operation

instance
	= name:identifier "(" args:expression_list ")"
		{ return { type: "MacroInstance", name: name, arguments: args } }
	/ name:identifier
		{ return { type: "MacroInstance", name: name, arguments: null } }

directive
	= ".def" _ name:identifier exp:expression
		{ return { type: "Define", length: exp } }
	/ ".org" _ exp:expression
		{ return { type: "SetOrigin", length: exp } }
	/ ".db" _ exp:expression_list
		{ return { type: "DataBytes", length: exp } }
	/ ".dw" _ exp:expression_list
		{ return { type: "DataWords", length: exp } }
	/ ".ds" _ exp:expression
		{ return { type: "DataSegment", length: exp } }
	/ if_directive
	/ macro_directive
	/ proc_directive

macro_directive
	= ".macro"i _ name:identifier args:argument_list statements:statement* ".end"i _
		{ return { type:"MacroDefinition", name: name, arguments: args, statements: statements } }

argument_list
	= "(" _ list:name_list ")" _
		{ return list; }
	/ 
		{ return null; }

proc_directive
	= ".proc"i _ statements:statement* ".end"i _
		{ return { type: "ProcDirective", statements: statements } }

if_directive
	= ".if"i _ exp:expression statements:statement*
		elseifs:elsif_directive*
		els:else_directive?
		".end"i
		{ return { "type": "IfStatement", "test": exp, "statements": s, "else_if": elseifs, "else": els } }

elsif_directive
	= ".elsif"i _ exp:expression s:statement* 
		{ return { type: "ElseIfStatements", statements: s, test: exp } }

else_directive
	= ".else"i _ s:statement*
		{ return { type: "ElseStatements", statements: s } }

name_list
	= a:(a:identifier "," _ { return a; })* b:identifier
		{ return a.concat(b); }

expression_list
	= a:(a:expression "," _ { return a; })* b:expression
		{ return a.concat(b) }

operation
	= name:instruction arg:argument
		{ return { type: "Operation", name: name, argument: arg } }

argument
	= reg:register
		{ return { type: "Register", name: reg } }
	/ "#" _ exp:expression
		{ return { type: "Immediate", value: exp } }
	/ exp:expression "," _ reg:register
		{ return { type: "AbsoluteIndexed", address:exp, register: reg } }
	/ exp:expression
		{ return { type: "Absolute", address:exp } }
	/ "[" _ exp:expression "]" _ "," _ reg:register
		{ return { type: "IndirectIndexed", address:exp, register: reg } }
	/ "[" _ exp:expression "," _ reg:register "]" _ 
		{ return { type: "IndexedIndirect", address:exp, register: reg } }
	/ "[" _ exp:expression "]" _ 
		{ return { type: "Indirect", address:exp } }
	/
		{ return { type: "Implied" } }

label
	= local:"@"? _ label:identifier ":" _
		{ return { type: "Label", name: label, local: Boolean(local) } }

expression
	= logical_or_expression

logical_or_expression
	= a:logical_and_expression "||" _ b:logical_or_expression
		{ return { type: "LogicalOr", left:a, right:b } }
	/ logical_and_expression

logical_and_expression
	= a:equality_expression "&&" _ b:logical_and_expression
		{ return { type: "LogicalAnd", left:a, right:b } }
	/ equality_expression

equality_expression
	= a:relational_expression "==" _ b:equality_expression
		{ return { type: "Equal", left:a, right:b } }
	/ a:relational_expression "!=" _ b:equality_expression
		{ return { type: "NotEqual", left:a, right:b } }
	/ relational_expression

relational_expression
	= a:bitwise_expression ">=" _ b:relational_expression
		{ return { type: "GreaterThanEqual", left:a, right:b } }
	/ a:bitwise_expression ">" _ b:relational_expression
		{ return { type: "GreaterThan", left:a, right:b } }
	/ a:bitwise_expression "<=" _ b:relational_expression
		{ return { type: "LessThanEqual", left:a, right:b } }
	/ a:bitwise_expression "<" _ b:relational_expression
		{ return { type: "LessThan", left:a, right:b } }
	/ bitwise_expression

bitwise_expression
	= a:shift_expression "&" _ b:bitwise_expression
		{ return { type: "BitwiseAnd", left:a, right:b } }
	/ a:shift_expression "^" _ b:bitwise_expression
		{ return { type: "BitwiseXor", left:a, right:b } }
	/ a:shift_expression "|" _ b:bitwise_expression
		{ return { type: "BitwiseOr", left:a, right:b } }
	/ shift_expression

shift_expression
	= a:addition_expression "<<" _ b:shift_expression
		{ return { type: "ShiftLeft", left:a, right:b } }
	/ a:addition_expression ">>>" _ b:shift_expression
		{ return { type: "ArithmaticShiftRight", left:a, right:b } }
	/ a:addition_expression ">>" _ b:shift_expression
		{ return { type: "ShiftRight", left:a, right:b } }
	/ addition_expression

addition_expression
	= a:multiplication_expression "+" _ b:addition_expression
		{ return { type: "Add", left:a, right:b } }
	/ a:multiplication_expression "-" _ b:addition_expression
		{ return { type: "Subtract", left:a, right:b } }
	/ multiplication_expression

multiplication_expression
	= a:group_expression "*" _ b:multiplication_expression
		{ return { type: "Multiply", left:a, right:b } }
	/ a:group_expression "/" _ b:multiplication_expression
		{ return { type: "Divide", left:a, right:b } }
	/ group_expression

group_expression
	= "(" _ exp:expression ")" _
		{ return exp }
	/ "-" _ exp:group_expression
		{ return { type: "Negate", value: exp } }
	/ "~" _ exp:group_expression
		{ return { type: "Complement", value: exp } }
	/ "!" _ exp:group_expression
		{ return { type: "Not", value: exp } }
	/ num:number
		{ return { type: "Number", value: num } }
	/ name:identifier
		{ return { type: "Identifier", name: name } }
	/ str:string
		{ return { type: "String", value:str } }

number
	= ("$" / "0x"i) hex:([0-9a-f]i+) _
		{ return parseInt(hex, 16) }
	/ "0" oct:([0-7]+) _
		{ return parseInt(oct, 8) }
	/ dec:([0-9]+) _
		{ return parseInt(dec, 10) }
	/ "0b"i bin:([01]+) _
		{ return parseInt(bin, 2) }
	/ "'" chr:string_char  "'"
		{ return chr.charCodeAt(0); }

string
	= '"' ch:string_char* '"'
		{ return ch.join(''); }

string_char
	= "\\x" chr:$([0-9a-f]i{2})
		{ return String.fromCharCode(parseInt(chr, 16)); }
	/ "\\u" chr:$([0-9a-f]i{4})
		{ return String.fromCharCode(parseInt(chr, 16)); }
	/ chr:$([0-9]i{1,3})
		{ return String.fromCharCode(parseInt(chr, 10)); }
	/ "\\n"i
		{ return "\n"; }
	/ "\\r"i
		{ return "\r"; }
	/ "\\t"i
		{ return "\t"; }
	/ "\\" b:.
		{ return b; }
	/ [^"\n\r]

identifier
	= !reserved name:$(identifier_character+) _
		{ return name }

reserved
	= register / instruction

register
	= name:register_name !identifier_character _
		{ return name.toUpperCase() }

instruction
	= name:instruction_name !identifier_character _
		{ return name.toUpperCase() }

instruction_name
	= "ADC"i / "AND"i / "ASL"i / "BCC"i / "BCS"i / "BEQ"i / "BIT"i / "BMI"i 
	/ "BNE"i / "BPL"i / "BRK"i / "BVC"i / "BVS"i / "CLC"i / "CLD"i / "CLI"i 
	/ "CLV"i / "CMP"i / "CPX"i / "CPY"i / "DEC"i / "DEX"i / "DEY"i / "EOR"i 
	/ "INC"i / "INX"i / "INY"i / "JMP"i / "JSR"i / "LDA"i / "LDY"i / "LDY"i 
	/ "LSR"i / "NOP"i / "ORA"i / "PHA"i / "PHP"i / "PLA"i / "PLP"i / "ROL"i 
	/ "ROR"i / "RTI"i / "RTS"i / "SBC"i / "SEC"i / "SED"i / "SEI"i / "STA"i 
	/ "STX"i / "STY"i / "TAX"i / "TAY"i / "TSX"i / "TXA"i / "TXS"i / "TYA"i

register_name
	= "A"i / "X"i / "Y"i / "S"i / "PC"i / "P"i

identifier_character
	 = [a-zA-Z_]

_
	= [ \n\r\t]*
