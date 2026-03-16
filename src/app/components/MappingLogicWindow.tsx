import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Search, Sparkles, Check, X, RefreshCw, ArrowRight,
  GitBranch, Save, Database, Layers, Cpu, CheckCircle2, Hash, Globe,
  Map as MapIcon, ChevronRight, Trash2, Edit3, Link2, Zap,
} from "lucide-react";
import { useTheme } from "../context/theme";

// ─── Colours ───────────────────────────────────────────────────────────────────
const EM  = "#10B981";
const EM2 = "#34D399";
const TX: Record<string,string> = {
  direct:"#10B981", string:"#3B82F6", numeric:"#F59E0B",
  temporal:"#8B5CF6", lookup:"#EC4899", composite:"#06B6D4", validate:"#EF4444",
};
const SEG: Record<string,string> = {
  ISA:"#10B981", GS:"#3B82F6", ST:"#8B5CF6",
  BHT:"#F59E0B", NM1:"#EC4899", CLM:"#EF4444", DTP:"#06B6D4", SV1:"#F97316",
};
const HEADER_H = 36, FIELD_H = 44, MINI_W = 128, MINI_H = 88;

// ─── Types ─────────────────────────────────────────────────────────────────────
type TxCat    = "direct"|"string"|"numeric"|"temporal"|"lookup"|"composite"|"validate";
type ViewMode = "all"|"mapped"|"unmapped"|"transformed";
type SegFilter= "ALL"|"ISA"|"GS"|"ST"|"BHT"|"NM1"|"CLM"|"DTP"|"SV1";
type FuncCat  = "edi"|"json"|"xml"|"string"|"numeric"|"date";

/** Source schema element — type never changes, mappings are separate */
interface SrcRow {
  id:string;
  kind:"header"|"field";
  segId?:string; segLabel?:string; segType?:"loop"|"segment"; segDesc?:string;
  srcLabel?:string; srcDesc?:string; srcDt?:string;
}

/** A single directed connection srcRow → tgtField with transform */
interface Mapping {
  id:string;
  srcRowId:string;
  tgtFieldId:string;
  transform:string;
  txCat:TxCat;
  confidence?:number;
}

interface TgtField { id:string; label:string; dt:string; desc:string; }
interface AISugg   { id:string; srcRowId:string; srcLabel:string; tgtId:string; tgtLabel:string; tgtDt:string; transform:string; txCat:TxCat; confidence:number; }
interface Project  { id:string; name:string; ediType:string; partnerName:string; status:string; lastUpdated:string; specName:string; }
interface TFn      { id:string; label:string; example:string; cat:FuncCat; types:string[]; desc:string; }

// ─── Target schema (independent) ─────────────────────────────────────────────
const ALL_TGT: TgtField[] = [
  {id:"auth_qualifier",        label:"auth_qualifier",         dt:"string",  desc:"Authorization qualifier"},
  {id:"sender_qualifier",      label:"sender_qualifier",       dt:"string",  desc:"Sender ID qualifier"},
  {id:"sender_id",             label:"sender_id",              dt:"string",  desc:"Interchange sender identifier"},
  {id:"receiver_id",           label:"receiver_id",            dt:"string",  desc:"Interchange receiver identifier"},
  {id:"interchange_date",      label:"interchange_date",       dt:"date",    desc:"Date of interchange"},
  {id:"interchange_time",      label:"interchange_time",       dt:"time",    desc:"Time of interchange"},
  {id:"edi_version",           label:"edi_version",            dt:"string",  desc:"EDI standard version"},
  {id:"usage_indicator",       label:"usage_indicator",        dt:"string",  desc:"T/P usage indicator"},
  {id:"functional_group_id",   label:"functional_group_id",    dt:"string",  desc:"Functional group identifier"},
  {id:"app_sender_code",       label:"app_sender_code",        dt:"string",  desc:"Application sender code"},
  {id:"group_date",            label:"group_date",             dt:"date",    desc:"Functional group date"},
  {id:"version_id",            label:"version_id",             dt:"string",  desc:"Version release industry ID"},
  {id:"transaction_type_code", label:"transaction_type_code",  dt:"string",  desc:"Transaction identifier code"},
  {id:"control_number",        label:"control_number",         dt:"string",  desc:"Transaction control number"},
  {id:"hierarchical_structure",label:"hierarchical_structure", dt:"string",  desc:"Hierarchical structure code"},
  {id:"purpose_code",          label:"purpose_code",           dt:"string",  desc:"Transaction purpose code"},
  {id:"transaction_date",      label:"transaction_date",       dt:"date",    desc:"Transaction date"},
  {id:"transaction_type",      label:"transaction_type",       dt:"string",  desc:"Mapped transaction type"},
  {id:"entity_id_code",        label:"entity_id_code",         dt:"string",  desc:"Entity identifier code"},
  {id:"entity_type",           label:"entity_type",            dt:"string",  desc:"Entity type qualifier"},
  {id:"org_name",              label:"org_name",               dt:"string",  desc:"Organization or last name"},
  {id:"first_name",            label:"first_name",             dt:"string",  desc:"First name"},
  {id:"npi_number",            label:"npi_number",             dt:"string",  desc:"NPI identification code"},
  {id:"claim_id",              label:"claim_id",               dt:"string",  desc:"Claim submitter identifier"},
  {id:"claim_amount",          label:"claim_amount",           dt:"decimal", desc:"Claim monetary amount"},
  {id:"service_location",      label:"service_location",       dt:"string",  desc:"Health care service location"},
  {id:"related_causes",        label:"related_causes",         dt:"string",  desc:"Related causes code"},
  {id:"provider_signature",    label:"provider_signature",     dt:"boolean", desc:"Provider signature flag"},
  {id:"date_qualifier",        label:"date_qualifier",         dt:"string",  desc:"Date/time qualifier code"},
  {id:"date_format",           label:"date_format",            dt:"string",  desc:"Date time format qualifier"},
  {id:"service_date",          label:"service_date",           dt:"string",  desc:"Service date or period"},
  {id:"procedure_id",          label:"procedure_id",           dt:"string",  desc:"Medical procedure identifier"},
  {id:"billed_amount",         label:"billed_amount",          dt:"decimal", desc:"Billed monetary amount"},
  {id:"unit_of_measure",       label:"unit_of_measure",        dt:"string",  desc:"Unit of measure code"},
  {id:"service_units",         label:"service_units",          dt:"decimal", desc:"Service unit count"},
];

// ─── Source schema (headers + fields, no mapping state) ───────────────────────
const BASE_SRC: SrcRow[] = [
  {id:"h-isa",kind:"header",segId:"ISA",segLabel:"ISA",segType:"loop",   segDesc:"Interchange Control Header"},
  {id:"isa01",kind:"field", segId:"ISA",srcLabel:"ISA01",srcDesc:"Auth Info Qualifier",       srcDt:"ID"},
  {id:"isa05",kind:"field", segId:"ISA",srcLabel:"ISA05",srcDesc:"Interchange ID Qualifier",  srcDt:"ID"},
  {id:"isa06",kind:"field", segId:"ISA",srcLabel:"ISA06",srcDesc:"Interchange Sender ID",     srcDt:"AN"},
  {id:"isa08",kind:"field", segId:"ISA",srcLabel:"ISA08",srcDesc:"Interchange Receiver ID",   srcDt:"AN"},
  {id:"isa09",kind:"field", segId:"ISA",srcLabel:"ISA09",srcDesc:"Interchange Date",          srcDt:"DT"},
  {id:"isa10",kind:"field", segId:"ISA",srcLabel:"ISA10",srcDesc:"Interchange Time",          srcDt:"TM"},
  {id:"isa12",kind:"field", segId:"ISA",srcLabel:"ISA12",srcDesc:"EDI Version Number",        srcDt:"ID"},
  {id:"isa15",kind:"field", segId:"ISA",srcLabel:"ISA15",srcDesc:"Interchange Usage Indicator",srcDt:"ID"},
  {id:"h-gs", kind:"header",segId:"GS", segLabel:"GS", segType:"loop",   segDesc:"Functional Group Header"},
  {id:"gs01", kind:"field", segId:"GS", srcLabel:"GS01",srcDesc:"Functional Identifier Code",srcDt:"ID"},
  {id:"gs02", kind:"field", segId:"GS", srcLabel:"GS02",srcDesc:"Application Sender Code",   srcDt:"AN"},
  {id:"gs04", kind:"field", segId:"GS", srcLabel:"GS04",srcDesc:"Group Date",                srcDt:"DT"},
  {id:"gs08", kind:"field", segId:"GS", srcLabel:"GS08",srcDesc:"Version/Release ID",        srcDt:"AN"},
  {id:"h-st", kind:"header",segId:"ST", segLabel:"ST", segType:"segment",segDesc:"Transaction Set Header"},
  {id:"st01", kind:"field", segId:"ST", srcLabel:"ST01",srcDesc:"Transaction Set ID Code",   srcDt:"ID"},
  {id:"st02", kind:"field", segId:"ST", srcLabel:"ST02",srcDesc:"Transaction Control Number",srcDt:"AN"},
  {id:"h-bht",kind:"header",segId:"BHT",segLabel:"BHT",segType:"segment",segDesc:"Beginning of Hierarchical Transaction"},
  {id:"bht01",kind:"field", segId:"BHT",srcLabel:"BHT01",srcDesc:"Hierarchical Structure Code", srcDt:"ID"},
  {id:"bht02",kind:"field", segId:"BHT",srcLabel:"BHT02",srcDesc:"Transaction Set Purpose Code",srcDt:"ID"},
  {id:"bht04",kind:"field", segId:"BHT",srcLabel:"BHT04",srcDesc:"Date",                        srcDt:"DT"},
  {id:"bht06",kind:"field", segId:"BHT",srcLabel:"BHT06",srcDesc:"Transaction Type Code",       srcDt:"ID"},
  {id:"h-nm1",kind:"header",segId:"NM1",segLabel:"NM1",segType:"loop",   segDesc:"Individual or Organizational Name"},
  {id:"nm101",kind:"field", segId:"NM1",srcLabel:"NM101",srcDesc:"Entity Identifier Code",    srcDt:"ID"},
  {id:"nm103",kind:"field", segId:"NM1",srcLabel:"NM103",srcDesc:"Name Last or Organization",srcDt:"AN"},
  {id:"nm109",kind:"field", segId:"NM1",srcLabel:"NM109",srcDesc:"Identification Code",       srcDt:"AN"},
  {id:"nm104",kind:"field", segId:"NM1",srcLabel:"NM104",srcDesc:"Name First",               srcDt:"AN"},
  {id:"nm102",kind:"field", segId:"NM1",srcLabel:"NM102",srcDesc:"Entity Type Qualifier",    srcDt:"ID"},
  {id:"h-clm",kind:"header",segId:"CLM",segLabel:"CLM",segType:"segment",segDesc:"Health Care Claim"},
  {id:"clm01",kind:"field", segId:"CLM",srcLabel:"CLM01",srcDesc:"Claim Submitter ID",          srcDt:"AN"},
  {id:"clm02",kind:"field", segId:"CLM",srcLabel:"CLM02",srcDesc:"Monetary Amount",             srcDt:"R"},
  {id:"clm05",kind:"field", segId:"CLM",srcLabel:"CLM05",srcDesc:"Health Care Service Location",srcDt:"C"},
  {id:"clm11",kind:"field", segId:"CLM",srcLabel:"CLM11",srcDesc:"Related Causes Code",         srcDt:"C"},
  {id:"clm06",kind:"field", segId:"CLM",srcLabel:"CLM06",srcDesc:"Provider Signature Indicator",srcDt:"ID"},
  {id:"h-dtp",kind:"header",segId:"DTP",segLabel:"DTP",segType:"segment",segDesc:"Date or Time or Period"},
  {id:"dtp01",kind:"field", segId:"DTP",srcLabel:"DTP01",srcDesc:"Date/Time Qualifier",    srcDt:"ID"},
  {id:"dtp02",kind:"field", segId:"DTP",srcLabel:"DTP02",srcDesc:"Date Time Period Format",srcDt:"ID"},
  {id:"dtp03",kind:"field", segId:"DTP",srcLabel:"DTP03",srcDesc:"Date Time Period",       srcDt:"AN"},
  {id:"h-sv1",kind:"header",segId:"SV1",segLabel:"SV1",segType:"segment",segDesc:"Professional Service"},
  {id:"sv101",kind:"field", segId:"SV1",srcLabel:"SV101",srcDesc:"Compound Procedure ID",  srcDt:"C"},
  {id:"sv102",kind:"field", segId:"SV1",srcLabel:"SV102",srcDesc:"Monetary Amount",        srcDt:"R"},
  {id:"sv103",kind:"field", segId:"SV1",srcLabel:"SV103",srcDesc:"Unit of Measure Code",   srcDt:"ID"},
  {id:"sv104",kind:"field", segId:"SV1",srcLabel:"SV104",srcDesc:"Service Unit Count",      srcDt:"R"},
];

