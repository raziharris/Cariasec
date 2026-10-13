"""Read-only, reproducible extraction. Requires pymupdf. Source is never modified."""
import pymupdf as fitz
import hashlib, json, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
source = root / 'KAD CARIASEC LATEST.1pdf.pdf'
doc = fitz.open(source)
pages = [{'page': i+1, 'text': p.get_text()} for i,p in enumerate(doc)]
def save(path, data):
    target = root / path
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
save('docs/pdf-extraction.json',pages)
groups = [
 ('R','Realistik','Pembuat',16,17,[20,22,24,26,28,30],['Jurutera','Tukang Masak','Mekanik','Tukang Kebun','Buruh','Atlet'],'Suka bekerja dengan objek, mesin, alatan, tumbuhan atau haiwan, atau berada di luar rumah.'),
 ('I','Investigatif','Pemikir',31,45,[33,35,37,39,41,43],['Peguam','Ahli Sains','Pengatur Cara','Ahli Farmasi','Pakar Bedah','Pakar Psikiatri'],'Suka mengumpul maklumat dan menganalisis situasi sebelum membuat keputusan.'),
 ('A','Artistik','Pencipta',47,61,[49,51,53,55,57,59],['Penyanyi','Pelukis','Ahli Muzik','Penari','Pelakon','Pereka Grafik'],'Tertarik dengan orang, pemandangan, tekstur dan bunyi yang luar biasa.'),
 ('S','Sosial','Pembantu',64,77,[65,67,69,71,73,75],['Guru','Jururawat','Pramugari','Kaunselor','Pelayan Restoran','Setiausaha Pejabat'],'Menggunakan perasaan, perkataan dan idea untuk bekerja dengan orang ramai daripada aktiviti fizikal untuk melakukan sesuatu.'),
 ('E','Enterprising','Pengusaha',79,94,[81,83,85,87,89,91],['Ejen Jualan','Ahli Politik','Ketua Eksekutif','Pemandu Pelancong','Kurator','Penilai Hartanah'],'Mempengaruhi, memujuk, memimpin atau mengurus untuk matlamat organisasi atau keuntungan ekonomi.'),
 ('C','Konvensional','Penyusun',96,110,[97,99,101,103,105,107],['Penganalisis Kewangan','Akauntan','Penasihat','Pustakawan','Juruwang','Operator'],'Perlu untuk berasa selamat dan pasti, mengikut rutin, menyelesaikan sesuatu dan terperinci dalam setiap butiran.')
]
assets = root / 'public/cards'
assets.mkdir(parents=True,exist_ok=True)
cards, categories = [], []
for gi,(code,name,role,info,career,numbers,titles,description) in enumerate(groups):
    challenge = gi*2+1
    categories.append(dict(code=code,name=name,role=role,description=description,sourcePage=info,careerPage=career,originalContent=pages[info-1]['text'],careerContent=pages[career-1]['text'],challenge=f'Lakonkan salah satu jenis pekerjaan untuk personaliti {name}',challengePage=challenge))
    for j,(page,title) in enumerate(zip(numbers,titles)):
        raw = pages[page-1]['text']
        assert title.upper() in ' '.join(raw.split()), (page,title)
        card_id = f'{code}{j+1}'
        # Only the artwork area; bilingual labels stay in the source archive.
        doc[page-1].get_pixmap(matrix=fitz.Matrix(2.5,2.5),clip=fitz.Rect(33,59,148,197),alpha=False).pil_save(str(assets / f'{card_id}.webp'),format='WEBP',quality=85)
        cards.append(dict(id=card_id,category=code,title=title,description=None,originalContent=raw,artwork=f'/cards/{card_id}.webp',source=dict(file=source.name,page=page)))
save('shared/cards.json',cards)
save('shared/categories.json',categories)
backs = [p['page'] for p in pages if 'EXPLORE YOUR POTENTIALS' in p['text']]
career_cards = [c['source']['page'] for c in cards]
challenges = list(range(1,12,2))
learning = [p['page'] for p in pages if p['page'] not in backs+career_cards+challenges]
save('docs/pdf-manifest.json',dict(file=source.name,sha256=hashlib.sha256(source.read_bytes()).hexdigest(),pageCount=len(doc),cards=career_cards,backs=backs,challenges=challenges,learning=learning,counts={g[0]:6 for g in groups},rulesFound=False))
assert len(cards)==36 and len(backs)==42 and len(learning)==26
print('Verified: 110 pages; 36 career cards; 42 backs; 6 challenges; 26 learning pages.')
