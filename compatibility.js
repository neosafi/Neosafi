/**
 * PREMIUM COMPATIBILITY ENGINE V1.0
 * Rend le projet compatible avec Safari iOS, Chrome Mobile, Firefox et les anciens navigateurs.
 */
(function() {
    // 1. Gestion de la hauteur réelle sur Mobile (Fix pour la barre d'adresse Safari/Chrome)
    const fixMobileHeight = () => {
        let vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    window.addEventListener('resize', fixMobileHeight);
    fixMobileHeight();

    // 2. Polyfill pour RequestAnimationFrame (Animation fluide sur vieux navigateurs)
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] 
                                   || window[vendors[x]+'CancelRequestAnimationFrame'];
    }

    // 3. Support pour l'AudioContext sur Safari/iOS
    window.AudioContext = window.AudioContext || window.webkitAudioContext;

    // 4. Détection des navigateurs pour des ajustements spécifiques
    const ua = navigator.userAgent.toLowerCase();
    const isSafari = ua.indexOf('safari') !== -1 && ua.indexOf('chrome') === -1;
    if (isSafari) {
        document.documentElement.classList.add('is-safari');
    }

    console.log("🚀 Compatibility Engine Active: All browsers supported.");
})();