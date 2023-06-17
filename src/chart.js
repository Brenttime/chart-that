// Themes Begin
am4core.useTheme(am4themes_animated);
// Themes end

var chart = am4core.create("chartdiv", am4charts.XYChart);
chart.paddingRight = 20;

var data = [];
var yAxisScale = 100; // Starting Max Value of Y-Axis
$("#yAxisScale").attr('value', yAxisScale);

// Popup Settings
var popup = chart.openPopup("<div>Click on plot area to add points<br>Drag bullets to change values<br>Double click on bullet to remove</div>");
popup.top = 10;
popup.right = 30;
popup.defaultStyles = false;

// Setup The Data Axis as a global access variable
var seriesSet = [] 
var numberOfSeries = 3;
createIndexButtons(numberOfSeries);
var buttons = document.getElementsByClassName("index-button");
var currentSet = 0;

function InvalidateAllSeries()
{
  if(seriesSet.length > 0)
  {
    seriesSet.forEach((series) => {
      series.invalidateData();
    });
  }
}

var dateAxis = chart.xAxes.push(new am4charts.DateAxis());
dateAxis.renderer.grid.template.location = 0;
dateAxis.renderer.minGridDistance = 100;
dateAxis.renderer.maxGridDistance = 100;
dateAxis.dateFormats.setKey("hour", "HH:mm"); // Format labels as "HH:mm"

// Set base interval
dateAxis.baseInterval = {
  timeUnit: "hour",
  count: 1
};

// Default load settings for x-axis
var today = new Date();
dateAxis.max = Date.parse(today);
dateAxis.min = today.setDate(today.getDate() - 1);

// Change the X-Axis to adjust for min and max time range
function TimeChange(min, max) {
  var numberOfHours = getHoursBetweenDates(min, max);
  var startTime = new Date(min);

  for (var i = 0; i <= numberOfHours; i++) {
    data.push({ date: new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate(), startTime.getHours() + i), value: yAxisScale });
  }

  // reset Min/Max for chart view
  dateAxis.max = max;
  dateAxis.min = min;

  // Set Chart Data for cursor
  chart.data = data;

  // Required to rerender chart view on client
  chart.validateData(); 

  InvalidateAllSeries();
}

TimeChange(dateAxis.min, dateAxis.max);

var valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
valueAxis.max = 100;
valueAxis.min = 0;

var series = chart.series.push(new am4charts.LineSeries());
series.dataFields.dateX = "date";
series.dataFields.valueY = "value";
series.tooltip.pointerOrientation = "vertical";
series.tooltip.background.fillOpacity = 0.5;

chart.cursor = new am4charts.XYCursor();
chart.cursor.xAxis = dateAxis;
chart.cursor.behavior = "none";

var addingPointsDisabled = false;

function addSeries(index) {
  var newSeries = chart.series.push(new am4charts.LineSeries());
  newSeries.data = []
  newSeries.dataFields.dateX = "date";
  newSeries.dataFields.valueY = "newValue";
  newSeries.interpolationDuration = 0;
  newSeries.stroke = am4core.color(seriesLineColors[index]);
  seriesSet.push(newSeries);

  var bullet = newSeries.bullets.push(new am4charts.CircleBullet());
  bullet.circle.fill = am4core.color(seriesLineColors[index]); 
  bullet.circle.stroke = am4core.color(seriesLineColors[index]);
  bullet.draggable = true;

  bullet.events.on("dragged", function (event) {
    var bullet = event.target;

    var x = bullet.pixelX;

    bullet.moveTo({ x: x, y: bullet.pixelY }, undefined, undefined, true);
    bullet.dataItem.valueY = valueAxis.yToValue(bullet.pixelY);
    bullet.dataItem.dataContext.newValue = bullet.dataItem.valueY;

    // remove the following three lines if you want to allow draggin bullets only along y axis
    bullet.dataItem.dateX = dateAxis.xToValue(bullet.pixelX);
    bullet.dataItem.dataContext.date = bullet.dataItem.dateX;
    dateAxis.postProcessSeriesDataItem(bullet.dataItem);
  })

  bullet.events.on("down", function (event) {
    addingPointsDisabled = true;

    chart.cursor.triggerMove(
      { x: series.tooltipX, y: series.tooltipY },
      "hard"
    ); // sticks cursor to the point

  })


  bullet.events.on("dragstop", function (event) {

    var bullet = event.target;

    chart.cursor.triggerMove(
      { x: series.tooltipX, y: series.tooltipY },
      "none"
    ); // enables mouse following again

    addingPointsDisabled = false;
  })

  bullet.events.on("doublehit", function (event) {
    addingPointsDisabled = false;
    var dataItem = event.target.dataItem;
    var dataContext = dataItem.dataContext;
    newSeries.data.splice(newSeries.data.indexOf(dataContext), 1);
    newSeries.invalidateData();

    chart.cursor.triggerMove(
      { x: series.tooltipX, y: series.tooltipY },
      "none"
    ); // enables mouse following again    
  })
}