// ─── Initial mappings (separate from source rows) ─────────────────────────────
let _mid = 0;
const mk = (srcRowId:string, tgtFieldId:string, transform:string, txCat:TxCat, confidence:number): Mapping =>
  ({id:`m${_mid++}`, srcRowId, tgtFieldId, transform, txCat, confidence});

const BASE_MAPPINGS: Mapping[] = [
  mk("isa01","auth_qualifier",        "Direct",              "direct",   99),
  mk("isa05","sender_qualifier",      "Direct",              "direct",   99),
  mk("isa06","sender_id",             "trim()",              "string",   98),
  mk("isa08","receiver_id",           "trim()",              "string",   98),
  mk("isa09","interchange_date",      "dateFormat(YYYYMMDD)","temporal", 97),
  mk("isa10","interchange_time",      "timeFormat(HHMM)",    "temporal", 96),
  mk("isa12","edi_version",           "Direct",              "direct",   99),
  mk("gs01", "functional_group_id",   "mapCode()",           "lookup",   94),
  mk("gs02", "app_sender_code",       "trim()",              "string",   97),
  mk("gs04", "group_date",            "dateFormat(YYYYMMDD)","temporal", 95),
  mk("gs08", "version_id",            "Direct",              "direct",   99),
  mk("st01", "transaction_type_code", "mapCode()",           "lookup",   97),
  mk("st02", "control_number",        "Direct",              "direct",   99),
  mk("bht01","hierarchical_structure","Direct",              "direct",   99),
  mk("bht02","purpose_code",          "Direct",              "direct",   99),
  mk("bht04","transaction_date",      "dateFormat(YYYYMMDD)","temporal", 97),
  mk("nm101","entity_id_code",        "Direct",              "direct",   99),
  mk("nm103","org_name",              "trim()",              "string",   96),
  mk("nm109","npi_number",            "validateNPI()",       "validate", 94),
  mk("clm01","claim_id",              "Direct",              "direct",   99),
  mk("clm02","claim_amount",          "toDecimal(2)",        "numeric",  99),
  mk("clm05","service_location",      "parseComposite()",    "composite",91),
  mk("clm11","related_causes",        "parseComposite()",    "composite",88),
  mk("dtp01","date_qualifier",        "Direct",              "direct",   99),
  mk("dtp02","date_format",           "Direct",              "direct",   99),
  mk("dtp03","service_date",          "dateCondition()",     "temporal", 92),
  mk("sv101","procedure_id",          "extractCode()",       "composite",93),
  mk("sv102","billed_amount",         "toDecimal(2)",        "numeric",  99),
  mk("sv103","unit_of_measure",       "Direct",              "direct",   99),
  mk("sv104","service_units",         "toDecimal(2)",        "numeric",  99),
];

const INIT_AI: AISugg[] = [
  {id:"s1",srcRowId:"bht06",srcLabel:"BHT06",tgtId:"transaction_type",  tgtLabel:"transaction_type",  tgtDt:"string", transform:"mapCode()", txCat:"lookup",  confidence:88},
  {id:"s2",srcRowId:"nm102",srcLabel:"NM102", tgtId:"entity_type",       tgtLabel:"entity_type",       tgtDt:"string", transform:"Direct",    txCat:"direct",  confidence:96},
  {id:"s3",srcRowId:"nm104",srcLabel:"NM104", tgtId:"first_name",        tgtLabel:"first_name",        tgtDt:"string", transform:"trim()",    txCat:"string",  confidence:87},
  {id:"s4",srcRowId:"clm06",srcLabel:"CLM06", tgtId:"provider_signature",tgtLabel:"provider_signature",tgtDt:"boolean",transform:"Direct",    txCat:"direct",  confidence:89},
  {id:"s5",srcRowId:"isa15",srcLabel:"ISA15", tgtId:"usage_indicator",   tgtLabel:"usage_indicator",   tgtDt:"string", transform:"Direct",    txCat:"direct",  confidence:94},
];

// ─── Transform functions ──────────────────────────────────────────────────────
const CAT_TX: Record<FuncCat,TxCat> = {
  edi:"lookup", string:"string", numeric:"numeric", date:"temporal", json:"composite", xml:"composite",
};
const FUNS: TFn[] = [
  {id:"trim",        label:"trim()",               cat:"string",  types:["AN","string"],          example:"trim()",               desc:"Remove whitespace"},
  {id:"uppercase",   label:"uppercase()",          cat:"string",  types:["AN","string","ID"],     example:"uppercase()",          desc:"Convert to uppercase"},
  {id:"lowercase",   label:"lowercase()",          cat:"string",  types:["AN","string","ID"],     example:"lowercase()",          desc:"Convert to lowercase"},
  {id:"substring",   label:"substring(0,10)",      cat:"string",  types:["AN","string"],          example:"substring(0,10)",      desc:"Extract substring"},
  {id:"concat",      label:"concat(val,'_ID')",    cat:"string",  types:["AN","string"],          example:"concat(val,'_ID')",    desc:"Concatenate values"},
  {id:"replace",     label:"replace('/','‑')",     cat:"string",  types:["AN","string"],          example:"replace('/','-')",     desc:"Replace substring"},
  {id:"split",       label:"split(':',0)",         cat:"string",  types:["AN","C","string"],      example:"split(':',0)",         desc:"Split by delimiter"},
  {id:"padLeft",     label:"padLeft(10,'0')",      cat:"string",  types:["AN","string","N0"],     example:"padLeft(10,'0')",      desc:"Left-pad string"},
  {id:"toDecimal",   label:"toDecimal(2)",         cat:"numeric", types:["R","N0","N2","numeric"],example:"toDecimal(2)",         desc:"Round to n decimals"},
  {id:"toInteger",   label:"toInteger()",          cat:"numeric", types:["R","N0","numeric"],     example:"toInteger()",          desc:"Convert to integer"},
  {id:"abs",         label:"abs()",                cat:"numeric", types:["R","N0","numeric"],     example:"abs()",                desc:"Absolute value"},
  {id:"multiply",    label:"multiply(100)",        cat:"numeric", types:["R","N0","numeric"],     example:"multiply(100)",        desc:"Multiply by constant"},
  {id:"dateFormat",  label:"dateFormat(YYYYMMDD)", cat:"date",    types:["DT","TM","date","time"],example:"dateFormat(YYYYMMDD)", desc:"Reformat date"},
  {id:"timeFormat",  label:"timeFormat(HHMM)",     cat:"date",    types:["TM","time"],            example:"timeFormat(HHMM)",     desc:"Reformat time"},
  {id:"dateCondition",label:"dateCondition()",     cat:"date",    types:["DT","AN","date"],       example:"dateCondition()",      desc:"Conditional date parse"},
  {id:"toISO8601",   label:"toISO8601()",          cat:"date",    types:["DT","date"],            example:"toISO8601()",          desc:"Convert to ISO 8601"},
  {id:"mapCode",     label:"mapCode()",            cat:"edi",     types:["ID","AN","string"],     example:"mapCode()",            desc:"Map EDI code"},
  {id:"parseComp",   label:"parseComposite()",     cat:"edi",     types:["C","composite"],        example:"parseComposite()",     desc:"Parse composite element"},
  {id:"extractCode", label:"extractCode()",        cat:"edi",     types:["C","composite"],        example:"extractCode()",        desc:"Extract code from composite"},
  {id:"validateNPI", label:"validateNPI()",        cat:"edi",     types:["AN","string"],          example:"validateNPI()",        desc:"Validate 10-digit NPI"},
  {id:"lookup",      label:"lookup(table)",        cat:"edi",     types:["ID","AN","string"],     example:"lookup('facility')",   desc:"Reference table lookup"},
  {id:"toJson",      label:"toJson()",             cat:"json",    types:["C","AN","string"],      example:"toJson()",             desc:"Convert to JSON"},
  {id:"jsonPath",    label:"jsonPath('$.id')",     cat:"json",    types:["C","AN","string"],      example:"jsonPath('$.id')",     desc:"Extract via JSONPath"},
  {id:"toXml",       label:"toXml('tag')",         cat:"xml",     types:["AN","string","C"],      example:"toXml('ClaimID')",     desc:"Wrap in XML element"},
  {id:"xmlPath",     label:"xmlPath(xpath)",       cat:"xml",     types:["AN","string"],          example:"xmlPath('//CLM01')",   desc:"Extract via XPath"},
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
let _mapId = 100;
const newMid = () => `m${_mapId++}`;

function rgb(h:string){
  if(!h.startsWith("#")||h.length<7) return "0,0,0";
  return `${parseInt(h.slice(1,3),16)},${parseInt(h.slice(3,5),16)},${parseInt(h.slice(5,7),16)}`;
}
function rowH(r:SrcRow){return r.kind==="header"?HEADER_H:FIELD_H;}
function cumY(rows:SrcRow[]){const ys:number[]=[]; let a=0; for(const r of rows){ys.push(a);a+=rowH(r);} return ys;}

// ─── Theme ────────────────────────────────────────────────────────────────────
function useT(){
  const{isDark}=useTheme();
  return{
    isDark,
    bg:       isDark?"linear-gradient(135deg,#0B1220 0%,#0F1A2F 100%)":"linear-gradient(135deg,#FFFFFF 0%,#F8FAFC 100%)",
    panelBg:  isDark?"rgba(9,14,28,0.97)":"#FFFFFF",
    toolBg:   isDark?"rgba(7,12,24,0.95)":"#FFFFFF",
    glass:    isDark?"rgba(255,255,255,0.06)":"#F8FAFC",
    gBorder:  isDark?"rgba(255,255,255,0.15)":"#E2E8F0",
    border:   isDark?"rgba(255,255,255,0.12)":"#E2E8F0",
    rowHov:   isDark?"rgba(255,255,255,0.05)":"#F8FAFC",
    rowHdr:   isDark?"rgba(255,255,255,0.03)":"#F1F5F9",
    text:     isDark?"#F8FAFC":"#0F172A",
    sub:      isDark?"#94A3B8":"#475569",
    muted:    isDark?"#475569":"#94A3B8",
    trackBg:  isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.07)",
    pillBg:   isDark?"rgba(0,0,0,0.35)":"rgba(0,0,0,0.06)",
    popBg:    isDark?"rgba(8,13,26,0.99)":"#FFFFFF",
    miniMapBg:isDark?"rgba(0,0,0,0.55)":"#F1F5F9",
    scroll:   isDark?`rgba(${rgb(EM)},0.18)`:`rgba(${rgb(EM)},0.25)`,
    emGlow:   "var(--c-em-glow)",
    emTxt:    "var(--c-em-text-glow)",
  };
}

