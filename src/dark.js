/**
 * Dark Mode Toggle
 */
function DarkChart()
{
    var color = "#ffffff";
    ChangeChartColor(color);
}

function lightChart()
{
    var color = "#000000";
    ChangeChartColor(color);
}

function ChangeChartColor(color)
{
    dateAxis.renderer.grid.template.stroke = am4core.color(color);
    valueAxis.renderer.grid.template.stroke = am4core.color(color);
    dateAxis.renderer.labels.template.fill = am4core.color(color);
    valueAxis.renderer.labels.template.fill = am4core.color(color);
    chart.cursor.lineX.stroke = am4core.color(color);
    chart.cursor.lineY.stroke = am4core.color(color);
    chart.colors.list = [am4core.color(color)];
}

const toggleCheckbox = document.getElementById('toggleCheckbox');
const moonIcon = document.getElementById('moonIcon');
const sunIcon = document.getElementById('sunIcon');

toggleCheckbox.addEventListener('change', () => {
    document.body.classList.toggle('dark-theme');
    $('input').toggleClass('dark-input');
    $('button').toggleClass('dark-button');
    
    if (toggleCheckbox.checked) {
        moonIcon.style.display = 'block';
        sunIcon.style.display = 'none';
        DarkChart();
    } else {
        moonIcon.style.display = 'none';
        sunIcon.style.display = 'block';
        lightChart();
    }
});

// Restore theme preference from local storage (if available)
document.addEventListener('DOMContentLoaded', () => {
    const darkThemePreferred = localStorage.getItem('darkTheme');

    if (darkThemePreferred === 'true') {
        toggleCheckbox.checked = true;
        document.body.classList.add('dark-theme');
        $('input').addClass('dark-input'); // Add Dark-Input theme for dark mode compliance
        $('button').addClass('dark-button');

        moonIcon.style.display = 'block';
        sunIcon.style.display = 'none';
        DarkChart();
    }
});

// Store theme preference in local storage
toggleCheckbox.addEventListener('change', () => {
    localStorage.setItem('darkTheme', toggleCheckbox.checked);
});