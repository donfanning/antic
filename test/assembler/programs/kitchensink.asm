.memory 16
.org 	0

irq:	RTI
reset:	JMP entry

.org 0xFFFA
.dw		irq_null, reset, irq_null
