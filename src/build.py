import sys
sd = sys.argv[1]
s = open(sd + '/base.html', encoding='utf8').read()
app = open(sd + '/app.js', encoding='utf8').read()


def rep(old, new):
    global s
    assert old in s, old
    s = s.replace(old, new, 1)


# 헤더: 오른쪽에 정기시험/종합점수 전환 추가 (제목은 그대로)
rep('''  <header>
    <div>
      <h1>등급컷 계산기</h1>
      <p class="sub">나이스 교과목별 일람표 파일을 올리면 응시 인원과 등급컷이 바로 나옵니다.</p>
    </div>
  </header>''', '''  <header>
    <div>
      <h1>등급컷 계산기</h1>
      <p class="sub">나이스 교과목별 일람표 파일을 올리면 응시 인원과 등급컷이 바로 나옵니다.</p>
    </div>
    <div class="views" role="tablist" aria-label="계산 종류">
      <button type="button" role="tab" id="view-reg" aria-selected="true">정기시험</button>
      <button type="button" role="tab" id="view-sum" aria-selected="false">종합점수</button>
    </div>
  </header>''')
rep('header{display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap}',
    'header{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap}')

# 정기시험 화면 전체를 regview로 감싼다 (내용은 그대로)
rep('  <div class="layout">', '  <div id="regview">\n  <div class="layout">')
rep('''  </div>
</main>''', '''  </div>
  </div>
  <div id="sumview" hidden></div>
</main>''')
# 파일 칸 묶음 (위아래 간격은 section과 같은 12px라 모습은 그대로)
rep('        <label class="drop" id="drop">', '        <div class="regbox">\n        <label class="drop" id="drop">')
rep('        <div id="meta"></div>', '        <div id="meta"></div>\n        </div>\n      </section>\n      <section id="gradeSide">\n        <h2>등급 기준</h2>\n        <div class="field">\n          <label for="full">만점</label>\n          <input id="full" type="number" min="1" step="any" value="100">\n        </div>')
# 조정 탭: 선택한 탭은 흰색으로 내용과 이어지게
rep('padding:8px 6px;border:0;background:var(--panel);color:var(--fg);cursor:pointer}\n.tabs button+button', 'padding:8px 6px;border:0;background:var(--fg);color:#fff;cursor:pointer}\n.tabs button+button')
rep('.tabs button[aria-selected="true"]{background:var(--fg);color:#fff}', '.tabs button[aria-selected="true"]{background:var(--panel);color:var(--fg)}')

