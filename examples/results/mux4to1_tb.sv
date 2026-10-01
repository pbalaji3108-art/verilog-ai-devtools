// =============================================================================
// Testbench: tb_mux4to1
// DUT module: mux4to1   (purely combinational, no clock, no reset)
// Assumed ports:
//   input  [7:0] in0
//   input  [7:0] in1
//   input  [7:0] in2
//   input  [7:0] in3
//   input  [1:0] sel
//   output [7:0] out
// Reset: none
// Target: Icarus Verilog 12 (iverilog -g2012)
// =============================================================================
module tb_mux4to1;

  logic [7:0] in0, in1, in2, in3;
  logic [1:0] sel;
  logic [7:0] out;

  integer checks = 0;
  integer errors = 0;

  mux4to1 dut (
    .in0(in0), .in1(in1), .in2(in2), .in3(in3),
    .sel(sel),
    .out(out)
  );

  // Reference model: what the DUT output SHOULD be
  function automatic [7:0] expected_out(input [7:0] a, b, c, d, input [1:0] s);
    case (s)
      2'd0: expected_out = a;
      2'd1: expected_out = b;
      2'd2: expected_out = c;
      2'd3: expected_out = d;
    endcase
  endfunction

  // Drive inputs, let combinational logic settle (#1), compare
  task automatic apply_and_check(input [7:0] a, b, c, d, input [1:0] s);
    logic [7:0] exp;
    begin
      in0 = a; in1 = b; in2 = c; in3 = d; sel = s;
      #1;
      exp = expected_out(a, b, c, d, s);
      checks = checks + 1;
      if (out !== exp) begin   // !== also catches X/Z on the output
        errors = errors + 1;
        $display("ERROR: sel=%0d in0=%h in1=%h in2=%h in3=%h | expected out=%h, got out=%h",
                 s, a, b, c, d, exp, out);
      end
    end
  endtask

  // Watchdog: a combinational test should never take this long
  initial begin
    #100000;
    $display("ERROR: watchdog timeout");
    $display("TEST FAILED");
    $finish;
  end

  integer i;
  initial begin
    $dumpfile("dump.vcd");
    $dumpvars(0, tb_mux4to1);

    // ---------------- Directed tests ----------------
    // Distinct value on every input so a wrong select is always visible
    for (i = 0; i < 4; i = i + 1)
      apply_and_check(8'hA0, 8'hB1, 8'hC2, 8'hD3, i[1:0]);
    // All zeros / all ones
    for (i = 0; i < 4; i = i + 1) apply_and_check(8'h00, 8'h00, 8'h00, 8'h00, i[1:0]);
    for (i = 0; i < 4; i = i + 1) apply_and_check(8'hFF, 8'hFF, 8'hFF, 8'hFF, i[1:0]);
    // Only the selected input is all-ones (catches stuck or swapped bits)
    apply_and_check(8'hFF, 8'h00, 8'h00, 8'h00, 2'd0);
    apply_and_check(8'h00, 8'hFF, 8'h00, 8'h00, 2'd1);
    apply_and_check(8'h00, 8'h00, 8'hFF, 8'h00, 2'd2);
    apply_and_check(8'h00, 8'h00, 8'h00, 8'hFF, 2'd3);
    // Alternating bit patterns
    apply_and_check(8'h55, 8'hAA, 8'h55, 8'hAA, 2'd1);
    apply_and_check(8'hAA, 8'h55, 8'hAA, 8'h55, 2'd2);

    // ---------------- Random tests ----------------
    for (i = 0; i < 200; i = i + 1)
      apply_and_check($urandom_range(0, 255), $urandom_range(0, 255),
                      $urandom_range(0, 255), $urandom_range(0, 255),
                      $urandom_range(0, 3));

    // ---------------- Summary ----------------
    $display("Checks: %0d  Errors: %0d", checks, errors);
    if (errors == 0) $display("TEST PASSED");
    else             $display("TEST FAILED");
    $finish;
  end

endmodule
