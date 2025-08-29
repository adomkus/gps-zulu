// Core utilities - consolidated from dom-safe.js, time.js, perf.js
(function(){
    // === DOM UTILITIES ===
    function setTextSafe(el, text){ 
        if (el && typeof text === 'string') el.textContent = text; 
    }
    function setHTMLSafe(el, html){ 
        if (el && typeof html === 'string') el.innerHTML = html; 
    }
    function setClass(el, className, on){ 
        if (!el) return; 
        if (on) el.classList.add(className); 
        else el.classList.remove(className); 
    }
    function byId(id){ 
        return document.getElementById(id); 
    }

    // === TIME UTILITIES ===
    function formatDateTimeLT(date){
        try { 
            return new Date(date).toLocaleString('lt-LT'); 
        } catch(_) { 
            return ''; 
        }
    }
    function formatTimeLT(date){
        try { 
            return new Date(date).toLocaleTimeString('lt-LT', { hour: '2-digit', minute: '2-digit' }); 
        } catch(_) { 
            return ''; 
        }
    }

    // === PERFORMANCE UTILITIES ===
    window.__logBuffer = window.__logBuffer || [];
    function log(...args) {
        console.log(...args);
        window.__logBuffer.push(new Date().toISOString() + ': ' + args.join(' '));
        if (window.__logBuffer.length > 1000) {
            window.__logBuffer = window.__logBuffer.slice(-500);
        }
    }
    
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // === MOBILE UTILITIES ===
    function setVH() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }

    // === EXPORT ===
    window.CoreUtils = {
        // DOM
        setText: setTextSafe,
        setHTML: setHTMLSafe,
        setClass: setClass,
        byId: byId,
        
        // Time
        formatDateTime: formatDateTimeLT,
        formatTime: formatTimeLT,
        
        // Performance
        log: log,
        debounce: debounce,
        
        // Mobile
        setVH: setVH
    };

    // Global alias for backward compatibility
    window.perf = { log: log, debounce: debounce };
    window.DomSafe = { setText: setTextSafe, setHTML: setHTMLSafe, setClass: setClass, byId: byId };
    window.TimeUtil = { formatDateTimeLT: formatDateTimeLT, formatTimeLT: formatTimeLT };
})();