var interaction = am4core.getInteraction();

interaction.events.on("up", function (event) {
  var currentSeries = seriesSet[currentSet];
  if (currentSeries && !addingPointsDisabled && chart.cursor.visible) {
    var date = series.tooltipDataItem.dateX;
    var point = am4core.utils.documentPointToSprite(event.pointer.point, chart.seriesContainer);
    var value = valueAxis.yToValue(point.y);
    if (value > valueAxis.min && value < valueAxis.max) {
      currentSeries.data.push({ date: date, newValue: value });
      sortData();
      currentSeries.invalidateData();
    }
  }
})

function sortData() {
  var currentSeries = seriesSet[currentSet];
  currentSeries.data.sort(function (a, b) {
    var atime = a.date.getTime();
    var btime = b.date.getTime();

    if (atime < btime) {
      return -1;
    }
    else if (atime == btime) {
      return 0;
    }
    else {
      return 1;
    }
  })
}

function ChangeYAxisMax(yAxisMax) {
  console.log(`Change chart to Y-Axis from Value ${valueAxis.max} to ${yAxisMax}`)
  valueAxis.max = Number(yAxisMax);
  valueAxis.min = Number(0);
  
  // Required to rerender chart view on client
  chart.validateData(); 
  //newSeries.invalidateData();
  InvalidateAllSeries();
}

function ClearChart() {
  console.log("Clearning Chart");
  seriesSet.forEach((series, localIndex) => {
    series.data = [];
    chart.removeData(chart.series[localIndex] = null);
  });
  chart.validateData(); // Required to rerender chart view on client
}

/**
 * Change Scale of Y-Axis (Max)
 */
$("#yAxisScale").change(function () {
  ChangeYAxisMax(this.value);
});

/**
 * Clear Chart Button Event 
 */
$("#clear").click(function () {
  ClearChart();
});

/**
 * Change Start Time of X-Axis (Min)
 */
$("#startTime").change(function () {
  TimeChange(Date.parse(this.value), dateAxis.max);
});

/**
 * Change End Time of X-Axis (Max)
 */
$("#endTime").change(function () {
  TimeChange(dateAxis.min, Date.parse(this.value));
});

// Set Chart to be 90% of the Screen
var chartContainer = document.getElementById("chartdiv");
chartContainer.style.height = (window.innerHeight * 0.9) + "px";

for(var i =0; i< numberOfSeries; i++)
{
  addSeries(i);
}

// Add click event listeners to the buttons
for (var i = 0; i < buttons.length; i++) {
  buttons[i].addEventListener("click", function() {
    currentSet = parseInt(this.innerHTML) - 1; // 0 Based Offset
    console.log(`User Toggled On Series ${this.innerHTML}`);

    // Remove current-index class from the last index and add it to the new one
    $(`.${currentIndexClassName}`).toggleClass(currentIndexClassName);
    $(this).toggleClass(currentIndexClassName);
  });
}