// node -r: the recording server's clock runs at the page's slow-motion rate, so leases and sync stamps agree
const R = +process.env.REC_RATE, T0 = +process.env.REC_T0, rn = Date.now;
if (R && T0) Date.now = () => Math.round(T0 + (rn() - T0) * R);
