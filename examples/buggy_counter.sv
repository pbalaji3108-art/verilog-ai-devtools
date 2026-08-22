// buggy_counter.sv
// A 4-bit up-counter with synchronous reset and enable.
// Use this with `explain-bug` once you've implemented bugExplainer.js.
// (There are two intentional bugs in here for you to have Claude find.)

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
