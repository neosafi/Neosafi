document.addEventListener('DOMContentLoaded', () => {
    // State
    let isSpinning = false;
    let rotation = 0;
    let email = localStorage.getItem('spin_win_email');
    let winHistory = JSON.parse(localStorage.getItem('spin_win_history') || '[]');
    let soundEnabled = localStorage.getItem('spin_win_sound') !== 'false';
    let currentTheme = localStorage.getItem('spin_win_theme') || 'dark';

    // Audio Context for Procedural SFX
    let audioCtx = null;

    // UI Elements
    const container = document.getElementById('main-container');

    // Supabase error banner
    const getBannerEl = () => {
        let el = document.getElementById('supabase-error-banner');
        if (!el) {
            el = document.createElement('div');
            el.id = 'supabase-error-banner';
            el.style.position = 'fixed';
            el.style.top = '16px';
            el.style.right = '16px';
            el.style.zIndex = '99999';
            el.style.maxWidth = '420px';
            el.style.padding = '12px 14px';
            el.style.borderRadius = '14px';
            el.style.background = 'rgba(239, 68, 68, 0.12)';
            el.style.border = '1px solid rgba(239, 68, 68, 0.35)';
            el.style.color = '#fff';
            el.style.backdropFilter = 'blur(12px)';
            el.style.boxShadow = '0 10px 30px rgba(0,0,0,0.35)';
            el.style.display = 'none';
            el.innerHTML = '<div style="font-weight:800;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:6px;">Supabase error</div><div id="supabase-error-banner-body" style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;font-size:12px;opacity:0.95;white-space:pre-wrap;word-break:break-word;"></div>';
            document.body.appendChild(el);
        }
        return el;
    };

    function showSupabaseError(op, err) {
        try {
            const banner = getBannerEl();
            const body = document.getElementById('supabase-error-banner-body');
            const msg = (err && (err.message || err.error_description || err.details))
                ? (err.message || err.error_description || err.details)
                : JSON.stringify(err || {});
            const status = err && err.status ? `status=${err.status}` : '';
            body.textContent = `op: ${op}\n${status}\n${msg}`;
            banner.style.display = 'block';
        } catch (e) {
            // ignore banner failures
        }
    }

    async function supabaseOp(opName, fn) {
        try {
            return await fn();
        } catch (err) {
            console.error(`[SupabaseOp:${opName}]`, err);
            showSupabaseError(opName, err);
            throw err;
        }
    }

    // UI Elements
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
    const copyBtn = document.getElementById('copy-btn');

    // Copy Code Logic
    copyBtn.addEventListener('click', () => {
        const code = couponBox.innerText;
        navigator.clipboard.writeText(code).then(() => {
            const originalIcon = copyBtn.innerHTML;
            copyBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
            copyBtn.classList.add('copy-success');
            setTimeout(() => {
                copyBtn.innerHTML = originalIcon;
                copyBtn.classList.remove('copy-success');
            }, 2000);
        });
    });

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

    let segments = [];
    let spinLimit = 1;

    // --- Load Config from Supabase ---
    async function loadGlobalConfig() {
        try {
            const { data: config, error } = await supabaseOp('system_config.select_all', () =>
                supabase.from('system_config').select('*')
            );

            if (error) throw error;

            config.forEach(item => {
                if (item.key === 'spin_limit') {
                    const raw = item.value;
                    const parsed = typeof raw === 'number' ? raw : parseInt(String(raw));
                    if (!Number.isNaN(parsed)) spinLimit = parsed;
                }
                if (item.key === 'wheel_segments') {
                    segments = item.value;
                }
            });

            if (!Array.isArray(segments) || segments.length === 0) segments = defaultSegments;
            drawWheel();
        } catch (err) {
            console.error('Config load failed (likely RLS/406). Using defaults:', err);
            showSupabaseError('system_config.select_all', err);
            spinLimit = 1;
            segments = defaultSegments;
            drawWheel();
        }
    }

    // Initialize
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateSoundIcon();
    updateHistoryUI();
    loadGlobalConfig();

    // Initial entrance logic
    if (!email) {
        leadCapture.style.display = 'block';
        wheelWrapper.style.display = 'none';
        trackVisitor('Anonymous');
    } else {
        leadCapture.style.display = 'none';
        wheelWrapper.classList.add('active-grid');
        checkSpinLimit(email);
    }

    async function checkSpinLimit(userEmail) {
        try {
            const now = new Date();
            const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

            const { data: recentSpins, error } = await supabaseOp('leads.check_spin_limit', () =>
                supabase
                    .from('leads')
                    .select('timestamp')
                    .eq('email', userEmail)
                    .neq('result', 'Pending')
                    .neq('result', 'FREE SPIN')
                    .gt('timestamp', twentyFourHoursAgo)
            );

            if (error) throw error;

            const spinsUsed = recentSpins.length;
            const spinsLeft = Math.max(0, spinLimit - spinsUsed);
            spinsLeftEl.innerText = spinsLeft;

            if (spinsLeft <= 0) {
                spinBtn.disabled = true;
                spinBtn.innerText = 'NO SPINS LEFT';
                return false;
            } else {
                spinBtn.disabled = false;
                spinBtn.innerText = 'EXECUTE SPIN';
                return true;
            }
        } catch (err) {
            console.error('Limit check failed:', err);
            showSupabaseError('leads.check_spin_limit', err);
            return true;
        }
    }

    // --- Visitor Tracking (Supabase) ---
    async function trackVisitor(userEmail) {
        try {
            const geoRes = await fetch('https://freeipapi.com/api/json');
            const geoData = await geoRes.json();
            const { browser, os } = parseUserAgent();

            const leadData = {
                email: userEmail,
                timestamp: new Date().toISOString(),
                ip: geoData.ipAddress || 'Unknown',
                location: `${geoData.cityName}, ${geoData.regionName}, ${geoData.countryName}`,
                browser, os, device: getDeviceType(),
                user_agent: navigator.userAgent,
                language: navigator.language,
                screen: `${window.screen.width}x${window.screen.height}`,
                referrer: document.referrer || 'Direct',
                result: 'Pending',
                code: ''
            };

            await supabaseOp('leads.insert(visitor)', () =>
                supabase.from('leads').insert([leadData])
            );
        } catch (err) {
            console.error('Lead tracking failed:', err);
            showSupabaseError('leads.insert(visitor)', err);
        }
    }

    // --- Real Email Verification ---
    async function verifyEmail(email) {
        const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!regex.test(email)) return { valid: false, message: "Invalid email format." };
        const disposableDomains = ['tempmail.com', 'throwawaymail.com', '10minutemail.com', 'mailinator.com', 'yopmail.com'];
        const domain = email.split('@')[1].toLowerCase();
        if (disposableDomains.includes(domain)) return { valid: false, message: "Please use a real email." };
        return { valid: true };
    }

    // Lead Capture
    spinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('email');
        const submitBtn = spinForm.querySelector('button');
        const emailValue = emailInput.value.trim();

        submitBtn.innerText = 'VERIFYING...';
        submitBtn.disabled = true;

        const verification = await verifyEmail(emailValue);
        if (!verification.valid) {
            alert(verification.message);
            submitBtn.innerText = 'Initialize Spin';
            submitBtn.disabled = false;
            emailInput.focus();
            return;
        }

        email = emailValue;
        localStorage.setItem('spin_win_email', email);

        // Visitor tracking is best-effort; never block the game UI on RLS/network errors.
        try {
            await trackVisitor(email);
        } catch (e) {
                // ignore (RLS/network). keep user flow working.
            }


        leadCapture.style.opacity = '0';
        leadCapture.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            leadCapture.style.display = 'none';
            wheelWrapper.classList.add('active-grid');
            checkSpinLimit(email);
            drawWheel();
        }, 500);
    });

    // Wheel Drawing
    function drawWheel() {
        if (!segments || segments.length === 0) return;
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
    }

    function adjustColor(hex, amt) {
        let usePound = hex[0] == '#';
        hex = usePound ? hex.slice(1) : hex;
        let num = parseInt(hex, 16);
        let r = (num >> 16) + amt;
        let b = ((num >> 8) & 0x00FF) + amt;
        let g = (num & 0x0000FF) + amt;
        const fix = (x) => Math.min(255, Math.max(0, x));
        return (usePound ? '#' : '') + (fix(g) | (fix(b) << 8) | (fix(r) << 16)).toString(16).padStart(6, '0');
    }

    // Spin Logic
    spinBtn.addEventListener('click', async () => {
        if (isSpinning) return;

        spinBtn.disabled = true;
        spinBtn.innerText = 'VERIFYING...';

        try {
            const { data: serverResult, error: rpcError } = await supabaseOp('execute_spin', () =>
                supabase.rpc('execute_spin', { user_email: email })
            );

            if (rpcError || (serverResult && serverResult.error)) {
                alert(serverResult ? serverResult.error : 'Security Verification Failed.');
                await checkSpinLimit(email);
                return;
            }

            const finalIndex = serverResult.index;
            console.log('🏆 Server Index:', finalIndex, 'Prize:', serverResult.label);

            isSpinning = true;
            spinBtn.innerText = 'SPINNING...';

            const sliceAngle = (2 * Math.PI) / segments.length;
            const extraSpins = 10;

            let targetAngle = (1.5 * Math.PI) - (finalIndex * sliceAngle) - (sliceAngle / 2);
            while (targetAngle < 0) targetAngle += 2 * Math.PI;

            const currentRotationBase = rotation % (2 * Math.PI);
            let angleDiff = targetAngle - currentRotationBase;
            if (angleDiff <= 0) angleDiff += 2 * Math.PI;

            const finalRotation = rotation + (extraSpins * 2 * Math.PI) + angleDiff;

            const start = performance.now();
            const duration = 6000;
            const initialRotation = rotation;

            function animate(time) {
                const t = Math.min((time - start) / duration, 1);
                const easeOut = 1 - Math.pow(1 - t, 5);
                rotation = initialRotation + (finalRotation - initialRotation) * easeOut;

                wheelCanvas.style.transform = `rotate(${rotation}rad)`;

                const normalizedRotation = rotation % (2 * Math.PI);
                let wheelPointAtPointer = (1.5 * Math.PI) - normalizedRotation;
                while (wheelPointAtPointer < 0) wheelPointAtPointer += 2 * Math.PI;
                const currentSlice = Math.floor(wheelPointAtPointer / sliceAngle);

                if (this.lastSlice !== currentSlice) {
                    playTick();
                    const pointer = document.querySelector('.wheel-pointer');
                    if (pointer) {
                        pointer.style.transform = 'translateX(-50%) rotate(-15deg)';
                        setTimeout(() => { pointer.style.transform = 'translateX(-50%) rotate(0deg)'; }, 40);
                    }
                    this.lastSlice = currentSlice;
                }

                if (t < 1) {
                    requestAnimationFrame(animate.bind(this));
                } else {
                    rotation = finalRotation;
                    wheelCanvas.style.transform = `rotate(${rotation}rad)`;
                    finishSpin(finalIndex, serverResult);
                }
            }

            requestAnimationFrame(animate.bind({ lastSlice: -1 }));
        } catch (err) {
            console.error('Spin failure:', err);
            alert('Digital sync failed. Please refresh.');
            spinBtn.disabled = false;
        }
    });

    async function finishSpin(index, serverResult) {
        isSpinning = false;
        const result = segments[index];

        if (email) {
            try {
                const { data: latestLead, error: fetchError } = await supabaseOp('leads.update.latest_pending', () =>
                    supabase
                        .from('leads')
                        .select('id')
                        .eq('email', email)
                        .eq('result', 'Pending')
                        .order('timestamp', { ascending: false })
                        .limit(1)
                );

                if (!fetchError && latestLead && latestLead.length > 0) {
                    await supabaseOp('leads.update.result', () =>
                        supabase
                            .from('leads')
                            .update({
                                result: serverResult.label,
                                code: serverResult.code
                            })
                            .eq('id', latestLead[0].id)
                    );
                }

                if (serverResult.label !== 'FREE SPIN') {
                    await checkSpinLimit(email);
                } else {
                    spinsLeftEl.innerText = parseInt(spinsLeftEl.innerText) + 1;
                    spinBtn.disabled = false;
                    spinBtn.innerText = 'SPIN AGAIN';
                }
            } catch (err) {
                console.error('Failed to update result:', err);
                showSupabaseError('leads.update.result', err);
            }
        }

        if (serverResult.label !== 'BETTER LUCK') {
            winHistory.unshift({
                reward: serverResult.label,
                code: serverResult.code,
                date: new Date().toLocaleDateString()
            });
            if (winHistory.length > 5) winHistory.pop();
            localStorage.setItem('spin_win_history', JSON.stringify(winHistory));
            updateHistoryUI();
            playWin();
        }

        setTimeout(() => showReward(result, serverResult), 500);
    }

    function updateHistoryUI() {
        historyList.innerHTML = winHistory.map((item, index) => {
            const hasCode = item.code && item.reward !== 'BETTER LUCK' && item.reward !== 'FREE SPIN';
            return `
            <li class="history-item">
                <div class="history-info">
                    <span class="history-date">${item.date}</span>
                    <span class="history-reward">${item.reward}</span>
                </div>
                ${hasCode ? `
                <button class="btn-copy-history" onclick="copyHistoryCode('${item.code}', this)" title="Copy Code">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>` : ''}
            </li>
        `;
        }).join('');

        totalWinsEl.innerText = winHistory.length;
    }

    // Global helper for history copying
    window.copyHistoryCode = function (code, btn) {
        navigator.clipboard.writeText(code).then(() => {
            const originalIcon = btn.innerHTML;
            btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
            btn.classList.add('copy-success-small');
            setTimeout(() => {
                btn.innerHTML = originalIcon;
                btn.classList.remove('copy-success-small');
            }, 2000);
        });
    };

    function showReward(visualReward, serverResult) {
        document.getElementById('reward-emoji').innerText = visualReward.icon;
        document.getElementById('reward-title').innerText = serverResult.label === 'BETTER LUCK' ? 'Keep Going!' : `You Won ${serverResult.label}!`;
        document.getElementById('reward-desc').innerText = serverResult.label === 'BETTER LUCK' ? 'Try again tomorrow!' : 'Use your code:';

        if (serverResult.label === 'BETTER LUCK' || serverResult.label === 'FREE SPIN') {
            couponBox.style.display = 'none';
            copyBtn.style.display = 'none';
        } else {
            couponBox.style.display = 'block';
            copyBtn.style.display = 'flex';
            couponBox.innerText = serverResult.code;
        }

        modal.style.display = 'flex';
        setTimeout(() => rewardCard.classList.add('show'), 10);

        if (serverResult.label !== 'BETTER LUCK' && serverResult.label !== 'FREE SPIN') {
            createConfetti();
            giftSection.style.display = 'block';
        } else {
            giftSection.style.display = 'none';
        }
    }

    // --- Gifting Logic ---
    showGiftBtn.addEventListener('click', () => {
        giftFormContainer.classList.toggle('gift-form-hidden');
        showGiftBtn.innerText = giftFormContainer.classList.contains('gift-form-hidden') ? 'Transfer loot to friend' : 'Cancel Transfer';
    });

    sendGiftBtn.addEventListener('click', async () => {
        const friendEmail = document.getElementById('friend-email').value.trim();
        if (!friendEmail || !(await verifyEmail(friendEmail)).valid) {
            alert('Please enter a valid recipient email.');
            return;
        }

        sendGiftBtn.innerText = 'TRANSFERRING...';
        sendGiftBtn.disabled = true;

        try {
            const currentCode = couponBox.innerText;
            const currentReward = document.getElementById('reward-title').innerText.replace('You Won ', '').replace('!', '');

            await supabaseOp('leads.insert(gift)', () =>
                supabase.from('leads').insert([{ 
                    email: friendEmail,
                    result: `Gift: ${currentReward}`,
                    code: currentCode,
                    referrer: `Gifted by ${email}`,
                    timestamp: new Date().toISOString()
                }])
            );

            claimSuccess.style.display = 'block';
            giftFormContainer.classList.add('gift-form-hidden');
            showGiftBtn.style.display = 'none';

            setTimeout(() => {
                claimSuccess.style.display = 'none';
            }, 5000);
        } catch (err) {
            console.error('Transfer failed:', err);
            alert('Transfer failed. Please try again.');
        } finally {
            sendGiftBtn.innerText = 'INITIATE TRANSFER';
            sendGiftBtn.disabled = false;
        }
    });

    function createConfetti() {
        const colors = ['#6366F1', '#8B5CF6', '#EC4899', '#10B981'];
        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.style.position = 'fixed';
            confetti.style.width = '8px';
            confetti.style.height = '8px';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.top = '-10px';
            confetti.style.zIndex = '1000';
            document.body.appendChild(confetti);

            confetti.animate([
                { transform: 'translate3d(0, 0, 0) rotate(0deg)', opacity: 1 },
                { transform: `translate3d(${(Math.random() - 0.5) * 200}px, 100vh, 0) rotate(${Math.random() * 360}deg)`, opacity: 0 }
            ], { duration: Math.random() * 3000 + 2000, easing: 'ease-out' }).onfinish = () => confetti.remove();
        }
    }

    // Modal Events
    document.getElementById('close-modal').addEventListener('click', () => {
        modal.style.display = 'none';
        rewardCard.classList.remove('show');
        if (spinsLeftEl.innerText === '1') {
            spinBtn.disabled = false;
            spinBtn.innerText = 'EXECUTE SPIN';
        }
    });

    // Theme & Sound
    themeToggle.addEventListener('click', () => {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', currentTheme);
        localStorage.setItem('spin_win_theme', currentTheme);
    });

    soundToggle.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        localStorage.setItem('spin_win_sound', soundEnabled);
        updateSoundIcon();
        if (soundEnabled && !audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    });

    function updateSoundIcon() {
        soundToggle.innerHTML = soundEnabled
            ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>'
            : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9l-3 3H2v6h6l3 3V3.05a9.38 9.38 0 0 1 3.5 1.5"></path></svg>';
    }

    function playTick() {
        if (!soundEnabled) return;
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
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
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime + i * 0.1);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(audioCtx.currentTime + i * 0.1);
            osc.stop(audioCtx.currentTime + i * 0.1 + 0.3);
        });
    }

    function parseUserAgent() {
        const ua = navigator.userAgent;
        let browser = 'Unknown', os = 'Unknown';
        if (ua.indexOf('Chrome') > -1) browser = 'Chrome'; else if (ua.indexOf('Safari') > -1) browser = 'Safari';
        if (ua.indexOf('Win') > -1) os = 'Windows'; else if (ua.indexOf('Mac') > -1) os = 'MacOS';
        return { browser, os };
    }

    function getDeviceType() {
        const ua = navigator.userAgent;
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'Tablet';
        if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) return 'Mobile';
        return 'Desktop';
    }

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
            constructor() { this.reset(); }
            reset() {
                this.x = Math.random() * bgCanvas.width;
                this.y = Math.random() * bgCanvas.height;
                this.size = Math.random() * 2 + 0.5;
                this.speedX = Math.random() * 0.4 - 0.2;
                this.speedY = Math.random() * 0.4 - 0.2;
                this.opacity = Math.random() * 0.3;
            }
            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                if (this.x < 0 || this.x > bgCanvas.width || this.y < 0 || this.y > bgCanvas.height) this.reset();
            }
            draw() {
                bgCtx.fillStyle = `rgba(148, 163, 184, ${this.opacity})`;
                bgCtx.beginPath();
                bgCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                bgCtx.fill();
            }
        }

        for (let i = 0; i < 40; i++) particles.push(new Particle());

        function animate() {
            bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
            particles.forEach(p => { p.update(); p.draw(); });
            requestAnimationFrame(animate);
        }

        animate();
    }

    initParticles();
});