// ─── DtBadge ──────────────────────────────────────────────────────────────────
function DtBadge({dt}:{dt?:string}){
  const map:Record<string,string>={string:"#3B82F6",date:"#8B5CF6",time:"#8B5CF6",decimal:"#F59E0B",boolean:"#EC4899",ID:"#64748B",AN:"#64748B",DT:"#8B5CF6",TM:"#8B5CF6",R:"#F59E0B",C:"#06B6D4"};
  const c=map[dt||"AN"]||"#64748B";
  return <span style={{fontFamily:"monospace",fontSize:"0.5rem",fontWeight:700,color:c,background:`rgba(${rgb(c)},0.12)`,border:`1px solid rgba(${rgb(c)},0.28)`,padding:"1px 4px",borderRadius:3,flexShrink:0}}>{dt||"AN"}</span>;
}

// ─── Neural BG ────────────────────────────────────────────────────────────────
function NeuralBg({isDark}:{isDark:boolean}){
  const nodes=[[8,15],[22,55],[38,28],[55,72],[70,18],[84,60],[94,35],[6,82],[18,42],[32,70],[48,10],[62,85],[76,48],[90,22]];
  const edges:number[][]=[];
  for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const dx=nodes[i][0]-nodes[j][0],dy=nodes[i][1]-nodes[j][1];if(dx*dx+dy*dy<350)edges.push([...nodes[i],...nodes[j]]);}
  return(
    <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",opacity:isDark?0.05:0.03}}>
      {edges.map((e,i)=><line key={i} x1={`${e[0]}%`} y1={`${e[1]}%`} x2={`${e[2]}%`} y2={`${e[3]}%`} stroke={EM} strokeWidth={1}/>)}
      {nodes.map(([x,y],i)=><circle key={i} cx={`${x}%`} cy={`${y}%`} r={2} fill={EM}/>)}
    </svg>
  );
}

