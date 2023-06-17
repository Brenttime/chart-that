function getDaysBetweenDates(date1, date2) {
    // Convert the date strings to Date objects
    const startDate = new Date(date1);
    const endDate = new Date(date2);

    // Calculate the time difference in milliseconds
    const timeDifference = endDate.getTime() - startDate.getTime();

    // Calculate the number of days
    const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));

    return days;
}

function getHoursBetweenDates(date1, date2) {
    // Convert the date strings to Date objects
    const startDate = new Date(date1);
    const endDate = new Date(date2);

    // Calculate the time difference in milliseconds
    const timeDifference = endDate.getTime() - startDate.getTime();

    // Calculate the number of hours
    const hours = Math.floor(timeDifference / (1000 * 60 * 60));

    return hours;
}

var currentIndexClassName = 'current-index';

var seriesLineColors = [
    "#2196f3", // Blue
    "#f44336", // Red
    "#4caf50", // Green
    "#ff9800", // Orange
    "#9c27b0", // Purple
    "#009688", // Teal
    "#ff5722", // Deep Orange
    "#673ab7", // Deep Purple
    "#8bc34a", // Lime
    "#e91e63"  // Pink
];

function createIndexButtons(count) {
    if (count <= seriesLineColors.length) {
        for (var i = 0; i < count; i++) {
            var newButton = $("<button>");
            newButton.addClass("index-button");
            newButton.text(i + 1);
            newButton.css('background-color', seriesLineColors[i])

            if(i == 0)
            {
                newButton.addClass(currentIndexClassName);
            }
            $(".button-container").append(newButton);
        }
    }
    else {
        alert(`Current Lines Series Colors only supports ${seriesLineColors.length} add more to add more series`);
    }
}