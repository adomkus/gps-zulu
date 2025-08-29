// Authentication and registration - consolidated from auth.js
(function(){
    const perf = window.perf;

    // === AUTHENTICATION FUNCTIONS ===
    async function handleAuth(url, username, password, errorElementId) {
        try {
            // Client-side validation
            if (!username || username.length < 3) {
                throw new Error('Vartotojo vardas turi būti bent 3 simboliai');
            }
            if (!password || password.length < 6) {
                throw new Error('Slaptažodis turi būti bent 6 simboliai');
            }

            const rememberMe = document.getElementById('remember-me');

            const response = await window.Api.fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, remember: !!(rememberMe && rememberMe.checked) })
            });

            // Handle remember me
            if (rememberMe && rememberMe.checked) {
                localStorage.setItem('gpsRemember', '1');
                localStorage.setItem('gpsSavedUsername', username);
            } else {
                localStorage.removeItem('gpsRemember');
                localStorage.removeItem('gpsSavedUsername');
            }

            return response;
        } catch (error) {
            perf.log(`Auth error: ${error.message}`);
            if (errorElementId) {
                const errorEl = document.getElementById(errorElementId);
                if (errorEl) {
                    errorEl.textContent = error.message;
                    errorEl.style.display = 'block';
                }
            }
            throw error;
        }
    }

    function setupAuthEventListeners() {
        const el = window.el || {};
        
        // Prefill username if remembered
        try {
            if (localStorage.getItem('gpsRemember') === '1') {
                const saved = localStorage.getItem('gpsSavedUsername');
                if (saved) {
                    const usernameInput = el.loginForm.querySelector('#login-username');
                    if (usernameInput) usernameInput.value = saved;
                }
                const remember = document.getElementById('remember-me');
                if (remember) remember.checked = true;
            }
        } catch (e) {
            perf.log('Error loading saved username:', e);
        }

        // Login form
        if (el.loginForm) {
            el.loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                try {
                    const username = el.loginForm.querySelector('#login-username').value;
                    const password = el.loginForm.querySelector('#login-password').value;
                    
                    const data = await handleAuth('/login', username, password, 'login-error');
                    if (data && window.initializeApp) {
                        window.initializeApp(data.user);
                    }
                } catch (error) {
                    // Error already handled by handleAuth
                }
            });
        }

        // Register form
        if (el.registerForm) {
            el.registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                try {
                    const username = el.registerForm.querySelector('#register-username').value;
                    const password = el.registerForm.querySelector('#register-password').value;
                    
                    const data = await handleAuth('/register', username, password, 'register-error');
                    if (data) {
                        alert(data.message);
                        // Toggle to login form
                        if (el.authContainer) {
                            const loginForm = el.authContainer.querySelector('.auth-form');
                            const registerForm = el.authContainer.querySelector('#register-form');
                            if (loginForm && registerForm) {
                                loginForm.classList.remove('hidden');
                                registerForm.classList.add('hidden');
                            }
                        }
                    }
                } catch (error) {
                    // Error already handled by handleAuth
                }
            });
        }

        // Toggle between login and register forms
        const showRegisterLink = document.getElementById('show-register');
        const showLoginLink = document.getElementById('show-login');
        
        if (showRegisterLink) {
            showRegisterLink.addEventListener('click', () => {
                const loginForm = el.authContainer.querySelector('.auth-form');
                const registerForm = el.authContainer.querySelector('#register-form');
                if (loginForm && registerForm) {
                    loginForm.classList.add('hidden');
                    registerForm.classList.remove('hidden');
                }
            });
        }
        
        if (showLoginLink) {
            showLoginLink.addEventListener('click', () => {
                const loginForm = el.authContainer.querySelector('.auth-form');
                const registerForm = el.authContainer.querySelector('#register-form');
                if (loginForm && registerForm) {
                    loginForm.classList.remove('hidden');
                    registerForm.classList.add('hidden');
                }
            });
        }

        // Form switching
        if (el.showRegisterLink) {
            el.showRegisterLink.addEventListener('click', () => {
                if (el.loginForm) el.loginForm.classList.add('hidden');
                if (el.registerForm) el.registerForm.classList.remove('hidden');
            });
        }

        if (el.showLoginLink) {
            el.showLoginLink.addEventListener('click', () => {
                if (el.registerForm) el.registerForm.classList.add('hidden');
                if (el.loginForm) el.loginForm.classList.remove('hidden');
            });
        }
    }

    // === EXPORT ===
    window.AuthModule = {
        handleAuth: handleAuth,
        setupAuthEventListeners: setupAuthEventListeners
    };
})();