// ─── Source Row ───────────────────────────────────────────────────────────────
function SrcRow({row,rowMappings,isPending,hov,selMId,onHov,onClick,T}:{
  row:SrcRow; rowMappings:Mapping[]; isPending:boolean; hov:boolean; selMId:string|null;
  onHov:(id:string|null)=>void; onClick:(row:SrcRow,e:React.MouseEvent)=>void;
  T:ReturnType<typeof useT>;
}){
  if(row.kind==="header"){
    const c=SEG[row.segId||""]||T.muted;
    return(
      <div style={{height:HEADER_H,display:"flex",alignItems:"center",gap:7,padding:"0 12px",background:`rgba(${rgb(c)},0.07)`,borderBottom:`1px solid ${T.rowHdr}`}}>
        <div style={{width:14,height:14,borderRadius:3,background:`rgba(${rgb(c)},0.18)`,border:`1px solid rgba(${rgb(c)},0.4)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          {row.segType==="loop"?<Layers style={{width:7,height:7,color:c}}/>:<Hash style={{width:7,height:7,color:c}}/>}
        </div>
        <span style={{fontFamily:"monospace",fontSize:"0.65rem",fontWeight:800,color:c,letterSpacing:"0.04em"}}>{row.segLabel}</span>
        <span style={{fontSize:"0.56rem",color:T.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{row.segDesc}</span>
      </div>
    );
  }
  const hasMappings=rowMappings.length>0;
  const primaryC=hasMappings?TX[rowMappings[0].txCat||"direct"]:"#EF4444";
  return(
    <div
      style={{height:FIELD_H,display:"flex",alignItems:"center",gap:7,padding:"0 10px 0 12px",
        background:isPending?`rgba(${rgb(EM)},0.13)`:hov?T.rowHov:"transparent",
        borderLeft:isPending?`2px solid ${EM}`:hasMappings?`2px solid ${TX[rowMappings[0].txCat||"direct"]}40`:"2px solid rgba(239,68,68,0.3)",
        borderBottom:`1px solid ${T.border}`,cursor:"pointer",transition:"background 0.12s"}}
      onMouseEnter={()=>onHov(row.id)} onMouseLeave={()=>onHov(null)} onClick={(e)=>onClick(row,e)}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:2}}>
          <span style={{fontFamily:"monospace",fontSize:"0.7rem",fontWeight:700,
            color:isPending?EM:hasMappings?T.text:T.muted,flexShrink:0}}>{row.srcLabel}</span>
          <DtBadge dt={row.srcDt}/>
          {isPending&&<span style={{fontFamily:"monospace",fontSize:"0.46rem",color:EM,background:`rgba(${rgb(EM)},0.12)`,border:`1px solid rgba(${rgb(EM)},0.35)`,padding:"1px 5px",borderRadius:3,flexShrink:0,whiteSpace:"nowrap"}}>SELECT TARGET →</span>}
        </div>
        <div style={{fontSize:"0.58rem",color:T.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{row.srcDesc}</div>
      </div>
      {/* mapping count dots */}
      <div style={{display:"flex",gap:2,flexShrink:0}}>
        {hasMappings
          ? rowMappings.map(m=>(
              <div key={m.id} style={{width:7,height:7,borderRadius:"50%",background:TX[m.txCat||"direct"],boxShadow:`0 0 5px rgba(${rgb(TX[m.txCat||"direct"])},0.6)`}}/>
            ))
          : <div style={{width:7,height:7,borderRadius:"50%",background:"#EF4444",boxShadow:"0 0 5px rgba(239,68,68,0.5)"}}/>
        }
      </div>
    </div>
  );
}

// ─── Target Field Row ─────────────────────────────────────────────────────────
function TgtFieldRow({field,fieldMappings,srcRows,isPendingSrc,hov,onHov,onClick,T}:{
  field:TgtField; fieldMappings:Mapping[]; srcRows:SrcRow[];
  isPendingSrc:boolean; hov:boolean;
  onHov:(id:string|null)=>void; onClick:(f:TgtField,e:React.MouseEvent)=>void;
  T:ReturnType<typeof useT>;
}){
  const hasMappings=fieldMappings.length>0;
  const canMap=isPendingSrc; // always allow — multiple src→same tgt is allowed
  const primaryC=hasMappings?TX[fieldMappings[0].txCat||"direct"]:"rgba(255,255,255,0.12)";
  return(
    <div
      style={{height:FIELD_H,display:"flex",alignItems:"center",gap:7,padding:"0 12px 0 10px",
        background:canMap&&hov?`rgba(${rgb(EM)},0.12)`:hov&&hasMappings?T.rowHov:"transparent",
        borderRight:hasMappings?`2px solid ${TX[fieldMappings[0].txCat||"direct"]}50`:canMap?`2px solid rgba(${rgb(EM)},0.4)`:"2px solid transparent",
        borderBottom:`1px solid ${T.border}`,
        cursor:canMap?"crosshair":hasMappings?"pointer":"default",
        transition:"all 0.12s"}}
      onMouseEnter={()=>onHov(field.id)} onMouseLeave={()=>onHov(null)} onClick={(e)=>onClick(field,e)}>
      {/* mapping dots on left */}
      <div style={{display:"flex",flexDirection:"column",gap:2,flexShrink:0,width:10,alignItems:"center"}}>
        {hasMappings
          ? fieldMappings.map(m=>(
              <div key={m.id} style={{width:7,height:7,borderRadius:"50%",background:TX[m.txCat||"direct"],boxShadow:`0 0 4px rgba(${rgb(TX[m.txCat||"direct"])},0.6)`}}/>
            ))
          : <div style={{width:7,height:7,borderRadius:"50%",background:T.isDark?"rgba(255,255,255,0.1)":"#E2E8F0"}}/>
        }
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:2}}>
          <span style={{fontFamily:"monospace",fontSize:"0.7rem",fontWeight:700,
            color:hasMappings?T.text:canMap&&hov?EM:T.muted,
            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{field.label}</span>
          <DtBadge dt={field.dt}/>
        </div>
        <div style={{fontSize:"0.58rem",color:T.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{field.desc}</div>
      </div>
      {hasMappings&&(
        <div style={{display:"flex",flexDirection:"column",gap:2,alignItems:"flex-end",flexShrink:0}}>
          {fieldMappings.map(m=>{
            const sr=srcRows.find(r=>r.id===m.srcRowId);
            return(
              <span key={m.id} style={{fontFamily:"monospace",fontSize:"0.46rem",color:TX[m.txCat||"direct"],
                background:`rgba(${rgb(TX[m.txCat||"direct"])},0.10)`,border:`1px solid rgba(${rgb(TX[m.txCat||"direct"])},0.28)`,
                padding:"1px 4px",borderRadius:3,whiteSpace:"nowrap"}}>{sr?.srcLabel||"?"}</span>
            );
          })}
        </div>
      )}
      {canMap&&hov&&(
        <div style={{display:"flex",alignItems:"center",gap:3,flexShrink:0,padding:"2px 6px",borderRadius:4,
          background:`rgba(${rgb(EM)},0.14)`,border:`1px solid rgba(${rgb(EM)},0.4)`,marginLeft:4}}>
          <Link2 style={{width:8,height:8,color:EM}}/>
          <span style={{fontFamily:"monospace",fontSize:"0.5rem",color:EM,fontWeight:700}}>MAP</span>
        </div>
      )}
    </div>
  );
}

// ─── Canvas Lines ─────────────────────────────────────────────────────────────
function CanvasLines({mappings,srcRows,srcYs,srcST,srcOffset,tgtFields,tgtYs,tgtST,tgtOffset,cW,cH,selMId,hovMId,mounted,onClick}:{
  mappings:Mapping[]; srcRows:SrcRow[]; srcYs:number[]; srcST:number; srcOffset:number;
  tgtFields:TgtField[]; tgtYs:number[]; tgtST:number; tgtOffset:number;
  cW:number; cH:number; selMId:string|null; hovMId:string|null; mounted:boolean;
  onClick:(mid:string,e:React.MouseEvent<SVGElement>)=>void;
}){
  const lines=useMemo(()=>mappings.flatMap(m=>{
    const si=srcRows.findIndex(r=>r.id===m.srcRowId);
    const ti=tgtFields.findIndex(f=>f.id===m.tgtFieldId);
    if(si<0||ti<0) return[];
    const srcCY=srcOffset+srcYs[si]+FIELD_H/2-srcST;
    const tgtCY=tgtOffset+tgtYs[ti]+FIELD_H/2-tgtST;
    if(srcCY<-60&&tgtCY<-60) return[];
    if(srcCY>cH+60&&tgtCY>cH+60) return[];
    const col=TX[m.txCat||"direct"];
    const active=m.id===selMId||m.id===hovMId;
    return[{id:m.id,srcCY,tgtCY,col,active,op:active?0.95:0.22,sw:active?2.2:0.9}];
  }),[mappings,srcRows,tgtFields,srcYs,tgtYs,srcST,tgtST,srcOffset,tgtOffset,cH,selMId,hovMId]);

  const bez=(y1:number,y2:number)=>`M 0 ${y1} C ${cW*0.38} ${y1}, ${cW*0.62} ${y2}, ${cW} ${y2}`;

  return(
    <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}>
      <defs>
        <filter id="glw" x="-60%" y="-200%" width="220%" height="500%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <g style={{opacity:mounted?1:0,transition:"opacity 0.8s"}}>
        {lines.map(l=>(
          <g key={l.id} style={{pointerEvents:"auto",cursor:"pointer"}}
            onClick={(e)=>{e.stopPropagation();onClick(l.id,e);}}>
            <path d={bez(l.srcCY,l.tgtCY)} fill="none" stroke="transparent" strokeWidth={18}/>
            <path d={bez(l.srcCY,l.tgtCY)} fill="none" stroke={l.col}
              strokeWidth={l.sw} strokeOpacity={l.op}
              filter={l.active?"url(#glw)":undefined}/>
            {l.active&&<>
              <circle cx={4} cy={l.srcCY} r={4} fill={l.col} fillOpacity={0.8}/>
              <circle cx={cW-4} cy={l.tgtCY} r={4} fill={l.col} fillOpacity={0.8}/>
            </>}
          </g>
        ))}
      </g>
    </svg>
  );
}

// ─── Logic Boxes ──────────────────────────────────────────────────────────────
function LogicBoxes({mappings,srcRows,srcYs,srcST,srcOffset,tgtFields,tgtYs,tgtST,tgtOffset,cW,cH,selMId,hovMId,onClick,T}:{
  mappings:Mapping[]; srcRows:SrcRow[]; srcYs:number[]; srcST:number; srcOffset:number;
  tgtFields:TgtField[]; tgtYs:number[]; tgtST:number; tgtOffset:number;
  cW:number; cH:number; selMId:string|null; hovMId:string|null;
  onClick:(mid:string,e:React.MouseEvent)=>void; T:ReturnType<typeof useT>;
}){
  const MW=88, MH=22;
  return(
    <div style={{position:"absolute",inset:0,pointerEvents:"none"}}>
      {mappings.map(m=>{
        if(m.txCat==="direct") return null;
        const si=srcRows.findIndex(r=>r.id===m.srcRowId);
        const ti=tgtFields.findIndex(f=>f.id===m.tgtFieldId);
        if(si<0||ti<0) return null;
        const srcCY=srcOffset+srcYs[si]+FIELD_H/2-srcST;
        const tgtCY=tgtOffset+tgtYs[ti]+FIELD_H/2-tgtST;
        const midY=(srcCY+tgtCY)/2;
        if(midY<-MH||midY>cH+MH) return null;
        const c=TX[m.txCat||"direct"], active=m.id===selMId||m.id===hovMId;
        return(
          <div key={m.id} style={{position:"absolute",left:cW/2-MW/2,top:midY-MH/2,width:MW,height:MH,
            background:`rgba(${rgb(c)},${active?0.22:T.isDark?0.11:0.13})`,
            border:`1px solid rgba(${rgb(c)},${active?0.72:0.38})`,
            borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",
            backdropFilter:"blur(12px)",pointerEvents:"auto",cursor:"pointer",
            boxShadow:active?`0 0 14px rgba(${rgb(c)},0.5)`:undefined,transition:"all 0.14s"}}
            onClick={(e)=>{e.stopPropagation();onClick(m.id,e);}}>
            <span style={{fontFamily:"monospace",fontSize:"0.52rem",color:c,fontWeight:700,padding:"0 5px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.transform}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Seg Bands ────────────────────────────────────────────────────────────────
function SegBands({rows,ys,st,cH,T}:{rows:SrcRow[];ys:number[];st:number;cH:number;T:ReturnType<typeof useT>}){
  return(
    <div style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden"}}>
      {rows.map((r,i)=>{
        if(r.kind!=="header") return null;
        const y=ys[i]-st;
        if(y<-HEADER_H||y>cH) return null;
        const c=SEG[r.segId||""]||T.muted;
        return<div key={r.id} style={{position:"absolute",left:0,right:0,top:y,height:HEADER_H,background:`rgba(${rgb(c)},${T.isDark?0.04:0.03})`,borderTop:`1px solid rgba(${rgb(c)},0.12)`}}/>;
      })}
    </div>
  );
}

// ─── Mini Map ─────────────────────────────────────────────────────────────────
function MiniMap({rows,ys,totalH,st,cH,onScroll,T}:{rows:SrcRow[];ys:number[];totalH:number;st:number;cH:number;onScroll:(s:number)=>void;T:ReturnType<typeof useT>}){
  const sc=totalH>0?MINI_H/totalH:1, vpH=Math.max(8,cH*sc), vpT=Math.min(st*sc,MINI_H-vpH);
  return(
    <div style={{position:"absolute",bottom:14,right:12,zIndex:10}}>
      <div style={{fontFamily:"monospace",fontSize:"0.44rem",color:T.muted,fontWeight:700,letterSpacing:"0.12em",marginBottom:3,display:"flex",alignItems:"center",gap:3}}>
        <MapIcon style={{width:7,height:7}}/> MINIMAP
      </div>
      <svg width={MINI_W} height={MINI_H}
        style={{background:T.miniMapBg,border:`1px solid ${T.gBorder}`,borderRadius:5,cursor:"pointer",display:"block",backdropFilter:"blur(8px)"}}
        onClick={e=>{const rect=e.currentTarget.getBoundingClientRect();onScroll(Math.max(0,(e.clientY-rect.top)/MINI_H*totalH-cH/2));}}>
        {rows.map((r,i)=>{
          if(r.kind==="header"){const c=SEG[r.segId||""]||T.muted;return<rect key={r.id} x={0} y={ys[i]*sc} width={MINI_W} height={HEADER_H*sc} fill={c} fillOpacity={0.2}/>;}
          const y=ys[i]*sc+(FIELD_H*sc)/2;
          return<line key={r.id} x1={0} y1={y} x2={MINI_W} y2={y} stroke={EM} strokeWidth={0.6} strokeOpacity={0.3}/>;
        })}
        <rect x={0} y={vpT} width={MINI_W} height={vpH} fill={T.isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)"} stroke={T.isDark?"rgba(255,255,255,0.28)":"rgba(0,0,0,0.2)"} strokeWidth={0.8} rx={2}/>
      </svg>
    </div>
  );
}

// ─── Function Selector ────────────────────────────────────────────────────────
function FunctionSelector({srcDt,current,onSelect,T}:{srcDt?:string;current?:string;onSelect:(fn:string,c:TxCat)=>void;T:ReturnType<typeof useT>}){
  const[cat,setCat]=useState<FuncCat|"all">("all");
  const[q,setQ]=useState("");
  const CATS:[FuncCat|"all",string,string][]=[
    ["all","All",T.sub],["edi","EDI","#10B981"],["string","String","#3B82F6"],
    ["numeric","Numeric","#F59E0B"],["date","Date","#8B5CF6"],["json","JSON","#EC4899"],["xml","XML","#06B6D4"],
  ];
  const fns=FUNS.filter(fn=>{
    if(cat!=="all"&&fn.cat!==cat) return false;
    if(q&&!fn.label.toLowerCase().includes(q.toLowerCase())&&!fn.desc.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  return(
    <div style={{borderTop:`1px solid ${T.gBorder}`}}>
      <div style={{padding:"8px 12px 6px",borderBottom:`1px solid ${T.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:5,padding:"3px 7px",borderRadius:6,background:T.glass,border:`1px solid ${T.border}`,marginBottom:6}}>
          <Search style={{width:9,height:9,color:T.muted}}/>
          <input value={q} onChange={e=>{e.stopPropagation();setQ(e.target.value);}} onClick={e=>e.stopPropagation()}
            placeholder="Search functions…"
            style={{flex:1,background:"transparent",border:"none",outline:"none",color:T.text,fontSize:"0.62rem",fontFamily:"monospace"}}/>
          {q&&<button onClick={e=>{e.stopPropagation();setQ("");}} style={{background:"none",border:"none",cursor:"pointer",display:"flex"}}><X style={{width:8,height:8,color:T.muted}}/></button>}
        </div>
        <div style={{display:"flex",gap:2,flexWrap:"wrap"}}>
          {CATS.map(([id,label,color])=>(
            <button key={id} onClick={e=>{e.stopPropagation();setCat(id as FuncCat|"all");}}
              style={{padding:"2px 7px",borderRadius:4,border:`1px solid ${cat===id?`rgba(${rgb(color)},0.45)`:T.border}`,
                background:cat===id?`rgba(${rgb(color)},0.13)`:"transparent",color:cat===id?color:T.muted,
                fontSize:"0.56rem",fontWeight:cat===id?700:500,cursor:"pointer",fontFamily:"monospace"}}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div style={{maxHeight:200,overflowY:"auto",scrollbarWidth:"thin",scrollbarColor:`rgba(${rgb(EM)},0.2) transparent`}}>
        {fns.length===0
          ?<div style={{padding:"12px",textAlign:"center",color:T.muted,fontSize:"0.62rem"}}>No matches</div>
          :fns.map(fn=>{
            const isCur=fn.example===current||fn.label===current;
            const cc=CATS.find(([id])=>id===fn.cat)?.[2]||T.sub;
            return(
              <button key={fn.id} onClick={e=>{e.stopPropagation();onSelect(fn.example,CAT_TX[fn.cat]);}}
                style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"6px 12px",
                  background:isCur?`rgba(${rgb(EM)},0.10)`:"transparent",borderBottom:`1px solid ${T.border}`,
                  cursor:"pointer",textAlign:"left",border:"none"}}
                onMouseEnter={e=>(e.currentTarget.style.background=`rgba(${rgb(EM)},0.07)`)}
                onMouseLeave={e=>(e.currentTarget.style.background=isCur?`rgba(${rgb(EM)},0.10)`:"transparent")}>
                <span style={{fontFamily:"monospace",fontSize:"0.62rem",fontWeight:700,color:isCur?EM:cc,flexShrink:0,minWidth:132}}>{fn.label}</span>
                <span style={{fontSize:"0.55rem",color:T.muted,flex:1,textAlign:"left"}}>{fn.desc}</span>
                {isCur&&<Check style={{width:9,height:9,color:EM,flexShrink:0}}/>}
              </button>
            );
          })
        }
      </div>
    </div>
  );
}

// ─── Suggestion Chips ─────────────────────────────────────────────────────────
function SuggChips({srcDt,tgtDt,onApply,T}:{srcDt?:string;tgtDt?:string;onApply:(fn:string,c:TxCat)=>void;T:ReturnType<typeof useT>}){
  const chips=useMemo(()=>{
    const src=srcDt||"AN", tgt=tgtDt||"string";
    return FUNS.filter(fn=>{
      const ms=fn.types.includes(src)||fn.types.some(t=>src.includes(t));
      const mt=tgt==="date"?fn.cat==="date":tgt==="decimal"?fn.cat==="numeric":true;
      return ms||mt;
    }).slice(0,4);
  },[srcDt,tgtDt]);
  if(!chips.length) return null;
  return(
    <div style={{padding:"8px 12px",borderTop:`1px solid ${T.gBorder}`}}>
      <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:5}}>
        <Sparkles style={{width:9,height:9,color:EM}}/>
        <span style={{fontFamily:"monospace",fontSize:"0.55rem",fontWeight:700,color:EM,letterSpacing:"0.08em"}}>SUGGESTED</span>
      </div>
      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
        {chips.map(fn=>{const c=TX[CAT_TX[fn.cat]||"direct"];return(
          <button key={fn.id} onClick={e=>{e.stopPropagation();onApply(fn.example,CAT_TX[fn.cat]);}}
            style={{padding:"2px 8px",borderRadius:4,fontFamily:"monospace",fontSize:"0.58rem",
              background:`rgba(${rgb(c)},0.12)`,border:`1px solid rgba(${rgb(c)},0.35)`,color:c,cursor:"pointer",fontWeight:600}}>
            {fn.label}
          </button>
        );})}
      </div>
    </div>
  );
}

// ─── Edit Popover (position:fixed) ────────────────────────────────────────────
function EditPopover({mapping,srcRow,tgtField,clientX,clientY,onRemove,onChange,onClose,T}:{
  mapping:Mapping; srcRow?:SrcRow; tgtField?:TgtField;
  clientX:number; clientY:number;
  onRemove:()=>void; onChange:(fn:string,cat:TxCat)=>void; onClose:()=>void;
  T:ReturnType<typeof useT>;
}){
  const[showFn,setShowFn]=useState(false);
  const W=308;
  const vw=window.innerWidth, vh=window.innerHeight;
  const left=Math.min(Math.max(clientX+10,8),vw-W-8);
  const top=Math.min(Math.max(clientY-24,8),vh-(showFn?590:310)-8);
  const c=TX[mapping.txCat||"direct"];
  return(
    <div style={{position:"fixed",inset:0,zIndex:9000,pointerEvents:"none"}} onClick={e=>e.stopPropagation()}>
      <div style={{position:"absolute",left,top,width:W,pointerEvents:"auto",
        background:T.popBg,border:`1px solid ${T.gBorder}`,borderRadius:14,
        boxShadow:`0 24px 80px rgba(0,0,0,${T.isDark?0.88:0.22})`,
        backdropFilter:"blur(48px)",WebkitBackdropFilter:"blur(48px)",overflow:"hidden"}}
        onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{padding:"10px 12px 8px",borderBottom:`1px solid ${T.gBorder}`,background:`rgba(${rgb(EM)},0.05)`}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <GitBranch style={{width:11,height:11,color:EM}}/>
              <span style={{fontFamily:"monospace",fontSize:"0.6rem",fontWeight:800,color:EM,letterSpacing:"0.1em"}}>MAPPING EDITOR</span>
            </div>
            <button onClick={e=>{e.stopPropagation();onClose();}} style={{width:20,height:20,borderRadius:5,background:T.glass,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
              <X style={{width:10,height:10,color:T.muted}}/>
            </button>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{flex:1,minWidth:0,padding:"4px 7px",borderRadius:6,background:T.glass,border:`1px solid ${T.border}`}}>
              <div style={{fontFamily:"monospace",fontSize:"0.62rem",fontWeight:700,color:T.sub}}>{srcRow?.srcLabel||mapping.srcRowId}</div>
              <div style={{fontSize:"0.52rem",color:T.muted}}>{srcRow?.srcDesc}</div>
            </div>
            <ArrowRight style={{width:10,height:10,color:T.muted,flexShrink:0}}/>
            <div style={{flex:1,minWidth:0,padding:"4px 7px",borderRadius:6,background:`rgba(${rgb(EM)},0.07)`,border:`1px solid rgba(${rgb(EM)},0.22)`}}>
              <div style={{fontFamily:"monospace",fontSize:"0.62rem",fontWeight:700,color:EM}}>{tgtField?.label||mapping.tgtFieldId}</div>
              <div style={{fontSize:"0.52rem",color:T.muted}}>{tgtField?.desc}</div>
            </div>
          </div>
        </div>
        {/* Current transform */}
        <div style={{padding:"8px 12px",borderBottom:`1px solid ${T.gBorder}`}}>
          <div style={{fontFamily:"monospace",fontSize:"0.52rem",color:T.muted,marginBottom:4,letterSpacing:"0.08em"}}>CURRENT TRANSFORM</div>
          <div style={{display:"flex",alignItems:"center",gap:5,padding:"5px 8px",borderRadius:7,background:`rgba(${rgb(c)},0.10)`,border:`1px solid rgba(${rgb(c)},0.32)`}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:c,flexShrink:0}}/>
            <span style={{fontFamily:"monospace",fontSize:"0.68rem",fontWeight:700,color:c,flex:1}}>{mapping.transform||"Direct"}</span>
            <DtBadge dt={srcRow?.srcDt}/>
            <ArrowRight style={{width:8,height:8,color:T.muted}}/>
            <DtBadge dt={tgtField?.dt}/>
          </div>
        </div>
        {/* Actions */}
        <div style={{padding:"8px 12px",display:"flex",gap:7,borderBottom:`1px solid ${T.gBorder}`}}>
          <button onClick={e=>{e.stopPropagation();setShowFn(v=>!v);}}
            style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:5,padding:"6px 0",borderRadius:7,cursor:"pointer",fontFamily:"monospace",fontSize:"0.62rem",fontWeight:700,
              background:showFn?`rgba(${rgb(EM)},0.16)`:T.glass,border:`1px solid ${showFn?`rgba(${rgb(EM)},0.45)`:T.border}`,color:showFn?EM:T.sub,transition:"all 0.15s"}}>
            <Edit3 style={{width:10,height:10}}/>
            {mapping.txCat==="direct"?"Add Transform":"Change Transform"}
          </button>
          <button onClick={e=>{e.stopPropagation();onRemove();}}
            style={{display:"flex",alignItems:"center",justifyContent:"center",gap:5,padding:"6px 12px",borderRadius:7,cursor:"pointer",fontFamily:"monospace",fontSize:"0.62rem",fontWeight:700,
              background:"rgba(239,68,68,0.10)",border:"1px solid rgba(239,68,68,0.35)",color:"#EF4444",transition:"all 0.15s"}}
            onMouseEnter={e=>(e.currentTarget.style.background="rgba(239,68,68,0.20)")}
            onMouseLeave={e=>(e.currentTarget.style.background="rgba(239,68,68,0.10)")}>
            <Trash2 style={{width:10,height:10}}/> Remove
          </button>
        </div>
        <SuggChips srcDt={srcRow?.srcDt} tgtDt={tgtField?.dt} onApply={(fn,cat)=>{onChange(fn,cat);setShowFn(false);}} T={T}/>
        {showFn&&<FunctionSelector srcDt={srcRow?.srcDt} current={mapping.transform} onSelect={(fn,cat)=>{onChange(fn,cat);setShowFn(false);}} T={T}/>}
      </div>
    </div>
  );
}

