"use client";
import { useEffect, useState } from "react";
export default function SystemStatus(){
  const [ready,setReady]=useState<boolean|null>(null);
  useEffect(()=>{const controller=new AbortController();fetch("/api/health",{cache:"no-store",signal:controller.signal}).then(r=>r.json().then(j=>setReady(r.ok&&j?.ok===true))).catch(()=>{if(!controller.signal.aborted)setReady(false)});return()=>controller.abort();},[]);
  return <div className="systemStatus" aria-live="polite"><span className={`statusDot ${ready===true?"":"statusDotPending"}`} aria-hidden="true"/><span>{ready===null?"Checking Navigator…":ready?"Ready.":"Navigator needs attention."}</span></div>;
}
