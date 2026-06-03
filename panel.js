document.addEventListener('DOMContentLoaded', () => {
    const leadsBody = document.getElementById('leads-body');
    const emptyMsg = document.getElementById('empty-msg');
    const exportBtn = document.getElementById('export-btn');
    const clearBtn = document.getElementById('clear-leads');
    const table = document.getElementById('leads-table');

    function loadLeads() {
        const leads = JSON.parse(localStorage.getItem('spin_win_leads') || '[]');
        
        if (leads.length === 0) {
            table.style.display = 'none';
            emptyMsg.style.display = 'block';
            exportBtn.disabled = true;
            exportBtn.style.opacity = '0.5';
            return;
        }

        table.style.display = 'table';
        emptyMsg.style.display = 'none';
        exportBtn.disabled = false;
        exportBtn.style.opacity = '1';

        leadsBody.innerHTML = leads.reverse().map(lead => `
            <tr>
                <td style="font-weight: 600; color: var(--primary);">${lead.email}</td>
                <td><span class="badge">${lead.location}</span></td>
                <td><code style="color: var(--text-muted);">${lead.ip}</code></td>
                <td>${lead.platform}</td>
                <td>${new Date(lead.timestamp).toLocaleString()}</td>
                <td>${lead.screen}</td>
            </tr>
        `).join('');
    }

    // --- Wheel Management Logic ---
    const configBody = document.getElementById('config-body');
    const saveConfigBtn = document.getElementById('save-config');

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

    function loadConfig() {
        const segments = JSON.parse(localStorage.getItem('spin_win_config') || JSON.stringify(defaultSegments));
        configBody.innerHTML = segments.map((seg, i) => `
            <tr data-index="${i}">
                <td><input type="text" value="${seg.label}" class="cfg-input cfg-label" style="width: 140px;"></td>
                <td><input type="text" value="${seg.icon}" class="cfg-input cfg-icon" style="width: 40px; text-align: center;"></td>
                <td><input type="number" value="${seg.weight}" class="cfg-input cfg-weight" style="width: 60px;"></td>
                <td><input type="text" value="${seg.code}" class="cfg-input cfg-code" style="width: 150px;"></td>
                <td><input type="color" value="${seg.color}" class="cfg-color"></td>
            </tr>
        `).join('');
    }

    saveConfigBtn.addEventListener('click', () => {
        const newSegments = [];
        document.querySelectorAll('#config-body tr').forEach(row => {
            newSegments.push({
                label: row.querySelector('.cfg-label').value,
                icon: row.querySelector('.cfg-icon').value,
                weight: parseInt(row.querySelector('.cfg-weight').value) || 0,
                code: row.querySelector('.cfg-code').value,
                color: row.querySelector('.cfg-color').value
            });
        });

        localStorage.setItem('spin_win_config', JSON.stringify(newSegments));
        
        saveConfigBtn.innerText = 'SAVED! ✨';
        saveConfigBtn.style.background = 'var(--success)';
        setTimeout(() => {
            saveConfigBtn.innerText = 'Save Changes';
            saveConfigBtn.style.background = '';
        }, 2000);
    });

    // Initial Load
    loadLeads();
    loadConfig();

    // Export Logic
    exportBtn.addEventListener('click', () => {
        const leads = JSON.parse(localStorage.getItem('spin_win_leads') || '[]');
        if (leads.length === 0) return;

        const headers = ['Email', 'Timestamp', 'IP Address', 'Location', 'Browser', 'Platform', 'Language', 'Screen', 'Referrer'];
        const csvRows = [headers.join(',')];

        leads.forEach(lead => {
            const row = [
                `"${lead.email}"`,
                `"${lead.timestamp}"`,
                `"${lead.ip}"`,
                `"${lead.location}"`,
                `"${lead.browser.replace(/"/g, '""')}"`,
                `"${lead.platform}"`,
                `"${lead.language}"`,
                `"${lead.screen}"`,
                `"${lead.referrer}"`
            ];
            csvRows.push(row.join(','));
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `leads_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });

    // Clear Logic
    clearBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to permanently delete all captured leads? This cannot be undone.')) {
            localStorage.removeItem('spin_win_leads');
            loadLeads();
        }
    });
});
