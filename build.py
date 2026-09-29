import pathlib
S=pathlib.Path('src')
css=(S/'base.css').read_text()+"\n"+(S/'app.css').read_text()
fonts_import=css.splitlines()[0]
css="\n".join(css.splitlines()[1:])
js=(S/'logo.js').read_text()+"\n"+(S/'core.js').read_text()+"\n"+(S/'app.js').read_text()
head='''<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#0b1020"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="MEREO Time">
<title>Rico · MEREO do time</title><link rel="manifest" href="manifest.webmanifest"><link rel="apple-touch-icon" href="icon-180.png"><link rel="icon" href="icon-192.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Sora:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap">
<script>try{var t=localStorage.getItem('ricoMereo.theme')||'rico';if(t!=='lava')document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='rico';}</script>'''
body='''<div class="atmosphere" aria-hidden="true"><i class="orb orb-orange"></i><i class="orb orb-blue"></i><i class="orb orb-pink"></i><i class="orb orb-amber"></i><i class="orb orb-teal"></i><i class="orb orb-cobalt"></i><i class="orb orb-ember"></i><i class="orb orb-deep"></i></div><div class="floor" aria-hidden="true"></div><div id="app"></div><dialog id="dialog"></dialog><div id="toast" class="toast" role="status" aria-live="polite"></div><noscript>Ative o JavaScript para abrir o MEREO do time.</noscript>'''
full=f'<!doctype html>\n<html lang="pt-BR" data-theme="rico"><head>\n{head}\n<style>\n{css}\n</style></head><body>{body}<script>\n{js}\n</script></body></html>\n'
pathlib.Path('index.html').write_text(full)
# Versão para prévia (Artifact): sem esqueleto, sem manifest/ícones relativos
art=f'<title>MEREO do Time</title>\n<meta name="theme-color" content="#0b1020">\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Sora:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap">\n<script>document.documentElement.setAttribute("lang","pt-BR");try{{var t=localStorage.getItem("ricoMereo.theme")||"rico";if(t!=="lava")document.documentElement.dataset.theme=t;}}catch(e){{document.documentElement.dataset.theme="rico";}}</script>\n<style>\n{css}\n</style>\n{body}<script>\n{js}\n</script>\n'
pathlib.Path('preview').mkdir(exist_ok=True)
pathlib.Path('preview/mereo-time.html').write_text(art)
print(len(full))
