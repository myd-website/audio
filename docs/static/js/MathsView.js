import{c as C,d as w,h as d,t as k,m as I,q as B,_ as M,r as p,f as S,R as v,S as e,Y as P,Z as U,T as o,U as q,W as F,X as m,V as T,$,a0 as A}from"./index.js";import"./index4.js";import{F as D}from"./index5.js";import{N as R}from"./index7.js";import"./use-expose.js";const[E,L]=C("divider"),Q={dashed:Boolean,hairline:k,contentPosition:I("center")};var W=w({name:E,props:Q,setup(l,{slots:c}){return()=>{var s;return d("div",{role:"separator",class:L({dashed:l.dashed,hairline:l.hairline,[`content-${l.contentPosition}`]:!!c.default})},[(s=c.default)==null?void 0:s.call(c)])}}});const X=B(W);const f=l=>($("data-v-51b3ae08"),l=l(),A(),l),Y={ref:"root",class:"text-center"},Z={class:"calculation"},j=["onClick"],z=f(()=>e("br",null,null,-1)),G={key:0,class:"calc-content"},H={class:"calc-title"},J={class:"calc-question"},K=f(()=>e("span",null," = ",-1)),O={class:"process"},ee={class:"process-content"},te={class:"process-content-type"},ne={style:{visibility:"hidden"}},se={class:"process-content-type"},ae={class:"process-content"},oe={class:"answer"},le={style:{visibility:"hidden"}},ce={class:"answerColor"},de={__name:"MathsView",setup(l){const c=p("好好学习，天天向上"),s=p(null),i=p(null),u=p(null),r=p(null),h=["学海无涯，奋斗不止。","坚持到底，永不放弃。","知识改变命运，学习成就未来。","不断挑战自我，超越极限。","今天努力一点，明天轻松一点。","积累点滴进步，铸就辉煌人生。","每一次的努力，都是成功的积累。","勤奋是成功的基石，智慧是成功的翅膀。","学习是一种态度，也是一种责任。","成功来自努力，努力造就成功。"],y=[{id:"add",name:"加法",type:"+",fn:(n,t)=>n+t},{id:"subtract",name:"减法",type:"-",fn:(n,t)=>n-t},{id:"multiply",name:"乘法",type:"x",fn:(n,t)=>n*t},{id:"divide",name:"除法",type:"÷",fn:(n,t)=>n/t}];S(()=>{b()});const b=()=>{const n=Math.floor(Math.random()*h.length);c.value=h[n]},V=n=>{console.log(n,"item"),s.value=n,r.value=null},x=()=>{console.log(s.value,"defaultCalc"),console.log(i.value,"startNumber"),console.log(u.value,"endNumber"),r.value=s.value.fn(Number(i.value),Number(u.value))};return(n,t)=>{const N=R,_=D,g=X;return m(),v("div",Y,[d(N,{"left-icon":"volume-o",text:c.value},null,8,["text"]),e("div",Z,[(m(),v(P,null,U(y,a=>e("div",{key:a.id,class:"box"},[e("div",{class:"item",onClick:ie=>V(a)},o(a.name)+"   "+o(a.type),9,j),z])),64))]),s.value?(m(),v("div",G,[e("div",H,[e("span",null,o(s.value.name)+"题目：",1),e("span",{class:"AI",onClick:x},"分析")]),e("div",J,[d(_,{class:"input",modelValue:i.value,"onUpdate:modelValue":t[0]||(t[0]=a=>i.value=a),type:"number"},null,8,["modelValue"]),e("span",null,o(s.value.type),1),d(_,{class:"input",modelValue:u.value,"onUpdate:modelValue":t[1]||(t[1]=a=>u.value=a),type:"number"},null,8,["modelValue"]),K,d(_,{class:"input",modelValue:r.value,"onUpdate:modelValue":t[2]||(t[2]=a=>r.value=a),readonly:"",type:"number"},null,8,["modelValue"])]),e("div",O,[e("div",ee,[e("div",te,[e("span",ne,o(s.value.type),1),e("span",null,o(i.value),1)]),e("div",se,[e("span",null,o(s.value.type),1),e("span",null,o(u.value),1)])]),d(g,{style:{color:"#1989fa",borderColor:"#1989fa",padding:"0 16px",marginBottom:"0px"},"content-position":"left"},{default:q(()=>[T("=")]),_:1}),e("div",ae,[e("div",oe,[e("span",le,o(s.value.type),1),e("span",ce,o(r.value),1)])])])])):F("",!0)],512)}}},me=M(de,[["__scopeId","data-v-51b3ae08"]]);export{me as default};
