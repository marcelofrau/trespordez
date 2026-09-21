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
  <h2>Seu Xbox Dev Mode, sem a dor de cabeça do Device Portal</h2>
  <p>O <strong>XB Homebrew Vault</strong> nasceu da vontade de organizar emuladores, apps e ferramentas em um Xbox com Developer Mode sem abrir o navegador, caçar endereço IP, upload manual e páginas pouco amigáveis a cada instalação.</p>
</section>

O resultado é um aplicativo gratuito e open source que conversa com o Xbox na rede local. Ele centraliza catálogo, instalação, gerenciamento de pacotes e ferramentas de diagnóstico em uma interface pensada para quem quer usar o console, não brigar com a administração dele.

<p class="post-actions"><a href="https://xbvault.pages.dev/" rel="external">Visitar XBVault</a><a href="https://github.com/marcelofrau/xb-homebrew-vault/releases/latest" rel="external">Baixar versão mais recente</a><a href="https://github.com/marcelofrau/xb-homebrew-vault" rel="external">Ver no GitHub</a></p>

## O que ele resolve

<div class="feature-grid">
  <article><h3>Catálogo integrado</h3><p>Navega pelo catálogo do Emulation Revival com busca, filtros e detalhes de compatibilidade antes de instalar.</p></article>
  <article><h3>Instalação sem cabo</h3><p>Baixa dependências, resolve pacotes e envia tudo sem fio para o Xbox via Device Portal.</p></article>
  <article><h3>Pacotes próprios</h3><p>Assistente para arquivos <code>.appx</code>, <code>.msix</code> e <code>.zip</code>, locais ou por URL, incluindo verificação de dependências.</p></article>
  <article><h3>Ferramentas de Dev Mode</h3><p>Captura de tela, informações do sistema, processos, rede e monitor de CPU, GPU e RAM em tempo real.</p></article>
  <article><h3>Arquivos e diagnósticos</h3><p>Explorador SSH/SFTP, logs, transferência de arquivos e integração com XRay para inspeção e Lua REPL.</p></article>
  <article><h3>USB preparado</h3><p>Assistente que detecta unidades e aplica permissões NTFS necessárias para mídia USB no Dev Mode.</p></article>
</div>

## Por que o catálogo do Emulation Revival importa

O catálogo é a ponte entre a comunidade e o console. XBVault usa os dados do [Emulation Revival](https://emulationrevival.github.io/) para apresentar emuladores, apps, ports e utilitários em uma interface única, sem substituir nem copiar o trabalho de curadoria deles.

<figure>
  <img src="{{ '/assets/images/posts/xb-homebrew-vault/browse.png' | relative_url }}" alt="Tela de catálogo do XB Homebrew Vault">
  <figcaption>Catálogo, filtros e detalhes de cada item antes da instalação.</figcaption>
</figure>

## Mais que instalar emulador

O foco começou na instalação de homebrew, mas o projeto foi crescendo. Hoje ele também ajuda a acompanhar o estado dos pacotes instalados, detectar atualização, fazer reinstalação e desinstalação sem ficar alternando entre telas do Device Portal.

<figure>
  <img src="{{ '/assets/images/posts/xb-homebrew-vault/tools.png' | relative_url }}" alt="Ferramentas de diagnóstico do XB Homebrew Vault">
  <figcaption>Painel de ferramentas: processos, rede, informações do sistema e desempenho.</figcaption>
</figure>

## Desktop e Android

O aplicativo compartilha a mesma base em .NET e Avalonia UI, mas atende dois jeitos de usar a coisa:

| Plataforma | O que esperar |
| --- | --- |
| Windows, macOS e Linux | Aplicativo desktop completo, builds self-contained e sem instalação obrigatória. |
| Android ARM64 | Interface pensada para tela vertical, conexão por QR code, catálogo, sideload, explorador de arquivos, logs, notificações e ferramentas no celular. |

<figure>
  <img src="{{ '/assets/images/posts/xb-homebrew-vault/android.png' | relative_url }}" alt="Versão Android do XB Homebrew Vault">
  <figcaption>XBVault no Android: o Xbox Dev Mode também cabe no bolso.</figcaption>
</figure>

## Versão atual: v2.0.7

A versão mais recente consolidou o fluxo de detalhes: ações agora mudam conforme conexão e estado do pacote. Sem Xbox conectado, o app pede conexão; pacote ausente mostra instalar; pacote atualizado mostra reinstalar ou remover; pacote defasado mostra atualização.

Também entraram correções importantes no fluxo de conexão, atualização de detalhes abertos, reinstalação/desinstalação, verificação pós-instalação e adaptação dos assistentes Android quando teclado virtual aparece. O release mantém builds para Windows x64 e ARM64, Linux x64 e ARM64, macOS Intel e Apple Silicon, além de APK Android ARM64.

Para quem gosta de conferir antes de executar, cada release publica checksums SHA-256 e resultados de análise no VirusTotal.

## Começando

1. Ative o Developer Mode no Xbox One ou Series S\|X.
2. Deixe Xbox e computador ou celular na mesma rede.
3. Baixe a versão adequada em [Releases](https://github.com/marcelofrau/xb-homebrew-vault/releases/latest).
4. Informe IP e credenciais do Dev Mode no assistente inicial.
5. Navegue pelo catálogo, escolha um item e instale.

O projeto é distribuído sob GPL-3.0 e continua evoluindo em público. Bugs, sugestões e contribuições podem ser acompanhados no [GitHub](https://github.com/marcelofrau/xb-homebrew-vault).

> XB Homebrew Vault não é afiliado à Microsoft, Xbox ou Emulation Revival. Use homebrew e dumps próprios dentro das leis aplicáveis na sua região.
