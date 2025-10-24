/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useState, type ChangeEvent, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { generateDecadeImage } from './services/geminiService';
import PolaroidCard from './components/PolaroidCard';
import { createAlbumPage } from './lib/albumUtils';
import Footer from './components/Footer';

//const DECADES = ['1840', '1880', '1900', '1920', '1940', '1960', '1970', '1980', '1990', '2000', '2020', '2040'];
const DECADES = ['1800', '1840','1920', '1950', '1960', '1970', '1980', '1990','2000'];

// Posições otimizadas para 12 fotos em 4 linhas de 3 colunas
const POSITIONS = [
    // Primeira linha (topo)
    { top: '1%', left: '1%', rotate: -10 },
    { top: '2%', left: '45%', rotate: 5 },
    { top: '1%', left: '90%', rotate: 11 },
    
    // Segunda linha (meio superior)
    { top: '20%', left: '8%', rotate: 8 },
    { top: '10%', left: '28%', rotate: -3 },
    { top: '15%', left: '70%', rotate: -8 },
    
    // Terceira linha (meio inferior)
    { top: '35%', left: '17%', rotate: -3 },
    { top: '29%', left: '50%', rotate: 4 },
    { top: '28%', left: '90%', rotate: 14 },
    
    // Quarta linha (base)
    { top: '55%', left: '25%', rotate: 12 },
    { top: '55%', left: '60%', rotate: 0 },
    { top: '55%', left: '0%', rotate: 3 }
];

// Configuração otimizada para as animações dos polaroides fantasmas
const GHOST_POLAROIDS_CONFIG = [
    // Canto superior esquerdo
    { initial: { x: "-100%", y: "-100%", rotate: -15 }, transition: { delay: 0.1 } },
    // Canto superior direito
    { initial: { x: "100%", y: "-100%", rotate: 15 }, transition: { delay: 0.2 } },
    // Canto inferior esquerdo
    { initial: { x: "-100%", y: "100%", rotate: -10 }, transition: { delay: 0.3 } },
    // Canto inferior direito
    { initial: { x: "100%", y: "100%", rotate: 10 }, transition: { delay: 0.4 } },
    // Lados
    { initial: { x: "0%", y: "-100%", rotate: -5 }, transition: { delay: 0.2 } },
    { initial: { x: "0%", y: "100%", rotate: 5 }, transition: { delay: 0.3 } },
    { initial: { x: "-100%", y: "0%", rotate: -8 }, transition: { delay: 0.4 } },
    { initial: { x: "100%", y: "0%", rotate: 8 }, transition: { delay: 0.5 } },
    // Diagonais
    { initial: { x: "-100%", y: "-100%", rotate: -20 }, transition: { delay: 0.6 } },
    { initial: { x: "100%", y: "-100%", rotate: 20 }, transition: { delay: 0.7 } }
];


type ImageStatus = 'pending' | 'done' | 'error';
interface GeneratedImage {
    status: ImageStatus;
    url?: string;
    error?: string;
}



const primaryButtonClasses = "font-permanent-marker text-lg text-center text-white bg-[#D2691E] py-3 px-8 rounded-sm transform transition-all duration-200 hover:scale-105 hover:-rotate-1 hover:bg-[#C25A1A] shadow-[3px_3px_0px_rgba(0,0,0,0.3)]";
const secondaryButtonClasses = "font-permanent-marker text-lg text-center text-[#5A4A3E] bg-[#F8F4E3] border-2 border-[#5A4A3E] py-3 px-8 rounded-sm transform transition-all duration-200 hover:scale-105 hover:rotate-1 hover:bg-[#FCF8EC] shadow-[2px_2px_0px_rgba(0,0,0,0.2)]";

const useMediaQuery = (query: string) => {
    const [matches, setMatches] = useState(false);
    useEffect(() => {
        const media = window.matchMedia(query);
        if (media.matches !== matches) {
            setMatches(media.matches);
        }
        const listener = () => setMatches(media.matches);
        window.addEventListener('resize', listener);
        return () => window.removeEventListener('resize', listener);
    }, [matches, query]);
    return matches;
};

