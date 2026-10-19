/** Browser-only, user-selected flat color flood fill. NOT AI segmentation. */
export const LOCAL_MAX_PIXELS=1_500_000;
export function removeConnectedSolidColor({rgba,width,height,x=0,y=0,tolerance=35}={}) {
  if (!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width*height>LOCAL_MAX_PIXELS) throw new Error('Image exceeds local pixel limit.');
  if (!(rgba instanceof Uint8ClampedArray || rgba instanceof Uint8Array) || rgba.length !== width*height*4) throw new Error('Invalid pixel data.');
  if (![x,y,tolerance].every(Number.isSafeInteger)||x<0||y<0||x>=width||y>=height||tolerance<0||tolerance>180) throw new Error('Invalid sample point or tolerance.');
  const result=new Uint8ClampedArray(rgba);
  const target=(y*width+x)*4;
  const red=rgba[target],green=rgba[target+1],blue=rgba[target+2];
  const maxDist=tolerance*tolerance*3;
  const seen=new Uint8Array(width*height);
  const queue=new Int32Array(width*height);
  const start=y*width+x;queue[0]=start;seen[start]=1;
  let head=0,tail=1,removed=0;
  const tryAdd=(i)=>{
    if(seen[i])return;
    seen[i]=1;
    const j=i*4,dr=rgba[j]-red,dg=rgba[j+1]-green,db=rgba[j+2]-blue;
    if(dr*dr+dg*dg+db*db<=maxDist)queue[tail++]=i;
  };
  while(head<tail){
    const i=queue[head++],p=i*4;
    if(result[p+3]>0)removed++;
    result[p+3]=0;
    const cx=i%width,cy=Math.floor(i/width);
    if(cx>0)tryAdd(i-1);
    if(cx+1<width)tryAdd(i+1);
    if(cy>0)tryAdd(i-width);
    if(cy+1<height)tryAdd(i+width);
  }
  return {rgba:result,removedPixels:removed,sampledColor:[red,green,blue],width,height,algorithm:'CONNECTED_SOLID_COLOR_ONLY',aiGenerated:false};
}
