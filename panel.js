document.addEventListener('DOMContentLoaded', () => {
    // --- State & Config ---
    let allLeads = [];
    let filteredLeads = [];
    let sortConfig = { key: 'timestamp', direction: 'desc' };
    
    const loginOverlay = document.getElementById('login-overlay');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');

    // --- Authorized Admin Config ---
    const ADMIN_EMAIL = 'neosafi5@gmail.com';

    const requestCodeBtn = document.getElementById('request-code-btn');
    const emailStatus = document.getElementById('email-status');

    if (requestCodeBtn) {
        requestCodeBtn.innerText = "Send Access Code to my Email";
        
        requestCodeBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            // 1. Generate code
            const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
            sessionStorage.setItem('temp_admin_code', generatedCode);

            requestCodeBtn.innerText = 'SENDING EMAIL...';
            requestCodeBtn.disabled = true;

            try {
                // 2. Send via FormSubmit (Zero Config)
                const response = await fetch("https://formsubmit.co/ajax/" + ADMIN_EMAIL, {
                    method: "POST",
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        _subject: "🔐 Admin Dashboard Access Code",
                        message: "Your 6-digit access code is: " + generatedCode,
                        code: generatedCode,
                        app_name: "Premium Spin & Win"
                    })
                });

                const result = await response.json();

                if (result.success === "true" || response.ok) {
                    emailStatus.style.display = 'block';
                    emailStatus.innerText = "✔ Code sent to " + ADMIN_EMAIL;
                    requestCodeBtn.innerText = 'RESEND CODE';
                } else {
                    throw new Error("FormSubmit error");
                }
                
            } catch (err) {
                console.error("Email error:", err);
                alert("First-time setup: Please check your email inbox and click 'ACTIVATE' in the email from FormSubmit to start receiving codes.");
                requestCodeBtn.innerText = 'Send Access Code to my Email';
            } finally {
                requestCodeBtn.disabled = false;
            }
        });
    }

    loginBtn.addEventListener('click', async () => {
        const token = document.getElementById('option-code').value.trim(); 
        const storedCode = sessionStorage.getItem('temp_admin_code');
        
        if (!token) {
            alert("Access Code is required.");
            return;
        }

        loginBtn.innerText = 'VERIFYING...';
        
        if (storedCode && token === storedCode) {
            localStorage.setItem('admin_authenticated', 'true');
            sessionStorage.removeItem('temp_admin_code'); 
            loginOverlay.style.display = 'none';
            initDashboard();
        } else {
            const errorEl = document.getElementById('login-error');
            errorEl.style.display = 'block';
            errorEl.innerText = "⚠ ACCESS DENIED: Invalid or Expired Code";
            loginBtn.innerText = 'Verify & Enter Dashboard';
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('admin_authenticated');
        window.location.reload();
    });

    // --- Auth Check ---
    async function checkAuth() {
        const isAuth = localStorage.getItem('admin_authenticated') === 'true';
        
        if (isAuth) {
            loginOverlay.style.display = 'none';
            initDashboard();
        }
    }

    // Start Auth Check
    checkAuth();

    // --- Visitor Info UI ---
    function escapeHtml(str) {
        return String(str ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '<')
            .replaceAll('>', '>')
            .replaceAll('"', '"')
            .replaceAll("'", '&#039;');
    }

    function maskEmail(email) {
        if (!email || email === 'Anonymous') return '👤 Anonymous Visitor';
        const str = String(email);
        const [user, domain] = str.split('@');
        if (!domain) return '•'.repeat(Math.min(10, str.length));

        // keep first char and first 2 chars of domain prefix
        const safeUser = user || '';
        const userMasked = safeUser.length <= 2 ? safeUser[0] + '•' : safeUser.slice(0, 1) + '•'.repeat(Math.min(8, safeUser.length - 1));
        return `${userMasked}@${domain}`;
    }


    function renderVisitorInfo(lead) {
        const ids = {
            email: 'visitor-email',
            timestamp: 'visitor-timestamp',
            ip: 'visitor-ip',
            location: 'visitor-location',
            device: 'visitor-device',
            os: 'visitor-os',
            browser: 'visitor-browser',
            referrer: 'visitor-referrer',
            result: 'visitor-result',
            code: 'visitor-code'
        };


        const get = (key) => document.getElementById(ids[key]);
        if (!lead) {
            Object.values(ids).forEach(id => { const el = document.getElementById(id); if (el) el.innerText = '-'; });
            return;
        }

        const visitorEmail = get('email');
        if (visitorEmail) visitorEmail.innerText = maskEmail(lead.email);


        const tsEl = get('timestamp');
        if (tsEl) tsEl.innerText = lead.timestamp ? new Date(lead.timestamp).toLocaleString() : '-';

        const ipEl = get('ip');
        if (ipEl) ipEl.innerText = lead.ip || '-';

        const locEl = get('location');
        if (locEl) locEl.innerText = lead.location || '-';

        const deviceEl = get('device');
        if (deviceEl) deviceEl.innerText = lead.device || 'Desktop';

        const osEl = get('os');
        if (osEl) osEl.innerText = lead.os || 'Unknown';

        const browserEl = get('browser');
        if (browserEl) browserEl.innerText = lead.browser || 'Unknown';

        const refEl = get('referrer');
        if (refEl) refEl.innerText = lead.referrer || 'Direct';

        const resultEl = get('result');
        if (resultEl) {
            const result = lead.result || 'None';
            resultEl.innerText = result;
            resultEl.style.color = (result && result !== 'Pending' && result !== 'BETTER LUCK' && result !== 'FREE SPIN') ? 'var(--success)' : 'var(--warning)';
        }

        const codeEl = get('code');
        if (codeEl) {
            const code = lead.code || 'N/A';
            codeEl.innerText = code;
        }
    }

    async function refreshVisitorInfo() {
        // Dernier visiteur = le lead le plus récent (même si Pending)
        if (!Array.isArray(allLeads) || allLeads.length === 0) {
            renderVisitorInfo(null);
            return;
        }

        // Sécurité: on re-trie côté client (évite des soucis si timestamp arrive mal trié)
        const sorted = [...allLeads].sort((a, b) => {
            const ta = a?.timestamp ? new Date(a.timestamp).getTime() : 0;
            const tb = b?.timestamp ? new Date(b.timestamp).getTime() : 0;
            return tb - ta;
        });

        renderVisitorInfo(sorted[0] ?? null);
    }

    // --- Dashboard Initialization ---
    async function initDashboard() {
        await fetchLeads();
        updateKPIs();
        initCharts();
        populateFilters();
        renderTable();
        renderEmailTable();
        await refreshVisitorInfo();
        loadConfig();
        loadSystemConfig();
    }


    async function fetchLeads() {
        try {
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .order('timestamp', { ascending: false });
            
            if (!error) {
                allLeads = data;
                filteredLeads = [...allLeads];
            }
        } catch (err) { console.error("Fetch leads failed:", err); }
    }

async function loadSystemConfig() {
        try {
            const { data, error } = await supabase
                .from('system_config')
                .select('*')
                .eq('key', 'spin_limit')
                .single();

            if (!error && data) {
                const raw = data.value;
                const parsed = typeof raw === 'number' ? raw : parseInt(String(raw));
                document.getElementById('cfg-spin-limit').value = Number.isNaN(parsed) ? (raw ?? 1) : parsed;
            }
        } catch (err) {
            console.warn('System config fetch failed (likely RLS/406). Using default spin_limit=1', err);
            if (document.getElementById('cfg-spin-limit')) {
                document.getElementById('cfg-spin-limit').value = 1;
            }
        }
    }

    document.getElementById('save-system-config').addEventListener('click', async () => {
        const limit = document.getElementById('cfg-spin-limit').value;
        const btn = document.getElementById('save-system-config');
        try {
            const { error } = await supabase
                .from('system_config')
                .upsert({ key: 'spin_limit', value: limit });
            
            if (!error) {
                btn.innerText = 'SAVED! ✨';
                btn.style.background = 'var(--success)';
                setTimeout(() => {
                    btn.innerText = 'Save System Settings';
                    btn.style.background = '';
                }, 2000);
            }
        } catch (err) { alert("Failed to save. Check configuration."); }
    });

    // --- KPI & Analytics Logic ---
    function updateKPIs() {
        const totalVisitors = allLeads.length;
        const totalEmails = new Set(allLeads.filter(l => l.email !== 'Anonymous').map(l => l.email)).size;
        
        document.getElementById('kpi-total-leads').innerText = totalVisitors;
        const convRate = totalVisitors > 0 ? Math.round((totalEmails / totalVisitors) * 100) : 0;
        document.getElementById('kpi-conv-rate').innerText = convRate + '%';

        const countries = allLeads.filter(l => l.location && l.location !== 'Unknown, Unknown, Unknown').map(l => l.location.split(', ').pop());
        const countryCounts = countries.reduce((acc, c) => { acc[c] = (acc[c] || 0) + 1; return acc; }, {});
        const topCountry = Object.keys(countryCounts).length > 0 ? 
            Object.keys(countryCounts).reduce((a, b) => countryCounts[a] > countryCounts[b] ? a : b) : '-';
        document.getElementById('kpi-top-country').innerText = topCountry;

        const prizes = allLeads.filter(l => l.result && l.result !== 'Pending' && l.result !== 'BETTER LUCK' && l.result !== 'FREE SPIN').map(l => l.result);
        const prizeCounts = prizes.reduce((acc, p) => { acc[p] = (acc[p] || 0) + 1; return acc; }, {});
        const topPrize = Object.keys(prizeCounts).length > 0 ? 
            Object.keys(prizeCounts).reduce((a, b) => prizeCounts[a] > prizeCounts[b] ? a : b) : '-';
        document.getElementById('kpi-top-prize').innerText = topPrize;
    }

    let leadsChart, deviceChart;
    function initCharts() {
        const ctxLeads = document.getElementById('leadsChart').getContext('2d');
        const ctxDevice = document.getElementById('deviceChart').getContext('2d');

        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        const visitorCounts = last7Days.map(date => 
            allLeads.filter(l => l.timestamp.startsWith(date)).length
        );

        const emailCounts = last7Days.map(date => 
            new Set(allLeads.filter(l => l.timestamp.startsWith(date) && l.email !== 'Anonymous').map(l => l.email)).size
        );

        if (leadsChart) leadsChart.destroy();
        leadsChart = new Chart(ctxLeads, {
            type: 'line',
            data: {
                labels: last7Days,
                datasets: [
                    { label: 'Visitors', data: visitorCounts, borderColor: '#6366F1', backgroundColor: 'rgba(99, 102, 241, 0.1)', fill: true, tension: 0.4 },
                    { label: 'Emails', data: emailCounts, borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: true, labels: { color: '#94A3B8' } } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });

        const devices = allLeads.map(l => l.device || 'Desktop');
        const deviceCounts = ['Desktop', 'Mobile', 'Tablet'].map(type => 
            devices.filter(d => d === type).length
        );

        if (deviceChart) deviceChart.destroy();
        deviceChart = new Chart(ctxDevice, {
            type: 'doughnut',
            data: {
                labels: ['Desktop', 'Mobile', 'Tablet'],
                datasets: [{ data: deviceCounts, backgroundColor: ['#6366F1', '#A855F7', '#F59E0B'], borderWidth: 0 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { color: '#94A3B8' } } }
            }
        });
    }

    function populateFilters() {
        const countries = [...new Set(allLeads.filter(l => l.location && l.location !== 'Unknown, Unknown, Unknown').map(l => l.location.split(', ').pop()))];
        const select = document.getElementById('filter-country');
        if (select) select.innerHTML = '<option value="">All Countries</option>' + countries.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    window.sortTable = function(key) {
        if (sortConfig.key === key) {
            sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
        } else {
            sortConfig.key = key;
            sortConfig.direction = 'asc';
        }
        renderTable();
    };

    function renderTable() {
        const searchTerm = document.getElementById('lead-search').value.toLowerCase();
        const countryFilter = document.getElementById('filter-country').value;
        const deviceFilter = document.getElementById('filter-device').value;

        filteredLeads = allLeads.filter(l => {
            const matchesSearch = l.email.toLowerCase().includes(searchTerm) || (l.location && l.location.toLowerCase().includes(searchTerm));
            const matchesCountry = !countryFilter || (l.location && l.location.endsWith(countryFilter));
            const matchesDevice = !deviceFilter || (l.device || 'Desktop') === deviceFilter;
            return matchesSearch && matchesCountry && matchesDevice;
        });

        filteredLeads.sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];
            if (sortConfig.key === 'timestamp') { valA = new Date(valA); valB = new Date(valB); }
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        const tbody = document.getElementById('leads-body');
        const emptyMsg = document.getElementById('empty-msg');

        if (filteredLeads.length === 0) {
            tbody.innerHTML = '';
            emptyMsg.style.display = 'block';
            return;
        }

        emptyMsg.style.display = 'none';
        tbody.innerHTML = filteredLeads.map(l => `
            <tr>
                <td>${new Date(l.timestamp).toLocaleString()}</td>
                <td style="font-weight: 600; color: ${l.email === 'Anonymous' ? 'var(--text-muted)' : 'var(--primary)'};">
                    ${maskEmail(l.email)}
                </td>

                <td><span class="badge">${l.location || 'Unknown'}</span></td>
                <td><span class="badge">${l.device || 'Desktop'}</span></td>
                <td>${l.result && l.result !== 'Pending' ? `<span class="badge badge-success">${l.result}</span>` : `<span class="badge badge-warning">Pending</span>`}</td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="viewDetails('${l.id}')">View</button>
                </td>
            </tr>
        `).join('');
    }

    function renderEmailTable() {
        const searchTerm = document.getElementById('email-search').value.toLowerCase();
        const emails = {};
        allLeads.forEach(l => {
            if (l.email === 'Anonymous') return;
            if (!emails[l.email]) {
                emails[l.email] = { email: l.email, domain: l.email.split('@')[1], capturedAt: l.timestamp, lastResult: l.result || 'Pending', id: l.id };
            } else if (new Date(l.timestamp) > new Date(emails[l.email].capturedAt)) {
                emails[l.email].capturedAt = l.timestamp; emails[l.email].lastResult = l.result || 'Pending'; emails[l.email].id = l.id;
            }
        });

        const emailList = Object.values(emails).filter(e => e.email.toLowerCase().includes(searchTerm));
        const tbody = document.getElementById('email-body');
        if (!tbody) return;
        
        tbody.innerHTML = emailList.map(e => `
            <tr>
                <td style="font-weight: 600; color: var(--primary);">${maskEmail(e.email)}</td>
                <td><span class="badge">${e.domain}</span></td>
                <td>${new Date(e.capturedAt).toLocaleString()}</td>
                <td><span class="badge ${e.lastResult !== 'Pending' ? 'badge-success' : 'badge-warning'}">${e.lastResult}</span></td>
                <td><button class="btn btn-primary btn-sm" onclick="viewDetails('${e.id}')">History</button></td>
            </tr>
        `).join('');

    }

    // Refresh visitor button (Dernier Visiteur)
    const refreshVisitorBtn = document.getElementById('refresh-visitor');
    if (refreshVisitorBtn) {
        refreshVisitorBtn.addEventListener('click', async () => {
            await fetchLeads();
            await refreshVisitorInfo();
        });
    }

    document.getElementById('lead-search').addEventListener('input', renderTable);
    document.getElementById('email-search').addEventListener('input', renderEmailTable);
    document.getElementById('filter-country').addEventListener('change', renderTable);
    document.getElementById('filter-device').addEventListener('change', renderTable);

    window.viewDetails = function(id) {
        const lead = allLeads.find(l => l.id === id);
        if (!lead) return;

        const modal = document.getElementById('user-modal');
        const body = document.getElementById('modal-body');
        
        body.innerHTML = `
            <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${maskEmail(lead.email)}</span></div>

            <div class="detail-row"><span class="detail-label">IP Address</span><span class="detail-value">${lead.ip}</span></div>
            <div class="detail-row"><span class="detail-label">Location</span><span class="detail-value">${lead.location}</span></div>
            <div class="detail-row"><span class="detail-label">OS / Platform</span><span class="detail-value">${lead.os || 'Unknown'}</span></div>
            <div class="detail-row"><span class="detail-label">Browser</span><span class="detail-value">${lead.browser || 'Unknown'}</span></div>
            <div class="detail-row"><span class="detail-label">Device Type</span><span class="detail-value">${lead.device || 'Desktop'}</span></div>
            <div class="detail-row"><span class="detail-label">Resolution</span><span class="detail-value">${lead.screen}</span></div>
            <div class="detail-row"><span class="detail-label">Referrer</span><span class="detail-value">${lead.referrer}</span></div>
            <div class="detail-row" style="margin-top: 1rem; border-top: 2px solid var(--glass-border); padding-top: 1rem;">
                <span class="detail-label">Win Result</span><span class="detail-value" style="color: var(--success);">${lead.result || 'None'}</span>
            </div>
            <div class="detail-row"><span class="detail-label">Promo Code</span><span class="detail-value" style="font-family: monospace;">${lead.code || 'N/A'}</span></div>
        `;
        modal.style.display = 'flex';
    };

    window.closeModal = function() { document.getElementById('user-modal').style.display = 'none'; };

    // --- Export & Reset Logic ---
    document.getElementById('export-csv').addEventListener('click', () => {
        if (allLeads.length === 0) return;
        const headers = ['Email', 'Timestamp', 'IP', 'Location', 'Device', 'Browser', 'OS', 'Result', 'Code'];
        const csv = [headers.join(','), ...allLeads.map(l => [
            `"${l.email}"`, `"${l.timestamp}"`, `"${l.ip}"`, `"${l.location}"`, `"${l.device || 'Desktop'}"`, `"${l.browser}"`, `"${l.os}"`, `"${l.result}"`, `"${l.code}"`
        ].join(','))].join('\n');
        downloadFile(csv, 'leads_export.csv', 'text/csv');
    });

    document.getElementById('export-json').addEventListener('click', () => {
        if (allLeads.length === 0) return;
        downloadFile(JSON.stringify(allLeads, null, 2), 'leads_export.json', 'application/json');
    });

    function downloadFile(content, fileName, contentType) {
        const a = document.createElement('a');
        const file = new Blob([content], { type: contentType });
        a.href = URL.createObjectURL(file); a.download = fileName; a.click();
    }

    document.getElementById('clear-leads').addEventListener('click', async () => {
        if (confirm('Permanently delete all leads from the cloud?')) {
            try {
                const { error } = await supabase.from('leads').delete().neq('id', '00000000-0000-0000-0000-000000000000'); 
                if (!error) { allLeads = []; renderTable(); updateKPIs(); initCharts(); }
            } catch (err) {}
        }
    });

    // --- Wheel Configuration Logic ---
    async function loadConfig() {
        const configBody = document.getElementById('config-body');
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

        try {
            const { data, error } = await supabase.from('system_config').select('*').eq('key', 'wheel_segments').single();
            let segments = (!error && data && data.value) ? data.value : defaultSegments;

            if (!Array.isArray(segments) || segments.length === 0) segments = defaultSegments;

            const totalWeight = segments.reduce((sum, s) => sum + (parseInt(s.weight) || 0), 0);
            configBody.innerHTML = segments.map((seg, i) => {
                const prob = totalWeight > 0 ? ((seg.weight / totalWeight) * 100).toFixed(1) : 0;
                return `
                <tr data-index="${i}">
                    <td><input type="text" class="cfg-input cfg-label" value="${seg.label}" style="width: 140px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); padding: 0.5rem; border-radius: 8px; color: white;"></td>
                    <td><input type="text" class="cfg-input cfg-icon" value="${seg.icon}" style="width: 50px; text-align: center; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); padding: 0.5rem; border-radius: 8px; color: white;"></td>
                    <td><input type="number" class="cfg-input cfg-weight" value="${seg.weight}" oninput="updateProbabilities()" style="width: 70px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); padding: 0.5rem; border-radius: 8px; color: white;"></td>
                    <td><span class="cfg-prob" style="font-family: monospace; color: var(--text-muted);">${prob}%</span></td>
                    <td><input type="text" class="cfg-input cfg-code" value="${seg.code}" style="width: 140px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); padding: 0.5rem; border-radius: 8px; color: white;"></td>
                    <td><input type="color" class="cfg-input cfg-color" value="${seg.color}" style="background: none; border: none; height: 35px; width: 35px; cursor: pointer;"></td>
                    <td><button class="btn btn-secondary btn-sm" onclick="this.closest('tr').remove(); updateProbabilities();" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.2);">Delete</button></td>
                </tr>`;
            }).join('');
        } catch (err) {
            console.warn('Wheel config fetch failed (likely RLS/406). Using defaults:', err);
            configBody.innerHTML = defaultSegments.map((seg, i) => {
                const prob = (defaultSegments[i].weight / defaultSegments.reduce((s, x) => s + x.weight, 0)) * 100;
                return `
                <tr data-index="${i}">
                    <td><input type="text" class="cfg-input cfg-label" value="${seg.label}" style="width: 140px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); padding: 0.5rem; border-radius: 8px; color: white;"></td>
                    <td><input type="text" class="cfg-input cfg-icon" value="${seg.icon}" style="width: 50px; text-align: center; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); padding: 0.5rem; border-radius: 8px; color: white;"></td>
                    <td><input type="number" class="cfg-input cfg-weight" value="${seg.weight}" oninput="updateProbabilities()" style="width: 70px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); padding: 0.5rem; border-radius: 8px; color: white;"></td>
                    <td><span class="cfg-prob" style="font-family: monospace; color: var(--text-muted);">${prob.toFixed(1)}%</span></td>
                    <td><input type="text" class="cfg-input cfg-code" value="${seg.code}" style="width: 140px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); padding: 0.5rem; border-radius: 8px; color: white;"></td>
                    <td><input type="color" class="cfg-input cfg-color" value="${seg.color}" style="background: none; border: none; height: 35px; width: 35px; cursor: pointer;"></td>
                    <td><button class="btn btn-secondary btn-sm" onclick="this.closest('tr').remove(); updateProbabilities();" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.2);">Delete</button></td>
                </tr>`;
            }).join('');
        }
    }

    document.getElementById('save-config').addEventListener('click', async () => {
        const rows = document.querySelectorAll('#config-body tr');
        const newConfig = Array.from(rows).map(row => ({
            label: row.querySelector('.cfg-label').value,
            icon: row.querySelector('.cfg-icon').value,
            weight: parseInt(row.querySelector('.cfg-weight').value) || 0,
            code: row.querySelector('.cfg-code').value,
            color: row.querySelector('.cfg-color').value
        }));

        if (newConfig.length < 2) return alert('At least 2 segments required.');

        const btn = document.getElementById('save-config');
        try {
            const { error } = await supabase.from('system_config').upsert({ key: 'wheel_segments', value: newConfig });
            if (!error) {
                btn.innerText = 'SAVED! ✨'; btn.style.background = 'var(--success)';
                setTimeout(() => { btn.innerText = 'Save All Changes'; btn.style.background = ''; loadConfig(); }, 2000);
            }
        } catch (err) { alert("Failed to save wheel config."); }
    });

    window.updateProbabilities = function() {
        const weights = Array.from(document.querySelectorAll('.cfg-weight')).map(input => parseInt(input.value) || 0);
        const total = weights.reduce((a, b) => a + b, 0);
        const probSpans = document.querySelectorAll('.cfg-prob');
        weights.forEach((w, i) => { if (probSpans[i]) probSpans[i].innerText = (total > 0 ? ((w / total) * 100).toFixed(1) : 0) + '%'; });
    };

    window.addSegment = function() {
        const configBody = document.getElementById('config-body');
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td><input type="text" class="cfg-input cfg-label" value="NEW REWARD" style="width: 140px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); padding: 0.5rem; border-radius: 8px; color: white;"></td>
            <td><input type="text" class="cfg-input cfg-icon" value="🎁" style="width: 50px; text-align: center; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); padding: 0.5rem; border-radius: 8px; color: white;"></td>
            <td><input type="number" class="cfg-input cfg-weight" value="10" oninput="updateProbabilities()" style="width: 70px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); padding: 0.5rem; border-radius: 8px; color: white;"></td>
            <td><span class="cfg-prob" style="font-family: monospace; color: var(--text-muted);">0%</span></td>
            <td><input type="text" class="cfg-input cfg-code" value="PROMO123" style="width: 140px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); padding: 0.5rem; border-radius: 8px; color: white;"></td>
            <td><input type="color" class="cfg-input cfg-color" value="#6366F1" style="background: none; border: none; height: 35px; width: 35px; cursor: pointer;"></td>
            <td><button class="btn btn-secondary btn-sm" onclick="this.closest('tr').remove(); updateProbabilities();" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.2);">Delete</button></td>
        `;
        configBody.appendChild(newRow);
        updateProbabilities();
    };

    window.resetConfig = async function() {
        if (confirm('Reset wheel to default segments?')) {
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
            try {
                const { error } = await supabase.from('system_config').upsert({ key: 'wheel_segments', value: defaultSegments });
                if (!error) loadConfig();
            } catch (err) {}
        }
    };
});