// Fotos tiradas direto da câmera do celular (via <input capture="environment">) saem em
// resolução total do sensor — muitas vezes 4 a 15MB. Enviadas assim, cru, pra leitura por
// IA (Anthropic), estouram o limite de tamanho de imagem da própria API e a rota devolve um
// erro genérico ("Erro ao ler..."), sem pista nenhuma pro usuário do que realmente houve.
// Esta função redimensiona no próprio navegador (canvas) antes de converter pra data URL,
// mantendo nitidez suficiente pra leitura de texto (cupom, ficha) com um arquivo bem menor.
export async function compressImageToDataUrl(
  file: File,
  maxDimension = 2000,
  quality = 0.86
): Promise<string> {
  try {
    const objectUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('Não foi possível carregar a imagem selecionada.'));
        el.src = objectUrl;
      });

      const scale = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight));
      const width = Math.round(img.naturalWidth * scale);
      const height = Math.round(img.naturalHeight * scale);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas indisponível neste navegador.');
      ctx.drawImage(img, 0, 0, width, height);

      // Reduz a qualidade progressivamente só se ainda assim o arquivo continuar grande
      // (ex.: foto com muito detalhe) — nunca mais que 3 tentativas, pra não travar a tela.
      let q = quality;
      let dataUrl = canvas.toDataURL('image/jpeg', q);
      for (let attempt = 0; attempt < 3 && dataUrl.length > 4 * 1024 * 1024; attempt++) {
        q = Math.max(0.5, q - 0.15);
        dataUrl = canvas.toDataURL('image/jpeg', q);
      }
      return dataUrl;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    // Nunca bloqueia o envio por causa da compressão — se algo falhar, manda o arquivo
    // original e deixa o back-end (ou a própria API de IA) reportar o problema real.
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