function App() {
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [generatedImages, setGeneratedImages] = useState<Record<string, GeneratedImage>>({});
    const [_isLoading, setIsLoading] = useState<boolean>(false);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [appState, setAppState] = useState<'idle' | 'image-uploaded' | 'generating' | 'results-shown'>('idle');
    const isMobile = useMediaQuery('(max-width: 768px)');
    const dragAreaRef = useRef<HTMLDivElement>(null);


    const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setUploadedImage(reader.result as string);
                setAppState('image-uploaded');
                setGeneratedImages({}); // Clear previous results
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerateClick = async () => {
        if (!uploadedImage) return;

        setIsLoading(true);
        setAppState('generating');
        
        const initialImages: Record<string, GeneratedImage> = {};
        DECADES.forEach(decade => {
            initialImages[decade] = { status: 'pending' };
        });
        setGeneratedImages(initialImages);

        const concurrencyLimit = 2; // Processar duas décadas por vez
        const decadesQueue = [...DECADES];

        const processDecade = async (decade: string) => {
            try {
                const prompt = `Reimagine the person in this photo in the style of the ${decade}. This includes clothing, hairstyle, photo quality, and the overall aesthetic of that decade. The output must be a photorealistic image showing the person clearly.`;
                const resultUrl = await generateDecadeImage(uploadedImage, prompt);
                setGeneratedImages(prev => ({
                    ...prev,
                    [decade]: { status: 'done', url: resultUrl },
                }));
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "Um erro inesperado ocorreu.";
                setGeneratedImages(prev => ({
                    ...prev,
                    [decade]: { status: 'error', error: errorMessage },
                }));
                console.error(`Falha ao gerar imagem para ${decade}:`, err);
            }
        };

        const workers = Array(concurrencyLimit).fill(null).map(async () => {
            while (decadesQueue.length > 0) {
                const decade = decadesQueue.shift();
                if (decade) {
                    await processDecade(decade);
                }
            }
        });

        await Promise.all(workers);

        setIsLoading(false);
        setAppState('results-shown');
    };

    const handleRegenerateDecade = async (decade: string) => {
        if (!uploadedImage) return;

        // Prevenir a re-geração se uma geração já estiver em progresso
        if (generatedImages[decade]?.status === 'pending') {
            return;
        }
        
        console.log(`Regenerar imagem para ${decade}...`);

        // Colocar a década em estado 'pending' para mostrar o spinner de carregamento
        setGeneratedImages(prev => ({
            ...prev,
            [decade]: { status: 'pending' },
        }));

        // Chamar o serviço de geração para a década específica
        try {
            const prompt = `Reimagine the person in this photo in the style of the ${decade}. This includes clothing, hairstyle, photo quality, and the overall aesthetic of that decade. The output must be a photorealistic image showing the person clearly.`;
            const resultUrl = await generateDecadeImage(uploadedImage, prompt);
            setGeneratedImages(prev => ({
                ...prev,
                [decade]: { status: 'done', url: resultUrl },
            }));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Um erro inesperado ocorreu.";
            setGeneratedImages(prev => ({
                ...prev,
                [decade]: { status: 'error', error: errorMessage },
            }));
            console.error(`Falha ao gerar imagem para ${decade}:`, err);
        }
    };
    
    const handleReset = () => {
        setUploadedImage(null);
        setGeneratedImages({});
        setAppState('idle');
    };

    const handleDownloadIndividualImage = (decade: string) => {
        const image = generatedImages[decade];
        if (image?.status === 'done' && image.url) {
            const link = document.createElement('a');
            link.href = image.url;
            link.download = `past-forward-${decade}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleDownloadAlbum = async () => {
        setIsDownloading(true);
        try {
            const imageData = Object.entries(generatedImages)
                .filter(([, image]) => {
                    const img = image as GeneratedImage;
                    return img.status === 'done' && img.url;
                })
                .reduce((acc, [decade, image]) => {
                    const img = image as GeneratedImage;
                    acc[decade] = img.url!;
                    return acc;
                }, {} as Record<string, string>);

            if (Object.keys(imageData).length < DECADES.length) {
                alert("Por favor, aguarde todas as imagens terminarem de serem geradas antes de baixar o álbum.");
                return;
            }

            const albumDataUrl = await createAlbumPage(imageData);

            const link = document.createElement('a');
            link.href = albumDataUrl;
            link.download = 'CemAnosDeFotos.jpg';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error("Erro ao criar ou baixar álbum:", error);
            alert("Desculpe, houve um erro ao criar seu álbum. Por favor, tente novamente.");
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <main className="bg-[#F8F4E3] text-[#5A4A3E] min-h-screen w-full flex flex-col items-center justify-center p-4 pb-24 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-full opacity-5" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'100\' height=\'100\' fill=\'%235A4A3E\' filter=\'url(%23noise)\' /%3E%3C/svg%3E")'}}></div>
            
            <div className="z-10 flex flex-col items-center justify-center w-full h-full flex-1 min-h-0">
                <div className="text-center mb-10">
                    <h1 className="text-6xl md:text-8xl font-caveat font-bold text-[#5A4A3E]">Linha do Tempo</h1>
                </div>

                {appState === 'idle' && (
                     <div className="relative flex flex-col items-center justify-center w-full">
                        {/* Polaroid fantasma para animação de introdução */}
                        {GHOST_POLAROIDS_CONFIG.map((config, index) => (
                             <motion.div
                                key={index}
                                className="absolute w-80 h-[26rem] rounded-md p-4 bg-[#FCF8EC]/20 blur-sm"
                                initial={config.initial}
                                animate={{
                                    x: "0%", y: "0%", rotate: (Math.random() - 0.5) * 20,
                                    scale: 0,
                                    opacity: 0,
                                }}
                                transition={{
                                    ...config.transition,
                                    ease: "circOut",
                                    duration: 2,
                                }}
                            />
                        ))}
                        <motion.div
                             initial={{ opacity: 0, scale: 0.8 }}
                             animate={{ opacity: 1, scale: 1 }}
                             transition={{ delay: 2, duration: 0.8, type: 'spring' }}
                             className="flex flex-col items-center"
                        >
                            <label htmlFor="file-upload" className="cursor-pointer group transform hover:scale-105 transition-transform duration-300">
                                 <PolaroidCard 
                                     caption="Click"
                                     status="done"
                                 />
                            </label>
                            <input id="file-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleImageUpload} />
                            
                        </motion.div>
                    </div>
                )}

                {appState === 'image-uploaded' && uploadedImage && (
                    <div className="flex flex-col items-center gap-6">
                         <PolaroidCard 
                            imageUrl={uploadedImage} 
                            caption="A tua foto" 
                            status="done"
                         />
                         <div className="flex items-center gap-4 mt-4">
                            <button onClick={handleReset} className={secondaryButtonClasses}>
                                Outra foto
                            </button>
                            <button onClick={handleGenerateClick} className={primaryButtonClasses}>
                                Gerar
                            </button>
                         </div>
                    </div>
                )}

                {(appState === 'generating' || appState === 'results-shown') && (
                     <>
                        {isMobile ? (
                            <div className="w-full max-w-sm flex-1 overflow-y-auto mt-4 space-y-8 p-4">
                                {DECADES.map((decade) => (
                                    <div key={decade} className="flex justify-center">
                                         <PolaroidCard
                                            caption={decade}
                                            status={generatedImages[decade]?.status || 'pending'}
                                            imageUrl={generatedImages[decade]?.url}
                                            error={generatedImages[decade]?.error}
                                            onShake={handleRegenerateDecade}
                                            onDownload={handleDownloadIndividualImage}
                                            isMobile={isMobile}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div ref={dragAreaRef} className="relative w-full max-w-5xl h-[600px] mt-4">
                                {DECADES.map((decade, index) => {
                                    const { top, left, rotate } = POSITIONS[index];
                                    return (
                                        <motion.div
                                            key={decade}
                                            className="absolute cursor-grab active:cursor-grabbing"
                                            style={{ top, left }}
                                            initial={{ opacity: 0, scale: 0.5, y: 100, rotate: 0 }}
                                            animate={{ 
                                                opacity: 1, 
                                                scale: 1, 
                                                y: 0,
                                                rotate: `${rotate}deg`,
                                            }}
                                            transition={{ type: 'spring', stiffness: 100, damping: 20, delay: index * 0.15 }}
                                        >
                                            <PolaroidCard 
                                                // In App.tsx, when using the ref
                                                dragConstraintsRef={dragAreaRef as React.RefObject<HTMLElement>}
                                                caption={decade}
                                                status={generatedImages[decade]?.status || 'pending'}
                                                imageUrl={generatedImages[decade]?.url}
                                                error={generatedImages[decade]?.error}
                                                onShake={handleRegenerateDecade}
                                                onDownload={handleDownloadIndividualImage}
                                                isMobile={isMobile}
                                            />
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                         <div className="h-20 mt-4 flex items-center justify-center">
                            {appState === 'results-shown' && (
                                <div className="flex flex-col sm:flex-row items-center gap-4">
                                    <button 
                                        onClick={handleDownloadAlbum} 
                                        disabled={isDownloading} 
                                        className={`${primaryButtonClasses} disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        {isDownloading ? 'Criar o Album...' : 'Criar o Album'}
                                    </button>
                                    <button onClick={handleReset} className={secondaryButtonClasses}>
                                        Começar de novo
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
            <Footer />
        </main>
    );
}

export default App;