// ─── AI Panel ─────────────────────────────────────────────────────────────────
function AIPanel({suggestions,onAccept,onReject,onAcceptAll,onClose,open,T}:{
  suggestions:AISugg[];onAccept:(s:AISugg)=>void;onReject:(id:string)=>void;
  onAcceptAll:()=>void;onClose:()=>void;open:boolean;T:ReturnType<typeof useT>;
}){
  const AW=272,avg=suggestions.length>0?Math.round(suggestions.reduce((a,s)=>a+s.confidence,0)/suggestions.length):0;
  return(
    <div style={{position:"absolute",top:0,bottom:0,right:0,width:AW,zIndex:50,
      transform:`translateX(${open?0:AW+4}px)`,transition:"transform 0.28s cubic-bezier(0.4,0,0.2,1)",
      background:T.isDark?"rgba(7,11,22,0.98)":"#FFFFFF",backdropFilter:"blur(36px)",WebkitBackdropFilter:"blur(36px)",
      borderLeft:`1px solid ${T.gBorder}`,boxShadow:open?`-8px 0 40px rgba(0,0,0,${T.isDark?0.7:0.12})`:"none",
      display:"flex",flexDirection:"column",pointerEvents:open?"auto":"none"}}>
      <div style={{padding:"12px 14px 10px",borderBottom:`1px solid rgba(16,185,129,0.14)`,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <Sparkles style={{width:12,height:12,color:EM}}/>
            <span style={{fontFamily:"monospace",fontSize:"0.58rem",fontWeight:800,color:EM,letterSpacing:"0.1em"}}>AI NEURAL ENGINE</span>
          </div>
          <button onClick={onClose} style={{width:18,height:18,borderRadius:4,background:T.glass,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><X style={{width:9,height:9,color:T.muted}}/></button>
        </div>
        <div style={{display:"flex",gap:6}}>
          {[{l:"PENDING",v:suggestions.length,c:EM},{l:"AVG CONF",v:`${avg}%`,c:T.sub}].map(s=>(
            <div key={s.l} style={{flex:1,padding:"4px 7px",borderRadius:6,background:T.glass,border:`1px solid ${T.border}`}}>
              <div style={{fontFamily:"monospace",fontSize:"0.44rem",color:T.muted}}>{s.l}</div>
              <div style={{fontFamily:"monospace",fontSize:"0.85rem",color:s.c,fontWeight:800}}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"10px 12px",scrollbarWidth:"thin",scrollbarColor:`rgba(${rgb(EM)},0.2) transparent`}}>
        {suggestions.length===0
          ?<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:100,gap:7}}>
              <CheckCircle2 style={{width:22,height:22,color:EM}}/><span style={{color:T.sub,fontSize:"0.65rem"}}>All done!</span>
            </div>
          :suggestions.map(s=>{const c=TX[s.txCat];return(
            <div key={s.id} style={{marginBottom:9,padding:10,borderRadius:8,background:T.glass,border:`1px solid ${T.border}`}}>
              <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:5}}>
                <span style={{fontFamily:"monospace",fontSize:"0.62rem",fontWeight:700,color:T.sub}}>{s.srcLabel}</span>
                <ArrowRight style={{width:8,height:8,color:T.muted,flexShrink:0}}/>
                <span style={{fontFamily:"monospace",fontSize:"0.62rem",fontWeight:700,color:EM,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.tgtLabel}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:6}}>
                <span style={{fontFamily:"monospace",fontSize:"0.52rem",color:c,fontWeight:700,background:`rgba(${rgb(c)},0.12)`,border:`1px solid rgba(${rgb(c)},0.28)`,padding:"1px 5px",borderRadius:4}}>{s.transform}</span>
                <DtBadge dt={s.tgtDt}/>
              </div>
              <div style={{marginBottom:7}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                  <span style={{fontFamily:"monospace",fontSize:"0.44rem",color:T.muted}}>Confidence</span>
                  <span style={{fontFamily:"monospace",fontSize:"0.48rem",color:s.confidence>=90?EM:T.sub,fontWeight:700}}>{s.confidence}%</span>
                </div>
                <div style={{height:3,borderRadius:2,background:T.trackBg}}>
                  <div style={{height:"100%",borderRadius:2,width:`${s.confidence}%`,transition:"width 0.4s",background:s.confidence>=90?EM:s.confidence>=75?"#F59E0B":"#EF4444"}}/>
                </div>
              </div>
              <div style={{display:"flex",gap:5}}>
                <button onClick={()=>onAccept(s)} style={{flex:1,padding:"5px 0",borderRadius:6,background:EM,color:"#fff",fontSize:"0.58rem",fontWeight:700,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:3}}><Check style={{width:8,height:8}}/> Accept</button>
                <button onClick={()=>onReject(s.id)} style={{flex:1,padding:"5px 0",borderRadius:6,background:T.glass,color:T.muted,fontSize:"0.58rem",fontWeight:600,border:`1px solid ${T.border}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:3}}><X style={{width:8,height:8}}/> Skip</button>
              </div>
            </div>
          );})}
      </div>
      {suggestions.length>0&&(
        <div style={{padding:"10px 12px",borderTop:`1px solid ${T.gBorder}`,flexShrink:0}}>
          <button onClick={onAcceptAll} style={{width:"100%",padding:"7px 0",borderRadius:7,background:`rgba(${rgb(EM)},0.12)`,border:`1px solid rgba(${rgb(EM)},0.35)`,color:EM,fontSize:"0.65rem",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
            <Sparkles style={{width:10,height:10}}/> Accept All {suggestions.length}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function MappingLogicWindow({project,onBack}:{project?:Project;onBack?:()=>void}){
  const T=useT();

  // ── Core state: source rows never change type; mappings are separate ──────
  const[mappings,setMappings]   = useState<Mapping[]>(BASE_MAPPINGS);
  const[aiSuggs,setAiSuggs]     = useState<AISugg[]>(INIT_AI);
  const[srcST,setSrcST]         = useState(0);
  const[tgtST,setTgtST]         = useState(0);
  const[hovSrcId,setHovSrcId]   = useState<string|null>(null);
  const[hovTgtId,setHovTgtId]   = useState<string|null>(null);
  const[hovMId,setHovMId]       = useState<string|null>(null);
  const[selMId,setSelMId]       = useState<string|null>(null);
  const[pendingSrcId,setPending]= useState<string|null>(null);
  const[segFilter,setSeg]       = useState<SegFilter>("ALL");
  const[viewMode,setVM]         = useState<ViewMode>("all");
  const[srcQ,setSrcQ]           = useState("");
  const[tgtQ,setTgtQ]           = useState("");
  const[cW,setCW]               = useState(500);
  const[cH,setCH]               = useState(500);
  const[srcOffset,setSrcOffset] = useState(0);
  const[tgtOffset,setTgtOffset] = useState(0);
  const[mounted,setMounted]     = useState(false);
  const[saving,setSaving]       = useState(false);
  const[autoMap,setAutoMap]     = useState(false);
  const[aiOpen,setAiOpen]       = useState(false);
  const[popover,setPopover]     = useState<{mid:string;clientX:number;clientY:number}|null>(null);

  const srcRef=useRef<HTMLDivElement>(null);
  const tgtRef=useRef<HTMLDivElement>(null);
  const canRef=useRef<HTMLDivElement>(null);

  useEffect(()=>{const t=setTimeout(()=>setMounted(true),100);return()=>clearTimeout(t);},[]);
  useEffect(()=>{
    if(!canRef.current) return;
    const ro=new ResizeObserver(e=>{setCW(e[0].contentRect.width);setCH(e[0].contentRect.height);});
    ro.observe(canRef.current);
    return()=>ro.disconnect();
  },[]);

  // Measure the Y offset of each scroll list relative to the canvas top
  // so bezier lines start/end at the correct row Y positions.
  const measureOffsets=useCallback(()=>{
    if(!canRef.current||!srcRef.current||!tgtRef.current) return;
    const cR=canRef.current.getBoundingClientRect();
    const sR=srcRef.current.getBoundingClientRect();
    const tR=tgtRef.current.getBoundingClientRect();
    setSrcOffset(Math.round(sR.top-cR.top));
    setTgtOffset(Math.round(tR.top-cR.top));
  },[]);
  useEffect(()=>{
    // Small delay so DOM has settled after render
    const t=setTimeout(measureOffsets,50);
    const ro=new ResizeObserver(measureOffsets);
    if(srcRef.current) ro.observe(srcRef.current);
    if(tgtRef.current) ro.observe(tgtRef.current);
    if(canRef.current) ro.observe(canRef.current);
    return()=>{clearTimeout(t);ro.disconnect();};
  },[measureOffsets]);
  // Re-measure when banner appears/disappears (changes tgt scroll top)
  useEffect(()=>{ setTimeout(measureOffsets,10); },[pendingSrcId,measureOffsets]);

  // ── Quick lookups ──────────────────────────────────────────────────────────
  const mappedSrcIds=useMemo(()=>new Set(mappings.map(m=>m.srcRowId)),[mappings]);
  const mappedTgtIds=useMemo(()=>new Set(mappings.map(m=>m.tgtFieldId)),[mappings]);

  // mappings by srcRowId
  const mappingsBySrc=useMemo(()=>{
    const map=new Map<string,Mapping[]>();
    for(const m of mappings){const arr=map.get(m.srcRowId)||[];arr.push(m);map.set(m.srcRowId,arr);}
    return map;
  },[mappings]);

  // mappings by tgtFieldId
  const mappingsByTgt=useMemo(()=>{
    const map=new Map<string,Mapping[]>();
    for(const m of mappings){const arr=map.get(m.tgtFieldId)||[];arr.push(m);map.set(m.tgtFieldId,arr);}
    return map;
  },[mappings]);

  // ─��� Source visible rows ────────────────────────────────────────────────────
  const srcVisRows=useMemo(()=>{
    let rs=BASE_SRC;
    if(segFilter!=="ALL") rs=rs.filter(r=>r.kind==="header"?r.segId===segFilter:r.segId===segFilter);
    if(viewMode==="mapped")      rs=rs.filter(r=>r.kind==="header"||mappedSrcIds.has(r.id));
    if(viewMode==="unmapped")    rs=rs.filter(r=>r.kind==="header"||!mappedSrcIds.has(r.id));
    if(viewMode==="transformed") rs=rs.filter(r=>r.kind==="header"||(mappingsBySrc.get(r.id)||[]).some(m=>m.txCat!=="direct"));
    if(srcQ){const sl=srcQ.toLowerCase();rs=rs.filter(r=>r.kind==="header"||(r.srcLabel?.toLowerCase().includes(sl)||r.srcDesc?.toLowerCase().includes(sl)));}
    return rs;
  },[mappedSrcIds,mappingsBySrc,segFilter,viewMode,srcQ]);

  const srcYs    =useMemo(()=>cumY(srcVisRows),[srcVisRows]);
  const srcTotalH=useMemo(()=>srcVisRows.reduce((s,r)=>s+rowH(r),0),[srcVisRows]);

  // ── Target visible fields ──────────────────────────────────────────────────
  const tgtVisFields=useMemo(()=>{
    let fs=ALL_TGT;
    if(viewMode==="mapped")      fs=fs.filter(f=>mappedTgtIds.has(f.id));
    if(viewMode==="unmapped")    fs=fs.filter(f=>!mappedTgtIds.has(f.id));
    if(viewMode==="transformed"){
      const txIds=new Set(mappings.filter(m=>m.txCat!=="direct").map(m=>m.tgtFieldId));
      fs=fs.filter(f=>txIds.has(f.id));
    }
    if(tgtQ){const tl=tgtQ.toLowerCase();fs=fs.filter(f=>f.label.toLowerCase().includes(tl)||f.desc.toLowerCase().includes(tl));}
    return fs;
  },[mappedTgtIds,mappings,viewMode,tgtQ]);

  const tgtYs    =useMemo(()=>tgtVisFields.map((_,i)=>i*FIELD_H),[tgtVisFields]);
  const tgtTotalH=useMemo(()=>tgtVisFields.length*FIELD_H,[tgtVisFields]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalSrcFields  =BASE_SRC.filter(r=>r.kind==="field").length;
  const mappedSrcCount  =mappedSrcIds.size;
  const transformedCount=mappings.filter(m=>m.txCat!=="direct").length;
  const pct             =totalSrcFields>0?Math.round(mappedSrcCount/totalSrcFields*100):0;

  // ── Scroll ─────────────────────────────────────────────────────────────────
  const scrollSrcTo=useCallback((st:number)=>{
    const s=Math.max(0,Math.min(st,srcTotalH-cH));
    if(srcRef.current) srcRef.current.scrollTop=s;
    setSrcST(s);
  },[srcTotalH,cH]);

  // ── AI ─────────────────────────────────────────────────────────────────────
  const acceptSugg=useCallback((s:AISugg)=>{
    setMappings(prev=>[...prev,{id:newMid(),srcRowId:s.srcRowId,tgtFieldId:s.tgtId,transform:s.transform,txCat:s.txCat,confidence:s.confidence}]);
    setAiSuggs(prev=>prev.filter(a=>a.id!==s.id));
  },[]);
  const rejectSugg=(id:string)=>setAiSuggs(prev=>prev.filter(a=>a.id!==id));
  const acceptAll=()=>aiSuggs.forEach(acceptSugg);

  // ── Mapping mutations (operate on Mapping[] only) ──────────────────────────
  const removeMapping=(mid:string)=>{
    setMappings(prev=>prev.filter(m=>m.id!==mid)); // instant removal
    setPopover(null); setSelMId(null);
  };
  const changeTransform=(mid:string,fn:string,cat:TxCat)=>{
    setMappings(prev=>prev.map(m=>m.id===mid?{...m,transform:fn,txCat:cat}:m));
    setPopover(null);
  };

  // ── Create new mapping (src + tgt both chosen) ─────────────────────────────
  const createMapping=(srcRowId:string,tgtFieldId:string)=>{
    // Check duplicate (same src→tgt pair already exists)
    if(mappings.some(m=>m.srcRowId===srcRowId&&m.tgtFieldId===tgtFieldId)) {
      setPending(null); return;
    }
    setMappings(prev=>[...prev,{id:newMid(),srcRowId,tgtFieldId,transform:"Direct",txCat:"direct",confidence:100}]);
    setPending(null);
  };

  // ── Click handlers ─────────────────────────────────────────────────────────
  const openPopover=(mid:string,e:React.MouseEvent)=>{
    e.stopPropagation();
    setPopover({mid,clientX:e.clientX,clientY:e.clientY});
    setSelMId(mid); setPending(null);
  };
  const closeAll=()=>{setPopover(null);setSelMId(null);};

  const handleSrcClick=(row:SrcRow,e:React.MouseEvent)=>{
    e.stopPropagation();
    if(row.kind==="header") return;
    if(pendingSrcId===row.id){setPending(null);}
    else{setPending(row.id);setPopover(null);setSelMId(null);}
  };

  const handleTgtClick=(field:TgtField,e:React.MouseEvent)=>{
    e.stopPropagation();
    if(pendingSrcId){
      createMapping(pendingSrcId,field.id);
    } else {
      // if this target has mappings, open popover for first one
      const ms=mappingsByTgt.get(field.id)||[];
      if(ms.length>0) openPopover(ms[0].id,e);
    }
  };

  const popMapping=popover?mappings.find(m=>m.id===popover.mid)||null:null;
  const popSrcRow =popMapping?BASE_SRC.find(r=>r.id===popMapping.srcRowId):undefined;
  const popTgtF   =popMapping?ALL_TGT.find(f=>f.id===popMapping.tgtFieldId):undefined;

  const SEGS:SegFilter[]=["ALL","ISA","GS","ST","BHT","NM1","CLM","DTP","SV1"];
  const PW=268;
  const VModes:[ViewMode,string,number,string][]=[
    ["all","All",totalSrcFields,EM],
    ["mapped","Mapped",mappedSrcCount,EM],
    ["unmapped","Unmapped",totalSrcFields-mappedSrcCount,"#EF4444"],
    ["transformed","Transformed",transformedCount,"#8B5CF6"],
  ];

  return(
    <>
      {popover&&popMapping&&(
        <EditPopover mapping={popMapping} srcRow={popSrcRow} tgtField={popTgtF}
          clientX={popover.clientX} clientY={popover.clientY}
          onRemove={()=>removeMapping(popMapping.id)}
          onChange={(fn,cat)=>changeTransform(popMapping.id,fn,cat)}
          onClose={closeAll} T={T}/>
      )}

      <div style={{display:"flex",flexDirection:"column",height:"100%",background:T.bg,overflow:"hidden",position:"relative"}}>

        {/* ── TOOLBAR ── */}
        <div style={{height:48,flexShrink:0,display:"flex",alignItems:"center",padding:"0 16px",gap:10,
          background:T.toolBg,backdropFilter:"blur(28px)",WebkitBackdropFilter:"blur(28px)",
          borderBottom:`1px solid ${T.gBorder}`,zIndex:20}}>
          <div style={{display:"flex",alignItems:"center",gap:7,flexShrink:0}}>
            <div style={{width:24,height:24,borderRadius:6,background:`rgba(${rgb(EM)},0.14)`,border:`1px solid rgba(${rgb(EM)},0.38)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <GitBranch style={{width:11,height:11,color:EM}}/>
            </div>
            <div>
              <div style={{fontFamily:"monospace",fontSize:"0.65rem",fontWeight:800,color:EM,textShadow:T.emTxt}}>Mapping Logic</div>
              <div style={{fontFamily:"monospace",fontSize:"0.5rem",color:T.muted}}>{project?.specName||"EDI 837P"} · {project?.partnerName||"Healthcare Claims"}</div>
            </div>
          </div>

          {pendingSrcId&&(
            <div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:7,
              background:`rgba(${rgb(EM)},0.10)`,border:`1px solid rgba(${rgb(EM)},0.38)`,flexShrink:0}}>
              <Link2 style={{width:9,height:9,color:EM}}/>
              <span style={{fontFamily:"monospace",fontSize:"0.58rem",color:EM,fontWeight:700,whiteSpace:"nowrap"}}>
                {BASE_SRC.find(r=>r.id===pendingSrcId)?.srcLabel} — click any target field
              </span>
              <button onClick={()=>setPending(null)} style={{background:"none",border:"none",cursor:"pointer",display:"flex",marginLeft:2}}><X style={{width:9,height:9,color:EM}}/></button>
            </div>
          )}

          <div style={{flex:1,display:"flex",flexDirection:"column",gap:3,maxWidth:220}}>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <span style={{fontFamily:"monospace",fontSize:"0.5rem",color:T.muted}}>Sources Mapped</span>
              <span style={{fontFamily:"monospace",fontSize:"0.54rem",fontWeight:700,color:pct>=90?EM:pct>=70?"#F59E0B":"#EF4444"}}>{mappedSrcCount}/{totalSrcFields} · {pct}%</span>
            </div>
            <div style={{height:3,borderRadius:2,background:T.trackBg}}>
              <div style={{height:"100%",borderRadius:2,width:`${pct}%`,transition:"width 0.6s",
                background:pct>=90?`linear-gradient(90deg,${EM},${EM2})`:"#F59E0B",
                boxShadow:pct>=90?`0 0 6px ${T.emGlow}`:"none"}}/>
            </div>
          </div>

          <div style={{display:"flex",gap:1,padding:"2px",borderRadius:7,background:T.pillBg,border:`1px solid ${T.border}`}}>
            {VModes.map(([id,label,count,color])=>(
              <button key={id} onClick={()=>setVM(id)} style={{padding:"3px 8px",borderRadius:5,fontFamily:"monospace",fontSize:"0.56rem",cursor:"pointer",border:"none",
                background:viewMode===id?`rgba(${rgb(color)},0.16)`:"transparent",color:viewMode===id?color:T.muted,fontWeight:viewMode===id?700:500,transition:"all 0.12s"}}>
                {label}{id!=="all"&&<span style={{marginLeft:3,fontSize:"0.48rem",opacity:0.7}}>({count})</span>}
              </button>
            ))}
          </div>

          <button onClick={()=>{setAutoMap(true);setTimeout(()=>{acceptAll();setAutoMap(false);},1200);}}
            style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:7,background:T.glass,border:`1px solid ${T.border}`,color:autoMap?EM:T.sub,fontSize:"0.62rem",fontWeight:600,cursor:"pointer"}}>
            {autoMap?<RefreshCw style={{width:10,height:10,animation:"spin 1s linear infinite"}}/>:<Cpu style={{width:10,height:10}}/>}
            {autoMap?"Mapping…":"AI Auto-Map"}
          </button>
          <button onClick={()=>setAiOpen(v=>!v)}
            style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:7,
              background:aiOpen?`rgba(${rgb(EM)},0.12)`:T.glass,border:`1px solid ${aiOpen?`rgba(${rgb(EM)},0.35)`:T.border}`,
              color:aiOpen?EM:T.muted,fontSize:"0.62rem",fontWeight:600,cursor:"pointer"}}>
            <Sparkles style={{width:10,height:10}}/>AI{aiSuggs.length>0?` (${aiSuggs.length})`:""}
          </button>
          <button onClick={()=>{setSaving(true);setTimeout(()=>setSaving(false),1600);}}
            style={{display:"flex",alignItems:"center",gap:4,padding:"5px 12px",borderRadius:7,border:"none",cursor:"pointer",
              background:saving?`rgba(${rgb(EM)},0.14)`:EM,color:"#fff",fontSize:"0.62rem",fontWeight:700,
              boxShadow:saving?"none":`0 0 14px ${T.emGlow}`,transition:"all 0.18s"}}>
            {saving?<CheckCircle2 style={{width:10,height:10}}/>:<Save style={{width:10,height:10}}/>}
            {saving?"Saved!":"Save Draft"}
          </button>
        </div>

        {/* ── BODY ── */}
        <div style={{flex:1,display:"flex",overflow:"hidden",minHeight:0}}>

          {/* SOURCE */}
          <div style={{width:PW,flexShrink:0,display:"flex",flexDirection:"column",background:T.panelBg,borderRight:`1px solid ${T.gBorder}`,zIndex:10,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)"}}>
            <div style={{padding:"10px 12px 8px",borderBottom:`1px solid ${T.gBorder}`,flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:7}}>
                <Database style={{width:11,height:11,color:EM}}/>
                <span style={{fontFamily:"monospace",fontSize:"0.58rem",fontWeight:800,color:EM,letterSpacing:"0.12em"}}>SOURCE SCHEMA</span>
                <span style={{marginLeft:"auto",fontFamily:"monospace",fontSize:"0.5rem",color:T.muted,background:T.glass,border:`1px solid ${T.border}`,padding:"1px 5px",borderRadius:3}}>{mappedSrcCount}/{totalSrcFields}</span>
              </div>
              <div style={{height:26,background:T.glass,border:`1px solid ${T.gBorder}`,borderRadius:7,display:"flex",alignItems:"center",gap:5,padding:"0 7px",backdropFilter:"blur(8px)"}}>
                <Search style={{width:9,height:9,color:T.muted}}/>
                <input placeholder="Search source…" value={srcQ} onChange={e=>setSrcQ(e.target.value)}
                  style={{flex:1,background:"transparent",border:"none",outline:"none",color:T.text,fontSize:"0.58rem",fontFamily:"monospace"}}/>
                {srcQ&&<button onClick={()=>setSrcQ("")} style={{background:"none",border:"none",cursor:"pointer",display:"flex"}}><X style={{width:8,height:8,color:T.muted}}/></button>}
              </div>
              <div style={{fontSize:"0.5rem",color:T.muted,fontFamily:"monospace",marginTop:5}}>
                Click any field to start mapping · Multiple targets allowed
              </div>
            </div>
            <div ref={srcRef} onScroll={()=>srcRef.current&&setSrcST(srcRef.current.scrollTop)}
              style={{flex:1,overflowY:"auto",scrollbarWidth:"thin",scrollbarColor:`${T.scroll} transparent`}}>
              {srcVisRows.map(row=>(
                <SrcRow key={row.id} row={row}
                  rowMappings={mappingsBySrc.get(row.id)||[]}
                  isPending={pendingSrcId===row.id}
                  hov={hovSrcId===row.id} selMId={selMId}
                  onHov={setHovSrcId} onClick={handleSrcClick} T={T}/>
              ))}
            </div>
          </div>

          {/* CANVAS */}
          <div ref={canRef} style={{flex:1,position:"relative",overflow:"hidden",minWidth:0}}
            onClick={()=>{closeAll();setPending(null);}}>
            <NeuralBg isDark={T.isDark}/>
            <SegBands rows={srcVisRows} ys={srcYs} st={srcST} cH={cH} T={T}/>
            <CanvasLines
              mappings={mappings} srcRows={srcVisRows} srcYs={srcYs} srcST={srcST} srcOffset={srcOffset}
              tgtFields={tgtVisFields} tgtYs={tgtYs} tgtST={tgtST} tgtOffset={tgtOffset}
              cW={cW} cH={cH} selMId={selMId} hovMId={hovMId} mounted={mounted}
              onClick={openPopover}/>
            <LogicBoxes
              mappings={mappings} srcRows={srcVisRows} srcYs={srcYs} srcST={srcST} srcOffset={srcOffset}
              tgtFields={tgtVisFields} tgtYs={tgtYs} tgtST={tgtST} tgtOffset={tgtOffset}
              cW={cW} cH={cH} selMId={selMId} hovMId={hovMId}
              onClick={openPopover} T={T}/>
            <MiniMap rows={srcVisRows} ys={srcYs} totalH={srcTotalH} st={srcST} cH={cH} onScroll={scrollSrcTo} T={T}/>

            {/* Watermark */}
            <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
              pointerEvents:"none",textAlign:"center",opacity:T.isDark?0.06:0.04,zIndex:0}}>
              <div style={{fontFamily:"monospace",fontSize:"1.8rem",fontWeight:900,color:EM,letterSpacing:"-0.04em",lineHeight:1}}>MAPPING</div>
              <div style={{fontFamily:"monospace",fontSize:"0.55rem",color:EM,letterSpacing:"0.35em",marginTop:3}}>CANVAS</div>
            </div>

            {/* Legend */}
            <div style={{position:"absolute",bottom:14,left:12,background:T.isDark?"rgba(7,11,22,0.95)":"#FFFFFF",
              border:`1px solid ${T.gBorder}`,borderRadius:10,padding:"6px 10px",
              backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",zIndex:10,
              boxShadow:`0 4px 20px rgba(0,0,0,${T.isDark?0.3:0.08})`}}>
              <div style={{fontFamily:"monospace",fontSize:"0.43rem",color:T.muted,fontWeight:700,letterSpacing:"0.12em",marginBottom:4}}>TRANSFORMS</div>
              {Object.entries(TX).map(([k,c])=>(
                <div key={k} style={{display:"flex",alignItems:"center",gap:5,marginBottom:2.5}}>
                  <div style={{width:14,height:1.5,background:c,borderRadius:1}}/>
                  <span style={{fontFamily:"monospace",fontSize:"0.48rem",color:T.sub,textTransform:"capitalize"}}>{k}</span>
                </div>
              ))}
              <div style={{marginTop:5,paddingTop:4,borderTop:`1px solid ${T.border}`,fontFamily:"monospace",fontSize:"0.42rem",color:T.muted}}>Click line · box · field to edit</div>
            </div>

            {/* AI pull-tab */}
            <div style={{position:"absolute",top:0,right:0,bottom:0,width:28,zIndex:40,cursor:"pointer"}}
              onClick={e=>{e.stopPropagation();setAiOpen(v=>!v);}}>
              <div style={{position:"absolute",right:0,top:"50%",transform:"translateY(-50%)",width:3,height:64,background:EM,borderRadius:"3px 0 0 3px",boxShadow:`0 0 12px ${T.emGlow}`,opacity:aiOpen?0:0.6,transition:"opacity 0.2s"}}/>
              <div style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",opacity:aiOpen?0:0.45,transition:"opacity 0.2s"}}>
                <ChevronRight style={{width:11,height:11,color:EM}}/>
              </div>
            </div>
            <AIPanel suggestions={aiSuggs} onAccept={acceptSugg} onReject={rejectSugg}
              onAcceptAll={acceptAll} onClose={()=>setAiOpen(false)} open={aiOpen} T={T}/>
          </div>

          {/* TARGET */}
          <div style={{width:PW,flexShrink:0,display:"flex",flexDirection:"column",background:T.panelBg,borderLeft:`1px solid ${T.gBorder}`,zIndex:10,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)"}}>
            <div style={{padding:"10px 12px 8px",borderBottom:`1px solid ${T.gBorder}`,flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:7}}>
                <Globe style={{width:11,height:11,color:"#3B82F6"}}/>
                <span style={{fontFamily:"monospace",fontSize:"0.58rem",fontWeight:800,color:"#3B82F6",letterSpacing:"0.12em"}}>TARGET SCHEMA</span>
                <span style={{marginLeft:"auto",fontFamily:"monospace",fontSize:"0.5rem",color:T.muted,background:T.glass,border:`1px solid ${T.border}`,padding:"1px 5px",borderRadius:3}}>{mappedTgtIds.size}/{ALL_TGT.length}</span>
              </div>
              <div style={{height:26,background:T.glass,border:`1px solid ${T.gBorder}`,borderRadius:7,display:"flex",alignItems:"center",gap:5,padding:"0 7px",backdropFilter:"blur(8px)"}}>
                <Search style={{width:9,height:9,color:T.muted}}/>
                <input placeholder="Search target…" value={tgtQ} onChange={e=>setTgtQ(e.target.value)}
                  style={{flex:1,background:"transparent",border:"none",outline:"none",color:T.text,fontSize:"0.58rem",fontFamily:"monospace"}}/>
                {tgtQ&&<button onClick={()=>setTgtQ("")} style={{background:"none",border:"none",cursor:"pointer",display:"flex"}}><X style={{width:8,height:8,color:T.muted}}/></button>}
              </div>
              <div style={{display:"flex",gap:8,marginTop:5}}>
                {[{v:mappedTgtIds.size,c:EM,l:"mapped"},{v:transformedCount,c:"#8B5CF6",l:"transformed"},{v:ALL_TGT.length-mappedTgtIds.size,c:"#EF4444",l:"available"}].map(s=>(
                  <div key={s.l} style={{display:"flex",alignItems:"center",gap:3}}>
                    <span style={{fontFamily:"monospace",fontSize:"0.52rem",fontWeight:700,color:s.c}}>{s.v}</span>
                    <span style={{fontSize:"0.5rem",color:T.muted,fontFamily:"monospace"}}>{s.l}</span>
                  </div>
                ))}
              </div>
            </div>

            {pendingSrcId&&(
              <div style={{padding:"6px 12px",background:`rgba(${rgb(EM)},0.08)`,borderBottom:`1px solid rgba(${rgb(EM)},0.22)`,
                display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
                <Zap style={{width:9,height:9,color:EM,flexShrink:0}}/>
                <span style={{fontSize:"0.56rem",color:EM,fontFamily:"monospace",fontWeight:600}}>Click any target field to create mapping</span>
              </div>
            )}

            <div ref={tgtRef} onScroll={()=>tgtRef.current&&setTgtST(tgtRef.current.scrollTop)}
              style={{flex:1,overflowY:"auto",scrollbarWidth:"thin",scrollbarColor:`rgba(59,130,246,0.18) transparent`}}>
              {tgtVisFields.length===0?(
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:120,gap:7,padding:16}}>
                  <CheckCircle2 style={{width:18,height:18,color:EM}}/>
                  <span style={{fontSize:"0.62rem",color:T.muted,textAlign:"center",fontFamily:"monospace"}}>No target fields match this filter</span>
                </div>
              ):tgtVisFields.map(field=>(
                <TgtFieldRow key={field.id} field={field}
                  fieldMappings={mappingsByTgt.get(field.id)||[]}
                  srcRows={BASE_SRC}
                  isPendingSrc={!!pendingSrcId}
                  hov={hovTgtId===field.id}
                  onHov={setHovTgtId} onClick={handleTgtClick} T={T}/>
              ))}
            </div>
          </div>
        </div>

        {/* ── BOTTOM BAR ── */}
        <div style={{height:38,flexShrink:0,display:"flex",alignItems:"center",padding:"0 14px",gap:6,
          background:T.toolBg,backdropFilter:"blur(28px)",WebkitBackdropFilter:"blur(28px)",
          borderTop:`1px solid ${T.gBorder}`,zIndex:20}}>
          {SEGS.map(s=>{const c=s==="ALL"?EM:(SEG[s]||T.muted),active=segFilter===s;return(
            <button key={s} onClick={()=>setSeg(s)} style={{padding:"2px 8px",borderRadius:4,fontFamily:"monospace",fontSize:"0.56rem",
              fontWeight:active?800:500,cursor:"pointer",border:`1px solid ${active?`rgba(${rgb(c)},0.45)`:T.gBorder}`,
              background:active?`rgba(${rgb(c)},0.14)`:T.glass,color:active?c:T.muted,transition:"all 0.12s",backdropFilter:"blur(6px)"}}>
              {s}
            </button>
          );})}
          <div style={{width:1,height:14,background:T.border,flexShrink:0,margin:"0 2px"}}/>
          {[{l:"MAPPINGS",v:mappings.length,c:EM},{l:"TRANSFORMED",v:transformedCount,c:"#8B5CF6"},{l:"AI PENDING",v:aiSuggs.length,c:"#EC4899"}].map(s=>(
            <div key={s.l} style={{display:"flex",alignItems:"center",gap:3}}>
              <span style={{fontFamily:"monospace",fontSize:"0.58rem",color:s.c,fontWeight:800}}>{s.v}</span>
              <span style={{fontFamily:"monospace",fontSize:"0.48rem",color:T.muted}}>{s.l}</span>
            </div>
          ))}
          <div style={{marginLeft:"auto",fontFamily:"monospace",fontSize:"0.47rem",color:T.muted,padding:"2px 7px",borderRadius:4,background:T.glass,border:`1px solid ${T.border}`}}>
            {pendingSrcId?"Select target field →":"Click source field to begin mapping"}
          </div>
        </div>
      </div>
    </>
  );
}
