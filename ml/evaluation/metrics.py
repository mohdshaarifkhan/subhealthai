import numpy as np

def brier_score(p, y): p=np.asarray(p); y=np.asarray(y); return float(np.mean((p-y)**2))
def ece(p, y, bins=10):
    p=np.asarray(p); y=np.asarray(y); edges=np.linspace(0,1,bins+1); out=0.0
    for i in range(bins):
        m=(p>=edges[i])&(p<edges[i+1]) if i<bins-1 else (p>=edges[i])&(p<=edges[i+1])
        if m.sum()==0: continue
        out += float(m.mean())*abs(float(p[m].mean()-y[m].mean()))
    return float(out)
def volatility(p): p=np.asarray(p); return 0.0 if len(p)<2 else float(np.abs(np.diff(p)).mean())
def lead_time(pred, y):
    pred=np.asarray(pred); y=np.asarray(y); lt=[]; i=0
    while i<len(y):
        if y[i]==1:
            start=i
            while i<len(y) and y[i]==1: i+=1
            end=i-1
            for t in range(max(0,start-7), end+1):
                if pred[t]==1: lt.append(start-t); break
        i+=1
    return float(np.mean(lt)) if lt else 0.0
def rationale_fidelity(topk, rules):
    a=set(topk); b=set(rules); return float(len(a&b)/max(1,len(a|b)))
