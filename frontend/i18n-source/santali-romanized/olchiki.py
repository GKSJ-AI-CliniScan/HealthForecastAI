# Romanized Santali -> Ol Chiki. Latin kept inside |...| and {placeholders}.
import re, sys, unicodedata
V = {'a':'ᱟ','e':'ᱮ','i':'ᱤ','o':'ᱚ','u':'ᱩ','ô':'ᱳ'}
C = {'k':'ᱠ','g':'ᱜ','ṅ':'ᱝ','c':'ᱪ','j':'ᱡ','ñ':'ᱧ','ń':'ᱧ','ṭ':'ᱴ','ḍ':'ᱰ','ṇ':'ᱬ','t':'ᱛ','d':'ᱫ','n':'ᱱ',
     'p':'ᱯ','b':'ᱵ','m':'ᱢ','y':'ᱭ','r':'ᱨ','ṛ':'ᱲ','l':'ᱞ','w':'ᱣ','s':'ᱥ','h':'ᱦ','f':'ᱯᱷ','v':'ᱣ'}
def conv(word):
    w = unicodedata.normalize('NFD', word)
    out=[]; prev_cons=False
    i=0
    while i < len(w):
        ch=w[i]; low=ch.lower()
        if low=='\u0301' :  i+=1; continue           # acute (ć, ń handled pre-NFC) -> ignore
        if low=='\u0303': out.append('ᱸ'); i+=1; continue   # tilde nasal
        if low=='\u0323':                               # under-dot: on vowel = gaahlaa, on consonant handled below
            out.append('ᱹ'); i+=1; continue
        if low=='\u0308': out.append('ᱹ'); i+=1; continue    # ä -> gaahlaa
        if low=='\u0259': out.append('ᱚᱹ'); prev_cons=False; i+=1; continue  # ə
        # precomposed consonants with dots/acute: recombine
        nxt = w[i+1] if i+1 < len(w) else ''
        comp = unicodedata.normalize('NFC', ch+nxt) if nxt in '\u0323\u0307\u0301' else None
        if comp and comp.lower() in C:
            out.append(C[comp.lower()]); prev_cons=True; i+=2; continue
        if low=='h' and prev_cons and out and out[-1] in 'ᱠᱜᱪᱡᱴᱰᱛᱫᱯᱵᱲ':
            out.append('ᱷ'); prev_cons=False; i+=1; continue
        if low in C: out.append(C[low]); prev_cons=True; i+=1; continue
        if low in V: out.append(V[low]); prev_cons=False; i+=1; continue
        out.append(ch); prev_cons=False; i+=1
    return ''.join(out)
def line(s):
    parts = re.split(r'(\|[^|]*\||\{[a-z]+\}|\d+)', s)
    res=[]
    for p in parts:
        if p.startswith('|'): res.append(p[1:-1])
        elif p.startswith('{') or p.isdigit(): res.append(p)
        else: res.append(conv(unicodedata.normalize('NFC',p)).replace('.', '᱾'))
    return ''.join(res)
for l in open(sys.argv[1]):
    print(line(l.rstrip('\n')))
