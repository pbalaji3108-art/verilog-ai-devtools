// buggy_counter.sv
// A 4-bit up-counter with an ASYNCHRONOUS active-high reset and an enable.
// Intent: count clears to 0 immediately when rst goes high, without waiting
// for a clock edge.
//
// Try it: npm run explain-bug -- -f examples/buggy_counter.sv
// (Contains two intentional functional bugs, plus one style/lint issue.)

module counter (
    input        clk,
    input        rst,
    input        en,
    output reg [3:0] count
);

  always @(posedge clk) begin
    if (rst)
      count = 4'b0000;
    else if (en)
      count <= count + 1;
  end

endmodule
