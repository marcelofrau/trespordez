---
image: /assets/images/posts/fxpak-pro-snes/001-1-1.png
image_alt: fxpak pro snes
title: "FXPAK Pro &#8211; SNES"
date: 2025-10-07 10:26:33 -03:00
author: the-archivist
categories: [moddding, retrogaming, reviews]
tags: []
description: "Acompanhando o desenvolvimento Depois de anos pesquisando e olhando minha lista de desejos, sempre via o SD2SNES lá, mas nunca tive coragem de desembolsar 100 euros num cartucho de SNES — o tão esperado item que me permitiria jogar 100% dos jogos no meu querido console que tenho desde criança. Lembro quando o SD2SNES ainda [&hellip;]"
wordpress_id: 1214
wordpress_url: https://trespordez.com.br/2025/10/fxpak-pro-snes/
wordpress_featured_image: https://trespordez.com.br/wp-content/uploads/2025/10/fx-pak-pro-thumb.jpg
---

<h2>Acompanhando o desenvolvimento</h2>

<p>Depois de anos pesquisando e olhando minha lista de desejos, sempre via o SD2SNES lá, mas nunca tive coragem de desembolsar 100 euros num cartucho de SNES — o tão esperado item que me permitiria jogar 100% dos jogos no meu querido console que tenho desde criança.</p>

<p>Lembro quando o SD2SNES ainda estava em desenvolvimento. Prometia rodar todos os jogos, inclusive os com chip Super FX e outros chips especiais presentes em alguns cartuchos que não podiam ser simplesmente copiados, já que traziam processadores dedicados dentro do próprio cartucho. Por isso, não era possível fazer reproduções fiéis desses jogos: esses chips eram proprietários e não existia produção ou revenda fora dos originais.</p>

<p>Por exemplo, o <strong>Yoshi’s Island</strong> usava um co-processador (DSP) que era inclusive mais rápido que a própria CPU do SNES, ajudando em cálculos de rotação, escalonamento de sprites e outras operações matemáticas complexas. Se essas tarefas fossem feitas apenas pela CPU principal, o jogo seria muito mais lento e travado.</p>

<p>Depois de muito acompanhar o projeto do SD2SNES, vi que ele se tornou algo realmente maduro. Com o tempo e várias revisões, o uso de um <strong>FPGA</strong> permitiu “recriar” os circuitos dos chips especiais dos cartuchos, tornando possível rodar 100% da biblioteca do SNES — com exceção de um único jogo: <em>Far East of Eden Zero</em>.</p>

<figure><img height="304" src="{{ '/assets/images/posts/fxpak-pro-snes/001-1-1.png' | relative_url }}" alt="" /></figure>

<h2>Mas o que é um FPGA?</h2>

<p>Em termos simples, um microchip — seja uma CPU ou microcontrolador — tem como função executar software: instruções, algoritmos, programas.<br>Um processador comum é um conjunto fixo de circuitos e transistores que executa instruções de código.</p>

<p>Já um <strong>FPGA (Field Programmable Gate Array)</strong> é diferente: em vez de rodar apenas software, ele pode <strong>reorganizar seus próprios circuitos internos</strong>. Ou seja, você pode literalmente “desenhar” o circuito que quiser, inclusive recriando o comportamento de outro processador ou até de um console inteiro.</p>

<p>No caso do <strong>SD2SNES (ou FXPak Pro)</strong>, o FPGA tem duas grandes funções:</p>

<ol>
<li><p>Recriar os chips especiais (Super FX, DSP, SA-1 etc.);</p></li>

<li><p>Fazer a ponte entre o cartão SD e o SNES, traduzindo os dados em tempo real como se fossem de um cartucho original.</p></li>
</ol>

<h2>Anos na lista de desejos</h2>

<p>Depois de anos, finalmente criei coragem. Pesquisei bastante e descobri que os modelos vendidos no AliExpress são equivalentes ao oficial, já que o projeto é <strong>open source</strong>.<br>O único fabricante oficialmente “abençoado” pelo criador é o próprio <strong>Krikzz</strong>, famoso pelos EverDrives. Mas, como o SD2SNES é aberto, há várias versões feitas por outros fabricantes — diferentemente dos EverDrives fechados, que geralmente são apenas cópias.</p>

<p>Outro projeto open source que está ganhando popularidade é o <strong>Summercart 64</strong> (para Nintendo 64), que também está na minha lista e deve ganhar um post futuro por aqui 😉</p>

<p>Aqui na Espanha, por sorte, as compras do AliExpress chegam rápido — em uma semana ou até menos.<br>Pra conter a ansiedade, preparei tudo antes da chegada: separei um cartão SD, coloquei o <em>fullset</em> de jogos e organizei minhas pastas com os favoritos. Assim que o pacote chegou, foi só conectar no meu SNES americano e ligar.</p>

