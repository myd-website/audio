import{d as N,r as k,v as S,R as p,S as o,k as $,a5 as A,h as l,U as e,l as I,a6 as M,g as R,X as r,V as d,$ as C,a0 as y,a7 as T,T as x,a8 as U}from"./index.js";import{C as j}from"./index3.js";import{C as E}from"./index4.js";import{u as F}from"./main.js";import{B as G}from"./index9.js";import"./index8.js";const X={class:"todo-list text-center mg20"},q=o("h3",{class:"mg10"},"Todo List",-1),H={class:"flex flex-center"},J=o("h3",{class:"mg10"},"任务清单",-1),K={class:"done-todo-area"},O=o("h3",{class:"mg10"},"已完成的任务清单",-1),P={class:"mg10"},Q={class:"mg10 mg-t20"},ne=N({__name:"TodoList",setup(W){const B=F(),f=M(),_=R(),L=k(),c=k(""),i=B.undoneTodoList,u=S([{id:Date.now(),name:"睡觉"}]),D=()=>{var n;if(c.value==="")return((n=_==null?void 0:_.refs)==null?void 0:n.todoinput).focus();const a={id:Date.now(),name:c.value};i.push(a),c.value=""},m=(a,n)=>{n?i.splice(i.findIndex(t=>t.id===a.id),1):u.splice(u.findIndex(t=>t.id===a.id),1)},V=a=>{i.splice(i.findIndex(n=>n.id===a.id),1),u.push(a)};function b(){f.push("/address/list")}function w(){f.push("/chat/list")}return(a,n)=>{const t=G,v=E,h=j,z=I("focus");return r(),p("div",X,[q,o("div",H,[$(o("input",{ref_key:"todoinput",ref:L,"onUpdate:modelValue":n[0]||(n[0]=s=>c.value=s)},null,512),[[z,200],[A,c.value]]),l(t,{onClick:D,size:"small",type:"primary"},{default:e(()=>[d("新增清单")]),_:1})]),o("div",null,[J,l(h,null,{default:e(()=>[(r(!0),p(C,null,y(U(i),s=>(r(),T(v,{key:s.id},{title:e(()=>[o("span",null,"---"+x(s.name)+"---",1)]),"right-icon":e(()=>[l(t,{onClick:g=>V(s),size:"small",type:"success"},{default:e(()=>[d("已完成")]),_:2},1032,["onClick"]),l(t,{onClick:g=>m(s,!0),size:"small",type:"danger"},{default:e(()=>[d("删除")]),_:2},1032,["onClick"])]),_:2},1024))),128))]),_:1})]),o("div",K,[O,l(h,null,{default:e(()=>[(r(!0),p(C,null,y(u,s=>(r(),T(v,{key:s.id},{title:e(()=>[o("span",null,"---"+x(s.name)+"---",1)]),"right-icon":e(()=>[l(t,{onClick:g=>m(s,!1),size:"small",type:"danger"},{default:e(()=>[d("删除")]),_:2},1032,["onClick"])]),_:2},1024))),128))]),_:1})]),o("div",P,[l(t,{onClick:b,block:"",type:"primary"},{default:e(()=>[d("地址列表")]),_:1})]),o("div",Q,[l(t,{onClick:w,block:"",type:"primary"},{default:e(()=>[d("聊天室")]),_:1})])])}}});export{ne as default};
