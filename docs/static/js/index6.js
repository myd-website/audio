import{c as S,d as k,r as O,ao as H,u as z,t as x,p as n,z as D,K as R,ap as L,aq as U,A as M,b as T,n as q,O as V,F as Y,a as j,ar as G,I as J,P as Q,C as W,as as A,U as X,at as Z,au as ee,S as te}from"./index.js";import{p as ne,c as oe,P as ae}from"./function-call.js";import{B as P}from"./index9.js";import{u as le}from"./use-expose.js";const[F,_]=S("action-bar"),I=Symbol(F),se={placeholder:Boolean,safeAreaInsetBottom:x};var ce=k({name:F,props:se,setup(e,{slots:r}){const o=O(),i=H(o,_),{linkChildren:l}=z(I);l();const f=()=>{var m;return n("div",{ref:o,class:[_(),{"van-safe-area-bottom":e.safeAreaInsetBottom}]},[(m=r.default)==null?void 0:m.call(r)])};return()=>e.placeholder?i(f):f()}});const re=D(ce),[ie,ue]=S("action-bar-button"),de=R({},L,{type:String,text:String,icon:String,color:String,loading:Boolean,disabled:Boolean});var fe=k({name:ie,props:de,setup(e,{slots:r}){const o=U(),{parent:i,index:l}=M(I),f=T(()=>{if(i){const s=i.children[l.value-1];return!(s&&"isButton"in s)}}),m=T(()=>{if(i){const s=i.children[l.value+1];return!(s&&"isButton"in s)}});return le({isButton:!0}),()=>{const{type:s,icon:B,text:g,color:C,loading:v,disabled:w}=e;return n(P,{class:ue([s,{last:m.value,first:f.value}]),size:"large",type:s,icon:B,color:C,loading:v,disabled:w,onClick:o},{default:()=>[r.default?r.default():g]})}}});const E=D(fe),[me,c,b]=S("dialog"),Be=R({},ne,{title:String,theme:String,width:q,message:[String,Function],callback:Function,allowHtml:Boolean,className:V,transition:Y("van-dialog-bounce"),messageAlign:String,closeOnPopstate:x,showCancelButton:Boolean,cancelButtonText:String,cancelButtonColor:String,cancelButtonDisabled:Boolean,confirmButtonText:String,confirmButtonColor:String,confirmButtonDisabled:Boolean,showConfirmButton:x,closeOnClickOverlay:Boolean}),ge=[...oe,"transition","closeOnPopstate"];var we=k({name:me,props:Be,emits:["confirm","cancel","keydown","update:show"],setup(e,{emit:r,slots:o}){const i=O(),l=j({confirm:!1,cancel:!1}),f=t=>r("update:show",t),m=t=>{var a;f(!1),(a=e.callback)==null||a.call(e,t)},s=t=>()=>{e.show&&(r(t),e.beforeClose?(l[t]=!0,te(e.beforeClose,{args:[t],done(){m(t),l[t]=!1},canceled(){l[t]=!1}})):m(t))},B=s("cancel"),g=s("confirm"),C=G(t=>{var a,u;if(t.target!==((u=(a=i.value)==null?void 0:a.popupRef)==null?void 0:u.value))return;({Enter:e.showConfirmButton?g:A,Escape:e.showCancelButton?B:A})[t.key](),r("keydown",t)},["enter","esc"]),v=()=>{const t=o.title?o.title():e.title;if(t)return n("div",{class:c("header",{isolated:!e.message&&!o.default})},[t])},w=t=>{const{message:a,allowHtml:u,messageAlign:d}=e,h=c("message",{"has-title":t,[d]:d}),y=X(a)?a():a;return u&&typeof y=="string"?n("div",{class:h,innerHTML:y},null):n("div",{class:h},[y])},K=()=>{if(o.default)return n("div",{class:c("content")},[o.default()]);const{title:t,message:a,allowHtml:u}=e;if(a){const d=!!(t||o.title);return n("div",{key:u?1:0,class:c("content",{isolated:!d})},[w(d)])}},$=()=>n("div",{class:[ee,c("footer")]},[e.showCancelButton&&n(P,{size:"large",text:e.cancelButtonText||b("cancel"),class:c("cancel"),style:{color:e.cancelButtonColor},loading:l.cancel,disabled:e.cancelButtonDisabled,onClick:B},null),e.showConfirmButton&&n(P,{size:"large",text:e.confirmButtonText||b("confirm"),class:[c("confirm"),{[Z]:e.showCancelButton}],style:{color:e.confirmButtonColor},loading:l.confirm,disabled:e.confirmButtonDisabled,onClick:g},null)]),p=()=>n(re,{class:c("footer")},{default:()=>[e.showCancelButton&&n(E,{type:"warning",text:e.cancelButtonText||b("cancel"),class:c("cancel"),color:e.cancelButtonColor,loading:l.cancel,disabled:e.cancelButtonDisabled,onClick:B},null),e.showConfirmButton&&n(E,{type:"danger",text:e.confirmButtonText||b("confirm"),class:c("confirm"),color:e.confirmButtonColor,loading:l.confirm,disabled:e.confirmButtonDisabled,onClick:g},null)]}),N=()=>o.footer?o.footer():e.theme==="round-button"?p():$();return()=>{const{width:t,title:a,theme:u,message:d,className:h}=e;return n(ae,J({ref:i,role:"dialog",class:[c([u]),h],style:{width:W(t)},tabindex:0,"aria-labelledby":a||d,onKeydown:C,"onUpdate:show":f},Q(e,ge)),{default:()=>[v(),K(),N()]})}}});export{we as s};
