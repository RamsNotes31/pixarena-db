// ================================================
// GAME VAULT - Dashboard JavaScript
// ================================================

let allData = [];
let filteredData = [];
let currentPage = 1;
const rowsPerPage = 15;

// Chart instances
let genreChart, ratingChart, tierChart, topGamesChart;

// Load data on page load
document.addEventListener('DOMContentLoaded', loadData);

async function loadData() {
    try {
        const response = await fetch('./data.csv');
        const csvText = await response.text();
        allData = parseCSV(csvText);
        filteredData = [...allData];
        
        populateFilters();
        updateDashboard();
        
        // Update snapshot date
        if (allData.length > 0 && allData[0].Data_Snapshot_Date) {
            document.getElementById('snapshot-date').textContent = allData[0].Data_Snapshot_Date;
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function parseCSV(csv) {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',');
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        // Handle commas in quoted fields
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let char of lines[i]) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());
        
        if (values.length >= headers.length) {
            const row = {};
            headers.forEach((header, index) => {
                row[header.trim()] = values[index] || '';
            });
            data.push(row);
        }
    }
    return data;
}

function populateFilters() {
    // Genre filter
    const genres = [...new Set(allData.map(d => d.Genre_Cleaned))].sort();
    const genreSelect = document.getElementById('filter-genre');
    genreSelect.innerHTML = '<option value="all">All Genres</option>';
    genres.forEach(genre => {
        if (genre) {
            genreSelect.innerHTML += `<option value="${genre}">${genre}</option>`;
        }
    });
    
    // Rating category filter
    const ratings = [...new Set(allData.map(d => d.Rating_Category))].sort();
    const ratingSelect = document.getElementById('filter-rating');
    ratingSelect.innerHTML = '<option value="all">All Ratings</option>';
    ratings.forEach(rating => {
        if (rating) {
            ratingSelect.innerHTML += `<option value="${rating}">${rating}</option>`;
        }
    });
}

function applyFilters() {
    const genreFilter = document.getElementById('filter-genre').value;
    const tierFilter = document.getElementById('filter-tier').value;
    const ratingFilter = document.getElementById('filter-rating').value;
    const searchFilter = document.getElementById('filter-search').value.toLowerCase();
    
    filteredData = allData.filter(item => {
        const matchGenre = genreFilter === 'all' || item.Genre_Cleaned === genreFilter;
        const matchTier = tierFilter === 'all' || item.Developer_Tier === tierFilter;
        const matchRating = ratingFilter === 'all' || item.Rating_Category === ratingFilter;
        const matchSearch = !searchFilter || item.game_name.toLowerCase().includes(searchFilter);
        
        return matchGenre && matchTier && matchRating && matchSearch;
    });
    
    currentPage = 1;
    updateDashboard();
}

function resetFilters() {
    document.getElementById('filter-genre').value = 'all';
    document.getElementById('filter-tier').value = 'all';
    document.getElementById('filter-rating').value = 'all';
    document.getElementById('filter-search').value = '';
    filteredData = [...allData];
    currentPage = 1;
    updateDashboard();
}

function updateDashboard() {
    updateKPIs();
    updateCharts();
    updateTable();
}

function updateKPIs() {
    const total = filteredData.length;
    const avgRating = total > 0 
        ? (filteredData.reduce((sum, d) => sum + parseFloat(d.rating || 0), 0) / total).toFixed(2)
        : '0.00';
    const topRated = filteredData.filter(d => d.Rating_Category && d.Rating_Category.includes('Top Rated')).length;
    const developers = new Set(filteredData.map(d => d.developer)).size;
    const genres = new Set(filteredData.map(d => d.genre)).size;
    
    animateValue('kpi-total', total);
    document.getElementById('kpi-avg').textContent = avgRating;
    animateValue('kpi-top', topRated);
    animateValue('kpi-devs', developers);
    animateValue('kpi-genres', genres);
}

