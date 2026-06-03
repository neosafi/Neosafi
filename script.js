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
    
    // Initial entrance for lead-capture only
    setTimeout(() => {
        container.classList.add('visible');
        leadCapture.classList.add('active');
    }, 100);
    
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
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>' :
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9l-3 3H2v6h6l3 3V3.05a9.38 9.38 0 0 1 3.5 1.5"></path></svg>';
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
        
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
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

    // Gifting Logic
    showGiftBtn.addEventListener('click', () => {
        giftFormContainer.style.display = 'block';
        showGiftBtn.style.display = 'none';
    });

    sendGiftBtn.addEventListener('click', () => {
        const friendEmail = document.getElementById('friend-email').value;
        if (!friendEmail || !friendEmail.includes('@')) {
            alert('Please enter a valid friend email.');
            return;
        }

        sendGiftBtn.innerText = 'SENDING...';
        sendGiftBtn.disabled = true;

        // Mock API call
        setTimeout(() => {
            giftFormContainer.innerHTML = `<p style="color: var(--success); margin-top: 1rem;">🎁 Gift sent to ${friendEmail}!</p>`;
            if (soundEnabled) playWin();
        }, 1500);
    });

    // Lead Capture
    spinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        email = document.getElementById('email').value;
        localStorage.setItem('spin_win_email', email);
        
        // --- NEW: Lead Tracking Logic ---
        try {
            // Get IP and Geolocation
            const geoRes = await fetch('https://freeipapi.com/api/json');
            const geoData = await geoRes.json();
            
            const leadData = {
                email: email,
                timestamp: new Date().toISOString(),
                ip: geoData.ipAddress || 'Unknown',
                location: `${geoData.cityName}, ${geoData.regionName}, ${geoData.countryName}`,
                browser: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                screen: `${window.screen.width}x${window.screen.height}`,
                referrer: document.referrer || 'Direct'
            };

            // Save to Local Leads Database
            const allLeads = JSON.parse(localStorage.getItem('spin_win_leads') || '[]');
            allLeads.push(leadData);
            localStorage.setItem('spin_win_leads', JSON.stringify(allLeads));
            
            console.log('Lead tracked:', leadData);
        } catch (err) {
            console.error('Lead tracking failed:', err);
        }
        // --- END: Lead Tracking Logic ---

        // 1. Firstly, hide lead-capture card with a pronounced exit animation
        leadCapture.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        leadCapture.style.opacity = '0';
        leadCapture.style.filter = 'blur(10px)';
        leadCapture.style.transform = 'scale(0.8) translateY(-60px)';
        
        setTimeout(() => {
            // 2. Remove from layout
            leadCapture.style.display = 'none';
            
            // 3. Show wheel-wrapper (the container)
            wheelWrapper.style.display = 'flex';
            
            // 4. Identify the specific wheel card (glass-card stagger-item)
            const wheelCard = wheelWrapper.querySelector('.glass-card.stagger-item');
            
            // 5. Force a reflow and then show it with a smooth entrance
            requestAnimationFrame(() => {
                setTimeout(() => {
                    wheelCard.classList.add('active');
                }, 50);
            });
            
            spinsLeftEl.innerText = '1';
            drawWheel(); 
        }, 600);
    });

    // Wheel Drawing
    function drawWheel() {
        const radius = wheelCanvas.width / 2;
        const arc = 2 * Math.PI / segments.length;

        ctx.clearRect(0, 0, wheelCanvas.width, wheelCanvas.height);

        segments.forEach((seg, i) => {
            const angle = i * arc;
            
            // Draw slice
            ctx.beginPath();
            ctx.fillStyle = seg.color;
            ctx.moveTo(radius, radius);
            ctx.arc(radius, radius, radius - 10, angle, angle + arc);
            ctx.lineTo(radius, radius);
            ctx.fill();
            
            // Add stroke
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw Label and Icon
            ctx.save();
            ctx.translate(radius, radius);
            ctx.rotate(angle + arc / 2);
            
            // Draw Label
            ctx.textAlign = 'right';
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 20px Inter';
            ctx.fillText(seg.label, radius - 80, 10);

            // Draw Icon
            ctx.font = '30px Inter';
            ctx.fillText(seg.icon, radius - 40, 12);
            
            ctx.restore();
        });

        // Outer Ring
        ctx.beginPath();
        ctx.arc(radius, radius, radius - 5, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 10;
        ctx.stroke();
    }

    // Spin Logic
    spinBtn.addEventListener('click', () => {
        if (isSpinning) return;
        
        isSpinning = true;
        spinBtn.disabled = true;
        spinBtn.innerText = 'SPINNING...';

        // Weighted Selection
        const totalWeight = segments.reduce((sum, s) => sum + s.weight, 0);
        const random = Math.random() * totalWeight;
        let cumulativeWeight = 0;
        let selectedIndex = 0;

        for (let i = 0; i < segments.length; i++) {
            cumulativeWeight += segments[i].weight;
            if (random < cumulativeWeight) {
                selectedIndex = i;
                break;
            }
        }

        const extraSpins = 5 + Math.random() * 5; 
        const sliceAngle = (2 * Math.PI) / segments.length;
        const targetAngle = (3 * Math.PI / 2) - (selectedIndex * sliceAngle) - (sliceAngle / 2);
        const finalRotation = (extraSpins * 2 * Math.PI) + targetAngle;
        
        const start = performance.now();
        const duration = 5000; 

        function animate(time) {
            const elapsed = time - start;
            const t = Math.min(elapsed / duration, 1);
            
            const easeOut = 1 - Math.pow(1 - t, 3);
            const currentRotation = finalRotation * easeOut;
            
            wheelCanvas.style.transform = `rotate(${currentRotation}rad)`;
            
            const currentSlice = Math.floor(((currentRotation % (2 * Math.PI)) / (2 * Math.PI)) * segments.length);
            if (this.lastSlice !== currentSlice) {
                document.querySelector('.wheel-pointer').style.transform = 'translateX(-50%) rotate(-15deg)';
                playTick();
                setTimeout(() => {
                    document.querySelector('.wheel-pointer').style.transform = 'translateX(-50%) rotate(0deg)';
                }, 50);
                this.lastSlice = currentSlice;
            }
            
            if (t < 1) {
                requestAnimationFrame(animate.bind(this));
            } else {
                finishSpin(selectedIndex);
            }
        }

        requestAnimationFrame(animate.bind({ lastSlice: -1 }));
    });

    function finishSpin(index) {
        isSpinning = false;
        const result = segments[index];
        
        if (result.label !== 'FREE SPIN') {
            localStorage.setItem('spin_win_last_spin', Date.now().toString());
            spinsLeftEl.innerText = '0';
        } else {
            spinsLeftEl.innerText = '1';
            spinBtn.disabled = false;
            spinBtn.innerText = 'SPIN AGAIN';
        }

        if (result.label !== 'BETTER LUCK') {
            winHistory.unshift({
                reward: result.label,
                code: result.code,
                date: new Date().toLocaleDateString()
            });
            if (winHistory.length > 5) winHistory.pop();
            localStorage.setItem('spin_win_history', JSON.stringify(winHistory));
            updateHistoryUI();
            playWin();
        }

        setTimeout(() => {
            showReward(result);
        }, 500);
    }

    function updateHistoryUI() {
        historyList.innerHTML = winHistory.map(item => `
            <li class="history-item">
                <div class="history-item-content">
                    <span class="history-date">${item.date}</span>
                    <span class="history-reward">${item.reward}</span>
                </div>
                ${item.code && item.code !== 'RETRY' && item.code !== 'TRYAGAIN' ? `
                    <button class="copy-history-btn" data-code="${item.code}" title="Copy Code">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                ` : ''}
            </li>
        `).join('');
        totalWinsEl.innerText = winHistory.length;

        // Add listeners to new buttons
        document.querySelectorAll('.copy-history-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const code = btn.getAttribute('data-code');
                navigator.clipboard.writeText(code);
                
                // Visual feedback
                const originalHTML = btn.innerHTML;
                btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                btn.classList.add('copied');
                
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.classList.remove('copied');
                }, 2000);
            });
        });
    }

    function showReward(reward) {
        document.getElementById('reward-emoji').innerText = reward.icon;
        document.getElementById('reward-title').innerText = reward.label === 'BETTER LUCK' ? 'Keep Going!' : `You Won ${reward.label}!`;
        document.getElementById('reward-desc').innerText = reward.label === 'BETTER LUCK' ? 'Try again tomorrow for another chance to win.' : 'Use the coupon code below at checkout:';
        
        if (reward.label === 'BETTER LUCK' || reward.label === 'FREE SPIN') {
            couponBox.style.display = 'none';
        } else {
            couponBox.style.display = 'block';
            couponBox.innerText = reward.code;
        }

        modal.style.display = 'flex';
        setTimeout(() => rewardCard.classList.add('show'), 10);

        if (reward.label !== 'BETTER LUCK' && reward.label !== 'FREE SPIN') {
            createConfetti();
        }
    }

    function createConfetti() {
        const colors = ['#6366F1', '#8B5CF6', '#EC4899', '#10B981'];
        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.style.position = 'fixed';
            confetti.style.width = '10px';
            confetti.style.height = '10px';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.top = '-10px';
            confetti.style.zIndex = '1000';
            confetti.style.borderRadius = '2px';
            document.body.appendChild(confetti);

            const animation = confetti.animate([
                { transform: 'translate3d(0, 0, 0) rotate(0deg)', opacity: 1 },
                { transform: `translate3d(${(Math.random() - 0.5) * 200}px, 100vh, 0) rotate(${Math.random() * 360}deg)`, opacity: 0 }
            ], {
                duration: Math.random() * 3000 + 2000,
                easing: 'cubic-bezier(0, .9, .57, 1)'
            });

            animation.onfinish = () => confetti.remove();
        }
    }

    // Modal Events
    document.getElementById('close-modal').addEventListener('click', () => {
        const btn = document.getElementById('close-modal');
        
        if (btn.innerText === 'Claim Reward') {
            btn.innerText = 'PROCEEDING...';
            btn.disabled = true;
            
            setTimeout(() => {
                claimSuccess.style.display = 'block';
                giftSection.style.display = 'none';
                btn.innerText = 'CLOSE';
                btn.disabled = false;
                if (soundEnabled) playWin();
            }, 1000);
        } else {
            modal.style.display = 'none';
            rewardCard.classList.remove('show');
            // Reset for next time
            btn.innerText = 'Claim Reward';
            claimSuccess.style.display = 'none';
            giftSection.style.display = 'block';
            giftFormContainer.style.display = 'none';
            showGiftBtn.style.display = 'block';
            
            if (spinsLeftEl.innerText === '1') {
                spinBtn.disabled = false;
                spinBtn.innerText = 'SPIN NOW';
            } else {
                spinBtn.innerText = 'NO SPINS LEFT';
            }
        }
    });

    couponBox.addEventListener('click', () => {
        navigator.clipboard.writeText(couponBox.innerText);
        const originalText = couponBox.innerText;
        couponBox.innerText = 'COPIED!';
        setTimeout(() => couponBox.innerText = originalText, 2000);
    });

    // Background Particles
    function initParticles() {
        const bgCanvas = document.getElementById('canvas-bg');
        const bgCtx = bgCanvas.getContext('2d');
        let particles = [];

        function resize() {
            bgCanvas.width = window.innerWidth;
            bgCanvas.height = window.innerHeight;
        }

        window.addEventListener('resize', resize);
        resize();

        class Particle {
            constructor() {
                this.reset();
            }
            reset() {
                this.x = Math.random() * bgCanvas.width;
                this.y = Math.random() * bgCanvas.height;
                this.size = Math.random() * 2 + 1;
                this.speedX = Math.random() * 0.5 - 0.25;
                this.speedY = Math.random() * 0.5 - 0.25;
                this.opacity = Math.random() * 0.5;
            }
            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                if (this.x < 0 || this.x > bgCanvas.width || this.y < 0 || this.y > bgCanvas.height) {
                    this.reset();
                }
            }
            draw() {
                bgCtx.fillStyle = currentTheme === 'dark' ? `rgba(148, 163, 184, ${this.opacity})` : `rgba(30, 41, 59, ${this.opacity})`;
                bgCtx.beginPath();
                bgCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                bgCtx.fill();
            }
        }

        for (let i = 0; i < 50; i++) {
            particles.push(new Particle());
        }

        function animate() {
            bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
            particles.forEach(p => {
                p.update();
                p.draw();
            });
            requestAnimationFrame(animate);
        }
        animate();
    }
});
