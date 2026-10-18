const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const defaultCorners = () => [[0.05,0.05],[0.95,0.05],[0.95,0.95],[0.05,0.95]];
export function validateCorners(corners){
 if (!Array.isArray(corners)||corners.length!==4||corners.some(p=>!Array.isArray(p)||p.length!==2||p.some(x=>!Number.isFinite(x)||x<0||x>1))) throw new Error("Invalid document corners.");
 // Reject degenerate or self-crossing quadrilaterals (consistent winding).
 let sign=0;
 for(let i=0;i<4;i++){
   const a=corners[i], b=corners[(i+1)%4], c=corners[(i+2)%4];
   const z=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);
   if(Math.abs(z)<0.00001)throw new Error("Document corners are too close together.");
   if(sign && Math.sign(z)!==sign)throw new Error("Document corners must form a convex shape.");
   sign=Math.sign(z);
 }
 return corners;
}
// Solves 8x8 homography system mapping (u,v) destination to source pixels.
export function sourceHomography(corners,width,height){
 validateCorners(corners);
 const dest=[[0,0],[1,0],[1,1],[0,1]];
 const matrix=[];
 for(let k=0;k<4;k++){
  const [u,v]=dest[k],x=corners[k][0]*(width-1),y=corners[k][1]*(height-1);
  matrix.push([u,v,1,0,0,0,-u*x,-v*x,x]);
  matrix.push([0,0,0,u,v,1,-u*y,-v*y,y]);
 }
 for(let c=0;c<8;c++){
  let pivot=c;for(let row=c+1;row<8;row++)if(Math.abs(matrix[row][c])>Math.abs(matrix[pivot][c]))pivot=row;
  if(Math.abs(matrix[pivot][c])<1e-10)throw new Error("Corner transform is degenerate.");
  [matrix[c],matrix[pivot]]=[matrix[pivot],matrix[c]];
  const factor=matrix[c][c];for(let j=c;j<=8;j++)matrix[c][j]/=factor;
  for(let r=0;r<8;r++)if(r!==c){const f=matrix[r][c];for(let j=c;j<=8;j++)matrix[r][j]-=f*matrix[c][j];}
 }
 const h=matrix.map(row=>row[8]);
 return (u,v)=>{const d=h[6]*u+h[7]*v+1;return [(h[0]*u+h[1]*v+h[2])/d,(h[3]*u+h[4]*v+h[5])/d];};
}
export function scanOutputSize(corners,width,height){
 validateCorners(corners);
 const length=(a,b)=>Math.hypot((a[0]-b[0])*width,(a[1]-b[1])*height);
 const rawW=Math.max(length(corners[0],corners[1]),length(corners[3],corners[2]));
 const rawH=Math.max(length(corners[0],corners[3]),length(corners[1],corners[2]));
 if(rawW<30||rawH<30)throw new Error("Document selection is too small.");
 const scale=Math.min(1,1600/rawW,2000/rawH,Math.sqrt(2500000/(rawW*rawH)));
 return {width:Math.max(100,Math.round(rawW*scale)),height:Math.max(100,Math.round(rawH*scale))};
}
export function enhanceScanPixel(r,g,b,mode){
 if(mode==="COLOR")return [r,g,b];
 const gray=Math.round(r*.299+g*.587+b*.114);
 if(mode==="GRAYSCALE")return [gray,gray,gray];
 if(mode==="ENHANCE"){
  const v=clamp(Math.round((gray-128)*1.45+140),0,255);return [v,v,v];
 }
 throw new Error("Unsupported scan appearance.");
}