function animateValue(id, endValue) {
    const element = document.getElementById(id);
    const duration = 500;
    const start = parseInt(element.textContent) || 0;
    const increment = (endValue - start) / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= endValue) || (increment < 0 && current <= endValue)) {
            element.textContent = endValue;
            clearInterval(timer);
        } else {
            element.textContent = Math.round(current);
        }
    }, 16);
}

function updateCharts() {
    updateGenreChart();
    updateRatingChart();
    updateTierChart();
    updateTopGamesChart();
}

function updateGenreChart() {
    const ctx = document.getElementById('genreChart').getContext('2d');
    const genreCounts = {};
    
    filteredData.forEach(d => {
        const genre = d.Genre_Cleaned || 'Unknown';
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    });
    
    const labels = Object.keys(genreCounts);
    const data = Object.values(genreCounts);
    const colors = generateColors(labels.length);
    
    if (genreChart) genreChart.destroy();
    
    genreChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Game Count',
                data: data,
                backgroundColor: colors,
                borderColor: colors.map(c => c.replace('0.7', '1')),
                borderWidth: 2,
                borderRadius: 8,
                barThickness: 30
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#8888aa', font: { family: 'Rajdhani' } }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#8888aa', font: { family: 'Rajdhani' } }
                }
            }
        }
    });
}

function updateRatingChart() {
    const ctx = document.getElementById('ratingChart').getContext('2d');
    const ratingCounts = {};
    
    filteredData.forEach(d => {
        const rating = d.Rating_Category || 'Unknown';
        ratingCounts[rating] = (ratingCounts[rating] || 0) + 1;
    });
    
    const labels = Object.keys(ratingCounts).sort();
    const data = labels.map(l => ratingCounts[l]);
    
    if (ratingChart) ratingChart.destroy();
    
    ratingChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels.map(l => l.replace(/^\d+\.\s*/, '')),
            datasets: [{
                data: data,
                backgroundColor: [
                    'rgba(0, 255, 136, 0.8)',
                    'rgba(0, 245, 255, 0.8)',
                    'rgba(255, 238, 0, 0.8)',
                    'rgba(255, 0, 170, 0.8)'
                ],
                borderColor: '#12121a',
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { 
                        color: '#8888aa', 
                        font: { family: 'Rajdhani', size: 11 },
                        padding: 15
                    }
                }
            }
        }
    });
}

function updateTierChart() {
    const ctx = document.getElementById('tierChart').getContext('2d');
    const tierCounts = { 'AAA Publisher': 0, 'Mid-Tier Publisher': 0, 'Indie Developer': 0 };
    
    filteredData.forEach(d => {
        const tier = d.Developer_Tier;
        if (tierCounts.hasOwnProperty(tier)) {
            tierCounts[tier]++;
        }
    });
    
    if (tierChart) tierChart.destroy();
    
    tierChart = new Chart(ctx, {
        type: 'polarArea',
        data: {
            labels: Object.keys(tierCounts),
            datasets: [{
                data: Object.values(tierCounts),
                backgroundColor: [
                    'rgba(157, 0, 255, 0.7)',
                    'rgba(0, 245, 255, 0.7)',
                    'rgba(0, 255, 136, 0.7)'
                ],
                borderColor: '#12121a',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { 
                        color: '#8888aa', 
                        font: { family: 'Rajdhani', size: 11 },
                        padding: 15
                    }
                }
            },
            scales: {
                r: {
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { display: false }
                }
            }
        }
    });
}

function updateTopGamesChart() {
    const ctx = document.getElementById('topGamesChart').getContext('2d');
    
    const topGames = [...filteredData]
        .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
        .slice(0, 10);
    
    if (topGamesChart) topGamesChart.destroy();
    
    topGamesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topGames.map(g => g.game_name),
            datasets: [{
                label: 'Rating',
                data: topGames.map(g => parseFloat(g.rating)),
                backgroundColor: 'rgba(255, 238, 0, 0.7)',
                borderColor: 'rgba(255, 238, 0, 1)',
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    min: 4,
                    max: 5,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#8888aa', font: { family: 'Rajdhani' } }
                },
                y: {
                    grid: { display: false },
                    ticks: { 
                        color: '#ffffff', 
                        font: { family: 'Rajdhani', size: 11 }
                    }
                }
            }
        }
    });
}

