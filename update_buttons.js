const fs = require('fs');
const glob = require('glob');

const buttonClassMap = [
  {
    regex: /bg-primary\s+hover:bg-white\s+text-black[^\"]*skew-x-\[-15deg\][^\"]*/g,
    replacement: "bg-primary text-black font-display uppercase tracking-widest font-black border-2 border-primary border-b-[6px] border-r-[6px] hover:bg-white hover:border-white active:border-b-2 active:border-r-2 active:translate-y-1 active:translate-x-1 transition-all shadow-xl px-6 py-3"
  },
  {
    regex: /bg-primary\s+text-black\s+px-6\s+py-2\s+font-display[^\"]*skew-x-\[-10deg\][^\"]*/g,
    replacement: "bg-primary text-black font-display uppercase tracking-widest font-black border-2 border-primary border-b-[4px] border-r-[4px] hover:bg-white hover:border-white active:border-b-2 active:border-r-2 active:translate-y-1 active:translate-x-1 transition-all shadow-md px-6 py-2"
  }
];

// Let's just create a general replacement strategy for ALL buttons with 'bg-primary' that look like CTA.
