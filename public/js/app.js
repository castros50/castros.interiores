(function () {
  function travarBotoes(form) {
    const botoes = form.querySelectorAll('button[type="submit"], button:not([type])');
    botoes.forEach(function (b) {
      if (b.disabled) return;
      b.disabled = true;
      b.dataset.textoOriginal = b.innerHTML;
      b.innerHTML = '<span class="spinner"></span> Enviando...';
    });
    const carregando = form.querySelector('.carregando');
    if (carregando) carregando.classList.add('ativo');
  }

  function destravarBotoes(form) {
    const botoes = form.querySelectorAll('button[type="submit"], button:not([type])');
    botoes.forEach(function (b) {
      if (b.dataset.textoOriginal) {
        b.innerHTML = b.dataset.textoOriginal;
        b.disabled = false;
      }
    });
    const carregando = form.querySelector('.carregando');
    if (carregando) carregando.classList.remove('ativo');
  }

  // Confirmação simples para ações destrutivas + trava de duplo clique.
  document.addEventListener('submit', function (ev) {
    const form = ev.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (form.dataset.confirmar && !window.confirm(form.dataset.confirmar)) {
      ev.preventDefault();
      return;
    }
    if (form.dataset.noLock === '1') return;
    travarBotoes(form);

    // Envio de fotos com barra de progresso real e nova tentativa em caso de falha,
    // sem perder os arquivos já selecionados pelo usuário.
    if (form.dataset.upload === '1') {
      ev.preventDefault();
      const xhr = new XMLHttpRequest();
      xhr.open(form.method || 'POST', form.action, true);
      xhr.upload.onprogress = function (e) {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          const barra = form.querySelector('.progresso > div');
          if (barra) barra.style.width = pct + '%';
        }
      };
      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 400) {
          window.location = xhr.responseURL || window.location.href;
        } else {
          window.alert('Falha ao enviar as fotos. Os arquivos selecionados não foram perdidos — tente enviar novamente.');
          destravarBotoes(form);
        }
      };
      xhr.onerror = function () {
        window.alert('Falha de conexão ao enviar as fotos. Tente novamente — nada foi perdido.');
        destravarBotoes(form);
      };
      xhr.send(new FormData(form));
    }
  });

  // Lightbox simples para ampliar fotos.
  document.addEventListener('click', function (ev) {
    const img = ev.target.closest('[data-ampliar]');
    if (img) {
      const box = document.getElementById('lightbox');
      const boxImg = document.getElementById('lightbox-img');
      if (box && boxImg) {
        boxImg.src = img.getAttribute('src');
        box.classList.add('ativo');
      }
    }
    if (ev.target.id === 'lightbox') {
      ev.target.classList.remove('ativo');
    }
  });

  // Pré-visualização de miniaturas antes do envio + contador de arquivos escolhidos.
  document.addEventListener('change', function (ev) {
    const input = ev.target;
    if (input.matches('input[type="file"][data-preview]')) {
      const alvo = document.querySelector(input.getAttribute('data-preview'));
      if (!alvo) return;
      alvo.innerHTML = '';
      const arquivos = Array.from(input.files || []);
      const contador = document.querySelector(input.getAttribute('data-contador') || '');
      if (contador) contador.textContent = arquivos.length ? (arquivos.length + ' foto(s) selecionada(s)') : '';
      arquivos.forEach(function (file) {
        const url = URL.createObjectURL(file);
        const div = document.createElement('div');
        div.className = 'foto-card';
        div.innerHTML = '<img src="' + url + '" alt="pré-visualização"><div class="legenda">' + file.name + '</div>';
        alvo.appendChild(div);
      });
    }
  });

  // Botão de microfone (ditar por voz) — Web Speech API, só no navegador, nada é enviado
  // ao servidor como áudio: o reconhecimento já devolve texto, que só preenche o campo.
  document.addEventListener('click', function (ev) {
    const botao = ev.target.closest('[data-mic-alvo]');
    if (!botao) return;
    const Reconhecimento = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Reconhecimento) {
      window.alert('Este navegador não tem suporte a reconhecimento de voz. Use Chrome ou Edge, ou digite a mensagem.');
      return;
    }
    const alvo = document.querySelector(botao.getAttribute('data-mic-alvo'));
    if (!alvo || botao.dataset.gravando === '1') return;

    botao.dataset.gravando = '1';
    const textoOriginalBotao = botao.innerHTML;
    botao.innerHTML = '🔴 Ouvindo...';

    const rec = new Reconhecimento();
    rec.lang = 'pt-BR';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = function (e) {
      const texto = e.results[0][0].transcript;
      alvo.value = (alvo.value ? alvo.value.trim() + ' ' : '') + texto;
      alvo.focus();
    };
    rec.onerror = function () {
      window.alert('Não foi possível captar o áudio. Tente novamente ou digite a mensagem.');
    };
    rec.onend = function () {
      botao.dataset.gravando = '0';
      botao.innerHTML = textoOriginalBotao;
    };
    rec.start();
  });

  // Botão "Copiar texto" (ex.: sugestão de mensagem dos agentes).
  document.addEventListener('click', function (ev) {
    const botao = ev.target.closest('[data-copiar-alvo]');
    if (!botao) return;
    const alvo = document.querySelector(botao.getAttribute('data-copiar-alvo'));
    if (!alvo) return;
    const texto = alvo.innerText || alvo.textContent || '';
    navigator.clipboard.writeText(texto).then(function () {
      const original = botao.innerHTML;
      botao.innerHTML = 'Copiado!';
      setTimeout(function () { botao.innerHTML = original; }, 2000);
    }).catch(function () { /* ignorar falha de permissão de clipboard */ });
  });

})();
