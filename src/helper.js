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

function createIndexButtons(count)
{
   for(var i = 0; i < count; i++)
   {
        var newButton = $("<button>");
        newButton.addClass("index-button");
        newButton.addClass("index-button-light");
        newButton.text(i + 1);

        // 1st index gets preselected as the toggled series
        if(i == 0)
        {
            newButton.addClass("current-index");
        }
        $(".button-container").append(newButton);
   }
}