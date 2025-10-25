/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const REMIX_IDEAS = [
    "colocate no colegio Ribadouro nos anos 90.",
    "recria a tua foto com diferentes cabelos",
    "transforma o teu cão num desenho animado",
    "criar uma versão fantasia de ti.",
    "criar um super herói baseado na tua foto.",
    "coloca-te em eventos históricos famosos.",
    "gerar um avatar de jogo de vídeo personalizado.",
];

const Footer = () => {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const intervalId = setInterval(() => {
            setIndex(prevIndex => (prevIndex + 1) % REMIX_IDEAS.length);
        }, 3500); //Altera o texto a cada 3.5 seconds 

        return () => clearInterval(intervalId);
    }, []);

    return (
        <footer className="fixed bottom-0 left-0 right-0 backdrop-blur-sm p-3 z-50 text-neutral-300 text-xs sm:text-sm border-t border-white/10">
            <div className="max-w-screen-xl mx-auto flex justify-between items-center gap-4 px-4">
                {/* Left Side */}
                <div className="hidden md:flex items-center gap-4 text-neutral-500 whitespace-nowrap">
                    <p>Power By AI</p>
                    <span className="text-neutral-700" aria-hidden="true">|</span>
                    <p>
                        Desenvolvida por{' '}
                        <a
                            href="https:/xani.me"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-orange-500 hover:text-green-500 transition-colors duration-200"
                        >
                            Xani 
                        </a>
                    </p>
                </div>

{/* Right Side */}
                <div className="flex-grow flex justify-end items-center gap-4 sm:gap-6">
                    <div className="hidden lg:flex items-center gap-2 text-neutral-500 text-right min-w-0">
                        <span className="flex-shrink-0">Altere as Fotos...</span>
                        <div className="relative w-64 h-5">
                            <AnimatePresence mode="wait">
                                <motion.span
                                    key={index}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.4, ease: "easeInOut" }}
                                    className="absolute inset-0 font-medium text-orange-500 whitespace-nowrap text-left"
                                >
                                    {REMIX_IDEAS[index]}
                                </motion.span>
                            </AnimatePresence>
                        </div>
                    </div>
                </div>




            
            </div>
        </footer>
    );
};

export default Footer;
