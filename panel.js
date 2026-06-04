document.addEventListener('DOMContentLoaded', () => {
    // --- State & Config ---
    let allLeads = JSON.parse(localStorage.getItem('spin_win_leads') || '[]');
    let filteredLeads = [...allLeads];
    let sortConfig = { key: 'timestamp', direction: 'desc' };
    
    // Auth Credentials
    const ADMIN_PASSWORD = 'admin';
    const ADMIN_EMAIL = 'neosafi5@gmail.com';
    let currentAccessCode = localStorage.getItem('admin_access_code') || '1234'; // Default fallback

    // --- Authentication ---
    const loginOverlay = document.getElementById('login-overlay');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const requestCodeBtn = document.getElementById('request-code-btn');
    const emailStatus = document.getElementById('email-status');

    function checkAuth() {
        if (sessionStorage.getItem('admin_authenticated') === 'true') {
            loginOverlay.style.display = 'none';
            initDashboard();
        }
    }

    // Generate and Send Code
    requestCodeBtn.addEventListener('click', async () => {
        // Generate a 6-digit code
        const newCode = Math.floor(100000 + Math.random() * 900000).toString();
        currentAccessCode = newCode;
        localStorage.setItem('admin_access_code', newCode);

        requestCodeBtn.innerText = 'SENDING...';
        requestCodeBtn.disabled = true;

        // --- ACTUAL EMAIL SENDING LOGIC ---
        const web3FormsKey = 'e042bf59-0262-4fbb-a17f-e42b61f2574d'; 

        try {
            const response = await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    access_key: web3FormsKey,
                    subject: '🔒 SECURE ACCESS CODE - Analytics Dashboard',
                    from_name: 'Premium Spin Security',
                    message: `SECURITY PROTOCOL V2.1\n\nYour temporary access code is: ${newCode}\n\nIf you did not request this code, please ignore this email.`,
                    email: ADMIN_EMAIL
                })
            });

            const result = await response.json();

            if (result.success) {
                requestCodeBtn.innerText = 'CODE SENT!';
                emailStatus.style.display = 'block';
                emailStatus.style.color = 'var(--success)';
                emailStatus.innerText = '✔ Code sent to your inbox.';
            } else {
                throw new Error('Delivery failed');
            }

        } catch (error) {
            console.error('Email delivery error:', error);
            requestCodeBtn.innerText = 'ERROR SENDING';
            emailStatus.style.display = 'block';
            emailStatus.style.color = '#ef4444';
            emailStatus.innerText = '⚠ System busy. Try emergency bypass.';
        }

        setTimeout(() => {
            requestCodeBtn.disabled = false;
            requestCodeBtn.innerText = `Request Code to ${ADMIN_EMAIL}`;
        }, 3000);
    });

    // Hidden Bypass: Click the "Secure Access" title 5 times to see current code
    let clickCount = 0;
    document.querySelector('#login-overlay h2').addEventListener('click', () => {
        clickCount++;
        if (clickCount >= 5) {
            alert(`EMERGENCY BYPASS:\nCurrent Access Code: ${currentAccessCode}`);
            clickCount = 0;
        }
    });

    loginBtn.addEventListener('click', () => {
        const pass = document.getElementById('admin-password').value;
        const code = document.getElementById('option-code').value;
        
        // Validate against password AND the dynamically generated code
        if (pass === ADMIN_PASSWORD && code === currentAccessCode) {
            sessionStorage.setItem('admin_authenticated', 'true');
            loginOverlay.style.display = 'none';
            initDashboard();
        } else {
            const errorEl = document.getElementById('login-error');
            errorEl.style.display = 'block';
            errorEl.classList.add('stagger-up');
            setTimeout(() => errorEl.classList.remove('stagger-up'), 500);
        }
    });

    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('admin_authenticated');
        window.location.reload();
    });

    checkAuth();

    // --- Dashboard Initialization ---
    function initDashboard() {
        updateKPIs();
        initCharts();
        populateFilters();
        renderTable();
        loadConfig();
    }

    // --- KPI Logic ---
    function updateKPIs() {
        document.getElementById('kpi-total-leads').innerText = allLeads.length;
        
        // Conversion Rate (Mocked since we don't track page views yet)
        // In a real app, you'd track sessions. Here we'll show unique emails.
        const uniqueEmails = new Set(allLeads.map(l => l.email)).size;
        document.getElementById('kpi-conv-rate').innerText = allLeads.length > 0 ? 
            Math.round((uniqueEmails / allLeads.length) * 100) + '%' : '0%';

        // Top Country
        const countries = allLeads.map(l => l.location.split(', ').pop());
        const countryCounts = countries.reduce((acc, c) => { acc[c] = (acc[c] || 0) + 1; return acc; }, {});
        const topCountry = Object.keys(countryCounts).reduce((a, b) => countryCounts[a] > countryCounts[b] ? a : b, '-');
        document.getElementById('kpi-top-country').innerText = topCountry;

        // Top Prize
        const prizes = allLeads.filter(l => l.result && l.result !== 'Pending' && l.result !== 'BETTER LUCK').map(l => l.result);
        const prizeCounts = prizes.reduce((acc, p) => { acc[p] = (acc[p] || 0) + 1; return acc; }, {});
        const topPrize = Object.keys(prizeCounts).reduce((a, b) => prizeCounts[a] > prizeCounts[b] ? a : b, '-');
        document.getElementById('kpi-top-prize').innerText = topPrize;
    }

    // --- Chart Logic ---
    let leadsChart, deviceChart;

    function initCharts() {
        const ctxLeads = document.getElementById('leadsChart').getContext('2d');
        const ctxDevice = document.getElementById('deviceChart').getContext('2d');

        // Lead Timeline (Last 7 Days)
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        const leadCounts = last7Days.map(date => 
            allLeads.filter(l => l.timestamp.startsWith(date)).length
        );

        if (leadsChart) leadsChart.destroy();
        leadsChart = new Chart(ctxLeads, {
            type: 'line',
            data: {
                labels: last7Days,
                datasets: [{
                    label: 'New Leads',
                    data: leadCounts,
                    borderColor: '#6366F1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });

        // Device Distro
        const devices = allLeads.map(l => l.device || 'Desktop');
        const deviceCounts = ['Desktop', 'Mobile', 'Tablet'].map(type => 
            devices.filter(d => d === type).length
        );

        if (deviceChart) deviceChart.destroy();
        deviceChart = new Chart(ctxDevice, {
            type: 'doughnut',
            data: {
                labels: ['Desktop', 'Mobile', 'Tablet'],
                datasets: [{
                    data: deviceCounts,
                    backgroundColor: ['#6366F1', '#A855F7', '#F59E0B'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { color: '#94A3B8' } } }
            }
        });
    }

    // --- Table & Filtering ---
    function populateFilters() {
        const countries = [...new Set(allLeads.map(l => l.location.split(', ').pop()))];
        const select = document.getElementById('filter-country');
        select.innerHTML = '<option value="">All Countries</option>' + 
            countries.map(c => `<option value="${c}">${c}</option>`).join('');
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
            const matchesSearch = l.email.toLowerCase().includes(searchTerm) || 
                                 l.location.toLowerCase().includes(searchTerm);
            const matchesCountry = !countryFilter || l.location.endsWith(countryFilter);
            const matchesDevice = !deviceFilter || (l.device || 'Desktop') === deviceFilter;
            return matchesSearch && matchesCountry && matchesDevice;
        });

        filteredLeads.sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];
            if (sortConfig.key === 'timestamp') {
                valA = new Date(valA);
                valB = new Date(valB);
            }
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
                <td style="font-weight: 600; color: var(--primary);">${l.email}</td>
                <td><span class="badge">${l.location}</span></td>
                <td><span class="badge">${l.device || 'Desktop'}</span></td>
                <td>${l.result && l.result !== 'Pending' ? `<span class="badge badge-success">${l.result}</span>` : `<span class="badge badge-warning">Pending</span>`}</td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="viewDetails('${l.email}', '${l.timestamp}')">View</button>
                </td>
            </tr>
        `).join('');
    }

    // --- Search & Filter Events ---
    document.getElementById('lead-search').addEventListener('input', renderTable);
    document.getElementById('filter-country').addEventListener('change', renderTable);
    document.getElementById('filter-device').addEventListener('change', renderTable);

    // --- Modal Logic ---
    window.viewDetails = function(email, timestamp) {
        const lead = allLeads.find(l => l.email === email && l.timestamp === timestamp);
        if (!lead) return;

        const modal = document.getElementById('user-modal');
        const body = document.getElementById('modal-body');
        
        body.innerHTML = `
            <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${lead.email}</span></div>
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

    window.closeModal = function() {
        document.getElementById('user-modal').style.display = 'none';
    };

    // --- Export Logic ---
    document.getElementById('export-csv').addEventListener('click', () => {
        if (allLeads.length === 0) return;
        const headers = ['Email', 'Timestamp', 'IP', 'Location', 'Device', 'Browser', 'OS', 'Result', 'Code'];
        const csv = [headers.join(','), ...allLeads.map(l => [
            `"${l.email}"`, `"${l.timestamp}"`, `"${l.ip}"`, `"${l.location}"`, 
            `"${l.device || 'Desktop'}"`, `"${l.browser}"`, `"${l.os}"`, `"${l.result}"`, `"${l.code}"`
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
        a.href = URL.createObjectURL(file);
        a.download = fileName;
        a.click();
    }

    document.getElementById('clear-leads').addEventListener('click', () => {
        if (confirm('Permanently delete all leads?')) {
            localStorage.removeItem('spin_win_leads');
            allLeads = [];
            renderTable();
            updateKPIs();
            initCharts();
        }
    });

    // --- Wheel Config Logic ---
    const DEFAULT_SEGMENTS = [
        { label: '100% OFF', color: '#6366F1', weight: 2, icon: '🔥', code: 'ZQYB214RZC' },
        { label: 'FREE PRODUCT', color: '#8B5CF6', weight: 3, icon: '🎁', code: 'FREEGIFT' },
        { label: 'FREE SPIN', color: '#EC4899', weight: 15, icon: '🔄', code: 'RETRY' },
        { label: '50% OFF', color: '#1E293B', weight: 5, icon: '💸', code: 'U7LUI0MZ9Q' },
        { label: 'BETTER LUCK', color: '#0F172A', weight: 35, icon: '😢', code: 'TRYAGAIN' },
        { label: 'BUNDLE', color: '#10B981', weight: 5, icon: '📦', code: 'BUNDLE' },
        { label: '25% OFF', color: '#1E293B', weight: 25, icon: '🏷️', code: 'LBVFFODD9Z' },
        { label: 'MYSTERY', color: '#4F46E5', weight: 10, icon: '💎', code: 'MYSTERY' }
    ];

    function loadConfig() {
        const configBody = document.getElementById('config-body');
        const segments = JSON.parse(localStorage.getItem('spin_win_config') || JSON.stringify(DEFAULT_SEGMENTS));
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
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="removeSegment(${i})" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.2);">Delete</button>
                </td>
            </tr>
            `;
        }).join('');
    }

    window.updateProbabilities = function() {
        const weights = Array.from(document.querySelectorAll('.cfg-weight')).map(input => parseInt(input.value) || 0);
        const total = weights.reduce((a, b) => a + b, 0);
        const probSpans = document.querySelectorAll('.cfg-prob');
        
        weights.forEach((w, i) => {
            const p = total > 0 ? ((w / total) * 100).toFixed(1) : 0;
            probSpans[i].innerText = p + '%';
        });
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
            <td>
                <button class="btn btn-secondary btn-sm" onclick="this.closest('tr').remove(); updateProbabilities();" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.2);">Delete</button>
            </td>
        `;
        configBody.appendChild(newRow);
        updateProbabilities();
    };

    window.removeSegment = function(index) {
        if (confirm('Delete this segment?')) {
            const rows = document.querySelectorAll('#config-body tr');
            rows[index].remove();
        }
    };

    window.resetConfig = function() {
        if (confirm('Reset wheel to default settings? This will overwrite your current configuration.')) {
            localStorage.setItem('spin_win_config', JSON.stringify(DEFAULT_SEGMENTS));
            loadConfig();
        }
    };

    document.getElementById('save-config').addEventListener('click', () => {
        const rows = document.querySelectorAll('#config-body tr');
        const newConfig = Array.from(rows).map(row => ({
            label: row.querySelector('.cfg-label').value,
            icon: row.querySelector('.cfg-icon').value,
            weight: parseInt(row.querySelector('.cfg-weight').value) || 0,
            code: row.querySelector('.cfg-code').value,
            color: row.querySelector('.cfg-color').value
        }));

        if (newConfig.length < 2) {
            alert('The wheel must have at least 2 segments.');
            return;
        }

        localStorage.setItem('spin_win_config', JSON.stringify(newConfig));
        
        const btn = document.getElementById('save-config');
        btn.innerText = 'SAVED! ✨';
        btn.style.background = 'var(--success)';
        setTimeout(() => {
            btn.innerText = 'Save All Changes';
            btn.style.background = '';
            loadConfig(); // Refresh indexes
        }, 2000);
    });
});
