import{c as P,B as b,d as W,r as v,v as q,a2 as C,a3 as D,x as E,w as L,k as M,P as $,h as i,I,a4 as A,G as R,a5 as x,i as G,q as O}from"./index-2821a120.js";import{u as V}from"./use-expose-a0075b0c.js";const[X,c]=P("notice-bar"),_={text:String,mode:String,color:String,delay:b(1),speed:b(60),leftIcon:String,wrapable:Boolean,background:String,scrollable:{type:Boolean,default:null}};var j=W({name:X,props:_,emits:["close","replay"],setup(e,{emit:m,slots:a}){let l=0,o=0,h;const d=v(),u=v(),t=q({show:!0,offset:0,duration:0}),y=()=>{if(a["left-icon"])return a["left-icon"]();if(e.leftIcon)return i(I,{class:c("left-icon"),name:e.leftIcon},null)},k=()=>{if(e.mode==="closeable")return"cross";if(e.mode==="link")return"arrow"},p=n=>{e.mode==="closeable"&&(t.show=!1,m("close",n))},N=()=>{if(a["right-icon"])return a["right-icon"]();const n=k();if(n)return i(I,{name:n,class:c("right-icon"),onClick:p},null)},S=()=>{t.offset=l,t.duration=0,A(()=>{x(()=>{t.offset=-o,t.duration=(o+l)/+e.speed,m("replay")})})},B=()=>{const n=e.scrollable===!1&&!e.wrapable,s={transform:t.offset?`translateX(${t.offset}px)`:"",transitionDuration:`${t.duration}s`};return i("div",{ref:d,role:"marquee",class:c("wrap")},[i("div",{ref:u,style:s,class:[c("content"),{"van-ellipsis":n}],onTransitionend:S},[a.default?a.default():e.text])])},r=()=>{const{delay:n,speed:s,scrollable:f}=e,T=G(n)?+n*1e3:0;l=0,o=0,t.offset=0,t.duration=0,clearTimeout(h),h=setTimeout(()=>{if(!d.value||!u.value||f===!1)return;const w=R(d).width,g=R(u).width;(f||g>w)&&x(()=>{l=w,o=g,t.offset=-o,t.duration=o/+s})},T)};return C(r),D(r),E("pageshow",r),V({reset:r}),L(()=>[e.text,e.scrollable],r),()=>{const{color:n,wrapable:s,background:f}=e;return M(i("div",{role:"alert",class:c({wrapable:s}),style:{color:n,background:f}},[y(),B(),N()]),[[$,t.show]])}}});const H=O(j);export{H as N};