<p>Tudo funcionou perfeitamente. O cartucho veio até com um SD já cheio de jogos, incluindo versões com suporte a <strong>MSU-1</strong> (áudio CD e vídeo FMV) e até de <strong>Super Game Boy</strong>.<br>Foi uma alegria ver <em>Star Fox</em>, <em>Super Mario RPG</em>, <em>Yoshi’s Island</em>, <em>Stunt FX</em> e <em>Mario Kart</em> rodando lisinhos, como nos cartuchos originais.</p>

<p>Notei apenas um ruído estranho em alguns jogos mais pesados. Suspeitei que fosse por causa da <strong>fonte</strong> (meu SNES americano usa 110V e aqui é 220V). Testei no meu SNES europeu — e o ruído sumiu.<br>Depois descobri que o problema também envolvia <strong>capacitores antigos</strong> do console. Acabei comprando um kit de recap e, aproveitando o embalo, fiz um <strong>mod de alimentação via USB-C</strong>, que permite usar fontes modernas e de melhor qualidade. Mais abaixo conto como foi essa parte.</p>

<p>A interface do SD2SNES é excelente — leitura instantânea, pastas organizadas, nomes completos de ROMs e save automático. Um salto enorme comparado ao meu antigo <strong>Super UFO</strong>, que tinha interface limitada, lentidão e formato de nomes 8.3.</p>

<h1>ROM Hacks e melhorias</h1>

<p>Coloquei várias ROMs modificadas pelo <strong>Vitor Vilela</strong>, que adaptou jogos clássicos para usar chips adicionais como o SA-1, melhorando muito o desempenho.<br>Jogos como <em>Super Mario World</em> e <em>Gradius III</em>, que sofriam com <em>slowdowns</em>, rodam agora com suavidade e fluidez. Alguns até ficaram mais desafiadores, já que a velocidade real aumentou!</p>

<h2>Traduções e hacks</h2>

<p>Outro prazer foi jogar títulos que nunca saíram no Ocidente, como <em>Tales of Phantasia</em> e <em>Star Ocean</em>, em versões traduzidas.<br>Sem contar os milhares de hacks de <em>Super Mario World</em>, com novas fases e modos de jogo. Aqui, o céu é o limite.</p>

<figure><img height="575" src="{{ '/assets/images/posts/fxpak-pro-snes/002-6-1024x575.jpg' | relative_url }}" alt="" /></figure>

<h1>Cheats</h1>

<p>O SD2SNES também permite usar <strong>cheat codes</strong>, como se fosse um Game Genie ou Pro Action Replay.<br>Dá pra ativar vidas infinitas em <em>Bubsy</em> (um alívio!), continues infinitos em <em>O Rei Leão</em>, e muito mais.<br>Esses recursos ajudam bastante a curtir jogos que sempre quis jogar, mas que antes eram frustrantes demais.</p>

<hr/>

<h1>MSU-1 (áudio e vídeo de CD)</h1>

<p>Pouca gente sabe, mas o SNES quase ganhou um leitor de CD em parceria com a Sony.<br>O projeto não foi pra frente (e daí nasceu o PlayStation!), mas o <strong>SD2SNES</strong> conseguiu recriar parte dessa experiência: suporte a <strong>trilhas de CD</strong> e <strong>vídeos FMV</strong> via MSU-1.<br>Existem dezenas de ROMs adaptadas com essas melhorias — ouvir <em>A Link to the Past</em> com trilha orquestrada é uma experiência incrível.</p>

<hr/>

<h1>Super Game Boy</h1>

<p>Também é possível jogar ROMs de <strong>Game Boy clássico</strong> diretamente, simulando o <strong>Super Game Boy</strong>.<br>Funciona perfeitamente, inclusive com jogos que têm bordas e cores especiais. É mais um bônus incrível.</p>

<figure>
<figure><img height="892" src="{{ '/assets/images/posts/fxpak-pro-snes/003-donkey-kong-super-game-boy-070-4144444792.png' | relative_url }}" alt="" /></figure>

<figure><img height="1024" src="{{ '/assets/images/posts/fxpak-pro-snes/004-gb-576x1024.jpg' | relative_url }}" alt="" /></figure>

<figure><img height="576" src="{{ '/assets/images/posts/fxpak-pro-snes/005-sgbfxpakthumbnail-2303215702-1024x576.jpg' | relative_url }}" alt="" /></figure>

<figure><img height="600" src="{{ '/assets/images/posts/fxpak-pro-snes/006-super-game-boy-snes.900x-3428360272.jpg' | relative_url }}" alt="" /></figure>
</figure>

<hr/>

<h1>Sensibilidade e energia</h1>

<p>Notei que o SD2SNES pode gerar ruído em consoles com <strong>fontes fracas ou reguladores antigos</strong>, especialmente em jogos com chips mais exigentes.<br>Se isso acontecer, troque a fonte ou faça um <strong>recap</strong> (substituição dos capacitores). No meu caso, resolveu completamente.</p>

<h2>Recap e PSU USB-C</h2>

