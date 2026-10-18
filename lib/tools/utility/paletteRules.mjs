export function rgbToHex(r,g,b){
 if(![r,g,b].every(v=>Number.isInteger(v)&&v>=0&&v<=255))throw new Error("Invalid color channel.");
 return "#"+[r,g,b].map(n=>n.toString(16).padStart(2,"0")).join("").toUpperCase();
}
export function dominantPalette(data,limit=6){
 if(!(data instanceof Uint8ClampedArray)||data.length%4!==0||data.length<4||!Number.isInteger(limit)||limit<1||limit>10)throw new Error("Invalid pixel data.");
 const histogram=new Map();
 for(let i=0;i<data.length;i+=4){if(data[i+3]<150)continue;
  const r=data[i]>>5,g=data[i+1]>>5,b=data[i+2]>>5;const key=(r<<6)|(g<<3)|b;
  const val=histogram.get(key)||{r:0,g:0,b:0,n:0};val.r+=data[i];val.g+=data[i+1];val.b+=data[i+2];val.n++;histogram.set(key,val);
 }
 return [...histogram.values()].sort((a,b)=>b.n-a.n).slice(0,limit).map(x=>{
 const r=Math.round(x.r/x.n),g=Math.round(x.g/x.n),b=Math.round(x.b/x.n);return{hex:rgbToHex(r,g,b),rgb:`rgb(${r}, ${g}, ${b})`,count:x.n};
 });
}
