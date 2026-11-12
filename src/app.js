(function(){
  var PRESETS={"9":[4,7,12,17,20,17,12,7,4],"5":[10,24,32,24,10]};
  var byId=function(id){return document.getElementById(id)};

  function fmt(x){return Math.round(x*100)/100}
  function num(v){
    if(typeof v==="number")return v;
    if(typeof v==="string"&&/^\s*-?\d+(\.\d+)?\s*$/.test(v))return Number(v);
    return null;
  }
  function txt(v){return String(v===undefined||v===null?"":v).replace(/\s+/g," ").trim()}
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}

  /* ---------- 종합점수 화면은 정기시험 화면을 복제해서 만든다 (아이디에 s- 를 붙임) ---------- */
  function buildSumView(){
    var lay=document.querySelector("#regview .layout").cloneNode(true);
    lay.querySelectorAll("[id]").forEach(function(el){el.id="s-"+el.id});
    var gs=lay.querySelector("#s-gradeSide"),first=gs.previousElementSibling;   // 정기시험에만 있는 '등급 기준' 구역을 첫 구역에 합친다
    gs.querySelector("h2").remove();
    gs.querySelector("#s-full").closest(".field").remove();
    while(gs.firstChild)first.appendChild(gs.firstChild);
    gs.remove();
    lay.querySelectorAll("label[for]").forEach(function(l){l.setAttribute("for","s-"+l.getAttribute("for"))});
    lay.querySelectorAll("[aria-controls]").forEach(function(l){l.setAttribute("aria-controls","s-"+l.getAttribute("aria-controls"))});
    lay.querySelectorAll("[aria-labelledby]").forEach(function(l){l.setAttribute("aria-labelledby","s-"+l.getAttribute("aria-labelledby"))});
    lay.querySelectorAll('input[name="round"],input[name="preset"]').forEach(function(i){i.name="s-"+i.name});
    lay.querySelector(".side h2").textContent="등급 기준";
    var box=lay.querySelector(".regbox");
    var back=document.createElement("div");
    back.className="regbox";
    back.innerHTML='<button type="button" class="back" id="sumBack">← 파일·반영비율 수정</button>'+
      '<div id="sumMetaR"></div>'+
      '<div class="sumsum" id="sumSummary"></div>'+
      '<div class="msg" id="sumResWarn"></div>';
    box.parentNode.replaceChild(back,box);

    var setup=document.createElement("div");
    setup.id="sumsetup";
    setup.innerHTML=
      '<div class="setup">'+
        '<section>'+
          '<h2>1. 파일 올리기</h2>'+
          '<label class="drop" id="bulkDrop"><svg aria-hidden="true"><use href="#f"/></svg>'+
            '<b>파일 올리기</b>'+
            '<span class="dn">반영할 모든 영역(정기시험·수행평가)의 파일을 한꺼번에 올려 주세요.</span>'+
            '<span>정기시험 : 나이스 · 교과담임 · 정기시험조회 · 교과목별일람표조회(전체학급)<br>'+
            '수행평가 : 나이스 · 교과담임 · 수행평가조회 · 교과목별일람표조회(전체학급)<br>파일 형식 : XLS data</span>'+
            '<span class="btn">파일 선택</span>'+
            '<span class="dh">또는 여기로 파일을 끌어다 놓으세요</span>'+
            '<input type="file" id="bulkFile" multiple accept=".xls,.xlsx,.csv,.html,.htm"></label>'+
          '<div class="note" id="bulkMsg" aria-live="polite"></div>'+
          '<div id="fileList" class="flist"></div>'+
        '</section>'+
        '<section>'+
          '<h2>2. 반영비율</h2>'+
          '<div id="sumMetaS"></div>'+
          '<p class="note">평가계획서의 비율(%)을 입력하세요. 합계는 100%여야 합니다.</p>'+
          '<div id="itemRows" class="items"></div>'+
          '<div class="note" id="itemSum"></div>'+
          '<div class="msg" id="itemWarn"></div>'+
        '</section>'+
      '</div>'+
      '<div class="runbar"><span class="note" id="runHint"></span><button type="button" class="run" id="sumRun" disabled>산출</button></div>';

    var gsec=lay.querySelector(".content > section");
    var rtabs=document.createElement("div");
    rtabs.className="views rtabs";rtabs.setAttribute("role","tablist");rtabs.setAttribute("aria-label","분석 종류");
    rtabs.innerHTML='<button type="button" role="tab" id="rtab-grade" aria-selected="true">등급컷</button>'+
      '<button type="button" role="tab" id="rtab-ach" aria-selected="false">성취도</button>';
    gsec.parentNode.insertBefore(rtabs,gsec);
    var asec=document.createElement("section");
    asec.id="achSec";asec.hidden=true;
    asec.innerHTML=
      '<h2>성취도</h2>'+
      '<div class="achopt">'+
        '<fieldset class="field"><legend>단계</legend><div class="opts">'+
          '<label><input type="radio" name="achLv" value="6" checked> A~E · 미도달</label>'+
          '<label><input type="radio" name="achLv" value="3"> A · B · C</label></div></fieldset>'+
        '<fieldset class="field"><legend>분할 방식</legend><div class="opts">'+
          '<label><input type="radio" name="achMode" value="fixed" checked> 고정분할</label>'+
          '<label><input type="radio" name="achMode" value="est"> 추정분할</label></div></fieldset>'+
      '</div>'+
      '<div class="achbd" id="achBd"></div>'+
      '<div class="msg" id="achMsg"></div>'+
      '<div class="ach" id="achOut"></div>'+
      '<p class="note achnote">I(미도달)은 공통과목에만 적용됩니다.</p>';
    gsec.parentNode.insertBefore(asec,gsec.nextSibling);

    var res=document.createElement("div");
    res.id="sumresult";res.hidden=true;
    res.appendChild(lay);
    byId("sumview").appendChild(setup);
    byId("sumview").appendChild(res);
  }
  buildSumView();

  /* ---------- 등급 계산 화면 (정기시험·종합점수가 각각 하나씩 가진다) ---------- */
  function Engine(P,placeholder){
    var $=function(id){return document.getElementById(P+id)};
    var ratios=PRESETS["5"].slice(),scores=[];
    var mode="pct",counts=[],rmode="round",full=100,note="",last=null,groups=[],histData=null;

    function renderRatios(){
      var box=$("ratios");box.innerHTML="";
      ratios.forEach(function(v,i){
        var d=document.createElement("div");d.className="field";
        d.innerHTML='<label for="'+P+'r'+i+'">'+(i+1)+'등급 (%)</label><input id="'+P+'r'+i+'" type="number" min="0" max="100" step="0.1" value="'+v+'">';
        box.appendChild(d);
        d.querySelector("input").addEventListener("input",function(e){
          ratios[i]=parseFloat(e.target.value)||0;calc();
        });
      });
    }
    function ksFromPct(n){
      var cum=0,rm=rmode;
      return ratios.map(function(p){cum+=p;return Math.max(0,Math.min(n,Math[rm](n*cum/100+1e-9)))});
    }
    function ksFromCnt(n){
      var cum=0;
      return counts.map(function(c,i){cum+=c;return i===counts.length-1?n:Math.max(0,Math.min(n,cum))});
    }
    function deriveCounts(){
      var n=scores.length,ks=ksFromPct(n);
      if(ks.length)ks[ks.length-1]=n;
      counts=ks.map(function(k,i){return k-(i?ks[i-1]:0)});
      renderCounts();
    }
    function renderCounts(){
      var box=$("counts");box.innerHTML="";
      counts.forEach(function(v,i){
        var d=document.createElement("div");d.className="field";
        d.innerHTML='<label for="'+P+'c'+i+'">'+(i+1)+'등급 (명)</label><input id="'+P+'c'+i+'" type="number" min="0" step="1" value="'+v+'"'+(scores.length?'':' disabled')+'>';
        box.appendChild(d);
        d.querySelector("input").addEventListener("input",function(e){
          counts[i]=Math.max(0,parseInt(e.target.value,10)||0);calc();
        });
      });
    }
    function setMode(m){
      mode=m;
      if(m==="cnt")deriveCounts();
      $("tab-pct").setAttribute("aria-selected",m==="pct");
      $("tab-cnt").setAttribute("aria-selected",m==="cnt");
      $("pane-pct").hidden=m!=="pct";
      $("pane-cnt").hidden=m!=="cnt";
      calc();
    }

    function calc(){
      var sc=scores.slice().sort(function(a,b){return b-a});
      var n=sc.length,msg=$("msg"),out=$("out"),G=ratios.length;
      $("hist").closest("section").hidden=!n;      // 점수 분포는 산출된 뒤에 반별 현황과 함께 나타난다
      var xb=$("exp"),ib=$("imgBtn");if(xb)xb.hidden=!n;if(ib)ib.hidden=!n;     // 저장 버튼도 산출 뒤에만
      var sum=ratios.reduce(function(a,b){return a+b},0);
      var mt="";
      if(mode==="cnt"){
        var cs=counts.reduce(function(a,b){return a+b},0);
        mt=n&&cs!==n?"인원 합계가 "+cs+"명입니다. 응시 인원 "+n+"명과 맞춰 주세요.":"";
      }else{
        mt=Math.abs(sum-100)>0.001?"비율의 합이 "+fmt(sum)+"%입니다. 100%로 맞춰 주세요.":"";
      }
      if(n&&sc[0]>full+1e-9)mt+=(mt?" ":"")+"만점("+fmt(full)+"점)보다 높은 점수가 있습니다.";
      msg.textContent=mt;
      if(!n){
        out.innerHTML='<div class="placeholder">'+placeholder+'</div>';
        $("stats").innerHTML="";last=null;drawHist([],[]);return;
      }
      var ks=mode==="cnt"?ksFromCnt(n):ksFromPct(n),cum=0,list=[],cuts=[],prevM=0,prevCut=Infinity;
      ks.forEach(function(k,i){
        var c=mode==="cnt"?k/n*100:(cum+=ratios[i]),m=i===G-1?n:k;
        if(m>0&&m<n&&sc[m-1]===sc[m]){var v=sc[m-1];while(m>0&&sc[m-1]===v)m--}   // 경계 동점자는 아래 등급으로
        if(m<prevM)m=prevM;
        var r={g:i+1,c:c,k:k,n:m-prevM,none:m===prevM,adj:(i<G-1&&m<k)?m:null,main:"",sub:""};
        if(!r.none){
          var cut=sc[m-1];                                  // 그 등급의 가장 낮은 점수
          r.main=fmt(cut)+"점 이상";
          r.sub=prevCut===Infinity?"~ "+fmt(sc[0])+"점 (최고점)":"~ "+fmt(prevCut)+"점 미만";
          cuts.push(cut);prevCut=cut;
        }
        prevM=m;list.push(r);
      });
      out.innerHTML=list.map(function(r){
        var cutHtml=r.none
          ?'<div class="gcut none"><b>해당 없음</b><span>0명</span></div>'
          :'<div class="gcut"><b>'+r.main+'</b><span>'+r.sub+'</span></div>';
        return '<div class="grow"><div class="gno">'+r.g+'</div>'+cutHtml+
          '<div class="ginfo"><b>'+r.n+'명</b><span>누적 '+fmt(r.c)+'%</span><span>경계 순위 '+r.k+'위'+(r.adj!==null?'<br>(동점으로 '+r.adj+'위까지)':'')+'</span></div></div>';
      }).join("");
      var mean=sc.reduce(function(a,b){return a+b},0)/n;
      var sd=Math.sqrt(sc.reduce(function(a,b){return a+(b-mean)*(b-mean)},0)/n);
      $("stats").innerHTML=
        '<div class="stat main"><small>응시 인원</small><strong>'+n+'명</strong>'+(note?note.split("|").map(function(t){return '<small>'+esc(t)+'</small>'}).join(""):'')+'</div>'+
        '<div class="stat"><small>평균</small><strong>'+fmt(mean)+'</strong></div>'+
        '<div class="stat"><small>표준편차</small><strong>'+fmt(sd)+'</strong></div>'+
        '<div class="stat"><small>최고 / 최저</small><strong>'+fmt(sc[0])+' / '+fmt(sc[n-1])+'</strong></div>';
      last={rows:list.map(function(r){return {g:r.g,main:r.main,sub:r.sub,n:r.n,none:r.none,p:mode==="cnt"?(counts[r.g-1]||0)/n*100:ratios[r.g-1]}}),
        stats:{n:n,mean:fmt(mean),sd:fmt(sd),max:fmt(sc[0]),min:fmt(sc[n-1]),full:full}};
      drawHist(sc,cuts);
    }
    function drawHist(sc,cuts){
      var mxs=sc.length?Math.max.apply(null,sc):100;
      var top=mxs>full?Math.ceil(mxs/10)*10:full,step=top/20;
      $("ax-mid").textContent=fmt(top/2)+"점";$("ax-top").textContent=fmt(top)+"점";
      var bins=new Array(21).fill(0);
      sc.forEach(function(x){bins[Math.min(20,Math.max(0,Math.floor(x/step)))]++});
      var mx=Math.max.apply(null,bins.concat([1]));
      histData={top:top,bins:bins,cutBins:cuts.map(function(t){return Math.min(20,Math.floor(t/step))})};
      $("hist").innerHTML=bins.map(function(c,i){
        var isCut=cuts.some(function(t){return Math.min(20,Math.floor(t/step))===i});
        return '<i class="'+(isCut?'hi':'')+'" style="height:'+Math.max(c?3:0,c/mx*100)+'%" title="'+fmt(i*step)+'점대 '+c+'명"></i>';
      }).join("");
    }
    // 점수 목록과 반별 현황을 새로 넣고 다시 계산한다.
    function setFull(v){full=v>0?v:100;calc()}
    function setData(sc,classesHtml,nt,fl,grp){
      scores=sc;note=nt||"";groups=grp||[];if(fl>0)full=fl;
      $("classes").innerHTML=classesHtml;
      $("classcard").hidden=!classesHtml;
      deriveCounts();
      calc();
    }

    $("round").addEventListener("change",function(e){if(e.target.value)rmode=e.target.value;calc()});
    $("tab-pct").onclick=function(){setMode("pct")};
    $("tab-cnt").onclick=function(){setMode("cnt")};
    $("preset").addEventListener("change",function(e){
      if(PRESETS[e.target.value]){ratios=PRESETS[e.target.value].slice();renderRatios();setMode("pct")}
    });
    renderRatios();
    deriveCounts();
    calc();
    return {setData:setData,setFull:setFull,getScores:function(){return scores.slice()},getLast:function(){return last?{rows:last.rows,stats:last.stats,groups:groups,hist:histData,note:note}:null}};
  }

  /* ---------- 일람표 파일 읽기 ---------- */
  function decode(buf){
    var b=new Uint8Array(buf),head="";
    for(var i=0;i<Math.min(400,b.length);i++)head+=String.fromCharCode(b[i]);
    if(!/<\s*(html|table|\?xml)/i.test(head))return null;
    try{return new TextDecoder("utf-8",{fatal:true}).decode(b)}catch(e){return new TextDecoder("euc-kr").decode(b)}
  }
  function readTable(f,ok,fail){
    var rd=new FileReader();
    rd.onload=function(e){
      try{
        var t=decode(e.target.result);
        var wb=t!==null?XLSX.read(t,{type:"string"}):XLSX.read(e.target.result,{type:"array"});
        ok(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:"",raw:true}));
      }catch(err){fail()}
    };
    rd.onerror=fail;
    rd.readAsArrayBuffer(f);
  }
  // 위쪽 설명 줄을 '항목 : 값' 단위로 나눈다.
  function parseMeta(tb,h){
    var cap=[],items=[],subject="",exam="",area="",year="",term="",grade="",full=null,i;
    for(i=0;i<h;i++){
      tb[i].forEach(function(v){
        var raw=String(v===undefined||v===null?"":v).trim().replace(/영\s+역/g,"영역");
        if(!raw||/^\d{4}\.\d{1,2}\.\d{1,2}\.?$/.test(raw))return;
        raw.split(/\s{2,}/).forEach(function(part){
          part.split(/\s(?=[가-힣A-Za-z]+\s:\s)/).forEach(function(q){
            q=q.replace(/\s+/g," ").trim();
            if(!q)return;
            var m=q.match(/^(.+?)\s:\s(.+)$/);
            if(m){
              if(m[1]==="교과목")subject=m[2];
              else{
                items.push([m[1],m[2]]);
                if(m[1]==="고사")exam=m[2];
                if(m[1]==="영역")area=m[2];
                if(/만점$/.test(m[1])&&num(m[2])!==null)full=num(m[2]);      // 만점 / 영역만점
              }
            }else if(/학년도$/.test(q)){year=q;items.push(["학년도",q])}
            else if(/^\d+학기$/.test(q)){term=q;items.push(["학기",q])}
            else if(/^\d+학년$/.test(q)){grade=q;items.push(["학년",q])}
            else if(/^(주간|야간)$/.test(q)||/^(일반계|전문계|특성화계|특목계)$/.test(q)){}   // 주야·계열 정보는 쓰지 않는다
            else cap.push(q);
          });
        });
      });
    }
    var html="";
    if(cap.length||items.length||subject){
      html='<div class="meta">'+
        (cap.length?'<div class="mcap">'+esc(cap.join(" "))+'</div>':'')+
        (subject?'<div class="msub">'+esc(subject)+'</div>':'')+
        '<dl>'+items.map(function(x){return '<dt>'+esc(x[0])+'</dt><dd>'+esc(x[1])+'</dd>'}).join("")+'</dl></div>';
    }
    return {html:html,subject:subject,exam:exam,area:area,full:full,cap:cap.join(" "),year:year,term:term,grade:grade};
  }
  // 일람표 구조: 왼쪽 위 칸이 '반번호', 오른쪽으로 반(1,2,3...), 아래로 번호(1,2,3...), 칸마다 점수.
  // 점수 아래쪽에는 응시인원·합계·평균 줄이 있어 점수 영역에서 제외한다.
  function parseTable(tb){
    var h=-1,k=0,i,c;
    for(i=0;i<Math.min(tb.length,40)&&h<0;i++){
      for(c=0;c<tb[i].length&&h<0;c++){
        var a=txt(tb[i][c]).replace(/\s/g,"");
        if(/반/.test(a)&&/번호/.test(a)&&tb[i].slice(c+1).some(function(v){return num(v)!==null})){h=i;k=c}
      }
    }
    if(h<0)return {error:"'반번호' 머리글을 찾지 못했습니다. 교과목별 일람표 파일이 맞는지 확인해 주세요."};
    var cols=[];
    for(c=k+1;c<tb[h].length;c++)if(num(tb[h][c])!==null)cols.push(c);
    var entries=[],dropped=[],zeros=0,absent=0,end=tb.length;
    for(i=h+1;i<tb.length;i++){
      if(num(tb[i][k])===null){
        if(txt(tb[i][k])){end=i;break}
        continue;
      }
      cols.forEach(function(c){
        var n=num(tb[i][c]),t=txt(tb[i][c]),cl=num(tb[h][c]),no=num(tb[i][k]);
        if(n!==null)entries.push({c:cl,n:no,v:Number(n.toFixed(2))});
        else if(t){
          if(/자퇴|전출|전학|퇴학|제적|휴학|유예/.test(t))dropped.push({c:cl,n:no});                 // 자퇴·전출: 계산에서 제외
          else{                                                             // 재적이 있으면 0점으로 포함 (미인정결, "(0.00)" 같은 표시 등)
            var pm=t.match(/^\(\s*(-?\d+(?:\.\d+)?)\s*\)$/);
            entries.push({c:cl,n:no,v:pm?Number(Number(pm[1]).toFixed(2)):0,z:true});zeros++;
          }
        }
      });
    }
    var fileN=null;
    for(i=end;i<tb.length;i++){
      if(/응시/.test(txt(tb[i][k]))){
        fileN=0;cols.forEach(function(c){var m=parseInt(txt(tb[i][c]),10);if(!isNaN(m))fileN+=m});
        break;
      }
    }
    return {entries:entries,dropped:dropped,zeros:zeros,numericCount:entries.length-zeros,classes:cols.map(function(c){return num(tb[h][c])}),absent:absent,fileN:fileN,meta:parseMeta(tb,h)};
  }
  function classCards(groups){
    return groups.map(function(g){
      var a=g.list,m=a.length?a.reduce(function(x,y){return x+y},0)/a.length:0;
      return '<div class="cls"><svg aria-hidden="true"><use href="#b"/></svg><b>'+g.c+'반</b><small>응시 <em>'+a.length+'명</em></small><small>평균 <em>'+(a.length?(Math.round(m*10)/10).toFixed(1):"-")+'</em></small></div>';
    }).join("");
  }
  function groupByClass(entries,order){
    var by={},keys=order.slice();
    entries.forEach(function(e){(by[e.c]=by[e.c]||[]).push(e.v)});
    if(!keys.length)keys=Object.keys(by).map(Number).sort(function(a,b){return a-b});
    return keys.map(function(c){return {c:c,list:by[c]||[]}});
  }
  function gstats(groups){
    return groups.map(function(g){
      var a=g.list,m=a.length?a.reduce(function(x,y){return x+y},0)/a.length:0;
      return {c:g.c,n:a.length,mean:a.length?(Math.round(m*10)/10).toFixed(1):"-"};
    });
  }
  function noteOf(z,d){
    var a=[];
    if(z)a.push("미인정결 등 "+z+"명 0점 포함");
    if(d)a.push("자퇴·전출·퇴학 등 "+d+"명 제외");
    return a.join("|");
  }
  function dropTarget(el,onFile){
    ["dragenter","dragover"].forEach(function(t){el.addEventListener(t,function(e){e.preventDefault();el.classList.add("over")})});
    ["dragleave","drop"].forEach(function(t){el.addEventListener(t,function(e){e.preventDefault();el.classList.remove("over")})});
    el.addEventListener("drop",function(e){var fs=e.dataTransfer.files;if(fs&&fs.length)onFile(fs[0],fs)});
  }

  /* ---------- 정기시험 화면 (이전과 동일) ---------- */
  var reg=Engine("","파일을 올리면 등급컷이 여기에 나타납니다.");
  var regMeta=null;
  function loadReg(f){
    readTable(f,function(tb){
      var p=parseTable(tb);
      if(p.error){byId("fstat").textContent=p.error;return}
      var sc=p.entries.map(function(e){return e.v});
      byId("meta").innerHTML=p.meta.html;
      byId("fstat").textContent=(p.fileN!==null&&p.fileN!==p.numericCount)?"주의: 파일의 응시인원 합계는 "+p.fileN+"명인데 점수가 있는 칸은 "+p.numericCount+"개입니다.":"";
      var fl=p.meta.full>0?p.meta.full:0;
      if(fl)byId("full").value=fl;
      regMeta=p.meta;
      var rg=groupByClass(p.entries,p.classes);
      reg.setData(sc,classCards(rg),noteOf(p.zeros,p.dropped.length),fl,gstats(rg));
    },function(){byId("fstat").textContent="파일을 읽지 못했습니다. 나이스에서 저장한 XLS data 파일인지 확인해 주세요."});
  }
  byId("full").addEventListener("input",function(e){reg.setFull(parseFloat(e.target.value))});
  byId("file").onchange=function(e){if(e.target.files[0])loadReg(e.target.files[0])};
  dropTarget(byId("drop"),loadReg);

  /* ---------- 종합점수 화면 ---------- */
  var sumEng=Engine("s-","산출할 수 있는 학생이 없습니다. 파일을 확인해 주세요.");
  function mk(id,kind,name){return {id:id,kind:kind,name:name,def:name,ratio:0,ratioManual:false,full:0,fullManual:false,fullFile:false,nameManual:false,parsed:null,fname:""}}
  var ex1=mk("e1","exam","1차 정기시험"),ex2=mk("e2","exam","2차 정기시험");
  var perf=[0,1,2,3].map(function(i){return mk("p"+i,"perf","영역"+(i+1))});
  var allSlots=[ex1,ex2].concat(perf);
  function items(){return allSlots.filter(function(a){return a.parsed})}
  function kindLabel(a){return a.kind==="exam"?"정기시험":"수행평가"}
  function byFname(x,y){return x.f.name<y.f.name?-1:x.f.name>y.f.name?1:0}

  // 파일 내용으로 1차·2차 정기시험과 수행평가를 구분한다.
  function classify(p){
    var m=(p.meta.exam||"").match(/([12])\s*차/);
    if(m)return m[1]==="1"?"e1":"e2";
    if(p.meta.area||/수행/.test(p.meta.cap))return "perf";
    if(p.meta.exam||/정기|고사/.test(p.meta.cap))return "exam";
    return "perf";
  }
  // 파일을 읽은 정보로 영역명·만점을 자동 입력한다 (직접 고친 값은 유지).
  function put(a,x){
    var mt=x.p.meta;
    a.parsed=x.p;a.fname=x.f.name;
    if(a.kind==="perf"&&!a.nameManual&&mt.area)a.name=mt.area;
    if(!a.fullManual){
      if(mt.full>0){a.full=mt.full;a.fullFile=true}
      else{a.fullFile=false;a.full=a.kind==="exam"?100:0}
    }
    if(a.kind==="perf"&&!a.ratioManual&&a.full>0)a.ratio=a.full;     // 수행평가는 만점과 같은 비율이 기본 (점수가 그대로 반영)
  }
  function removeItem(a){
    a.parsed=null;a.fname="";a.ratio=0;a.ratioManual=false;a.full=0;a.fullManual=false;a.fullFile=false;a.nameManual=false;a.name=a.def;
    byId("bulkMsg").textContent="";
    renderFileList();renderRows();
  }
  function addFiles(files){
    var arr=Array.prototype.slice.call(files),parsed=[],skipped=[],pending=arr.length;
    if(!pending)return;
    byId("bulkMsg").textContent="파일을 읽는 중입니다…";
    function done(){
      if(--pending)return;
      var placed=0;
      parsed.sort(byFname);
      parsed.forEach(function(x){
        var k=classify(x.p),a=null;
        if(k==="e1")a=ex1;
        else if(k==="e2")a=ex2;
        else if(k==="exam")a=!ex1.parsed?ex1:!ex2.parsed?ex2:null;
        else a=perf.filter(function(p){return !p.parsed})[0]||null;
        if(!a){skipped.push(x.f.name+(k==="perf"?" (수행평가는 최대 4개)":" (넣을 자리가 없음)"));return}
        put(a,x);placed++;
      });
      byId("bulkMsg").textContent=(placed?placed+"개 파일을 넣었습니다. ":"")+(skipped.length?"넣지 못한 파일: "+skipped.join(", ")+".":"");
      renderFileList();renderRows();
    }
    arr.forEach(function(f){
      readTable(f,function(tb){
        var p=parseTable(tb);
        if(p.error)skipped.push(f.name+" (일람표가 아님)");else parsed.push({f:f,p:p});
        done();
      },function(){skipped.push(f.name+" (읽지 못함)");done()});
    });
  }

  // 1. 올린 파일 목록
  function renderFileList(){
    var box=byId("fileList"),list=items();
    if(!list.length){box.innerHTML='<div class="note">아직 올린 파일이 없습니다.</div>';return}
    box.innerHTML="";
    list.forEach(function(a){
      var sub=[];
      if(a.parsed.meta.subject)sub.push(a.parsed.meta.subject);
      sub.push(a.parsed.entries.length+"명");
      var d=document.createElement("div");d.className="fcard";
      d.innerHTML='<span class="fk '+a.kind+'">'+kindLabel(a)+'</span>'+
        '<div class="ft"><b id="fn-'+a.id+'">'+esc(a.name)+'</b><span>'+esc(sub.join(" · "))+'<br>'+esc(a.fname)+'</span></div>'+
        '<button type="button" class="x" aria-label="'+esc(a.name)+' 파일 제거">×</button>';
      box.appendChild(d);
      d.querySelector(".x").addEventListener("click",function(){removeItem(a)});
    });
  }
  // 2. 반영비율 (영역명·만점은 파일에서 자동 입력, 수정 가능)
  function renderRows(){
    var box=byId("itemRows"),list=items();
    box.innerHTML="";
    if(!list.length){box.innerHTML='<div class="note">파일을 올리면 항목이 여기에 나타납니다.</div>';recomputeSum();return}
    var cap=document.createElement("div");cap.className="arow perf cap";
    cap.innerHTML='<span>항목</span><span>비율</span><span>만점</span>';
    box.appendChild(cap);
    list.forEach(function(a){
      var d=document.createElement("div");d.className="arow perf";
      d.innerHTML=(a.kind==="exam"
        ?'<span class="aname">'+esc(a.name)+'</span>'
        :'<input type="text" id="an-'+a.id+'" aria-label="영역명" maxlength="20" value="'+esc(a.name)+'">')+
        '<div class="pct"><input type="number" id="ar-'+a.id+'" aria-label="'+esc(a.name)+' 반영 비율(%)" min="0" max="100" step="0.1" value="'+(a.ratio||"")+'"><span>%</span></div>'+
        '<div class="pct"><input type="number" id="fu-'+a.id+'" aria-label="'+esc(a.name)+' 만점" min="0" step="any" value="'+(a.full||"")+'"><span>점</span></div>';
      box.appendChild(d);
      if(a.kind==="perf")d.querySelector("#an-"+a.id).addEventListener("input",function(e){
        a.name=e.target.value.trim()||a.def;a.nameManual=true;
        var t=byId("fn-"+a.id);if(t)t.textContent=a.name;
      });
      d.querySelector("#ar-"+a.id).addEventListener("input",function(e){
        a.ratio=parseFloat(e.target.value)||0;a.ratioManual=e.target.value!=="";
        if(a.kind==="perf"&&!a.fullManual&&!a.fullFile){a.full=a.ratio;var fx=byId("fu-"+a.id);if(fx)fx.value=a.ratio||""}
        recomputeSum();
      });
      d.querySelector("#fu-"+a.id).addEventListener("input",function(e){
        a.full=parseFloat(e.target.value)||0;a.fullManual=e.target.value!=="";a.fullFile=false;
        if(a.kind==="perf"&&!a.ratioManual&&a.full>0){a.ratio=a.full;var rx=byId("ar-"+a.id);if(rx)rx.value=a.ratio}
        recomputeSum();
      });
    });
    recomputeSum();
  }
  function sumStatus(){
    var list=items(),sr=0;
    list.forEach(function(a){sr+=a.ratio});
    var okRatio=Math.abs(sr-100)<0.001;
    return {list:list,sr:sr,okRatio:okRatio,ready:list.length>0&&okRatio};
  }
  function subjectWarn(list){
    var subs=[];
    list.forEach(function(a){if(a.parsed&&a.parsed.meta.subject&&subs.indexOf(a.parsed.meta.subject)<0)subs.push(a.parsed.meta.subject)});
    return subs.length>1?"파일마다 교과목이 다릅니다. 파일을 확인해 주세요.":"";
  }
  // 과목 정보 (첫 파일 기준): 교과목, 학년도, 학기, 학년
  function sumMeta(list){
    var mt=null;
    for(var i=0;i<list.length;i++){if(list[i].parsed.meta.subject){mt=list[i].parsed.meta;break}}
    if(!mt)return "";
    var rows=[["학년도",mt.year],["학기",mt.term],["학년",mt.grade]].filter(function(r){return r[1]});
    return '<div class="meta"><div class="msub">'+esc(mt.subject)+'</div>'+
      '<dl>'+rows.map(function(r){return '<dt>'+r[0]+'</dt><dd>'+esc(r[1])+'</dd>'}).join("")+'</dl></div>';
  }
  // 설정 화면의 상태 표시와 산출 버튼
  function recomputeSum(){
    var s=sumStatus(),el=byId("itemSum");
    el.textContent=s.list.length?"비율 합계 "+fmt(s.sr)+"% / 100%":"";
    el.className=s.okRatio?"note":"msg";
    byId("itemWarn").textContent=subjectWarn(s.list);
    var mh=sumMeta(s.list);
    byId("sumMetaS").innerHTML=mh;byId("sumMetaR").innerHTML=mh;
    byId("runHint").textContent=!s.list.length?"파일을 올려 주세요."
      :!s.okRatio?"비율 합계를 100%로 맞춰 주세요.":"산출할 수 있습니다.";
    byId("sumRun").disabled=!s.ready;
    s.list.forEach(function(a){var el=byId("ar-"+a.id);if(el)el.classList.remove("need")});
    if(!s.ready&&s.list.length){
      var empty=s.list.filter(function(a){return !(a.ratio>0)});
      (empty.length?empty:s.list).forEach(function(a){var el=byId("ar-"+a.id);if(el)el.classList.add("need")});   // 비어 있는 비율, 모두 채웠는데 합계가 다르면 전체
    }
  }
  // 학생 한 명의 종합점수 = Σ (점수 ÷ 만점 × 반영 비율). 반·번호가 같으면 같은 학생으로 본다.
  function runSum(){
    var s=sumStatus();
    if(!s.ready)return;
    var list=s.list,warns=[],w=subjectWarn(list);
    if(w)warns.push(w);
    var dropSet={};
    list.forEach(function(a){a.parsed.dropped.forEach(function(d){dropSet[d.c+"-"+d.n]=1})});   // 자퇴·전출은 모든 항목에서 제외
    var maps=list.map(function(a){var m={};a.parsed.entries.forEach(function(e){m[e.c+"-"+e.n]=e});return m});
    var union={};
    maps.forEach(function(m){Object.keys(m).forEach(function(key){if(!dropSet[key])union[key]=1})});
    var total=[],blanks=0,zeroStu=0;
    Object.keys(union).forEach(function(key){
      var t=0,blank=false,c=null,z=false;
      maps.forEach(function(m,i){
        var e=m[key],v=0;
        if(e){c=e.c;v=e.v;if(e.z)z=true}else blank=true;   // 재적이 있는데 칸이 비어 있으면 그 항목은 0점
        t+=v/(list[i].full>0?list[i].full:list[i].ratio)*list[i].ratio;   // 만점이 비어 있으면 점수가 그대로 반영 점수
      });
      total.push({c:c,v:Number(t.toFixed(2))});
      if(z)zeroStu++;
      if(blank)blanks++;
    });
    if(blanks)warns.push("일부 항목의 칸이 비어 있는 학생 "+blanks+"명은 그 항목을 0점으로 계산했습니다.");
    byId("sumSummary").innerHTML=list.map(function(a){return '<div class="sumline"><span>'+esc(a.name)+'</span><b>'+fmt(a.ratio)+'%</b></div>'}).join("");
    byId("sumResWarn").textContent=warns.join(" ");
    var sg=groupByClass(total,[]);
    sumEng.setData(total.map(function(x){return x.v}),classCards(sg),noteOf(zeroStu,Object.keys(dropSet).length),100,gstats(sg));
    if(!byId("achSec").hidden)renderAch();
    byId("sumsetup").hidden=true;
    byId("sumresult").hidden=false;
    window.scrollTo(0,0);
  }
  byId("bulkFile").addEventListener("change",function(e){if(e.target.files.length)addFiles(e.target.files);e.target.value=""});
  dropTarget(byId("bulkDrop"),function(f,all){addFiles(all)});
  /* ---------- 성취도 (종합점수) ---------- */
  var FIX6=[90,80,70,60,40],FIX3=[80,60];
  var ach={lv:6,mode:"fixed",est6:FIX6.slice(),est3:FIX3.slice()};
  function achNames(){return ach.lv===6?["A","B","C","D","E","미도달"]:["A","B","C"]}
  function achBounds(){return ach.mode==="fixed"?(ach.lv===6?FIX6:FIX3):(ach.lv===6?ach.est6:ach.est3)}
  function renderAchInputs(){
    var box=byId("achBd"),bd=achBounds(),nm=achNames();
    box.innerHTML="";
    bd.forEach(function(v,i){
      var d=document.createElement("div");d.className="field";
      d.innerHTML='<label for="ab'+i+'">'+nm[i]+' 이상 (점)</label><input type="number" id="ab'+i+'" step="any" value="'+v+'"'+(ach.mode==="fixed"?' disabled':'')+'>';
      box.appendChild(d);
      d.querySelector("input").addEventListener("input",function(e){
        var arr=ach.lv===6?ach.est6:ach.est3;
        arr[i]=parseFloat(e.target.value);
        renderAch();
      });
    });
  }
  function renderAch(){
    var nm=achNames(),bd=achBounds(),sc=sumEng.getScores(),n=sc.length,out=byId("achOut"),msg=byId("achMsg");
    var okOrder=bd.every(function(v,i){return isFinite(v)&&(i===0||v<bd[i-1])});
    msg.textContent=okOrder?"":"경계 점수는 A부터 아래로 갈수록 낮아야 합니다.";
    if(!n){out.innerHTML='<div class="placeholder">산출 후 성취도 분포가 표시됩니다.</div>';return}
    if(!okOrder){out.innerHTML="";return}
    var cnt=nm.map(function(){return 0});
    sc.forEach(function(x){
      var k=0;
      while(k<bd.length&&x<bd[k])k++;      // 위에서부터 경계 이상인 첫 단계
      cnt[k]++;
    });
    var rows=nm.map(function(name,k){
      var rg=k===0?fmt(bd[0])+"점 이상":k===nm.length-1?fmt(bd[bd.length-1])+"점 미만":fmt(bd[k])+"점 이상 ~ "+fmt(bd[k-1])+"점 미만";
      var pc=cnt[k]/n*100;
      return '<div class="achrow"><div class="lv">'+(name==="미도달"?'<span>I</span><small>미도달</small>':esc(name))+'</div><div class="rg">'+rg+'</div>'+
        '<div class="bar" aria-hidden="true"><i style="width:'+pc.toFixed(1)+'%"></i></div>'+
        '<div class="n">'+cnt[k]+'명</div><div class="pc">'+pc.toFixed(1)+'%</div></div>';
    }).join("");
    out.innerHTML=rows+'<div class="achtot"><span>합계</span><b>'+n+'명</b><span>100%</span></div>';
  }
  function showAch(on){
    byId("achSec").hidden=!on;
    byId("s-out").closest("section").hidden=on;
    byId("rtab-grade").setAttribute("aria-selected",!on);
    byId("rtab-ach").setAttribute("aria-selected",on);
    if(on){renderAchInputs();renderAch()}
  }
  byId("rtab-grade").onclick=function(){showAch(false)};
  byId("rtab-ach").onclick=function(){showAch(true)};
  document.querySelectorAll('input[name="achLv"]').forEach(function(r){r.addEventListener("change",function(e){ach.lv=parseInt(e.target.value,10);renderAchInputs();renderAch()})});
  document.querySelectorAll('input[name="achMode"]').forEach(function(r){r.addEventListener("change",function(e){ach.mode=e.target.value;renderAchInputs();renderAch()})});
  byId("sumRun").onclick=runSum;
  byId("sumBack").onclick=function(){byId("sumresult").hidden=true;byId("sumsetup").hidden=false;window.scrollTo(0,0)};
  renderFileList();
  renderRows();

  /* ---------- 결과 내보내기: 배포용 이미지(PNG)와 PDF ---------- */
  // d: {title, sub, ratios, rows, stats, note, groups, hist, ach, dateText}
  // mode: "cut"(등급컷만, 배포용 이미지) | "full"(전체 분석, PDF)
  function renderReport(d,mode,mk){
    var cut=mode==="cut",W=cut?1080:1240,P=cut?56:64;
    var INK="#333333",MUTED="#6b6b6b",BG="#f0f0f0",PANEL="#ffffff",ACC="#ff8c00",BAR="#bdbdbd",TRACK="#e4e4e4";
    function F(wt,px){return wt+" "+px+'px "Noto Sans KR","Malgun Gothic","Apple SD Gothic Neo",sans-serif'}
    function paint(c,H){
      var y=P;
      function T(s,x,yy,font,col,al){c.font=font;c.fillStyle=col;c.textAlign=al||"left";c.textBaseline="alphabetic";c.fillText(String(s),x,yy)}
      function R(x,yy,w,h,col){c.fillStyle=col;c.fillRect(x,yy,w,h)}
      function TW(s,font){c.font=font;return c.measureText(String(s)).width}
      function H2(label){R(P,y+8,14,14,INK);T(label,P+26,y+24,F(700,28),INK);y+=24+18}
      R(0,0,W,H,BG);
      // 제목
      T(d.title,P,y+(cut?46:42),F(700,cut?46:42),INK);y+=(cut?46:42)+16;
      if(d.sub){T(d.sub,P,y+24,F(400,24),MUTED);y+=24+12}
      if(d.ratios&&d.ratios.length){
        // 항목마다 한 줄, 둘째 줄부터는 첫 항목의 시작 위치에 맞춘다. 너무 길면 …으로 줄인다
        var lab="반영비율 : ",lf=F(400,22),lw=TW(lab,lf),maxw=W-2*P-lw;
        d.ratios.forEach(function(rt,i){
          var s=rt;
          while(s.length>1&&TW(s,lf)>maxw)s=s.slice(0,-1);
          if(s!==rt)s=s.slice(0,-1)+"…";
          if(i===0)T(lab,P,y+22,lf,MUTED);
          T(s,P+lw,y+22,lf,MUTED);y+=22+8;
        });
        y+=4;
      }
      R(P,y+6,W-2*P,6,INK);y+=6+26;

      // 등급컷
      if(!cut){H2("등급컷")}
      var rowH=cut?92:72,total=d.stats.n;
      d.rows.forEach(function(r){
        var h=rowH-8;
        R(P,y,W-2*P,h,PANEL);
        var rb=h-24;
        R(P+12,y+12,rb,rb,INK);
        T(r.g,P+12+rb/2,y+12+rb/2+(cut?11:9),F(700,cut?32:26),"#ffffff","center");
        var tx=P+12+rb+24,base=y+h/2+(cut?(r.none?10:14):(r.none?9:11));
        if(r.none){
          T("해당 없음",tx,base,F(700,cut?30:24),MUTED);
        }else{
          var cf=F(700,cut?42:32);
          T(r.main,tx,base,cf,INK);
          var w=TW(r.main,cf);
          R(tx,base+8,w,5,ACC);
          T(r.sub,tx+w+20,base,F(400,cut?22:18),MUTED);
        }
        var rx=W-P-22;
        T(r.n+"명",rx,y+(cut?40:30),F(700,cut?34:28),INK,"right");
        if(r.p!=null)T((Math.round(r.p*10)/10)+"%",rx,y+(cut?68:52),F(400,cut?20:17),MUTED,"right");     // 실제 비율이 아니라 정한 등급 비율
        y+=rowH;
      });
      y+=cut?6:10;

      if(cut){
        var s=d.stats;
        T("응시 "+s.n+"명 · 평균 "+s.mean+" · 최고 "+s.max+" / 최저 "+s.min+(s.full?" · 만점 "+s.full+"점":""),P,y+22,F(400,22),MUTED);y+=22+10;
        T(d.dateText,W-P,y+20,F(400,18),MUTED,"right");y+=20;
        return y+P;
      }

      // 통계
      var cw=(W-2*P-3*16)/4,sy=y;
      [["응시 인원",d.stats.n+"명"],["평균",d.stats.mean],["표준편차",d.stats.sd],["최고 / 최저",d.stats.max+" / "+d.stats.min]].forEach(function(it,i){
        var x=P+i*(cw+16),dark=i===0;
        R(x,sy,cw,92,dark?INK:PANEL);
        T(it[0],x+18,sy+32,F(400,20),dark?"#d6d6d6":MUTED);
        T(it[1],x+18,sy+72,F(700,34),dark?"#ffffff":INK);
      });
      y=sy+92+14;
      if(d.note){d.note.split("|").forEach(function(l){T(l,P,y+18,F(400,18),MUTED);y+=18+6})}
      y+=18;

      // 반별 현황
      if(d.groups&&d.groups.length){
        H2("반별 현황");
        var cols=6,gw=(W-2*P-(cols-1)*12)/cols;
        d.groups.forEach(function(g,i){
          var x=P+(i%cols)*(gw+12),gy=y+Math.floor(i/cols)*(96+12);
          R(x,gy,gw,96,PANEL);
          T(g.c+"반",x+16,gy+34,F(700,26),INK);
          T("응시 "+g.n+"명",x+16,gy+62,F(400,19),MUTED);
          T("평균 "+g.mean,x+16,gy+84,F(400,19),MUTED);
        });
        y+=Math.ceil(d.groups.length/cols)*(96+12)+14;
      }

      // 점수 분포
      if(d.hist){
        H2("점수 분포");
        var hh=210,hx=P,hw=W-2*P;
        R(hx,y,hw,hh+60,PANEL);
        var bw=(hw-48)/d.hist.bins.length,mx=Math.max.apply(null,d.hist.bins.concat([1]));
        d.hist.bins.forEach(function(v,i){
          var bh=v?Math.max(4,v/mx*hh):0;
          R(hx+24+i*bw+2,y+16+hh-bh,bw-4,bh,d.hist.cutBins.indexOf(i)>=0?INK:BAR);
        });
        R(hx+24,y+16+hh,hw-48,3,INK);
        T("0점",hx+24,y+16+hh+30,F(400,18),MUTED);
        T(d.hist.top/2+"점",hx+hw/2,y+16+hh+30,F(400,18),MUTED,"center");
        T(d.hist.top+"점",hx+hw-24,y+16+hh+30,F(400,18),MUTED,"right");
        y+=hh+60+12;
        T("5점 단위로 나눈 점수 분포이며, 검은 막대는 등급컷이 속한 구간입니다.",P,y+18,F(400,17),MUTED);y+=18+22;
      }

      // 성취도
      if(d.ach&&d.ach.rows.length){
        H2("성취도 · "+d.ach.label);
        d.ach.rows.forEach(function(r){
          R(P,y,W-2*P,52,PANEL);
          R(P+8,y+8,36,36,INK);
          T(r.name,P+26,y+33,F(700,r.name==="I"?22:20),"#ffffff","center");
          if(r.small)T(r.small,P+26,y+45,F(400,10),"#ffffff","center");
          T(r.rg,P+60,y+33,F(700,20),INK);
          var bx=P+330,bwid=W-2*P-330-170;
          R(bx,y+19,bwid,14,TRACK);
          R(bx,y+19,bwid*r.pc/100,14,INK);
          T(r.n+"명",W-P-100,y+33,F(700,20),INK,"right");
          T(r.pc.toFixed(1)+"%",W-P-16,y+33,F(400,18),MUTED,"right");
          y+=56;
        });
        if(d.ach.note)T(d.ach.note,P,y+18,F(400,17),MUTED),y+=18;
        y+=20;
      }

      T("등급컷 계산기 · "+d.dateText,W-P,y+18,F(400,17),MUTED,"right");y+=18;
      return y+P;
    }
    // 높이를 먼저 재고(임시 캔버스), 그 크기로 다시 그린다
    var tmp=mk(W,8000),H=paint(tmp.getContext("2d"),8000);
    var cv=mk(W,Math.ceil(H));
    paint(cv.getContext("2d"),Math.ceil(H));
    return cv;
  }

  // 캔버스 한 장을 PDF 한 페이지(가로 A4, 세로는 내용 길이)로 감싼다
  function makePdf(canvas,jpegBytes){
    var w=canvas.width,h=canvas.height,jpg;
    if(jpegBytes)jpg=jpegBytes;
    else{
      var bin=atob(canvas.toDataURL("image/jpeg",0.92).split(",")[1]);
      jpg=new Uint8Array(bin.length);
      for(var i=0;i<bin.length;i++)jpg[i]=bin.charCodeAt(i);
    }
    var pw=595.28,ph=pw*h/w,parts=[],offs=[],len=0;
    function enc(s){var a=new Uint8Array(s.length);for(var i=0;i<s.length;i++)a[i]=s.charCodeAt(i)&255;return a}
    function add(u){parts.push(u);len+=u.length}
    function addS(s){add(enc(s))}
    function obj(n,body,stream){
      offs[n]=len;addS(n+" 0 obj\n"+body+"\n");
      if(stream){addS("stream\n");add(stream);addS("\nendstream\n")}
      addS("endobj\n");
    }
    addS("%PDF-1.4\n");
    obj(1,"<< /Type /Catalog /Pages 2 0 R >>");
    obj(2,"<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    obj(3,"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 "+pw.toFixed(2)+" "+ph.toFixed(2)+"] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>");
    obj(4,"<< /Type /XObject /Subtype /Image /Width "+w+" /Height "+h+" /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length "+jpg.length+" >>",jpg);
    var cs="q "+pw.toFixed(2)+" 0 0 "+ph.toFixed(2)+" 0 0 cm /Im0 Do Q";
    obj(5,"<< /Length "+cs.length+" >>",enc(cs));
    var xr=len;
    addS("xref\n0 6\n0000000000 65535 f \n");
    for(var n=1;n<=5;n++)addS(("0000000000"+offs[n]).slice(-10)+" 00000 n \n");
    addS("trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n"+xr+"\n%%EOF\n");
    var out=new Uint8Array(len),p=0;
    parts.forEach(function(u){out.set(u,p);p+=u.length});
    return out;
  }

  function dateText(){var d=new Date();return d.getFullYear()+"."+("0"+(d.getMonth()+1)).slice(-2)+"."+("0"+d.getDate()).slice(-2)+" 작성"}
  function safeName(t){return String(t||"").replace(/[\\\/:*?"<>|]/g,"").replace(/\s+/g,"_")}
  function download(blob,name){
    var a=document.createElement("a");
    a.href=URL.createObjectURL(blob);a.download=name;
    document.body.appendChild(a);a.click();
    setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},1000);
  }
  function mkCanvas(w,h){var c=document.createElement("canvas");c.width=w;c.height=h;return c}
  // 글꼴이 준비된 뒤에 그린다 (필요한 글자만 내려받음)
  function withFonts(d,cb){
    var t=JSON.stringify(d);
    if(document.fonts&&document.fonts.load){
      Promise.all([document.fonts.load('700 20px "Noto Sans KR"',t),document.fonts.load('400 20px "Noto Sans KR"',t)]).then(cb,cb);
    }else cb();
  }
  function saveImage(d){
    withFonts(d,function(){
      renderReport(d,"cut",mkCanvas).toBlob(function(b){download(b,"등급컷_"+d.kind+"_"+safeName(d.title)+".png")},"image/png");
    });
  }
  function savePdf(d){
    withFonts(d,function(){
      var u=makePdf(renderReport(d,"full",mkCanvas));
      download(new Blob([u],{type:"application/pdf"}),"분석결과_"+d.kind+"_"+safeName(d.title)+".pdf");
    });
  }
  function regData(){
    var L=reg.getLast(),m=regMeta||{};
    if(!L)return null;
    var sub=[m.year,m.term,m.grade].filter(Boolean).join(" ");
    return {kind:"정기시험",title:m.subject||"정기시험",sub:sub+(m.exam?(sub?" · ":"")+m.exam:""),ratios:[],rows:L.rows,stats:L.stats,note:L.note,groups:L.groups,hist:L.hist,ach:null,dateText:dateText()};
  }
  function sumData(){
    var L=sumEng.getLast(),list=items(),mt=null;
    if(!L)return null;
    for(var i=0;i<list.length;i++){if(list[i].parsed.meta.subject){mt=list[i].parsed.meta;break}}
    var sub=mt?[mt.year,mt.term,mt.grade].filter(Boolean).join(" "):"";
    var A=achCompute();
    return {kind:"종합점수",title:(mt&&mt.subject)||"종합점수",sub:sub+(sub?" · ":"")+"종합점수",
      ratios:list.map(function(a){return a.name+" "+fmt(a.ratio)+"%"}),
      rows:L.rows,stats:L.stats,note:L.note,groups:L.groups,hist:L.hist,
      ach:A.rows.length?{label:(ach.mode==="fixed"?"고정분할 ":"추정분할 ")+(ach.lv===6?"A~E · 미도달":"A · B · C"),rows:A.rows,note:ach.lv===6?"I(미도달)은 공통과목에만 적용됩니다.":""}:null,
      dateText:dateText()};
  }
  // 성취도 계산 (화면을 거치지 않고 현재 설정으로)
  function achCompute(){
    var nm=achNames(),bd=achBounds(),sc=sumEng.getScores(),n=sc.length;
    var ok=bd.every(function(v,i){return isFinite(v)&&(i===0||v<bd[i-1])});
    if(!n||!ok)return {rows:[]};
    var cnt=nm.map(function(){return 0});
    sc.forEach(function(x){var k=0;while(k<bd.length&&x<bd[k])k++;cnt[k]++});
    return {rows:nm.map(function(name,k){
      var rg=k===0?fmt(bd[0])+"점 이상":k===nm.length-1?fmt(bd[bd.length-1])+"점 미만":fmt(bd[k])+"점 이상 ~ "+fmt(bd[k-1])+"점 미만";
      return {name:name==="미도달"?"I":name,small:name==="미도달"?"미도달":"",rg:rg,n:cnt[k],pc:cnt[k]/n*100};
    })};
  }
  byId("imgBtn").onclick=function(){var d=regData();if(d)saveImage(d)};
  byId("pdfBtn").onclick=function(){var d=regData();if(d)savePdf(d)};
  byId("s-imgBtn").onclick=function(){var d=sumData();if(d)saveImage(d)};
  byId("s-pdfBtn").onclick=function(){var d=sumData();if(d)savePdf(d)};

  /* ---------- 화면 전환 ---------- */
  function setView(v){
    byId("regview").hidden=v!=="reg";
    byId("sumview").hidden=v!=="sum";
    byId("view-reg").setAttribute("aria-selected",v==="reg");
    byId("view-sum").setAttribute("aria-selected",v==="sum");
    try{localStorage.setItem("gradecut-view",v)}catch(e){}   // 선택한 탭만 이 브라우저에 기억 (파일·점수는 저장하지 않음)
  }
  byId("view-reg").onclick=function(){setView("reg")};
  byId("view-sum").onclick=function(){setView("sum")};
  try{if(localStorage.getItem("gradecut-view")==="sum")setView("sum")}catch(e){}
})();
