import{c as o,d as c,p as r,aa as d,t as u,I as m,ag as f,z as g}from"./index.js";const[p,i]=o("cell-group"),v={title:String,inset:Boolean,border:u};var O=c({name:p,inheritAttrs:!1,props:v,setup(e,{slots:t,attrs:l}){const n=()=>{var a;return r("div",m({class:[i({inset:e.inset}),{[f]:e.border&&!e.inset}]},l),[(a=t.default)==null?void 0:a.call(t)])},s=()=>r("div",{class:i("title",{inset:e.inset})},[t.title?t.title():e.title]);return()=>e.title||t.title?r(d,null,[s(),n()]):n()}});const T=g(O);export{T as C};
