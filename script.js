document.addEventListener('DOMContentLoaded', () => {
    // State
    let isSpinning = false;
    let rotation = 0;
    let email = localStorage.getItem('spin_win_email');
    const lastSpin = localStorage.getItem('spin_win_last_spin');
    let winHistory = JSON.parse(localStorage.getItem('spin_win_history') || '[]');
    let soundEnabled = localStorage.getItem('spin_win_sound') !== 'false';
    let currentTheme = localStorage.getItem('spin_win_theme') || 'dark';
    
    // Audio Context for Procedural SFX
    let audioCtx = null;

    // UI Elements
    const container = document.getElementById('main-container');
    const leadCapture = document.getElementById('lead-capture');
    const wheelWrapper = document.getElementById('wheel-wrapper');
    const spinForm = document.getElementById('spin-form');
    const spinBtn = document.getElementById('spin-btn');
    const wheelCanvas = document.getElementById('wheel');
    const ctx = wheelCanvas.getContext('2d');
    const modal = document.getElementById('reward-modal');
    const rewardCard = document.getElementById('reward-card');
    const couponBox = document.getElementById('coupon-code');
    const historyList = document.getElementById('win-history');
    const totalWinsEl = document.getElementById('total-wins');
    const spinsLeftEl = document.getElementById('spins-left');
    const themeToggle = document.getElementById('theme-toggle');
    const soundToggle = document.getElementById('sound-toggle');
    
    // Gifting Elements
    const showGiftBtn = document.getElementById('show-gift-form');
    const giftFormContainer = document.getElementById('gift-form-container');
    const sendGiftBtn = document.getElementById('send-gift-btn');
    const claimSuccess = document.getElementById('claim-success');
    const giftSection = document.getElementById('gift-section');

    // Config - Weighted Probability
    const defaultSegments = [
        { label: '100% OFF', color: '#6366F1', weight: 2, icon: '🔥', code: 'ZQYB214RZC' },
        { label: 'FREE PRODUCT', color: '#8B5CF6', weight: 3, icon: '🎁', code: 'FREEGIFT' },
        { label: 'FREE SPIN', color: '#EC4899', weight: 15, icon: '🔄', code: 'RETRY' },
        { label: '50% OFF', color: '#1E293B', weight: 5, icon: '💸', code: 'U7LUI0MZ9Q' },
        { label: 'BETTER LUCK', color: '#0F172A', weight: 35, icon: '😢', code: 'TRYAGAIN' },
        { label: 'BUNDLE', color: '#10B981', weight: 5, icon: '📦', code: 'BUNDLE' },
        { label: '25% OFF', color: '#1E293B', weight: 25, icon: '🏷️', code: 'LBVFFODD9Z' },
        { label: 'MYSTERY', color: '#4F46E5', weight: 10, icon: '💎', code: 'MYSTERY' }
    ];

    let segments = JSON.parse(localStorage.getItem('spin_win_config') || JSON.stringify(defaultSegments));

    // Initialize
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateSoundIcon();
    updateHistoryUI();
    
    // Initial entrance logic
    if (!email) {
        leadCapture.style.display = 'block';
        wheelWrapper.style.display = 'none';
    } else {
        leadCapture.style.display = 'none';
        wheelWrapper.classList.add('active-grid');
        
        // Show status based on last spin
        if (lastSpin && Date.now() - parseInt(lastSpin) < 24 * 60 * 60 * 1000) {
            spinsLeftEl.innerText = '0';
            spinBtn.disabled = true;
            spinBtn.innerText = 'NO SPINS LEFT';
        } else {
            spinsLeftEl.innerText = '1';
        }
    }
    
    drawWheel();
    initParticles();

    // Theme Toggle
    themeToggle.addEventListener('click', () => {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', currentTheme);
        localStorage.setItem('spin_win_theme', currentTheme);
    });

    // Sound Toggle
    soundToggle.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        localStorage.setItem('spin_win_sound', soundEnabled);
        updateSoundIcon();
        if (soundEnabled && !audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    });

    function updateSoundIcon() {
        soundToggle.innerHTML = soundEnabled ? 
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>' :
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9l-3 3H2v6h6l3 3V3.05a9.38 9.38 0 0 1 3.5 1.5"></path></svg>';
    }

    // Procedural Audio
    function playTick() {
        if (!soundEnabled) return;
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    }

    function playWin() {
        if (!soundEnabled) return;
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        const notes = [523.25, 659.25, 783.99, 1046.50]; 
        notes.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.1);
            gain.gain.setValueAtTime(0, audioCtx.currentTime + i * 0.1);
            gain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + i * 0.1 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + i * 0.1 + 0.3);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(audioCtx.currentTime + i * 0.1);
            osc.stop(audioCtx.currentTime + i * 0.1 + 0.3);
        });
    }

    // Helpers
    function parseUserAgent() {
        const ua = navigator.userAgent;
        let browser = "Unknown", os = "Unknown";
        if (ua.indexOf("Chrome") > -1) browser = "Chrome";
        else if (ua.indexOf("Safari") > -1) browser = "Safari";
        else if (ua.indexOf("Firefox") > -1) browser = "Firefox";
        else if (ua.indexOf("Edge") > -1) browser = "Edge";
        if (ua.indexOf("Win") > -1) os = "Windows";
        else if (ua.indexOf("Mac") > -1) os = "MacOS";
        else if (ua.indexOf("Android") > -1) os = "Android";
        else if (ua.indexOf("iPhone") > -1) os = "iOS";
        return { browser, os };
    }

    function getDeviceType() {
        const ua = navigator.userAgent;
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return "Tablet";
        if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) return "Mobile";
        return "Desktop";
    }

    // Lead Capture
    spinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        email = document.getElementById('email').value;
        localStorage.setItem('spin_win_email', email);
        
        try {
            const geoRes = await fetch('https://freeipapi.com/api/json');
            const geoData = await geoRes.json();
            const { browser, os } = parseUserAgent();
            const leadData = {
                email: email, timestamp: new Date().toISOString(),
                ip: geoData.ipAddress || 'Unknown',
                location: `${geoData.cityName}, ${geoData.regionName}, ${geoData.countryName}`,
                browser, os, device: getDeviceType(),
                userAgent: navigator.userAgent, language: navigator.language,
                screen: `${window.screen.width}x${window.screen.height}`,
                referrer: document.referrer || 'Direct', result: 'Pending', code: ''
            };
            const allLeads = JSON.parse(localStorage.getItem('spin_win_leads') || '[]');
            allLeads.push(leadData);
            localStorage.setItem('spin_win_leads', JSON.stringify(allLeads));
        } catch (err) { console.error('Lead tracking failed:', err); }

        // Transition to Wheel
        leadCapture.style.opacity = '0';
        leadCapture.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            leadCapture.style.display = 'none';
            wheelWrapper.classList.add('active-grid');
            spinsLeftEl.innerText = '1';
            drawWheel(); 
        }, 500);
    });

    // Wheel Drawing
    function drawWheel() {
        const radius = wheelCanvas.width / 2;
        const arc = 2 * Math.PI / segments.length;
        ctx.clearRect(0, 0, wheelCanvas.width, wheelCanvas.height);
        segments.forEach((seg, i) => {
            const angle = i * arc;
            ctx.beginPath();
            const gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
            gradient.addColorStop(0, seg.color);
            gradient.addColorStop(1, adjustColor(seg.color, -30));
            ctx.fillStyle = gradient;
            ctx.moveTo(radius, radius);
            ctx.arc(radius, radius, radius - 10, angle, angle + arc);
            ctx.lineTo(radius, radius);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            ctx.lineWidth = 4;
            ctx.stroke();
            ctx.save();
            ctx.translate(radius, radius);
            ctx.rotate(angle + arc / 2);
            ctx.textAlign = 'right';
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 22px "Orbitron"';
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.fillText(seg.label, radius - 90, 10);
            ctx.font = '32px "Inter"';
            ctx.fillText(seg.icon, radius - 45, 12);
            ctx.restore();
        });
        ctx.beginPath();
        ctx.arc(radius, radius, radius - 5, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 15;
        ctx.stroke();
    }

    function adjustColor(hex, amt) {
        let usePound = hex[0] == "#";
        hex = usePound ? hex.slice(1) : hex;
        let num = parseInt(hex, 16);
        let r = (num >> 16) + amt;
        let b = ((num >> 8) & 0x00FF) + amt;
        let g = (num & 0x0000FF) + amt;
        const fix = (x) => Math.min(255, Math.max(0, x));
        return (usePound ? "#" : "") + (fix(g) | (fix(b) << 8) | (fix(r) << 16)).toString(16).padStart(6, '0');
    }

    // Spin Logic
    spinBtn.addEventListener('click', () => {
        if (isSpinning) return;
        isSpinning = true;
        spinBtn.disabled = true;
        spinBtn.innerText = 'SPINNING...';
        const totalWeight = segments.reduce((sum, s) => sum + s.weight, 0);
        const random = Math.random() * totalWeight;
        let cumulativeWeight = 0, selectedIndex = 0;
        for (let i = 0; i < segments.length; i++) {
            cumulativeWeight += segments[i].weight;
            if (random < cumulativeWeight) { selectedIndex = i; break; }
        }
        const extraSpins = 5 + Math.random() * 5; 
        const sliceAngle = (2 * Math.PI) / segments.length;
        const targetAngle = (3 * Math.PI / 2) - (selectedIndex * sliceAngle) - (sliceAngle / 2);
        const finalRotation = (extraSpins * 2 * Math.PI) + targetAngle;
        const start = performance.now();
        const duration = 5000; 
        function animate(time) {
            const t = Math.min((time - start) / duration, 1);
            const easeOut = 1 - Math.pow(1 - t, 3);
            const currentRotation = finalRotation * easeOut;
            wheelCanvas.style.transform = `rotate(${currentRotation}rad)`;
            const currentSlice = Math.floor(((currentRotation % (2 * Math.PI)) / (2 * Math.PI)) * segments.length);
            if (this.lastSlice !== currentSlice) {
                document.querySelector('.wheel-pointer').style.transform = 'translateX(-50%) rotate(-15deg)';
                playTick();
                setTimeout(() => document.querySelector('.wheel-pointer').style.transform = 'translateX(-50%) rotate(0deg)', 50);
                this.lastSlice = currentSlice;
            }
            if (t < 1) requestAnimationFrame(animate.bind(this));
            else finishSpin(selectedIndex);
        }
        requestAnimationFrame(animate.bind({ lastSlice: -1 }));
    });

    function finishSpin(index) {
        isSpinning = false;
        const result = segments[index];
        if (email) {
            const allLeads = JSON.parse(localStorage.getItem('spin_win_leads') || '[]');
            const leadIndex = allLeads.findLastIndex(l => l.email === email);
            if (leadIndex !== -1) {
                allLeads[leadIndex].result = result.label;
                allLeads[leadIndex].code = result.code;
                localStorage.setItem('spin_win_leads', JSON.stringify(allLeads));
            }
        }
        if (result.label !== 'FREE SPIN') {
            localStorage.setItem('spin_win_last_spin', Date.now().toString());
            spinsLeftEl.innerText = '0';
        } else {
            spinsLeftEl.innerText = '1';
            spinBtn.disabled = false;
            spinBtn.innerText = 'SPIN AGAIN';
        }
        if (result.label !== 'BETTER LUCK') {
            winHistory.unshift({ reward: result.label, code: result.code, date: new Date().toLocaleDateString() });
            if (winHistory.length > 5) winHistory.pop();
            localStorage.setItem('spin_win_history', JSON.stringify(winHistory));
            updateHistoryUI();
            playWin();
        }
        setTimeout(() => showReward(result), 500);
    }

    function updateHistoryUI() {
        historyList.innerHTML = winHistory.map(item => `
            <li class="history-item">
                <span class="history-date">${item.date}</span>
                <span class="history-reward">${item.reward}</span>
            </li>
        `).join('');
        totalWinsEl.innerText = winHistory.length;
    }

    function showReward(reward) {
        document.getElementById('reward-emoji').innerText = reward.icon;
        document.getElementById('reward-title').innerText = reward.label === 'BETTER LUCK' ? 'Keep Going!' : `You Won ${reward.label}!`;
        document.getElementById('reward-desc').innerText = reward.label === 'BETTER LUCK' ? 'Try again tomorrow!' : 'Use your code:';
        if (reward.label === 'BETTER LUCK' || reward.label === 'FREE SPIN') couponBox.style.display = 'none';
        else { couponBox.style.display = 'block'; couponBox.innerText = reward.code; }
        modal.style.display = 'flex';
        setTimeout(() => rewardCard.classList.add('show'), 10);
        if (reward.label !== 'BETTER LUCK' && reward.label !== 'FREE SPIN') createConfetti();
    }

    function createConfetti() {
        const colors = ['#6366F1', '#8B5CF6', '#EC4899', '#10B981'];
        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.style.position = 'fixed'; confetti.style.width = '8px'; confetti.style.height = '8px';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.left = Math.random() * 100 + 'vw'; confetti.style.top = '-10px'; confetti.style.zIndex = '1000';
            document.body.appendChild(confetti);
            confetti.animate([
                { transform: 'translate3d(0, 0, 0) rotate(0deg)', opacity: 1 },
                { transform: `translate3d(${(Math.random() - 0.5) * 200}px, 100vh, 0) rotate(${Math.random() * 360}deg)`, opacity: 0 }
            ], { duration: Math.random() * 3000 + 2000, easing: 'ease-out' }).onfinish = () => confetti.remove();
        }
    }

    // Modal Events
    document.getElementById('close-modal').addEventListener('click', () => {
        const btn = document.getElementById('close-modal');
        if (btn.innerText === 'CLAIM LOOT') {
            btn.innerText = 'PROCEEDING...'; btn.disabled = true;
            setTimeout(() => {
                claimSuccess.style.display = 'block'; giftSection.style.display = 'none';
                btn.innerText = 'CLOSE'; btn.disabled = false;
                if (soundEnabled) playWin();
            }, 1000);
        } else {
            modal.style.display = 'none'; rewardCard.classList.remove('show');
            btn.innerText = 'CLAIM LOOT'; claimSuccess.style.display = 'none';
            giftSection.style.display = 'block'; giftFormContainer.classList.add('gift-form-hidden');
            showGiftBtn.style.display = 'block';
            if (spinsLeftEl.innerText === '1') { spinBtn.disabled = false; spinBtn.innerText = 'EXECUTE SPIN'; }
            else { spinBtn.innerText = 'NO SPINS LEFT'; }
        }
    });

    showGiftBtn.addEventListener('click', () => {
        giftFormContainer.classList.remove('gift-form-hidden');
        showGiftBtn.style.display = 'none';
    });

    sendGiftBtn.addEventListener('click', () => {
        const friendEmail = document.getElementById('friend-email').value;
        if (!friendEmail || !friendEmail.includes('@')) return alert('Valid email required.');
        sendGiftBtn.innerText = 'SENDING...'; sendGiftBtn.disabled = true;
        setTimeout(() => {
            giftFormContainer.innerHTML = `<p style="color: var(--cyber-blue); margin-top: 1rem; font-size: 0.8rem;">🎁 Loot transferred to ${friendEmail}!</p>`;
            if (soundEnabled) playWin();
        }, 1200);
    });

    // Background Particles
    function initParticles() {
        const bgCanvas = document.getElementById('canvas-bg');
        const bgCtx = bgCanvas.getContext('2d');
        let particles = [];
        function resize() { bgCanvas.width = window.innerWidth; bgCanvas.height = window.innerHeight; }
        window.addEventListener('resize', resize); resize();
        class Particle {
            constructor() { this.reset(); }
            reset() { this.x = Math.random() * bgCanvas.width; this.y = Math.random() * bgCanvas.height; this.size = Math.random() * 2 + 0.5; this.speedX = Math.random() * 0.4 - 0.2; this.speedY = Math.random() * 0.4 - 0.2; this.opacity = Math.random() * 0.3; }
            update() { this.x += this.speedX; this.y += this.speedY; if (this.x < 0 || this.x > bgCanvas.width || this.y < 0 || this.y > bgCanvas.height) this.reset(); }
            draw() { bgCtx.fillStyle = `rgba(148, 163, 184, ${this.opacity})`; bgCtx.beginPath(); bgCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2); bgCtx.fill(); }
        }
        for (let i = 0; i < 40; i++) particles.push(new Particle());
        function animate() {
            bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
            particles.forEach(p => { p.update(); p.draw(); });
            requestAnimationFrame(animate);
        }
        animate();
    }
});
