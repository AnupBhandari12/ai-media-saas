import {describe,expect,test} from "bun:test";
import {getWorkflowById} from "../../lib/workflows/registry.js";
import {runApprovedLocalSteps} from "../../lib/workflows/runLocalWorkflow.js";
import {runEcommerceProductPack} from "../../lib/workflows/runEcommerceProductPack.js";
import {ECOMMERCE_STEPS,ECOMMERCE_OUTPUTS,ECOMMERCE_LIMITS,
  normalizeEcommerceSettings,validateEcommerceFile,validateEcommerceDimensions,
  getEcommerceCrop,getEcommercePlan,ecommerceDownloadName,createEcommerceMetadata}
  from "../../lib/workflows/ecommerceProductPackPlan.js";

const img=(type="image/jpeg",name="shoe-photo.jpg")=>new File([new Uint8Array(1024)],name,{type});
const blob=(type="image/jpeg",size=1000)=>new Blob([new Uint8Array(size)],{type});
function adapters({calls=[],dimensionsOverride,watermarkType,resizeDimensions}={}) {
  return {
    dimensions:async file=>{
      if (dimensionsOverride) return dimensionsOverride;
      if (file.name.startsWith("product-crop.")) return {width:1600,height:1600};
      if (file.name.startsWith("product-resized.")||file.name.startsWith("product-watermarked.")) {
        const size=resizeDimensions??(calls.filter(c=>c==="IMG-03").length===1?1200:800);
        return {width:size,height:size};
      }
      return {width:2400,height:1600};
    },
    crop:async(file,settings)=>{calls.push("IMG-08");expect(settings).toMatchObject({width:1600,height:1600});
      return {blob:blob(file.type),width:1600,height:1600};},
    resize:async(file,w,h)=>{calls.push("IMG-03");return {blob:blob(file.type),width:w,height:h};},
    watermark:async(file,options)=>{calls.push("IMG-12");expect(options.text).toBe("My Shop");
      const size=calls.filter(c=>c==="IMG-03").length===1?1200:800;
      return {blob:blob(watermarkType??file.type),width:size,height:size};},
  };
}
describe("Phase 22 Stage 10 WF-09 E-commerce Product Pack local beta",()=>{
  test("approved registry plan and two output sizes",()=>{
    expect(getWorkflowById("WF-09").variants[0].steps).toEqual(ECOMMERCE_STEPS);
    expect(getEcommercePlan().steps).toEqual(["IMG-08","IMG-03","IMG-12"]);
    expect(ECOMMERCE_OUTPUTS.map(x=>x.size)).toEqual([1200,800]);
  });
  test("rejects arbitrary/AI/paid settings and invalid metadata",()=>{
    for(const bad of [null,[],{steps:["AI-01"]},{backgroundRemove:true},{provider:"api"},
      {productName:"x"},{productName:"a".repeat(91)},{altText:"bad"},
      {watermarkText:"x".repeat(51)},{focusX:-1},{focusY:101}])
      expect(()=>normalizeEcommerceSettings(bad)).toThrow();
  });
  test("accepts expected types and rejects empty/large/unsupported",()=>{
    for(const type of ["image/jpeg","image/png","image/webp"]) expect(validateEcommerceFile(img(type))).toBeTruthy();
    expect(()=>validateEcommerceFile()).toThrow();
    expect(()=>validateEcommerceFile(img("image/svg+xml"))).toThrow();
    expect(()=>validateEcommerceFile(new File([],"empty.jpg",{type:"image/jpeg"}))).toThrow();
    expect(()=>validateEcommerceFile({name:"big.jpg",type:"image/jpeg",size:ECOMMERCE_LIMITS.maxInputBytes+1})).toThrow();
  });
  test("source bounds prohibit upscale and processing bombs",()=>{
    expect(validateEcommerceDimensions(2000,1500)).toEqual({width:2000,height:1500});
    for (const [w,h] of [[1199,1500],[1400,500],[8001,5000],[5000,5000],[-1,1200]])
      expect(()=>validateEcommerceDimensions(w,h)).toThrow();
  });
  test("square crop honors horizontal/vertical focus",()=>{
    expect(getEcommerceCrop({width:2400,height:1600},{focusX:0})).toEqual({x:0,y:0,width:1600,height:1600});
    expect(getEcommerceCrop({width:2400,height:1600},{focusX:100})).toEqual({x:800,y:0,width:1600,height:1600});
    expect(getEcommerceCrop({width:1600,height:2400},{focusY:75})).toEqual({x:0,y:600,width:1600,height:1600});
  });
  test("two local outputs, two step traces, no watermark when blank",async()=>{
    const calls=[];const r=await runEcommerceProductPack(img(),{}, {adapters:adapters({calls})});
    expect(calls).toEqual(["IMG-08","IMG-03","IMG-08","IMG-03"]);
    expect(r.outputs.map(o=>[o.variant,o.width,o.height])).toEqual([["catalog",1200,1200],["web",800,800]]);
    expect(r.outputs.every(o=>o.trace.map(t=>t.id).join(",")===ECOMMERCE_STEPS.join(","))).toBe(true);
    expect(r.outputs.every(o=>o.trace[2].status==="SKIPPED")).toBe(true);
    expect(r.outputs[0].filename).toBe("shoe-photo-product-catalog.jpg");
    expect(r.metadata.filename).toBe("shoe-photo-product-metadata.txt");
  });
  test("watermark enabled performs IMG-12 for both sizes",async()=>{
    const calls=[];const r=await runEcommerceProductPack(img(),{watermarkText:"My Shop"},{adapters:adapters({calls})});
    expect(calls).toEqual(["IMG-08","IMG-03","IMG-12","IMG-08","IMG-03","IMG-12"]);
    expect(r.outputs.every(o=>o.trace[2].status==="COMPLETED")).toBe(true);
  });
  test("PNG and WebP extensions reflect real result MIME",async()=>{
    for(const [type,ext] of [["image/png","png"],["image/webp","webp"]]) {
      const r=await runEcommerceProductPack(img(type,`chair.${ext}`),{}, {adapters:adapters()});
      expect(r.outputs.map(o=>o.filename)).toEqual([`chair-product-catalog.${ext}`,`chair-product-web.${ext}`]);
    }
  });
  test("blocks wrong watermark MIME",async()=>{
    await expect(runEcommerceProductPack(img(),{watermarkText:"My Shop"},
      {adapters:adapters({watermarkType:"image/webp"})})).rejects.toThrow(/Invalid/);
  });
  test("blocks forged decoded dimensions",async()=>{
    await expect(runEcommerceProductPack(img(),{},{adapters:adapters({resizeDimensions:799})}))
      .rejects.toThrow(/dimensions/i);
  });
  test("rejects missing adapters",async()=>{
    await expect(runEcommerceProductPack(img(),{},{adapters:{dimensions:async()=>({width:2000,height:2000})}})).rejects.toThrow();
  });
  test("cancel prevents processing",async()=>{
    const controller=new AbortController();controller.abort();
    await expect(runEcommerceProductPack(img(),{},{signal:controller.signal,adapters:adapters()}))
      .rejects.toThrow(/cancel/i);
  });
  test("metadata includes agreed deliverables and background removal caveat",()=>{
    const text=createEcommerceMetadata({sourceName:"shoes.jpg",config:normalizeEcommerceSettings(),
      outputs:[{variant:"catalog",width:1200,height:1200,bytes:1333}]});
    expect(text).toContain("Background removal: Not performed");
    expect(text).toContain("Alt text:");
    expect(text).toContain("catalog: 1200x1200");
  });
  test("download filename safe and suffix controlled",()=>{
    expect(ecommerceDownloadName("my good shoe!.jpg","web")).toBe("my-good-shoe-product-web.jpg");
    expect(()=>ecommerceDownloadName("x.jpg","zip")).toThrow();
  });
  test("other previous local sequences remain allowed, unsafe one blocked",async()=>{
    for(const steps of [["IMG-08","IMG-03","IMG-01"],["CRT-04","IMG-02"],["IMG-03","IMG-05","IMG-01"]]) {
      const out=await runApprovedLocalSteps({steps,input:img(),
        operations:Object.fromEntries(steps.map(id=>[id,async file=>({file,status:"SKIPPED"})]))});
      expect(out.trace.length).toBe(steps.length);
    }
    await expect(runApprovedLocalSteps({steps:["IMG-12","IMG-08"],input:img(),operations:{}})).rejects.toThrow();
  });
});
