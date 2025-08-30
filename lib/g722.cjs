'use strict';

// Minimal G.722 encoder ported from spandsp (LGPL v2.1)
// Only implements 64kbit/s mode with 16kHz sample rate.

const qmf_coeffs_fwd = Int16Array.from([3,-11,12,32,-210,951,3876,-805,362,-156,53,-11]);
const qmf_coeffs_rev = Int16Array.from([-11,53,-156,362,-805,3876,951,-210,32,12,-11,3]);
const qm2 = Int16Array.from([-7408,-1616,7408,1616]);
const qm4 = Int16Array.from([0,-20456,-12896,-8968,-6288,-4240,-2584,-1200,20456,12896,8968,6288,4240,2584,1200,0]);
const qm5 = Int16Array.from([
  -280,-280,-23352,-17560,-14120,-11664,-9752,-8184,-6864,-5712,-4696,-3784,-2960,-2208,-1520,-880,
  23352,17560,14120,11664,9752,8184,6864,5712,4696,3784,2960,2208,1520,880,280,-280
]);
const qm6 = Int16Array.from([
  -136,-136,-136,-136,-24808,-21904,-19008,-16704,-14984,-13512,-12280,-11192,-10232,-9360,-8576,-7856,
  -7192,-6576,-6000,-5456,-4944,-4464,-4008,-3576,-3168,-2776,-2400,-2032,-1688,-1360,-1040,-728,
  24808,21904,19008,16704,14984,13512,12280,11192,10232,9360,8576,7856,7192,6576,6000,5456,
  4944,4464,4008,3576,3168,2776,2400,2032,1688,1360,1040,728,432,136,-432,-136
]);
const q6 = Int16Array.from([
  0,35,72,110,150,190,233,276,323,370,422,473,530,587,650,714,
  786,858,940,1023,1121,1219,1339,1458,1612,1765,1980,2195,2557,2919,0,0
]);
const ilb = Int16Array.from([
 2048,2093,2139,2186,2233,2282,2332,2383,2435,2489,2543,2599,2656,2714,2774,2834,
 2896,2960,3025,3091,3158,3228,3298,3371,3444,3520,3597,3676,3756,3838,3922,4008
]);
const iln = Int16Array.from([0,63,62,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16,15,14,13,12,11,10,9,8,7,6,5,4,0]);
const ilp = Int16Array.from([0,61,60,59,58,57,56,55,54,53,52,51,50,49,48,47,46,45,44,43,42,41,40,39,38,37,36,35,34,33,32,0]);
const ihn = Int16Array.from([0,1,0]);
const ihp = Int16Array.from([0,3,2]);
const wl = Int16Array.from([-60,-30,58,172,334,538,1198,3042]);
const rl42 = Int16Array.from([0,7,6,5,4,3,2,1,7,6,5,4,3,2,1,0]);
const wh = Int16Array.from([0,-214,798]);
const rh2 = Int16Array.from([2,1,2,1]);

function satAdd16(a,b){ let s=a+b; if(s>32767) return 32767; if(s<-32768) return -32768; return s; }
function satSub16(a,b){ let s=a-b; if(s>32767) return 32767; if(s<-32768) return -32768; return s; }
function saturate16(x){ if(x>32767) return 32767; if(x<-32768) return -32768; return x; }

function vecDot(x, coeffs, size, ptr){
  let sum=0;
  for(let i=0;i<size;i++) sum += x[(ptr+i)%size]*coeffs[i];
  return sum;
}

function Block(){
  return {nb:0,det:0,s:0,sz:0,r:0,p:new Int16Array(2),a:new Int16Array(2),b:new Int16Array(6),d:new Int16Array(7)};
}

function State(){
  return {
    band:[{...Block(),det:32},{...Block(),det:8}],
    x:new Int16Array(12),
    y:new Int16Array(12),
    ptr:0
  };
}

