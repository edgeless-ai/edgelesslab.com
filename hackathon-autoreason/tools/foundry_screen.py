import json, urllib.request, os, time
API="https://api.edgelesslab.com"
by_idx={i:it for i,it in enumerate(json.load(open('captures/foundry/manifest.json')))}
sel = {1:'poster',2:'sticker',3:'tee',5:'poster',7:'poster',8:'tee',9:'poster',10:'cc-tee',
       11:'cap',14:'tee',15:'poster',16:'tote',17:'sticker',18:'poster',19:'poster',20:'tee',21:'poster',22:'sticker'}
done=set()
if os.path.exists('captures/foundry/screened.jsonl'):
    for l in open('captures/foundry/screened.jsonl'):
        try: done.add(json.loads(l)['idx'])
        except: pass
def upload(path):
    b="----f"; fn=os.path.basename(path); body=b""
    body+=f"--{b}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{fn}\"\r\nContent-Type: image/jpeg\r\n\r\n".encode()
    body+=open(path,'rb').read()+f"\r\n--{b}--\r\n".encode()
    return json.load(urllib.request.urlopen(urllib.request.Request(f"{API}/upload-art",data=body,method="POST",headers={"Content-Type":f"multipart/form-data; boundary={b}"}),timeout=90))
def submit(a,t,c,k):
    return json.load(urllib.request.urlopen(urllib.request.Request(f"{API}/submit",method="POST",data=json.dumps({"art_url":a,"title":t,"creator":c,"kind":k}).encode(),headers={"Content-Type":"application/json"}),timeout=150))
f=open('captures/foundry/screened.jsonl','a')
for idx,kind in sel.items():
    if idx in done: continue
    it=by_idx[idx]
    try:
        art=upload(it['file']).get('art_url')
        if not art: continue
        r=submit(art,it['title'],it['persona'],kind)
        rec={"idx":idx,**it,"kind":kind,"art_url":art,"slug":r.get('slug'),"verdict":r.get('verdict'),
             "score":r.get('score'),"reason":(r.get('reason') or '')[:100],"listed":r.get('listed'),"mockup":r.get('mockup')}
        f.write(json.dumps(rec)+"\n"); f.flush(); time.sleep(18)
        print(f"  {it['persona']:9} {it['title'][:16]:18} {kind:7} -> {str(r.get('verdict')).upper():11} score={r.get('score')} {'LISTED' if r.get('listed') else ''}", flush=True)
    except Exception as e:
        print(f"  x {it['title']}: {str(e)[:80]}", flush=True)
print("SCREENING DONE", flush=True)
