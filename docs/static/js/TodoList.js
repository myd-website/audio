import{d as $,ac as A,r as C,a as I,Z as u,$ as f,a0 as e,G as S,a4 as G,p as a,a6 as t,a7 as d,a8 as y,a9 as x,a1 as T,a3 as B,ad as M,H as j,B as E}from"./index.js";import{C as F}from"./index3.js";import{C as H}from"./index4.js";import{u as R}from"./main.js";import{B as U}from"./index9.js";import"./index8.js";const Z={class:"todo-list text-center mg20"},q={class:"flex flex-center"},J={class:"done-todo-area"},K={class:"mg10"},O={class:"mg10 mg-t20"},to=$({__name:"TodoList",setup(P){const L=R(),m=A(),c=E(),D=C(),r=C(""),i=L.undoneTodoList,p=I([{id:Date.now(),name:"睡觉"}]),b=()=>{var o;if(r.value==="")return((o=c==null?void 0:c.refs)==null?void 0:o.todoinput).focus();const l={id:Date.now(),name:r.value};i.push(l),r.value=""},v=(l,o)=>{o?i.splice(i.findIndex(s=>s.id===l.id),1):p.splice(p.findIndex(s=>s.id===l.id),1)},w=l=>{i.splice(i.findIndex(o=>o.id===l.id),1),p.push(l)};function z(){m.push("/address/list")}function N(){m.push("/chat/list")}return(l,o)=>{const s=U,_=H,g=F,V=j("focus");return u(),f("div",Z,[o[9]||(o[9]=e("h3",{class:"mg10"},"Todo List",-1)),e("div",q,[S(e("input",{ref_key:"todoinput",ref:D,"onUpdate:modelValue":o[0]||(o[0]=n=>r.value=n)},null,512),[[V,200],[G,r.value]]),a(s,{onClick:b,size:"small",type:"primary"},{default:t(()=>o[1]||(o[1]=[d("新增清单")])),_:1})]),e("div",null,[o[4]||(o[4]=e("h3",{class:"mg10"},"任务清单",-1)),a(g,null,{default:t(()=>[(u(!0),f(y,null,x(M(i),n=>(u(),T(_,{key:n.id},{title:t(()=>[e("span",null,"---"+B(n.name)+"---",1)]),"right-icon":t(()=>[a(s,{onClick:k=>w(n),size:"small",type:"success"},{default:t(()=>o[2]||(o[2]=[d("已完成")])),_:2},1032,["onClick"]),a(s,{onClick:k=>v(n,!0),size:"small",type:"danger"},{default:t(()=>o[3]||(o[3]=[d("删除")])),_:2},1032,["onClick"])]),_:2},1024))),128))]),_:1})]),e("div",J,[o[6]||(o[6]=e("h3",{class:"mg10"},"已完成的任务清单",-1)),a(g,null,{default:t(()=>[(u(!0),f(y,null,x(p,n=>(u(),T(_,{key:n.id},{title:t(()=>[e("span",null,"---"+B(n.name)+"---",1)]),"right-icon":t(()=>[a(s,{onClick:k=>v(n,!1),size:"small",type:"danger"},{default:t(()=>o[5]||(o[5]=[d("删除")])),_:2},1032,["onClick"])]),_:2},1024))),128))]),_:1})]),e("div",K,[a(s,{onClick:z,block:"",type:"primary"},{default:t(()=>o[7]||(o[7]=[d("地址列表")])),_:1})]),e("div",O,[a(s,{onClick:N,block:"",type:"primary"},{default:t(()=>o[8]||(o[8]=[d("聊天室")])),_:1})])])}}});export{to as default};
