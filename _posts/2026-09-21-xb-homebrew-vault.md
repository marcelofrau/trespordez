---
title: "XB Homebrew Vault"
date: 2026-09-21 08:00:00 -03:00
author: the-archivist
categories: [emulators, news]
tags: [android, emulation-revival, homebrew, xbox, xbox-dev-mode]
description: "Um Series S pequeno e silencioso virando central de emulação e ports — e um app pra cuidar disso tudo sem sofrer no Device Portal."
image: /assets/images/posts/xb-homebrew-vault/cover.jpg
image_alt: "XB Homebrew Vault"
image_fit: contain
image_position: center
---

<p>Quem acompanha o Três por Dez já percebeu que eu tenho um carinho especial por hardware que rende mais do que parece. E o Xbox Series S é exatamente isso: pequeno, barato, silencioso, e quando colocado em Developer Mode vira uma máquina absurda pra emulação, ports e homebrew em geral.</p>

<p>Tem RetroArch, PPSSPP, Flycast, XBSX2, um monte de port de PC, jogo feito pra UWP, frontend, ferramenta... a cena do Dev Mode cresceu muito, e continua crescendo. Quem fuça um pouco logo monta uma biblioteca respeitável ali.</p>

<p>Só que tem um porém, e quem já passou por isso sabe bem do que eu tô falando: instalar e administrar essas coisas pelo Device Portal é um parto. Abrir o navegador, digitar IP, logar, procurar o pacote, descobrir que faltou dependência, enviar, esperar, conferir se entrou... e repetir o ritual inteiro na próxima vez. Funciona, mas é daquelas experiências que fazem você repensar se vale mesmo a pena mexer com aquilo.</p>

<p>Pois é. Eu cansei desse ritual e resolvi fazer alguma coisa a respeito. O resultado é o <strong>XB Homebrew Vault</strong>: um app open source que conversa com o Xbox na rede local e deixa todo esse processo bem menos burocrático.</p>

<p class="post-actions"><a href="https://xbvault.pages.dev/" rel="external">Visitar XBVault</a><a href="https://github.com/marcelofrau/xb-homebrew-vault/releases/latest" rel="external">Baixar versão mais recente</a><a href="https://github.com/marcelofrau/xb-homebrew-vault" rel="external">Ver no GitHub</a></p>

<h2>Antes de tudo: a cena existe, e é boa</h2>

<p>Muita gente ainda associa Xbox Dev Mode só com emulador, mas a história é maior. Como no fundo o console é um PC compacto ligado na TV, a comunidade foi portando engine, jogo, ferramenta e experiência de todo tipo. Parte disso é projeto independente, parte é port de coisa conhecida, parte foi feita sob medida pro ambiente do Xbox.</p>

<p>Nesse meio todo, o <a href="https://emulationrevival.github.io/">Emulation Revival</a> virou peça central. O pessoal de lá organiza um catálogo enorme de emuladores, apps, ports e jogos que seria impossível acompanhar um por um. O Vault usa esse catálogo como base: busca, filtro, detalhe de cada item e instalação, tudo na mesma tela.</p>

<section class="xbvault-gallery-intro"><h2>Pra ver como ficou</h2><p>Catálogo, ferramentas e a versão Android. Clica em qualquer imagem pra ampliar e fuçar com calma.</p></section>

<div class="post-gallery xbvault-gallery" aria-label="Galeria de screenshots do XB Homebrew Vault">
  <a href="{{ '/assets/images/posts/xb-homebrew-vault/browse.png' | relative_url }}" aria-label="Abrir catálogo do XB Homebrew Vault"><img src="{{ '/assets/images/posts/xb-homebrew-vault/browse.png' | relative_url }}" alt="Tela de catálogo do XB Homebrew Vault"></a>
  <a href="{{ '/assets/images/posts/xb-homebrew-vault/tools.png' | relative_url }}" aria-label="Abrir ferramentas do XB Homebrew Vault"><img src="{{ '/assets/images/posts/xb-homebrew-vault/tools.png' | relative_url }}" alt="Ferramentas de diagnóstico do XB Homebrew Vault"></a>
  <a href="{{ '/assets/images/posts/xb-homebrew-vault/android.png' | relative_url }}" aria-label="Abrir versão Android do XB Homebrew Vault"><img src="{{ '/assets/images/posts/xb-homebrew-vault/android.png' | relative_url }}" alt="Versão Android do XB Homebrew Vault"></a>
</div>

<h2>O que dá pra fazer com ele</h2>

<p>Nada de manual de 40 páginas. A ideia é: conectou, navegou, instalou. O app baixa o pacote, resolve dependência e manda sem fio pro Xbox. E se você tem um <code>.appx</code>, <code>.msix</code> ou <code>.zip</code> parado no PC — ou um link — o assistente ajuda a preparar a instalação também.</p>

<p>Depois de instalado, ele continua útil: mostra o que tá no console, o que tem atualização, o que dá pra reinstalar ou remover, sem ficar pulando entre telas do portal. E pra quem gosta de fuçar, tem captura de tela, processos, rede, gráfico de CPU/GPU/RAM em tempo real, explorador de arquivos por SSH/SFTP, logs e até integração com XRay pra inspeção e Lua REPL. Ah, e preparar pendrive USB pro Dev Mode também, com as permissões NTFS aplicadas sem comando manual.</p>

<h2>No PC e no bolso</h2>

<p>O app é feito em .NET com Avalonia, e a mesma base atende desktop e Android. No PC (Windows, macOS e Linux) rola a experiência completa, com builds que não precisam de instalação. No Android, a interface foi refeita pra tela vertical: dá pra conectar pelo QR code, navegar no catálogo, fazer sideload, mexer nos arquivos e acompanhar notificações sem precisar ligar o computador. Confesso que essa parte virou minha favorita — instalar coisa no Xbox largado no sofá tem seu charme.</p>

<h2>Versão atual: v2.0.7</h2>

<p>A versão mais recente arrumou umas coisas chatas do dia a dia: conexão que testava mas não atualizava o estado do app, tela de detalhes desatualizada depois de conectar, aquele falso erro de instalação logo depois de instalar... essas coisinhas. Agora cada tela mostra a ação certa pro momento: sem conexão, pede pra conectar; pacote novo, instala; já instalado, reinstala ou remove; desatualizado, atualiza. No Android, os assistentes também passaram a se virar melhor quando o teclado virtual abre.</p>

<p>Tem build pra Windows x64 e ARM64, Linux x64 e ARM64, macOS Intel e Apple Silicon, além do APK pra Android. Cada release sai com checksum SHA-256 e link de análise no VirusTotal, pra quem — como eu — gosta de conferir antes de executar.</p>

<h2>Por onde começar</h2>

<p>O caminho é simples: coloca o Xbox One ou Series S|X em Developer Mode, deixa ele e o PC ou celular na mesma rede, baixa a versão certa em <a href="https://github.com/marcelofrau/xb-homebrew-vault/releases/latest">Releases</a>, informa IP e credenciais no assistente inicial e pronto. Daí é navegar no catálogo e instalar o que der vontade.</p>

<p>O projeto é GPL-3.0 e continua evoluindo em público. Bug, ideia, sugestão — tudo pelo <a href="https://github.com/marcelofrau/xb-homebrew-vault">GitHub</a>.</p>

<blockquote>
  <p>XB Homebrew Vault não é afiliado à Microsoft, Xbox ou Emulation Revival. E como sempre por aqui: use homebrew e software próprio dentro da lei da sua região.</p>
</blockquote>