function block4(band, dx){
  let wd1,wd2,wd3,sp,r,p; const ap=new Int16Array(2);
  r=satAdd16(band.s,dx); p=satAdd16(band.sz,dx);
  wd1=saturate16(band.a[0]<<2); let wd32=((p^band.p[0])&0x8000)?-wd1:wd1;
  if(wd32>32767) wd32=32767; wd3=(((p^band.p[1])&0x8000)?-128:128)+(wd32>>7)+((band.a[1]*32512)>>15);
  if(Math.abs(wd3)>12288) wd3=wd3<0?-12288:12288; ap[1]=wd3;
  wd1=((p^band.p[0])&0x8000)?-192:192; wd2=((band.a[0]*32640)>>15); ap[0]=satAdd16(wd1,wd2);
  wd3=satSub16(15360,ap[1]); if(Math.abs(ap[0])>wd3) ap[0]=ap[0]<0?-wd3:wd3;
  wd1=satAdd16(r,r); wd1=(ap[0]*wd1)>>15; wd2=satAdd16(band.r,band.r); wd2=(ap[1]*wd2)>>15;
  sp=satAdd16(wd1,wd2); band.r=r; band.a[1]=ap[1]; band.a[0]=ap[0]; band.p[1]=band.p[0]; band.p[0]=p;
  let wd = dx===0?0:128; band.d[0]=dx; let sz=0;
  for(let i=5;i>=0;i--){ wd2=((band.d[i+1]^dx)&0x8000)?-wd:wd; wd3=((band.b[i]*32640)>>15); band.b[i]=satAdd16(wd2,wd3); wd3=satAdd16(band.d[i],band.d[i]); sz += (band.b[i]*wd3)>>15; band.d[i+1]=band.d[i]; }
  band.sz=sz; band.d[0]=dx; band.s=satAdd16(sp,sz);
}

function encode(pcm){
  const s=State();
  const out=new Uint8Array(pcm.length);
  let g722_bytes=0; let xhigh=0;
  for(let j=0;j<pcm.length;){
    let xlow,el,wd,wd1,ril,wd2,il4,ih2,wd3,eh,code,dlow,dhigh,ilow,ihigh,mih;
    // transmit QMF
    s.x[s.ptr]=pcm[j++]; s.y[s.ptr]=pcm[j++]; if(++s.ptr>=12) s.ptr=0;
    const sumodd=vecDot(s.x,qmf_coeffs_fwd,12,s.ptr); const sumeven=vecDot(s.y,qmf_coeffs_rev,12,s.ptr);
    xlow=(sumeven+sumodd)>>14; xhigh=(sumeven-sumodd)>>14;
    el=satSub16(xlow,s.band[0].s);
    wd=el>=0?el:~el;
    for(let i=1;i<30;i++){ wd1=(q6[i]*s.band[0].det)>>12; if(wd<wd1){ wd1=i; break;} }
    let i=wd1; ilow=el<0?iln[i]:ilp[i];
    ril=ilow>>2; wd2=qm4[ril]; dlow=(s.band[0].det*wd2)>>15;
    il4=rl42[ril]; wd=(s.band[0].nb*127)>>7; s.band[0].nb=wd+wl[il4];
    if(s.band[0].nb<0) s.band[0].nb=0; else if(s.band[0].nb>18432) s.band[0].nb=18432;
    wd1=(s.band[0].nb>>6)&31; wd2=8-(s.band[0].nb>>11); wd3=wd2<0?(ilb[wd1]<<-wd2):(ilb[wd1]>>wd2); s.band[0].det=wd3<<2;
    block4(s.band[0],dlow);
    // high band
    eh=satSub16(xhigh,s.band[1].s);
    wd=eh>=0?eh:~eh; wd1=(564*s.band[1].det)>>12; mih=wd>=wd1?2:1; ihigh=eh<0?ihn[mih]:ihp[mih];
    wd2=qm2[ihigh]; dhigh=(s.band[1].det*wd2)>>15;
    ih2=rh2[ihigh]; wd=(s.band[1].nb*127)>>7; s.band[1].nb=wd+wh[ih2];
    if(s.band[1].nb<0) s.band[1].nb=0; else if(s.band[1].nb>22528) s.band[1].nb=22528;
    wd1=(s.band[1].nb>>6)&31; wd2=10-(s.band[1].nb>>11); wd3=wd2<0?(ilb[wd1]<<-wd2):(ilb[wd1]>>wd2); s.band[1].det=wd3<<2;
    block4(s.band[1],dhigh); code=((ihigh<<6)|ilow)&0xFF;
    out[g722_bytes++]=code;
  }
  return Buffer.from(out.slice(0,g722_bytes));
}

module.exports = { encode };
