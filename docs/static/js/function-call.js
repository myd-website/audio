import{n as S,t as I,O as L,r as m,ac as ae,j as K,k as se,w as P,aD as le,x as Y,c as A,d as D,l as H,p as d,aj as U,K as x,aE as ce,D as _,G as X,_ as F,z as G,F as b,b as ie,v as re,o as V,h as ue,az as de,aF as fe,aG as ve,aa as me,I as N,S as ye,R as he,J as Z,ao as ke,P as Ce,aH as Oe,aI as ge,a as we,E as Ie,ay as be,B as Se}from"./index.js";import{u as q}from"./use-expose.js";import{L as Pe}from"./index8.js";let xe=2e3;const pe=()=>++xe,J={show:Boolean,zIndex:S,overlay:I,duration:S,teleport:[String,Object],lockScroll:I,lazyRender:I,beforeClose:Function,overlayStyle:Object,overlayClass:L,transitionAppear:Boolean,closeOnClickOverlay:I},nt=Object.keys(J);function ze(e,t){return e>t?"horizontal":t>e?"vertical":""}function Te(){const e=m(0),t=m(0),o=m(0),l=m(0),n=m(0),s=m(0),a=m(""),u=()=>a.value==="vertical",h=()=>a.value==="horizontal",f=()=>{o.value=0,l.value=0,n.value=0,s.value=0,a.value=""};return{move:c=>{const v=c.touches[0];o.value=(v.clientX<0?0:v.clientX)-e.value,l.value=v.clientY-t.value,n.value=Math.abs(o.value),s.value=Math.abs(l.value);const k=10;(!a.value||n.value<k&&s.value<k)&&(a.value=ze(n.value,s.value))},start:c=>{f(),e.value=c.touches[0].clientX,t.value=c.touches[0].clientY},reset:f,startX:e,startY:t,deltaX:o,deltaY:l,offsetX:n,offsetY:s,direction:a,isVertical:u,isHorizontal:h}}let p=0;const M="van-overflow-hidden";function Be(e,t){const o=Te(),l="01",n="10",s=y=>{o.move(y);const i=o.deltaY.value>0?n:l,c=le(y.target,e.value),{scrollHeight:v,offsetHeight:k,scrollTop:g}=c;let O="11";g===0?O=k>=v?"00":"01":g+k>=v&&(O="10"),O!=="11"&&o.isVertical()&&!(parseInt(O,2)&parseInt(i,2))&&Y(y,!0)},a=()=>{document.addEventListener("touchstart",o.start),document.addEventListener("touchmove",s,{passive:!1}),p||document.body.classList.add(M),p++},u=()=>{p&&(document.removeEventListener("touchstart",o.start),document.removeEventListener("touchmove",s),p--,p||document.body.classList.remove(M))},h=()=>t()&&a(),f=()=>t()&&u();ae(h),K(f),se(f),P(t,y=>{y?a():u()})}function W(e){const t=m(!1);return P(e,o=>{o&&(t.value=o)},{immediate:!0}),o=>()=>t.value?o():null}const[Le,Ee]=A("overlay"),Ae={show:Boolean,zIndex:S,duration:S,className:L,lockScroll:I,lazyRender:I,customStyle:Object};var De=D({name:Le,props:Ae,setup(e,{slots:t}){const o=m(),l=W(()=>e.show||!e.lazyRender),n=a=>{e.lockScroll&&Y(a,!0)},s=l(()=>{var a;const u=x(ce(e.zIndex),e.customStyle);return _(e.duration)&&(u.animationDuration=`${e.duration}s`),X(d("div",{ref:o,style:u,class:[Ee(),e.className]},[(a=t.default)==null?void 0:a.call(t)]),[[F,e.show]])});return H("touchmove",n,{target:o}),()=>d(U,{name:"van-fade",appear:!0},{default:s})}});const _e=G(De),Ne=x({},J,{round:Boolean,position:b("center"),closeIcon:b("cross"),closeable:Boolean,transition:String,iconPrefix:String,closeOnPopstate:Boolean,closeIconPosition:b("top-right"),safeAreaInsetTop:Boolean,safeAreaInsetBottom:Boolean}),[Re,j]=A("popup");var Me=D({name:Re,inheritAttrs:!1,props:Ne,emits:["open","close","opened","closed","keydown","update:show","clickOverlay","clickCloseIcon"],setup(e,{emit:t,attrs:o,slots:l}){let n,s;const a=m(),u=m(),h=W(()=>e.show||!e.lazyRender),f=ie(()=>{const r={zIndex:a.value};if(_(e.duration)){const C=e.position==="center"?"animationDuration":"transitionDuration";r[C]=`${e.duration}s`}return r}),y=()=>{n||(n=!0,a.value=e.zIndex!==void 0?+e.zIndex:pe(),t("open"))},i=()=>{n&&ye(e.beforeClose,{done(){n=!1,t("close"),t("update:show",!1)}})},c=r=>{t("clickOverlay",r),e.closeOnClickOverlay&&i()},v=()=>{if(e.overlay)return d(_e,{show:e.show,class:e.overlayClass,zIndex:a.value,duration:e.duration,customStyle:e.overlayStyle,role:e.closeOnClickOverlay?"button":void 0,tabindex:e.closeOnClickOverlay?0:void 0,onClick:c},{default:l["overlay-content"]})},k=r=>{t("clickCloseIcon",r),i()},g=()=>{if(e.closeable)return d(Z,{role:"button",tabindex:0,name:e.closeIcon,class:[j("close-icon",e.closeIconPosition),he],classPrefix:e.iconPrefix,onClick:k},null)},O=()=>t("opened"),ee=()=>t("closed"),te=r=>t("keydown",r),oe=h(()=>{var r;const{round:C,position:T,safeAreaInsetTop:E,safeAreaInsetBottom:ne}=e;return X(d("div",N({ref:u,style:f.value,role:"dialog",tabindex:0,class:[j({round:C,[T]:T}),{"van-safe-area-top":E,"van-safe-area-bottom":ne}],onKeydown:te},o),[(r=l.default)==null?void 0:r.call(l),g()]),[[F,e.show]])}),R=()=>{const{position:r,transition:C,transitionAppear:T}=e,E=r==="center"?"van-fade":`van-popup-slide-${r}`;return d(U,{name:C||E,appear:T,onAfterEnter:O,onAfterLeave:ee},{default:oe})};return P(()=>e.show,r=>{r&&!n&&(y(),o.tabindex===0&&re(()=>{var C;(C=u.value)==null||C.focus()})),!r&&n&&(n=!1,t("close"))}),q({popupRef:u}),Be(u,()=>e.show&&e.lockScroll),H("popstate",()=>{e.closeOnPopstate&&(i(),s=!1)}),V(()=>{e.show&&y()}),ue(()=>{s&&(t("update:show",!0),s=!1)}),K(()=>{e.show&&e.teleport&&(i(),s=!0)}),de(fe,()=>e.show),()=>e.teleport?d(ve,{to:e.teleport},{default:()=>[v(),R()]}):d(me,null,[v(),R()])}});const je=G(Me);let z=0;function $e(e){e?(z||document.body.classList.add("van-toast--unclickable"),z++):z&&(z--,z||document.body.classList.remove("van-toast--unclickable"))}const[Ke,w]=A("toast"),Ye=["show","overlay","teleport","transition","overlayClass","overlayStyle","closeOnClickOverlay"],He={icon:String,show:Boolean,type:b("text"),overlay:Boolean,message:S,iconSize:S,duration:Oe(2e3),position:b("middle"),teleport:[String,Object],wordBreak:String,className:L,iconPrefix:String,transition:b("van-fade"),loadingType:String,forbidClick:Boolean,overlayClass:L,overlayStyle:Object,closeOnClick:Boolean,closeOnClickOverlay:Boolean};var Ue=D({name:Ke,props:He,emits:["update:show"],setup(e,{emit:t,slots:o}){let l,n=!1;const s=()=>{const i=e.show&&e.forbidClick;n!==i&&(n=i,$e(n))},a=i=>t("update:show",i),u=()=>{e.closeOnClick&&a(!1)},h=()=>clearTimeout(l),f=()=>{const{icon:i,type:c,iconSize:v,iconPrefix:k,loadingType:g}=e;if(i||c==="success"||c==="fail")return d(Z,{name:i||c,size:v,class:w("icon"),classPrefix:k},null);if(c==="loading")return d(Pe,{class:w("loading"),size:v,type:g},null)},y=()=>{const{type:i,message:c}=e;if(o.message)return d("div",{class:w("text")},[o.message()]);if(_(c)&&c!=="")return i==="html"?d("div",{key:0,class:w("text"),innerHTML:String(c)},null):d("div",{class:w("text")},[c])};return P(()=>[e.show,e.forbidClick],s),P(()=>[e.show,e.type,e.message,e.duration],()=>{h(),e.show&&e.duration>0&&(l=setTimeout(()=>{a(!1)},e.duration))}),V(s),ke(s),()=>d(je,N({class:[w([e.position,e.wordBreak==="normal"?"break-normal":e.wordBreak,{[e.type]:!e.icon}]),e.className],lockScroll:!1,onClick:u,onClosed:h,"onUpdate:show":a},Ce(e,Ye)),{default:()=>[f(),y()]})}});function Xe(){const e=we({show:!1}),t=n=>{e.show=n},o=n=>{x(e,n,{transitionAppear:!0}),t(!0)},l=()=>t(!1);return q({open:o,close:l,toggle:t}),{open:o,close:l,state:e,toggle:t}}function Fe(e){const t=ge(e),o=document.createElement("div");return document.body.appendChild(o),{instance:t.mount(o),unmount(){t.unmount(),document.body.removeChild(o)}}}const Ge={icon:"",type:"text",message:"",className:"",overlay:!1,onClose:void 0,onOpened:void 0,duration:2e3,teleport:"body",iconSize:void 0,iconPrefix:void 0,position:"middle",transition:"van-fade",forbidClick:!1,loadingType:void 0,overlayClass:"",overlayStyle:void 0,closeOnClick:!1,closeOnClickOverlay:!1};let B=[],Ve=!1,$=x({},Ge);const Ze=new Map;function Q(e){return be(e)?e:{message:e}}function qe(){const{instance:e,unmount:t}=Fe({setup(){const o=m(""),{open:l,state:n,close:s,toggle:a}=Xe(),u=()=>{},h=()=>d(Ue,N(n,{onClosed:u,"onUpdate:show":a}),null);return P(o,f=>{n.message=f}),Se().render=h,{open:l,close:s,message:o}}});return e}function Je(){if(!B.length||Ve){const e=qe();B.push(e)}return B[B.length-1]}function We(e={}){if(!Ie)return{};const t=Je(),o=Q(e);return t.open(x({},$,Ze.get(o.type||$.type),o)),t}const Qe=e=>t=>We(x({type:e},Q(t))),at=Qe("loading");export{je as P,Xe as a,Ue as b,at as c,nt as d,Fe as m,J as p,We as s,Te as u};
