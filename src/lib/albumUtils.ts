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
        img.onerror = (_err) => reject(new Error(`Falha ao carregar imagem: ${src.substring(0, 50)}...`));
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
        throw new Error('Não foi possível obter o contexto 2D do canvas');
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
    const grid = { 
        cols: 2, 
        rows: Math.ceil(imagesWithDecades.length / 2)  // Ajusta o número de linhas conforme necessário
    };

    // Aumentar o preenchimento para criar mais espaço entre os polaroids
    const padding = 30;
    const contentTopMargin = 100;  // Reduzir a margem superior
    const contentHeight = canvasHeight - contentTopMargin - 50;  // Deixar espaço para o rodapé

    // Aumentar o tamanho dos polaroids
    const cellWidth = (canvasWidth - padding * (grid.cols + 1)) / grid.cols;
    const cellHeight = contentHeight / grid.rows;

    // Ajustar a proporção do polaroid
    const polaroidAspectRatio = 1.2;  // Ligeiramente mais alto que largo
    let polaroidWidth = cellWidth * 0.95;  // Usar mais da largura da célula
    let polaroidHeight = polaroidWidth * polaroidAspectRatio;

    // Garantir que o polaroid caiba na altura da célula
    if (polaroidHeight > cellHeight * 0.9) {
        polaroidHeight = cellHeight * 0.9;
        polaroidWidth = polaroidHeight / polaroidAspectRatio;
    }

    // Ajustar o contêiner da imagem dentro do polaroid
    const imageContainerWidth = polaroidWidth * 0.9;
    const imageContainerHeight = imageContainerWidth * 0.8;  // Mais largo que alto
    
    // Calcular o deslocamento horizontal para centralizar
    const horizontalOffset = (canvasWidth - (polaroidWidth * grid.cols + padding * (grid.cols - 1))) / 2;

    // Inverte a ordem de desenho: desenhe as linhas inferiores primeiro para que as linhas superiores sejam renderizadas em cima
    const reversedImages = [...imagesWithDecades].reverse();
    reversedImages.forEach(({ decade, img }, reversedIndex) => {
        // Calcula o índice original para determinar a posição na grade
        const index = imagesWithDecades.length - 1 - reversedIndex;

        const row = Math.floor(index / grid.cols);
        const col = index % grid.cols;

        // Calcula a posição do canto superior esquerdo do polaroid com o deslocamento horizontal
        const x = col * (polaroidWidth + padding) + padding + horizontalOffset;
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
        
        // Calcula as dimensões da imagem para preencher melhor o container
        const aspectRatio = img.naturalWidth / img.naturalHeight;
        
        // Aumentar o tamanho da imagem para preencher mais o container
        const scale = 1.2; // Fator de escala para aumentar a imagem
        let drawWidth = imageContainerWidth * scale;
        let drawHeight = drawWidth / aspectRatio;

        // Se a altura ultrapassar o container, ajusta pela altura
        if (drawHeight > imageContainerHeight * scale) {
            drawHeight = imageContainerHeight * scale;
            drawWidth = drawHeight * aspectRatio;
        }

        // Calcula a posição para a imagem, deslocando para baixo
        const imageAreaTopMargin = (polaroidWidth - imageContainerWidth) / 2;
        // Aumenta o deslocamento vertical para baixar a imagem (aumentado de 0.5 para 0.6)
        const verticalOffset = polaroidHeight * 0.1;
        const imageContainerY = -polaroidHeight / 2 + imageAreaTopMargin + verticalOffset;
        
        // Centraliza a imagem horizontalmente e ajusta o posicionamento vertical
        const imgX = -drawWidth / 2;
        // Remove o ajuste negativo e mantém o alinhamento vertical central
        const imgY = imageContainerY + (imageContainerHeight - drawHeight) / 2;
        
        ctx.drawImage(img, imgX, imgY, drawWidth, drawHeight);
        
        // Desenha a legenda escrita à mão
        ctx.fillStyle = '#222';
        ctx.font = `60px 'Permanent Marker', cursive`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Ajusta a posição vertical do texto para ficar mais abaixo na moldura
        const captionAreaTop = -polaroidHeight / 2 + polaroidHeight * 0.85; // Aumentado de 0.8 para 0.85
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