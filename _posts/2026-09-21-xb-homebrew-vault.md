---
title: "XB Homebrew Vault: central de comando para Xbox Dev Mode"
date: 2026-09-21 08:00:00 -03:00
author: the-archivist
categories: [emulators, news]
tags: [android, emulation-revival, homebrew, xbox, xbox-dev-mode]
description: "Conheça o XB Homebrew Vault, aplicativo open source para navegar, instalar e administrar homebrew no Xbox Dev Mode pelo PC ou Android."
image: /assets/images/posts/xb-homebrew-vault/cover.jpg
image_alt: "XB Homebrew Vault em execução"
image_position: center
---

<section class="software-hero">
  <p class="eyebrow">Projeto pessoal</p>
  <h2>O Xbox Dev Mode é muito melhor do que a experiência para instalar coisas nele</h2>
  <p>O <strong>XB Homebrew Vault</strong> nasceu exatamente dessa irritação: o console tem uma cena de homebrew cada vez mais interessante, mas administrar tudo pelo Device Portal parece castigo para quem só queria instalar um port e jogar.</p>
</section>

Vou ser sincero: eu gosto muito da ideia do Xbox em Developer Mode. Um Series S pequeno, barato, silencioso e com uma arquitetura moderna tem tudo para virar uma máquina excelente de emulação, ports e experiências feitas pela comunidade. E virou. Tem RetroArch, PPSSPP, Flycast, XBSX2, jogos feitos para UWP, ports de PC, ferramentas, frontends e uma quantidade surpreendente de projetos que continuam aparecendo.

O problema nunca foi falta de coisa para rodar. O problema era o caminho até ela.

Para instalar um aplicativo normalmente você abre o portal web do Xbox, digita IP, usa credenciais, navega por telas que parecem feitas para uma equipe de TI de 2016, escolhe pacote, procura dependência, envia arquivo, espera, confere se o pacote entrou e recomeça tudo quando alguma coisa não conversa direito. Funciona. Mas é uma experiência horrível para quem está só tentando aproveitar o próprio console.

Foi daí que saiu o XB Homebrew Vault: uma central para deixar esse processo menos burocrático e mais parecido com o que deveria ser desde o começo.

<p class="post-actions"><a href="https://xbvault.pages.dev/" rel="external">Visitar XBVault</a><a href="https://github.com/marcelofrau/xb-homebrew-vault/releases/latest" rel="external">Baixar versão mais recente</a><a href="https://github.com/marcelofrau/xb-homebrew-vault" rel="external">Ver no GitHub</a></p>

## A parte mais legal: o ecossistema existe

Xbox Dev Mode não é só emulador. A comunidade foi construindo ports, jogos, ferramentas e experiências que aproveitam o fato de o console ser, no fim das contas, um PC compacto ligado na TV. Parte desse material vem de projetos independentes, parte são ports de engines conhecidas, parte são aplicativos feitos especificamente para o ambiente UWP/Xbox.

