import test from 'node:test';import assert from 'node:assert/strict';
import {createRequire} from 'node:module';const require=createRequire(import.meta.url);
const C=require('./src/core.js');
const month='2026-09';
// Notas de referência geradas pelo monthData() do Rico Pipeline (core.mjs) para os mesmos lançamentos.
const PIPELINE_CASES=[[{}, 1.6], [{"cap": 800000}, 2.4000000000000004], [{"cap": 1000000, "prev": 200000, "stvm": 100000, "aloc": 1500000, "seg": 5000, "con": 100000, "cards": 10, "ic": 88, "nps": 50}, 3.410099262336602], [{"cap": 300000, "aloc": 2600000, "cards": 40, "ic": 70, "nps": 20}, 2.200191675794086], [{"cap": 2000000, "prev": 500000, "aloc": 0, "seg": 30000, "con": 0, "cards": 0, "ic": 100, "nps": 90}, 4.1]];
test('mesmo MEREO do Rico Pipeline',()=>{
  for(const [c,expected] of PIPELINE_CASES){
    const mem={id:'m',goals:{}};const st={members:{m:mem},entries:{'m|2026-09':{...c,ic:c.ic??null,nps:c.nps??null,cap:c.cap??0}}};
    const r=C.monthResult(st,mem,'2026-09');
    assert.ok(Math.abs(r.score-expected)<1e-9,JSON.stringify({c,mine:r.score,expected}));
  }
});
test('100% da meta = 3,00',()=>{const mem={id:'m',goals:{}};const st={members:{m:mem},entries:{'m|2026-09':{cap:800000,aloc:2200000,cards:25}}};assert.equal(C.fmtScore(C.monthResult(st,mem,month).score),'3,00');});
test('semestre: projeção e até agora',()=>{
  const mem={id:'m',goals:{}};const st={members:{m:mem},entries:{'m|2026-07':{cap:800000,aloc:2200000,cards:25,ic:83,nps:41.3},'m|2026-08':{cap:400000,aloc:2200000,cards:25}}};
  const sem=C.semesterOf('2026-09');assert.deepEqual(C.semesterMonths(sem)[0],'2026-07');
  const ytd=C.semesterResult(st,mem,sem,'ytd'),proj=C.semesterResult(st,mem,sem,'proj');
  assert.equal(ytd.totals.cap,1200000);assert.equal(ytd.goals.cap,1600000);
  assert.equal(proj.totals.cap,3600000);assert.equal(proj.goals.cap,4800000);
  assert.equal(C.fmtScore(C.score(75,C.COMPONENTS[0].curve)),'2,38');
  assert.deepEqual(C.shiftSemester({year:2026,half:2},1),{year:2027,half:1});assert.deepEqual(C.shiftSemester({year:2026,half:1},-1),{year:2025,half:2});
});
test('mesclagem por updatedAt',()=>{const a={members:{x:{name:'A',updatedAt:1}},entries:{},settings:{updatedAt:1}},b={members:{x:{name:'B',updatedAt:2},y:{name:'Y',updatedAt:1}},entries:{},settings:{updatedAt:0}};const m=C.merge(a,b);assert.equal(m.members.x.name,'B');assert.ok(m.members.y);});