# CSS 추가
css = '''.views{display:flex;border:3px solid var(--line);background:var(--panel)}
.views button{font:inherit;font-weight:700;padding:9px 24px;border:0;background:var(--fg);color:#fff;cursor:pointer}
.views button+button{border-left:3px solid var(--line)}
.views button[aria-selected="true"]{background:var(--panel);color:var(--fg)}
.regbox,.sumbox{display:flex;flex-direction:column;gap:12px}
.sumbox{gap:14px}
input[type=text]{font:inherit;color:var(--fg);background:var(--panel);border:2px solid var(--line);border-radius:0;padding:8px 10px;width:100%;box-sizing:border-box}
.step{display:flex;flex-direction:column;gap:8px;padding-top:10px;border-top:2px solid var(--line)}
.sh{display:flex;align-items:center;gap:8px;font-weight:700}
.sn{width:22px;height:22px;background:var(--fg);color:#fff;display:flex;align-items:center;justify-content:center;font-size:.85rem;flex:none}
.chk{display:flex;align-items:center;gap:8px;font-size:.95rem;color:var(--fg);cursor:pointer}
.chk input{width:18px;height:18px;margin:0;accent-color:var(--fg)}
.arow.perf{grid-template-columns:minmax(0,1fr) 84px 84px}
.arow input[type=text],.arow input[type=number]{padding-top:5px;padding-bottom:5px}
#sumsetup h2::before{display:none}
.arow.cap{font-size:.78rem;color:var(--muted);font-weight:400}
.fl{font-size:.78rem;color:var(--muted);font-weight:400}
.mini{appearance:none;-webkit-appearance:none;width:auto;margin-left:8px;padding:1px 26px 1px 12px;border:2px solid var(--line);border-radius:999px;font:inherit;font-size:.78rem;font-weight:700;color:var(--fg);cursor:pointer;background:var(--panel) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%23333' stroke-width='2'/%3E%3C/svg%3E") no-repeat right 10px center}
.grp{display:flex;align-items:center}
.items{display:flex;flex-direction:column;gap:8px}
.grp{font-size:.8rem;font-weight:700;color:var(--muted);padding-top:4px;border-bottom:2px solid var(--line)}
.arow{display:grid;grid-template-columns:minmax(0,1fr) 92px;gap:8px;align-items:center}
.aname{font-weight:700}
.pct{display:flex;align-items:center;gap:4px;font-weight:700}
.pct input{text-align:right;min-width:0;padding-left:6px;padding-right:6px;-moz-appearance:textfield;appearance:textfield}
.pct input::-webkit-outer-spin-button,.pct input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.afile{background:var(--panel);border:2px solid var(--line);padding:10px 12px;display:flex;flex-direction:column;gap:7px}
.afile:hover,.afile.over{border-color:var(--accent);outline:3px solid var(--accent)}
.ah{display:flex;align-items:center;gap:8px}
.fico{width:34px;height:23px;color:var(--fg);flex:none}
.bulk{position:relative;display:flex;align-items:center;gap:12px;background:var(--panel);border:2px solid var(--line);padding:10px 14px;cursor:pointer}
.bulk:hover,.bulk.over{border-color:var(--accent);outline:3px solid var(--accent)}
.bulk:focus-within{outline:3px solid var(--accent)}
.bulk b{display:block;color:var(--fg);font-size:.95rem}
.bulk span{font-size:.8rem;color:var(--muted);line-height:1.5}
.bulk input{position:absolute;opacity:0;width:1px;height:1px}
.gdesc{grid-column:1 / -1;font-size:.8rem;color:var(--muted);line-height:1.5}
.ah b{overflow-wrap:anywhere}
.ah span{font-size:.85rem;color:var(--muted);white-space:nowrap}
.abtn{position:relative;display:block;text-align:center;background:var(--fg);color:#fff;font-weight:700;font-size:.9rem;padding:8px;cursor:pointer}
.abtn span{font-size:.9rem;color:#fff}
.abtn input{position:absolute;opacity:0;width:1px;height:1px}
.abtn:focus-within{outline:3px solid var(--accent);outline-offset:1px}
.ast{font-size:.82rem;color:var(--muted);line-height:1.4}
.ast.err{color:var(--warn);font-weight:700}
.ast b{color:var(--fg)}
.afull{display:flex;align-items:center;gap:8px;font-size:.85rem}
.afull input{width:84px;padding:4px 8px;text-align:right}
.setup{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px;align-items:start}
@media(max-width:820px){.setup{grid-template-columns:minmax(0,1fr)}}
.files{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px}
.files .grp{grid-column:1 / -1}
.runbar{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-top:20px;padding-top:14px;border-top:6px solid var(--line)}
.run{font:inherit;font-weight:700;font-size:1.05rem;background:var(--fg);color:#fff;border:0;padding:12px 44px;cursor:pointer}
.run:disabled{background:var(--bar);color:var(--muted);cursor:not-allowed}
.back{font:inherit;font-weight:700;background:var(--panel);color:var(--fg);border:2px solid var(--line);padding:9px 12px;cursor:pointer;text-align:left}
.sumsum{background:var(--panel);padding:10px 14px;display:flex;flex-direction:column;gap:3px;font-size:.88rem}
.sumline{display:flex;justify-content:space-between;gap:8px}
.sumline span{color:var(--muted)}

:root{--shadow:0 1px 3px rgba(0,0,0,.16),0 1px 2px rgba(0,0,0,.08)}
.views,.drop,.bulk,details.adv,.meta,.stat,.grow,.cls,.histwrap,.afile,.back,.sumsum,.placeholder,.opts label,.run:not(:disabled),.drop .btn,.abtn{box-shadow:var(--shadow)}
.tabs button[aria-selected="true"]{box-shadow:var(--shadow)}
.views button[aria-selected="true"]{box-shadow:inset 0 2px 3px rgba(0,0,0,.14)}

.rtabs{align-self:flex-start}
.achopt{display:flex;gap:16px;flex-wrap:wrap}
.achopt fieldset{flex:1;min-width:210px}
.achbd{display:grid;grid-template-columns:repeat(auto-fit,minmax(92px,1fr));gap:8px}
.ach{display:flex;flex-direction:column;gap:4px}
.achrow{display:grid;grid-template-columns:34px 10.5rem minmax(0,1fr) 3.6rem 3.8rem;align-items:center;gap:12px;background:var(--panel);padding:6px 12px 6px 6px;font-variant-numeric:tabular-nums;box-shadow:var(--shadow)}
.achrow .lv{background:var(--fg);color:#fff;font-weight:700;height:34px;display:flex;align-items:center;justify-content:center;font-size:.9rem;white-space:nowrap}
.achrow .rg{font-weight:700;font-size:.92rem}
.achrow .bar{height:14px;background:#e4e4e4}
.achrow .bar i{display:block;height:100%;background:var(--fg)}
.achrow .n{font-weight:700;text-align:right}
.achrow .pc{text-align:right;color:var(--muted);font-size:.9rem}
.achtot{display:flex;justify-content:flex-end;gap:14px;padding:4px 12px 0;font-size:.88rem;color:var(--muted);font-variant-numeric:tabular-nums}
@media(max-width:760px){.achrow{grid-template-columns:34px minmax(0,1fr) 3.4rem 3.6rem}.achrow .bar{grid-column:1 / -1;order:5}}

[hidden]{display:none!important}
.achrow .lv{flex-direction:column;gap:1px;line-height:1}
.achrow .lv small{font-size:.5rem;font-weight:400;letter-spacing:-.02em}
.achnote{font-size:.78rem;line-height:1.5}

.flist{display:flex;flex-direction:column;gap:6px}
.fcard{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;background:var(--panel);border:2px solid var(--line);padding:8px 10px;box-shadow:var(--shadow)}
.fcard .fk{font-size:.75rem;font-weight:700;background:var(--fg);color:#fff;padding:2px 8px;white-space:nowrap}
.fcard .fk.perf{background:var(--panel);color:var(--fg);box-shadow:inset 0 0 0 2px var(--fg)}
.fcard .ft b{display:block;overflow-wrap:anywhere}
.fcard .ft span{font-size:.8rem;color:var(--muted);line-height:1.4}
.fcard .x{font:inherit;font-size:1.3rem;line-height:1;border:0;background:transparent;color:var(--muted);cursor:pointer;padding:2px 6px}
.fcard .x:hover{color:var(--fg)}
.drop .dh{align-self:center;text-align:center;font-size:.75rem;color:#8c8c8c;margin-top:-2px}
.drop .dn{font-size:.78rem;color:#9a9a9a;margin-top:-4px}

.arow input[type=text],.arow input[type=number]{height:34px;padding-top:0;padding-bottom:0;box-sizing:border-box}
.arow input.need{border-color:var(--accent);box-shadow:0 0 0 3px rgba(255,140,0,.35)}
.side{display:flex;flex-direction:column;gap:20px}
.sechead{display:flex;align-items:center;justify-content:space-between;gap:12px}
.imgbtn{font:inherit;font-size:.75rem;font-weight:700;background:var(--panel);color:var(--fg);border:2px solid var(--line);padding:3px 10px;cursor:pointer;box-shadow:var(--shadow)}
.imgbtn:hover,.pdfbtn:hover{border-color:var(--accent);outline:2px solid var(--accent)}
.exportbar{display:flex;justify-content:flex-end}
.pdfbtn{font:inherit;font-weight:700;background:var(--fg);color:#fff;border:2px solid var(--fg);padding:9px 22px;cursor:pointer;box-shadow:var(--shadow)}
</style>'''
rep('</style>', css)

# 스크립트 교체
a = s.index('<script>\n') if '<script>\n' in s else s.index('<script>\r\n')
b = s.index('</script>', a) + len('</script>')
s = s[:a] + '<script>\n' + app + '</script>' + s[b:]
open(sd + '/out.html', 'w', encoding='utf8').write(s)
print('built', len(s))
