import{c as L,s as y,av as D,d as I,aH as B,h as a,m as V,j as o,t as _,C as s,i as u,I as f,q,aT as A}from"./index-83ec3282.js";const[T,i]=L("cell"),z={tag:V("div"),icon:String,size:String,title:o,value:o,label:o,center:Boolean,isLink:Boolean,border:_,required:Boolean,iconPrefix:String,valueClass:s,labelClass:s,titleClass:s,titleStyle:null,arrowDirection:String,clickable:{type:Boolean,default:null}},M=y({},z,D);var N=I({name:T,props:M,setup(e,{slots:n}){const v=B(),h=()=>{if(n.label||u(e.label))return a("div",{class:[i("label"),e.labelClass]},[n.label?n.label():e.label])},m=()=>{var t;if(n.title||u(e.title)){const l=(t=n.title)==null?void 0:t.call(n);return Array.isArray(l)&&l.length===0?void 0:a("div",{class:[i("title"),e.titleClass],style:e.titleStyle},[l||a("span",null,[e.title]),h()])}},g=()=>{const t=n.value||n.default;if(t||u(e.value))return a("div",{class:[i("value"),e.valueClass]},[t?t():a("span",null,[e.value])])},C=()=>{if(n.icon)return n.icon();if(e.icon)return a(f,{name:e.icon,class:i("left-icon"),classPrefix:e.iconPrefix},null)},S=()=>{if(n["right-icon"])return n["right-icon"]();if(e.isLink){const t=e.arrowDirection&&e.arrowDirection!=="right"?`arrow-${e.arrowDirection}`:"arrow";return a(f,{name:t,class:i("right-icon")},null)}};return()=>{var t;const{tag:l,size:r,center:w,border:P,isLink:k,required:x}=e,c=(t=e.clickable)!=null?t:k,d={center:w,required:x,clickable:c,borderless:!P};return r&&(d[r]=!!r),a(l,{class:i(d),role:c?"button":void 0,tabindex:c?0:void 0,onClick:v},{default:()=>{var b;return[C(),m(),g(),S(),(b=n.extra)==null?void 0:b.call(n)]}})}}});const j=q(N);const R=A("main",{state:()=>({counter:0,name:"Eduardo",selectAddress:null,undoneTodoList:[{id:Date.now(),name:"吃饭"}]}),getters:{doubleCount:e=>e.counter*2,doubleCountPlusOne(){return this.doubleCount*2+1}},actions:{reset(){this.counter=0}}}),E=R;export{j as C,z as c,E as u};