function generateColors(count) {
    const baseColors = [
        'rgba(0, 245, 255, 0.7)',
        'rgba(255, 0, 170, 0.7)',
        'rgba(157, 0, 255, 0.7)',
        'rgba(0, 255, 136, 0.7)',
        'rgba(255, 238, 0, 0.7)',
        'rgba(255, 102, 0, 0.7)',
        'rgba(0, 136, 255, 0.7)',
        'rgba(255, 68, 68, 0.7)',
        'rgba(136, 0, 255, 0.7)',
        'rgba(0, 255, 200, 0.7)'
    ];
    
    const colors = [];
    for (let i = 0; i < count; i++) {
        colors.push(baseColors[i % baseColors.length]);
    }
    return colors;
}

function updateTable() {
    const tbody = document.getElementById('table-body');
    const sortedData = [...filteredData].sort((a, b) => 
        parseInt(a.Global_Rank) - parseInt(b.Global_Rank)
    );
    
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = sortedData.slice(start, end);
    
    tbody.innerHTML = pageData.map(game => {
        const rank = parseInt(game.Global_Rank);
        const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : 'normal';
        const score = parseFloat(game.Rating_Score_100) || 0;
        const scoreClass = score >= 70 ? 'high' : score >= 40 ? 'mid' : 'low';
        const tierClass = game.Developer_Tier === 'AAA Publisher' ? 'aaa' : 
                          game.Developer_Tier === 'Mid-Tier Publisher' ? 'mid' : 'indie';
        const stars = '★'.repeat(Math.floor(parseFloat(game.rating))) + 
                     (parseFloat(game.rating) % 1 >= 0.5 ? '½' : '');
        
        return `
            <tr>
                <td><span class="rank-badge ${rankClass}">${rank}</span></td>
                <td><strong>${game.game_name}</strong></td>
                <td>${game.developer}</td>
                <td>${game.Genre_Cleaned}</td>
                <td>
                    <div class="rating-cell">
                        <span class="stars">${stars}</span>
                        <span class="rating-num">${parseFloat(game.rating).toFixed(1)}</span>
                    </div>
                </td>
                <td>
                    <div class="score-cell">
                        <div class="score-track">
                            <div class="score-bar ${scoreClass}" style="width: ${score}%"></div>
                        </div>
                        <span>${score.toFixed(0)}</span>
                    </div>
                </td>
                <td><span class="type-badge ${tierClass}">${game.Developer_Tier}</span></td>
            </tr>
        `;
    }).join('');
    
    // Update pagination
    const totalPages = Math.ceil(sortedData.length / rowsPerPage);
    document.getElementById('page-info').textContent = `${currentPage} / ${totalPages}`;
    document.getElementById('prev-btn').disabled = currentPage === 1;
    document.getElementById('next-btn').disabled = currentPage >= totalPages;
    document.getElementById('table-count').textContent = filteredData.length;
}

function changePage(direction) {
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    const newPage = currentPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        updateTable();
    }
}

function sortTable(columnIndex) {
    const sortKeys = ['Global_Rank', 'game_name', 'developer', 'Genre_Cleaned', 'rating', 'Rating_Score_100', 'Developer_Tier'];
    const key = sortKeys[columnIndex];
    
    filteredData.sort((a, b) => {
        let valA = a[key];
        let valB = b[key];
        
        // Numeric sort for certain columns
        if (['Global_Rank', 'rating', 'Rating_Score_100'].includes(key)) {
            return parseFloat(valA) - parseFloat(valB);
        }
        
        return String(valA).localeCompare(String(valB));
    });
    
    currentPage = 1;
    updateTable();
}
