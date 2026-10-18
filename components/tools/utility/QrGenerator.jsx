/* eslint-disable @next/next/no-img-element -- Local object URL preview with strict image MIME */
"use client";
import { useEffect, useState } from "react";
import UtilityShell, { fieldClass, primaryClass, secondaryClass } from "./UtilityShell";
import ResultPanel from "@/components/tools/ResultPanel";
import { buildQrPayload, validateQrSize } from "@/lib/tools/utility/qrRules.mjs";

export default function QrGenerator() {
  const [type, setType] = useState("URL"), [size, setSize] = useState("512");
  const [fields, setFields] = useState({url:"https://example.com", text:"", ssid:"", password:"", encryption:"WPA", name:"", phone:""});
  const [output, setOutput] = useState(null), [busy,setBusy] = useState(false), [error,setError] = useState("");
  useEffect(() => () => { if (output?.png) URL.revokeObjectURL(output.png); if (output?.svg) URL.revokeObjectURL(output.svg); }, [output]);
  function change(key, value) { setFields(p=>({...p,[key]:value})); setOutput(null); }
  async function generate() {
    setBusy(true); setError(""); setOutput(null);
    try {
      const payload = buildQrPayload(type, fields), width=validateQrSize(size);
      const QR = await import("qrcode");
      const qrcode = QR.default || QR;
      const options = { errorCorrectionLevel:"H", margin:4, width, color:{dark:"#111827",light:"#FFFFFF"} };
      const pngData = await qrcode.toDataURL(payload, options);
      const svg = await qrcode.toString(payload, {...options,type:"svg"});
      const response = await fetch(pngData);
      const pngBlob = await response.blob();
      setOutput({png:URL.createObjectURL(pngBlob),svg:URL.createObjectURL(new Blob([svg], {type:"image/svg+xml"})),size:width});
    } catch(e) {setError(e?.message||"QR generation failed.");}
    finally {setBusy(false);}
  }
  const result = output ? <div className="space-y-4">
    <ResultPanel title="Your QR code is ready" description="Test scanning with another phone before sharing. Use strong contrast and leave the white quiet zone." metadata={[{label:"Size",value:`${output.size} × ${output.size}`},{label:"Privacy",value:"Local"}]}>
      <div className="flex justify-center bg-white p-5"><img src={output.png} alt="Generated QR preview" className="h-56 w-56 object-contain" /></div>
    </ResultPanel>
    <div className="flex flex-wrap gap-2"><a href={output.png} download="ai-media-qr.png" className={primaryClass}>Download PNG</a><a href={output.svg} download="ai-media-qr.svg" className={secondaryClass}>Download SVG</a></div>
  </div> : null;
  return <UtilityShell toolId="UTL-01" title="QR Code Generator" description="Make a scannable URL, text, Wi-Fi or contact QR locally; export PNG or SVG." error={error} result={result}>
    <div><label className="text-sm font-medium" htmlFor="qr-type">QR type</label><select id="qr-type" value={type} onChange={e=>{setType(e.target.value);setOutput(null)}} className={fieldClass}><option value="URL">Website URL</option><option value="TEXT">Text</option><option value="WIFI">Wi-Fi</option><option value="CONTACT">Contact vCard</option></select></div>
    {type === "URL" && <div><label htmlFor="qr-url" className="text-sm font-medium">Website URL</label><input id="qr-url" className={fieldClass} value={fields.url} onChange={e=>change("url",e.target.value)} /></div>}
    {type === "TEXT" && <div><label htmlFor="qr-text" className="text-sm font-medium">Text</label><textarea id="qr-text" rows={4} maxLength={900} className={fieldClass} value={fields.text} onChange={e=>change("text",e.target.value)} /></div>}
    {type === "WIFI" && <><div><label htmlFor="qr-ssid">Network name (SSID)</label><input id="qr-ssid" className={fieldClass} value={fields.ssid} onChange={e=>change("ssid",e.target.value)} /></div><div><label htmlFor="qr-encryption">Encryption</label><select id="qr-encryption" className={fieldClass} value={fields.encryption} onChange={e=>change("encryption",e.target.value)}><option value="WPA">WPA/WPA2</option><option value="nopass">Open network</option></select></div>{fields.encryption !== "nopass" && <div><label htmlFor="qr-password">Password</label><input id="qr-password" type="password" className={fieldClass} value={fields.password} onChange={e=>change("password",e.target.value)} /></div>}</>}
    {type === "CONTACT" && <><div><label htmlFor="qr-name">Full name</label><input id="qr-name" className={fieldClass} value={fields.name} onChange={e=>change("name",e.target.value)} /></div><div><label htmlFor="qr-phone">Phone</label><input id="qr-phone" className={fieldClass} value={fields.phone} onChange={e=>change("phone",e.target.value)} /></div></>}
    <div><label htmlFor="qr-size">Image size</label><select id="qr-size" value={size} className={fieldClass} onChange={e=>{setSize(e.target.value);setOutput(null)}}>{[256,512,1024].map(n=><option value={n} key={n}>{n} px</option>)}</select></div>
    <button type="button" className={`${primaryClass} w-full`} onClick={generate} disabled={busy}>{busy?"Generating...":"Generate QR code"}</button>
    <p className="text-xs text-muted">Wi-Fi QR embeds the password in the code. Share only if you intend to share network access.</p>
  </UtilityShell>;
}
