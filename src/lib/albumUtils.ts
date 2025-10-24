/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
// Função auxiliar para carregar uma imagem e retornar como um HTMLImageElement
function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        // Configure crossOrigin para operações de canvas, mesmo com URLs de dados
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = (_err) => reject(new Error(`Failed to load image: ${src.substring(0, 50)}...`));
        img.src = src;
    });
}

/**
 * Cria uma única página de álbum de fotos a partir de uma coleção de imagens de década.
 * @param imageData Um registro que mapeia strings de década para suas URLs de dados de imagem.
 * @returns Uma promessa que resolve para uma URL de dados da página do álbum gerada (formato JPEG).
 */
export async function createAlbumPage(imageData: Record<string, string>): Promise<string> {
    const canvas = document.createElement('canvas');
    // Canvas de alta resolução para qualidade boa (razão de proporção A4)
    const canvasWidth = 2480;
    const canvasHeight = 3508;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Could not get 2D canvas context');
    }

    // 1. Desenha o fundo da página do álbum
    ctx.fillStyle = '#f3e8d2ff'; // Uma cor quente, como uma folha de papel
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 2. Desenha o título
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.font = `bold 150px 'Caveat', cursive`;
    ctx.fillText('Viagem ao Passado', canvasWidth / 2, 150);

    // 3. Carrega todas as imagens de polaroid de forma concorrente
    const decades = Object.keys(imageData);
    const loadedImages = await Promise.all(
        Object.values(imageData).map(url => loadImage(url))
    );

    const imagesWithDecades = decades.map((decade, index) => ({
        decade,
        img: loadedImages[index],
    }));

    // 4. Define a grid layout e desenha cada polaroid
    const grid = { cols: 2, rows: 4 };
    const padding = 10; // Reduzir o espaçamento entre os polaoids
    const contentTopMargin = 350; // Aumentar o espaçamento superior para melhor espaçamento
    const contentHeight = canvasHeight - contentTopMargin;
    
    //Calcula as dimensões da célula com uma margem reduzida
    const cellWidth = (canvasWidth - padding * (grid.cols + 1)) / grid.cols;
    const cellHeight = contentHeight / grid.rows;

    //Calcula as dimensões do polaroid para caber dentro da célula com uma margem
    const polaroidAspectRatio = 1.2; // A altura do polaroid é 1.2 vezes a largura
    const maxPolaroidWidth = cellWidth * 0.95; // Use mais da largura da célula
    const maxPolaroidHeight = cellHeight * 0.9;

    let polaroidWidth = maxPolaroidWidth;
    let polaroidHeight = polaroidWidth * polaroidAspectRatio;

    if (polaroidHeight > maxPolaroidHeight) {
        polaroidHeight = maxPolaroidHeight;
        polaroidWidth = polaroidHeight / polaroidAspectRatio;
    }

    const imageContainerWidth = polaroidWidth * 0.9;
    const imageContainerHeight = imageContainerWidth; //Área de foto clássica

    // Inverte a ordem de desenho: desenhe as linhas inferiores primeiro para que as linhas superiores sejam renderizadas em cima
    const reversedImages = [...imagesWithDecades].reverse();
    reversedImages.forEach(({ decade, img }, reversedIndex) => {
        // Calcula o índice original para determinar a posição na grade
        const index = imagesWithDecades.length - 1 - reversedIndex;

        const row = Math.floor(index / grid.cols);
        const col = index % grid.cols;

        // Calcula o canto superior esquerdo do polaroid dentro de sua célula de grade
        const x = padding + (cellWidth + padding) * col + (cellWidth - polaroidWidth) / 2;
        const y = contentTopMargin + cellHeight * row + (cellHeight - polaroidHeight) / 2;
        
        ctx.save();
        
        // Translada o contexto para o centro do polaroid para a rotação
        ctx.translate(x + polaroidWidth / 2, y + polaroidHeight / 2);
        
        // Aplica uma rotação muito leve, aleatória para um visual natural
        const rotation = (Math.random() - 0.5) * 0.05; // Redução de rotação para um visual mais limpo
        ctx.rotate(rotation);
        
        // Desenha uma sombra suave
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 5;
        
        // Desenha o frame do polaroid branco com uma borda suave (centralizado na nova origem)
        ctx.fillStyle = '#fff';
        ctx.fillRect(-polaroidWidth / 2, -polaroidHeight / 2, polaroidWidth, polaroidHeight);
        
        // Adiciona uma borda suave
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 2;
        ctx.strokeRect(-polaroidWidth / 2, -polaroidHeight / 2, polaroidWidth, polaroidHeight);
        
        // Remover a sombra para desenhar subsequentemente
        ctx.shadowColor = 'transparent';
        
        // Calcula as dimensões da imagem para caber dentro da área do container mantendo a proporção
        const aspectRatio = img.naturalWidth / img.naturalHeight;
        let drawWidth = imageContainerWidth;
        let drawHeight = drawWidth / aspectRatio;

        if (drawHeight > imageContainerHeight) {
            drawHeight = imageContainerHeight;
            drawWidth = drawHeight * aspectRatio;
        }

        // Calcula a posição para centralizar a imagem dentro da área do container
        const imageAreaTopMargin = (polaroidWidth - imageContainerWidth) / 2;
        const imageContainerY = -polaroidHeight / 2 + imageAreaTopMargin;
        
        const imgX = -drawWidth / 2; // Centraliza horizontalmente devido à tradução do contexto
        const imgY = imageContainerY + (imageContainerHeight - drawHeight) / 2;
        
        ctx.drawImage(img, imgX, imgY, drawWidth, drawHeight);
        
        // Desenha a legenda escrita à mão
        ctx.fillStyle = '#222';
        ctx.font = `60px 'Permanent Marker', cursive`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const captionAreaTop = imageContainerY + imageContainerHeight;
        const captionAreaBottom = polaroidHeight / 2;
        const captionY = captionAreaTop + (captionAreaBottom - captionAreaTop) / 2;

        ctx.fillText(decade, 0, captionY);
        
        ctx.restore(); // Restaura o contexto para o estado pré-transformação
    });




    // Add a semi-transparent background
ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
ctx.fillRect(canvasWidth - 200, canvasHeight - 40, 180, 30);

// Add the text
ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
ctx.font = 'bold 28px Arial';
ctx.textAlign = 'right';
ctx.textBaseline = 'middle';
ctx.fillText('© ' + new Date().getFullYear() + ' - Xani', canvasWidth - 20, canvasHeight - 25);

    // Converte o canvas para uma imagem JPEG de alta qualidade e retorna a URL de dados
    return canvas.toDataURL('image/jpeg', 0.9);
}