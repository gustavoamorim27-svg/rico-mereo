# MEREO do time

**No ar:** https://gustavoamorim27-svg.github.io/rico-mereo/ (acesso com senha, a mesma do Hub do Assessor)

- `index.html` é só a tela de login. O painel inteiro fica em `app.enc`, compactado e criptografado com AES-256-GCM; a chave sai da senha via PBKDF2-SHA256.
- O código-fonte (src/ e build.py) fica em `src.enc` (um .tar criptografado com a mesma senha).
- O link de compartilhar o time (`#time=…`) continua funcionando: depois da senha, o painel abre já no time.
- O login é compartilhado com o Hub do Assessor e o Pipeline. "Lembrar neste aparelho" vale até a meia-noite da próxima segunda-feira (Brasília).

## Atualizar

```
HUB_SENHA='…' python3 cofre.py abrir src.enc src.tar      # fonte (src/ + build.py)
# editar, rodar build.py
HUB_SENHA='…' python3 cofre.py fechar index-montado.html app.enc
```

Nunca suba a senha nem arquivos descriptografados.
