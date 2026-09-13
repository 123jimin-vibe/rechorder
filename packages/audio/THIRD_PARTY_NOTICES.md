# The Synthesis ToolKit in C++ (STK)

The bow reflection function and bowed waveguide topology in `src/string-model.ts`
are adapted from STK's Bowed and BowTable and Julius O. Smith's bowed-string model.
The violin body coefficients in `src/string-body.ts` are from STK Bowed, contributed
by Esteban Maestre (2011). Rechorder adds rate conversion, phase compensation,
independent players, expressive motion, oversampling and streaming scheduling.

Sources: [Bowed.cpp](https://github.com/thestk/stk/blob/master/src/Bowed.cpp),
[Bowed.h](https://github.com/thestk/stk/blob/master/include/Bowed.h),
[BowTable.h](https://github.com/thestk/stk/blob/master/include/BowTable.h),
[Smith's bowed-string model](https://www.dsprelated.com/freebooks/pasp/Digital_Waveguide_Bowed_String.html).

The Synthesis ToolKit in C++ (STK)
Copyright (c) 1995-2023 Perry R. Cook and Gary P. Scavone

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:
The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

Any person wishing to distribute modifications to the Software is
asked to send the modifications to the original developer so that they
can be incorporated into the canonical version. This is, however, not
a binding provision of this license.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR
ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