<p>Como mencionei, meu SNES americano apresentava chiados.<br>Após testar o mod USB-C (que desativa a regulação interna e usa uma fonte moderna externa), o problema melhorou, mas não sumiu.<br>O criador do mod sugeriu o recap, e realmente — depois da troca de todos os capacitores, o console ficou perfeito.<br>Foi minha primeira experiência com componentes SMD, mas com as dicas do <strong>Adrian’s Digital Basement</strong> e outros canais, deu tudo certo.</p>

<figure>
<figure><img height="1024" src="{{ '/assets/images/posts/fxpak-pro-snes/007-recap-576x1024.jpg' | relative_url }}" alt="" /></figure>

<figure><img height="1024" src="{{ '/assets/images/posts/fxpak-pro-snes/008-2-576x1024.jpg' | relative_url }}" alt="" /></figure>

<figure><img height="1024" src="{{ '/assets/images/posts/fxpak-pro-snes/009-3-576x1024.jpg' | relative_url }}" alt="" /></figure>

<figure><img height="899" src="{{ '/assets/images/posts/fxpak-pro-snes/010-5-edited.jpg' | relative_url }}" alt="" /></figure>
</figure>

<hr/>

<h1>SD Cards e desempenho</h1>

<p>Para usar recursos como <strong>MSU-1 com FMV e áudio CD</strong>, é importante usar um <strong>cartão SD rápido e de marca confiável</strong>.<br>Nada exagerado — não precisa ser um SanDisk Extreme —, mas evite cartões genéricos.<br>O menu do SD2SNES tem até um <strong>teste de velocidade</strong> pra confirmar se o cartão está dentro do recomendado.</p>

<hr/>

<h1>Open Source e comunidade</h1>

<p>Por ser open source, o SD2SNES tem uma comunidade muito ativa.<br>O firmware chegou até a versão <strong>1.11.0</strong>, considerada estável e completa, mas nada impede que surjam novas atualizações.<br>Mais informações:</p>

<ul>
<li><p>Site oficial: <a href="https://sd2snes.de/blog/" target="_new" rel="noopener">https://sd2snes.de/blog/</a></p></li>

<li>GitHub: <a href="https://github.com/mrehkopf/sd2snes" target="_new" rel="noopener">https://github.com/mrehkopf/sd2snes</a></li>
</ul>

<h1>Temas e personalização</h1>

<p>É possível personalizar o menu do SD2SNES com temas, cores e imagens.<br>Fiz o meu próprio tema em poucos minutos usando a ferramenta oficial no site:<br>👉 <a href="https://sd2snes.de/themes/" target="_new" rel="noopener">https://sd2snes.de/themes/</a></p>

<figure>
<figure><img height="448" src="{{ '/assets/images/posts/fxpak-pro-snes/011-sd2snes-metroid-menu-2162771721-1.jpg' | relative_url }}" alt="" /></figure>

<figure><img height="437" src="{{ '/assets/images/posts/fxpak-pro-snes/012-sd2snes-641638078-1.jpg' | relative_url }}" alt="" /></figure>

<figure><img height="448" src="{{ '/assets/images/posts/fxpak-pro-snes/013-sfcsd2snes-1.png' | relative_url }}" alt="" /></figure>

<figure><img height="448" src="{{ '/assets/images/posts/fxpak-pro-snes/014-smas.png' | relative_url }}" alt="" /></figure>

<figure><img height="448" src="{{ '/assets/images/posts/fxpak-pro-snes/015-snesclassiceu.png' | relative_url }}" alt="" /></figure>

<figure><img height="448" src="{{ '/assets/images/posts/fxpak-pro-snes/016-som.png' | relative_url }}" alt="" /></figure>

<figure><img height="448" src="{{ '/assets/images/posts/fxpak-pro-snes/017-stars.png' | relative_url }}" alt="" /></figure>

<figure><img height="448" src="{{ '/assets/images/posts/fxpak-pro-snes/018-us1.png' | relative_url }}" alt="" /></figure>
</figure>

<h1>Conclusão</h1>

<p>Foi uma compra excelente.<br>O <strong>FXPak Pro</strong> é uma verdadeira mão na roda e permite explorar todo o potencial do SNES — inclusive com MSU, cheats, hacks e traduções.<br>É um investimento alto, mas pra quem ama o console, vale cada centavo.<br>Agora sim posso dizer que tenho o SNES definitivo!</p>

<h2>Onde comprar?</h2>

<p>Deixo aqui o link exatamente do que eu comprei e usei pra fazer o review nessa pagina. Se quiserem posso postar videos e entrar mais a fundo e detalhar como funciona e quais recursos estao disponiveis.</p>

<p><a href="https://s.click.aliexpress.com/e/_c3Su8OND" target="_blank" rel="noopener"><img src="//ae01.alicdn.com/kf/Sf471b0c09a214ac8a55e7b5a1ee2f65fK.png_140x140.png">Veja no aliexpress o FX Pak Pro</a></p>

