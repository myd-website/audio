import{c as w,d as k,p as r,t as B,F as M,z as P,_ as F,r as c,w as I,o as A,Z as _,$ as f,a0 as e,a8 as U,a9 as $,a3 as s,a6 as q,a5 as D,a7 as S}from"./index.js";import"./index4.js";import{F as T}from"./index5.js";import{N as z}from"./index7.js";import"./use-expose.js";const[E,L]=w("divider"),Q={dashed:Boolean,hairline:B,contentPosition:M("center")};var R=k({name:E,props:Q,setup(p,{slots:d}){return()=>{var n;return r("div",{role:"separator",class:L({dashed:p.dashed,hairline:p.hairline,[`content-${p.contentPosition}`]:!!d.default})},[(n=d.default)==null?void 0:n.call(d)])}}});const Z=P(R);const j={ref:"root",class:"text-center"},G={class:"calculation"},H=["onClick"],J={key:0,class:"calc-content"},K={class:"calc-title"},O={class:"calc-question"},W={class:"process"},X={class:"process-content"},Y={class:"process-content-type"},ee={style:{visibility:"hidden"}},te={class:"process-content-type"},le={class:"process-content"},ne={class:"answer"},ae={style:{visibility:"hidden"}},se={class:"answerColor"},oe={__name:"MathsView",setup(p){const d=c("好好学习，天天向上"),n=c(null),o=c(null),u=c(null),i=c(null),v=c(!1),y=["学海无涯，奋斗不止。","坚持到底，永不放弃。","知识改变命运，学习成就未来。","不断挑战自我，超越极限。","今天努力一点，明天轻松一点。","积累点滴进步，铸就辉煌人生。","每一次的努力，都是成功的积累。","勤奋是成功的基石，智慧是成功的翅膀。","学习是一种态度，也是一种责任。","成功来自努力，努力造就成功。"],h=[{id:"add",name:"加法",type:"+",fn:(l,t)=>l+t},{id:"subtract",name:"减法",type:"-",fn:(l,t)=>l-t},{id:"multiply",name:"乘法",type:"x",fn:(l,t)=>l*t},{id:"divide",name:"除法",type:"÷",fn:(l,t)=>l/t}];I([o,u],([l,t])=>{l&&t&&(i.value=null)}),A(()=>{b()});const b=()=>{const l=Math.floor(Math.random()*y.length);d.value=y[l]},x=l=>{console.log(l,"item"),n.value=l,i.value=null,v.value=!1},V=()=>{console.log(n.value,"defaultCalc"),console.log(o.value,"startNumber"),console.log(u.value,"endNumber"),v.value=!0,i.value=n.value.fn(Number(o.value),Number(u.value))},N=()=>{o.value=null,u.value=null,i.value=null,v.value=!1};return(l,t)=>{const g=z,m=T,C=Z;return _(),f("div",j,[r(g,{"left-icon":"volume-o",text:d.value},null,8,["text"]),e("div",G,[(_(),f(U,null,$(h,a=>e("div",{key:a.id,class:"box"},[e("div",{class:"item",onClick:ue=>x(a)},s(a.name)+"   "+s(a.type),9,H),t[3]||(t[3]=e("br",null,null,-1))])),64))]),n.value?(_(),f("div",J,[e("div",K,[e("span",null,s(n.value.name)+"题目：",1),e("span",{class:"AI",onClick:V},"分析"),e("span",{class:"clear",onClick:N},"清空")]),e("div",O,[r(m,{class:"input",modelValue:o.value,"onUpdate:modelValue":t[0]||(t[0]=a=>o.value=a),type:"number"},null,8,["modelValue"]),e("span",null,s(n.value.type),1),r(m,{class:"input",modelValue:u.value,"onUpdate:modelValue":t[1]||(t[1]=a=>u.value=a),type:"number"},null,8,["modelValue"]),t[4]||(t[4]=e("span",null," = ",-1)),r(m,{class:"input",modelValue:i.value,"onUpdate:modelValue":t[2]||(t[2]=a=>i.value=a),readonly:"",type:"number"},null,8,["modelValue"])]),e("div",W,[e("div",X,[e("div",Y,[e("span",ee,s(n.value.type),1),e("span",null,s(o.value),1)]),e("div",te,[e("span",null,s(n.value.type),1),e("span",null,s(u.value),1)])]),r(C,{style:{color:"#1989fa",borderColor:"#1989fa",padding:"0 16px",marginBottom:"0px"},"content-position":"left"},{default:q(()=>t[5]||(t[5]=[S("=")])),_:1}),e("div",le,[e("div",ne,[e("span",ae,s(n.value.type),1),e("span",se,s(i.value),1)])])])])):D("",!0)],512)}}},ve=F(oe,[["__scopeId","data-v-36f691d4"]]);export{ve as default};
