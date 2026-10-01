// mux4to1.sv -- reference DUT for examples/mux_description.txt
module mux4to1 (
    input  logic [7:0] in0, in1, in2, in3,
    input  logic [1:0] sel,
    output logic [7:0] out
);
  always_comb begin
    case (sel)
      2'd0:    out = in0;
      2'd1:    out = in1;
      2'd2:    out = in2;
      default: out = in3;
    endcase
  end
endmodule