O [Emulation Revival](https://emulationrevival.github.io/) é peça central nisso. O catálogo deles organiza uma quantidade enorme de emuladores, apps, ports e jogos que seriam difíceis de descobrir um por um. O XBVault consome esse catálogo e coloca busca, filtros, detalhes e instalação na frente de quem está usando o console.

## O que o Vault faz na prática

<div class="feature-grid">
  <article><h3>Catálogo de verdade</h3><p>Busca emuladores, ports, jogos e utilitários do Emulation Revival com filtros e informações antes de instalar.</p></article>
  <article><h3>Instalação sem ritual</h3><p>Baixa o pacote, resolve dependências e envia sem fio para o Xbox. Sem alternar entre abas do navegador e painel do Device Portal.</p></article>
  <article><h3>Seu próprio pacote</h3><p>Tem um <code>.appx</code>, <code>.msix</code> ou <code>.zip</code>? O assistente analisa arquivo local ou URL e ajuda a preparar instalação.</p></article>
  <article><h3>O Xbox está fazendo o quê?</h3><p>Captura de tela, processos, rede, informações do sistema e gráfico de CPU, GPU e RAM em tempo real.</p></article>
  <article><h3>Arquivo, log e diagnóstico</h3><p>Explorador SSH/SFTP, transferência de arquivos, logs e integração com XRay para inspeção e Lua REPL.</p></article>
  <article><h3>USB sem gambiarra manual</h3><p>Assistente que encontra a unidade e aplica as permissões NTFS que o Dev Mode precisa para trabalhar com mídia USB.</p></article>
</div>

<section class="xbvault-gallery-intro"><h2>Um pouco do que aparece na tela</h2><p>Catálogo, ferramentas e versão Android em três momentos diferentes do mesmo projeto. Clique em qualquer imagem para ampliar, navegar e dar zoom.</p></section>

<div class="post-gallery xbvault-gallery" aria-label="Galeria de screenshots do XB Homebrew Vault">
  <a href="{{ '/assets/images/posts/xb-homebrew-vault/browse.png' | relative_url }}" aria-label="Abrir catálogo do XB Homebrew Vault"><img src="{{ '/assets/images/posts/xb-homebrew-vault/browse.png' | relative_url }}" alt="Tela de catálogo do XB Homebrew Vault"></a>
  <a href="{{ '/assets/images/posts/xb-homebrew-vault/tools.png' | relative_url }}" aria-label="Abrir ferramentas do XB Homebrew Vault"><img src="{{ '/assets/images/posts/xb-homebrew-vault/tools.png' | relative_url }}" alt="Ferramentas de diagnóstico do XB Homebrew Vault"></a>
  <a href="{{ '/assets/images/posts/xb-homebrew-vault/android.png' | relative_url }}" aria-label="Abrir versão Android do XB Homebrew Vault"><img src="{{ '/assets/images/posts/xb-homebrew-vault/android.png' | relative_url }}" alt="Versão Android do XB Homebrew Vault"></a>
</div>

## Quando a instalação não é o fim da história

Uma parte importante do projeto é não tratar o botão de instalar como ponto final. Depois de conectar ao Xbox, o aplicativo sabe se um pacote está ausente, instalado, atualizado ou se existe atualização disponível. A tela de detalhes muda junto com esse estado em vez de despejar botões genéricos e deixar a pessoa adivinhar o que fazer.

Também existe espaço para quem gosta de mexer mais fundo. Ferramentas de desenvolvimento, gerenciamento de processos, captura, rede, explorador de arquivos e o Inspector/XRay fazem sentido quando um port resolve dar problema, quando um pacote precisa de investigação ou quando simplesmente bate a curiosidade de olhar o que está acontecendo dentro do console.

## Desktop para organizar, Android para não depender do desktop

O XBVault é feito em .NET 10 e Avalonia UI. A mesma base atende desktop e Android, mas a proposta não é simplesmente esticar uma janela de PC para o celular.

| Plataforma | Como entra na história |
| --- | --- |
| Windows, macOS e Linux | Builds self-contained para administrar biblioteca, instalar pacotes, explorar arquivos e acompanhar ferramentas com mais espaço. |
| Android ARM64 | Versão vertical para conectar por QR code, navegar no catálogo, fazer sideload, conferir arquivos, logs, trabalhos e notificações sem precisar ligar o PC. |

## O que chegou na v2.0.7

A versão atual não é uma atualização só de aparência. Ela mexeu em pontos chatos que aparecem justamente no uso diário: conexão que testava mas não mudava o estado do aplicativo, tela de detalhes que ficava desatualizada depois de conectar, ações de reinstalar ou remover que nem sempre encontravam o pacote certo e verificações pós-instalação que podiam acusar falha depois de uma instalação já aceita pelo Xbox.

Agora o fluxo de detalhe acompanha a situação real: sem conexão, mostra como conectar; pacote ausente, instala; pacote já instalado, oferece reinstalar ou remover; versão defasada, mostra atualização. No Android, os assistentes também passaram a se adaptar quando o teclado virtual abre, porque preencher IP, URL ou credencial numa tela apertada não deveria ser uma luta.

O release v2.0.7 tem builds para Windows x64 e ARM64, Linux x64 e ARM64, macOS Intel e Apple Silicon, além do APK Android ARM64. Os arquivos são publicados com SHA-256 e links de análise no VirusTotal para quem prefere conferir o que baixa.

## Como começar sem drama

1. Ative o Developer Mode no Xbox One ou Series S\|X.
2. Deixe Xbox e computador ou celular na mesma rede.
3. Baixe a versão adequada em [Releases](https://github.com/marcelofrau/xb-homebrew-vault/releases/latest).
4. Informe IP e credenciais do Dev Mode no assistente inicial.
5. Conecte, navegue pelo catálogo e instale o que quiser testar.

O XB Homebrew Vault é GPL-3.0, open source e continua evoluindo em público. Bugs, ideias e contribuições ficam no [GitHub](https://github.com/marcelofrau/xb-homebrew-vault).

> XB Homebrew Vault não é afiliado à Microsoft, Xbox ou Emulation Revival. Use homebrew e software próprio dentro das leis aplicáveis na sua região.
