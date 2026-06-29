document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('tracker-form');
    const tableBody = document.getElementById('table-body');
    const clearBtn = document.getElementById('clear-data-btn');
    const exportBtn = document.getElementById('export-btn');
    
    // Stats Elements
    const totalIacEl = document.getElementById('total-iac');
    const totalTroubleshootEl = document.getElementById('total-troubleshoot');
    const avgPrepEl = document.getElementById('avg-prep');

    // Chart instances
    let progressChartInstance = null;
    let distributionChartInstance = null;

    // State
    let logs = JSON.parse(localStorage.getItem('julyDevOpsLogs')) || [];

    // Initialize
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Inter', sans-serif";
    
    updateUI();

    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;

    // Handle Form Submit
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const date = document.getElementById('date').value;
        
        // Check if date already exists
        const existingIndex = logs.findIndex(log => log.date === date);
        
        const newLog = {
            id: Date.now().toString(),
            date: date,
            prepTime: parseFloat(document.getElementById('prepTime').value),
            screenTime: parseFloat(document.getElementById('screenTime').value),
            discipline: parseInt(document.getElementById('discipline').value),
            iacTime: parseFloat(document.getElementById('iacTime').value),
            k8sTime: parseFloat(document.getElementById('k8sTime').value),
            sysDesignTime: parseFloat(document.getElementById('sysDesignTime').value),
            troubleshoot: parseInt(document.getElementById('troubleshoot').value),
            sleep: parseFloat(document.getElementById('sleep').value),
            energy: parseInt(document.getElementById('energy').value),
            confidence: document.getElementById('confidence').value,
            mockInterview: document.getElementById('mockInterview').value,
            naukriResume: document.getElementById('naukriResume').value,
            jobsApplied: parseInt(document.getElementById('jobsApplied').value),
            lesson: document.getElementById('lesson').value
        };

        if (existingIndex >= 0) {
            if(confirm('An entry for this date already exists. Overwrite?')) {
                logs[existingIndex] = newLog;
            } else {
                return;
            }
        } else {
            logs.push(newLog);
        }

        // Sort by date (oldest to newest for charts)
        logs.sort((a, b) => new Date(a.date) - new Date(b.date));

        saveData();
        updateUI();
        
        // Don't reset date on submit
        const currentDate = document.getElementById('date').value;
        form.reset();
        document.getElementById('date').value = currentDate;
    });

    // Handle Clear All Data
    clearBtn.addEventListener('click', () => {
        if (logs.length === 0) return;
        if (confirm('Are you sure you want to delete all tracking data? This cannot be undone.')) {
            logs = [];
            saveData();
            updateUI();
        }
    });

    // Handle CSV Export
    exportBtn.addEventListener('click', () => {
        if (logs.length === 0) {
            alert('No data to export!');
            return;
        }

        const headers = ['Date', 'Total Prep (h)', 'Screen Time (h)', 'Discipline', 'IaC (h)', 'K8s (h)', 'Sys Design (h)', 'Troubleshoot Scenarios', 'Sleep (h)', 'Energy', 'Confidence', 'Mock Interview', 'Naukri Update', 'Jobs Applied', 'Key Takeaway'];
        
        const csvRows = [];
        csvRows.push(headers.join(','));

        logs.forEach(log => {
            const values = [
                log.date,
                log.prepTime,
                log.screenTime,
                log.discipline,
                log.iacTime,
                log.k8sTime,
                log.sysDesignTime,
                log.troubleshoot,
                log.sleep,
                log.energy,
                log.confidence,
                log.mockInterview,
                log.naukriResume || 'No',
                log.jobsApplied || 0,
                `"${log.lesson.replace(/"/g, '""')}"` // Escape quotes in text
            ];
            csvRows.push(values.join(','));
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', 'July_AWS_DevOps_Prep.csv');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });

    // Handle Individual Delete
    window.deleteLog = (id) => {
        if (confirm('Delete this entry?')) {
            logs = logs.filter(log => log.id !== id);
            saveData();
            updateUI();
        }
    };

    function saveData() {
        localStorage.setItem('julyDevOpsLogs', JSON.stringify(logs));
    }

    function updateUI() {
        renderTable();
        calculateStats();
        renderCharts();
    }

    function renderTable() {
        tableBody.innerHTML = '';
        
        if (logs.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="11" style="text-align: center; color: var(--text-secondary);">No data logged yet. Start preparing!</td></tr>';
            return;
        }

        // Reverse to show newest on top in the table
        const tableLogs = [...logs].reverse();

        tableLogs.forEach(log => {
            const tr = document.createElement('tr');
            let confidenceClass = log.confidence.toLowerCase();

            tr.innerHTML = `
                <td>${formatDate(log.date)}</td>
                <td>${log.prepTime}</td>
                <td>${log.screenTime}</td>
                <td>${log.discipline}/10</td>
                <td>${log.iacTime + log.k8sTime}</td>
                <td>${log.sysDesignTime}</td>
                <td>${log.troubleshoot}</td>
                <td>${log.energy}/10</td>
                <td><span class="badge ${confidenceClass}">${log.confidence}</span></td>
                <td>${log.naukriResume || 'No'}</td>
                <td>${log.jobsApplied || 0}</td>
                <td style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${log.lesson}">${log.lesson}</td>
                <td>
                    <button class="delete-btn" onclick="deleteLog('${log.id}')" title="Delete">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    function calculateStats() {
        if (logs.length === 0) {
            totalIacEl.textContent = '0h';
            totalTroubleshootEl.textContent = '0';
            avgPrepEl.textContent = '0h';
            return;
        }

        const totals = logs.reduce((acc, log) => {
            acc.iac += (log.iacTime + log.k8sTime);
            acc.troubleshoot += log.troubleshoot;
            acc.prep += log.prepTime;
            return acc;
        }, { iac: 0, troubleshoot: 0, prep: 0 });

        totalIacEl.textContent = `${totals.iac}h`;
        totalTroubleshootEl.textContent = `${totals.troubleshoot}`;
        avgPrepEl.textContent = `${(totals.prep / logs.length).toFixed(1)}h`;
    }

    function renderCharts() {
        if (progressChartInstance) progressChartInstance.destroy();
        if (distributionChartInstance) distributionChartInstance.destroy();

        if (logs.length === 0) return;

        const labels = logs.map(log => formatDate(log.date));
        const prepData = logs.map(log => log.prepTime);
        const screenData = logs.map(log => log.screenTime);
        const disciplineData = logs.map(log => log.discipline);

        // Progress Chart (Line/Bar hybrid)
        const ctxProgress = document.getElementById('progressChart').getContext('2d');
        progressChartInstance = new Chart(ctxProgress, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        type: 'line',
                        label: 'Discipline (1-10)',
                        data: disciplineData,
                        borderColor: '#10b981',
                        backgroundColor: '#10b981',
                        borderWidth: 2,
                        yAxisID: 'y1',
                    },
                    {
                        type: 'bar',
                        label: 'Prep Time (h)',
                        data: prepData,
                        backgroundColor: 'rgba(59, 130, 246, 0.7)',
                        yAxisID: 'y',
                    },
                    {
                        type: 'bar',
                        label: 'Screen Time (h)',
                        data: screenData,
                        backgroundColor: 'rgba(239, 68, 68, 0.7)',
                        yAxisID: 'y',
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Hours' }
                    },
                    y1: {
                        beginAtZero: true,
                        max: 10,
                        position: 'right',
                        title: { display: true, text: 'Score' },
                        grid: { drawOnChartArea: false }
                    }
                }
            }
        });

        // Time Distribution Chart (Doughnut)
        const totalIac = logs.reduce((sum, log) => sum + log.iacTime, 0);
        const totalK8s = logs.reduce((sum, log) => sum + log.k8sTime, 0);
        const totalSys = logs.reduce((sum, log) => sum + log.sysDesignTime, 0);
        
        const ctxDist = document.getElementById('distributionChart').getContext('2d');
        distributionChartInstance = new Chart(ctxDist, {
            type: 'doughnut',
            data: {
                labels: ['IaC/Terraform', 'K8s/CI-CD', 'System Design'],
                datasets: [{
                    data: [totalIac, totalK8s, totalSys],
                    backgroundColor: [
                        '#f59e0b', // warning orange
                        '#3b82f6', // primary blue
                        '#8b5cf6'  // purple
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }

    function formatDate(dateString) {
        const options = { month: 'short', day: 'numeric' };
        const [year, month, day] = dateString.split('-');
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('en-US', options);
    }
});
